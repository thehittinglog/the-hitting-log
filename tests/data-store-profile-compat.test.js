const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const dataStoreSource = fs.readFileSync(require.resolve("../scripts/data-store.js"), "utf8");
const ageEligibilitySource = fs.readFileSync(require.resolve("../scripts/age-eligibility.js"), "utf8");

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function createClient({ supportsHandedness, supportsEligibility = false, initialProfile, games = [] }) {
  let profile = initialProfile;
  const operations = [];

  function execute(table, operation, columns, payload) {
    operations.push({ table, operation, columns, payload });
    if (table === "hitting_log_games") {
      return { data: games, error: null };
    }

    const requestsHandedness = columns?.includes("handedness") || Object.hasOwn(payload || {}, "handedness");
    const requestsEligibility = columns?.includes("date_of_birth")
      || columns?.includes("guardian_permission_confirmed_at")
      || Object.hasOwn(payload || {}, "date_of_birth")
      || Object.hasOwn(payload || {}, "guardian_permission_confirmed_at");
    if (requestsEligibility && !supportsEligibility) {
      return {
        data: null,
        error: {
          code: operation === "upsert" ? "PGRST204" : "42703",
          message: operation === "upsert"
            ? "Could not find the 'date_of_birth' column of 'hitting_log_profiles' in the schema cache"
            : "column hitting_log_profiles.date_of_birth does not exist",
        },
      };
    }
    if (requestsHandedness && !supportsHandedness) {
      return {
        data: null,
        error: {
          code: operation === "upsert" ? "PGRST204" : "42703",
          message: operation === "upsert"
            ? "Could not find the 'handedness' column of 'hitting_log_profiles' in the schema cache"
            : "column hitting_log_profiles.handedness does not exist",
        },
      };
    }

    if (operation === "upsert") {
      profile = { ...payload };
    }
    return { data: profile, error: null };
  }

  function from(table) {
    let operation = "select";
    let columns = "";
    let payload = null;
    const builder = {
      select(value) { columns = value; return builder; },
      eq() { return builder; },
      maybeSingle() { return Promise.resolve(execute(table, operation, columns, payload)); },
      single() { return Promise.resolve(execute(table, operation, columns, payload)); },
      upsert(value) { operation = "upsert"; payload = value; return builder; },
      then(resolve, reject) { return Promise.resolve(execute(table, operation, columns, payload)).then(resolve, reject); },
    };
    return builder;
  }

  return {
    auth: {
      async getUser() {
        return { data: { user: { id: "user-1", email: "player@example.com", user_metadata: { sport_type: "softball" } } }, error: null };
      },
    },
    from,
    operations,
  };
}

async function initialize(options) {
  const client = createClient(options);
  const context = {
    console,
    localStorage: createStorage(),
    window: {
      hittingLogPitchGrid: { locations: [] },
      hittingLogSupabaseReady: Promise.resolve(client),
    },
  };
  vm.runInNewContext(ageEligibilitySource, context, { filename: "scripts/age-eligibility.js" });
  vm.runInNewContext(dataStoreSource, context, { filename: "scripts/data-store.js" });
  const result = await context.window.initializeHittingLogDataStore();
  return { client, context, result };
}

(async () => {
  const existing = await initialize({
    supportsHandedness: false,
    initialProfile: { user_id: "user-1", athlete_name: "Existing Player", sport_type: "softball" },
    games: [{ game_id: "game-1", payload: { id: "game-1", tournaments: [], atBats: [] } }],
  });
  assert.equal(existing.result.profile.athleteName, "Existing Player");
  assert.equal(existing.result.profile.sportType, "softball");
  assert.equal(existing.result.profile.handedness, null);
  assert.equal(existing.result.games.length, 1);
  assert.equal(existing.client.operations.filter((item) => item.operation === "upsert").length, 0, "existing profile was rewritten during load");
  await assert.rejects(
    existing.context.window.saveHittingLogProfile({ athleteName: "Existing Player", sportType: "softball", handedness: "right" }),
    (error) => error.code === "PROFILE_HANDEDNESS_SCHEMA_MISSING",
    "selected handedness was silently discarded on a legacy profile schema",
  );
  assert.equal(
    existing.client.operations.filter((item) => item.operation === "upsert" && !Object.hasOwn(item.payload, "handedness")).length,
    0,
    "selected handedness unexpectedly retried without the handedness field",
  );

  const newlyCreated = await initialize({ supportsHandedness: false, initialProfile: null });
  assert.equal(newlyCreated.result.profile.handedness, null);
  const legacyUpsert = newlyCreated.client.operations.find((item) => item.operation === "upsert" && !Object.hasOwn(item.payload, "handedness"));
  assert(legacyUpsert, "new profile did not retry with the backwards-compatible shape");

  for (const handedness of ["right", "left"]) {
    const supported = await initialize({
      supportsHandedness: true,
      initialProfile: { user_id: "user-1", athlete_name: "Player", sport_type: "baseball", handedness },
    });
    assert.equal(supported.result.profile.handedness, handedness);
    const saved = await supported.context.window.saveHittingLogProfile({
      athleteName: "Player",
      sportType: "baseball",
      handedness,
    });
    assert.equal(saved.handedness, handedness);
  }

  const malformed = await initialize({
    supportsHandedness: true,
    initialProfile: { user_id: "user-1", athlete_name: "Player", sport_type: "baseball", handedness: "unknown-value" },
  });
  assert.equal(malformed.result.profile.handedness, null);

  const nullableDateOfBirth = await initialize({
    supportsHandedness: true,
    supportsEligibility: true,
    initialProfile: {
      user_id: "user-1",
      athlete_name: "Existing Player",
      sport_type: "softball",
      handedness: "left",
      date_of_birth: null,
      guardian_permission_confirmed_at: null,
    },
  });
  assert.equal(nullableDateOfBirth.result.profile.dateOfBirth, null);
  assert.equal(nullableDateOfBirth.result.profile.handedness, "left");

  const savedWithDateOfBirth = await nullableDateOfBirth.context.window.saveHittingLogProfile({
    athleteName: "Existing Player",
    sportType: "softball",
    handedness: "left",
    dateOfBirth: "2008-09-06",
  });
  assert.equal(savedWithDateOfBirth.dateOfBirth, "2008-09-06");
  assert.equal(savedWithDateOfBirth.handedness, "left");
  const savedOperations = nullableDateOfBirth.client.operations.filter((item) => item.operation === "upsert");
  const savedPayload = savedOperations[savedOperations.length - 1].payload;
  assert.equal(savedPayload.sport_type, "softball");
  assert.equal(savedPayload.handedness, "left");

  const compatibleMissingEligibilitySchema = await initialize({
    supportsHandedness: true,
    supportsEligibility: false,
    initialProfile: { user_id: "user-1", athlete_name: "Existing Player", sport_type: "baseball", handedness: "right" },
  });
  assert.equal(compatibleMissingEligibilitySchema.result.profile.dateOfBirth, null);
  assert.equal(compatibleMissingEligibilitySchema.result.profile.handedness, "right");
  await assert.rejects(
    compatibleMissingEligibilitySchema.context.window.saveHittingLogProfile({
      athleteName: "Existing Player",
      sportType: "baseball",
      handedness: "right",
      dateOfBirth: "2000-01-01",
    }),
    (error) => error.code === "PROFILE_DATE_OF_BIRTH_SCHEMA_MISSING",
  );

  console.log("Data-store profile schema compatibility tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
