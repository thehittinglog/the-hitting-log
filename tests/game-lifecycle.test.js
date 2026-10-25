"use strict";

const assert = require("node:assert/strict");
const lifecycle = require("../scripts/game-lifecycle");

assert.equal(lifecycle.normalizeStatus(undefined), lifecycle.COMPLETED, "historical games must default to completed");
assert.equal(lifecycle.normalizeStatus("in_progress"), lifecycle.IN_PROGRESS);
assert.equal(lifecycle.isInProgress({ status: "in_progress" }), true);
assert.equal(lifecycle.isInProgress({}), false, "historical games must not become resumable drafts");

const existing = [{ id: "at-bat-1", outcome: "single" }];
const added = lifecycle.appendUniqueAtBat(existing, { id: "at-bat-2", outcome: "walk" });
assert.deepEqual(added.map((atBat) => atBat.id), ["at-bat-1", "at-bat-2"]);
assert.equal(existing.length, 1, "adding an at-bat must not mutate the previous saved array");

const retried = lifecycle.appendUniqueAtBat(added, { id: "at-bat-2", outcome: "walk" });
assert.equal(retried.length, 2, "a retried at-bat submission must not create a duplicate");

const partialAtBat = {
  id: "at-bat-3",
  pitches: [
    { id: "pitch-1", location: { id: "zone-5" }, result: "called_strike" },
    { id: "pitch-2", location: { id: "right-out" }, result: "ball" },
  ],
};
const resumable = lifecycle.withDraftState(
  { id: "game-resume", status: lifecycle.IN_PROGRESS, atBats: added },
  partialAtBat,
  "pitch_actions",
);
assert.equal(resumable.id, "game-resume", "resuming must preserve the existing game ID");
assert.deepEqual(resumable.pendingAtBat.pitches, partialAtBat.pitches, "resume state must preserve pitch sequence and locations");
assert.equal(resumable.recordingStep, "pitch_actions");

const committed = lifecycle.commitAtBat(resumable, partialAtBat);
assert.deepEqual(committed.atBats.map((atBat) => atBat.id), ["at-bat-1", "at-bat-2", "at-bat-3"]);
assert.equal(committed.pendingAtBat, null);
assert.equal(committed.status, lifecycle.IN_PROGRESS, "saving an at-bat must not finish the game");
assert.equal(lifecycle.commitAtBat(committed, partialAtBat).atBats.length, 3, "network retries must be idempotent");

const completedGame = { id: "game-1", status: lifecycle.COMPLETED };
const withAddedAtBat = {
  ...completedGame,
  atBats: lifecycle.appendUniqueAtBat([], { id: "at-bat-1" }),
};
assert.equal(withAddedAtBat.status, lifecycle.COMPLETED, "adding an at-bat must not reopen a completed game");
assert.equal(lifecycle.commitAtBat(completedGame, { id: "at-bat-1" }).status, lifecycle.COMPLETED);
assert.equal(lifecycle.completeGame(resumable).status, lifecycle.COMPLETED);
assert.equal(lifecycle.completeGame(resumable).pendingAtBat, null, "finishing must clear only the unfinished draft at-bat");

console.log("Game lifecycle tests passed");
