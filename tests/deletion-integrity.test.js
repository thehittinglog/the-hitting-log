"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const pitchGrid = require("../scripts/pitch-location-grid");

const dataStoreSource = fs.readFileSync(require.resolve("../scripts/data-store.js"), "utf8");

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function createClient(initialGames, { ignoreDeletes = false } = {}) {
  let profileRow = { user_id: "user-1", athlete_name: "Test Player", sport_type: "baseball" };
  let gameRows = initialGames.map((game) => ({
    user_id: "user-1",
    game_id: game.id,
    payload: game,
    updated_at: "2026-09-09T00:00:00.000Z",
  }));
  const deleteFilters = [];

  function from(table) {
    let operation = "select";
    let payload = null;
    const filters = [];
    const builder = {
      select() { return builder; },
      eq(column, value) { filters.push([column, value]); return builder; },
      limit() { return builder; },
      maybeSingle() { return Promise.resolve(execute()); },
      single() { return Promise.resolve(execute()); },
      upsert(value) { operation = "upsert"; payload = value; return builder; },
      delete() { operation = "delete"; return builder; },
      then(resolve, reject) { return Promise.resolve(execute()).then(resolve, reject); },
    };

    function matches(row) {
      return filters.every(([column, value]) => row[column] === value);
    }

    function execute() {
      if (table === "hitting_log_profiles") {
        if (operation === "upsert") profileRow = { ...payload };
        return { data: profileRow, error: null };
      }
      if (table !== "hitting_log_games") {
        throw new Error(`Unexpected table: ${table}`);
      }
      if (operation === "delete") {
        deleteFilters.push(filters.slice());
        if (!ignoreDeletes) gameRows = gameRows.filter((row) => !matches(row));
        return { data: null, error: null };
      }
      if (operation === "upsert") {
        payload.forEach((nextRow) => {
          const index = gameRows.findIndex((row) => row.user_id === nextRow.user_id && row.game_id === nextRow.game_id);
          const savedRow = { ...nextRow };
          if (index >= 0) gameRows[index] = savedRow;
          else gameRows.push(savedRow);
        });
        return {
          data: payload.map((row) => ({ user_id: row.user_id, game_id: row.game_id })),
          error: null,
        };
      }
      return { data: gameRows.filter(matches), error: null };
    }

    return builder;
  }

  return {
    auth: {
      async getUser() {
        return { data: { user: { id: "user-1", email: "player@example.com", user_metadata: {} } }, error: null };
      },
    },
    from,
    getGameRows: () => gameRows,
    deleteFilters,
  };
}

async function initialize(initialGames, options) {
  const client = createClient(initialGames, options);
  const context = {
    console,
    localStorage: createStorage(),
    window: {
      hittingLogPitchGrid: pitchGrid,
      hittingLogSupabaseReady: Promise.resolve(client),
    },
  };
  vm.runInNewContext(dataStoreSource, context, { filename: "scripts/data-store.js" });
  await context.window.initializeHittingLogDataStore();
  return { client, store: context.window };
}

const gameWithAtBats = {
  id: "game-with-at-bats",
  date: "2026-09-09",
  opponent: "Test Team",
  atBats: [
    { id: "at-bat-1", outcome: "single", timing: "on_time", pitches: [{ id: "pitch-1", result: "batted_ball", location: pitchGrid.locations[0] }] },
    { id: "at-bat-2", outcome: "strikeout", timing: "late", pitches: [{ id: "pitch-2", result: "swinging_strike", location: pitchGrid.locations[1] }] },
    { id: "at-bat-3", outcome: "walk", timing: "early", pitches: [{ id: "pitch-3", result: "ball", location: pitchGrid.locations[2] }] },
  ],
};
const emptyGame = { id: "empty-game", date: "2026-09-08", opponent: "Empty Team", atBats: [] };

(async () => {
  const { client, store } = await initialize([gameWithAtBats, emptyGame]);
  assert.equal(store.getAllAtBats().length, 3);
  assert.equal(store.getAllPitches().length, 3);
  assert.equal(store.getChartDataForFilter("Late").totalMatches, 1);

  const withoutSecondAtBat = {
    ...store.getSavedGames().find((game) => game.id === gameWithAtBats.id),
    atBats: gameWithAtBats.atBats.filter((atBat) => atBat.id !== "at-bat-2"),
  };
  await store.saveGame(withoutSecondAtBat);
  assert.deepEqual(Array.from(store.getSavedGames()[0].atBats, (atBat) => atBat.id), ["at-bat-1", "at-bat-3"]);
  assert.equal(store.getAllAtBats().length, 2, "deleted at-bat must leave every derived at-bat source");
  assert.equal(store.getAllPitches().length, 2, "pitches nested in the deleted at-bat must leave every derived pitch source");
  assert.equal(store.getChartDataForFilter("Late").totalMatches, 0, "deleted at-bat data must leave chart projections");
  assert.deepEqual(client.getGameRows().find((row) => row.game_id === gameWithAtBats.id).payload.atBats.map((atBat) => atBat.id), ["at-bat-1", "at-bat-3"]);

  await store.deleteGameFromCloud(emptyGame.id);
  assert.equal(client.getGameRows().some((row) => row.game_id === emptyGame.id), false, "an empty game must remain deleted after reload");
  assert.deepEqual(client.deleteFilters[0], [["user_id", "user-1"], ["game_id", emptyGame.id]], "game delete must be scoped to the authenticated user and game ID");

  await store.deleteGameFromCloud(gameWithAtBats.id);
  assert.equal(store.getSavedGames().length, 0);
  assert.equal(store.getAllAtBats().length, 0);
  assert.equal(store.getAllPitches().length, 0);
  assert.equal(store.getChartDataForFilter("On Time").totalMatches, 0);
  assert.equal(client.getGameRows().length, 0, "deleted games must not return from the persisted source");

  const blocked = await initialize([emptyGame], { ignoreDeletes: true });
  await assert.rejects(blocked.store.deleteGameFromCloud(emptyGame.id), /did not confirm/);
  assert.equal(blocked.store.getSavedGames().length, 1, "a failed delete must retain the in-memory game");

  console.log("Game and at-bat deletion integrity tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
