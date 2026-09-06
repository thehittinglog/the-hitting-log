(function () {
  const storageKey = "hitting-log-games";
  const accountsKey = "hitting-log-accounts";
  const currentUserKey = "hitting-log-current-user";
  const gamesTable = "hitting_log_games";
  const profilesTable = "hitting_log_profiles";
  let gamesCache = [];
  let profileCache = null;
  let authenticatedUser = null;
  let initialized = false;
  const hitResults = new Set(["Single", "Double", "Triple", "Home Run"]);
  const outResults = new Set(["Out"]);
  const resultLabels = {
    hot_cold: "Hot/Cold Zones",
    called_strike: "Called Strike",
    swinging_strike: "Swinging Strike",
    foul_ball: "Foul Ball",
    left_field_line: "Left Field Line",
    right_field_line: "Right Field Line",
    ground_ball: "Ground Ball",
    line_drive: "Line Drive",
    fly_ball: "Fly Ball",
    single: "Single",
    double: "Double",
    triple: "Triple",
    home_run: "Home Run",
    homerun: "Home Run",
    HomeRun: "Home Run",
    out: "Out",
    fielders_choice: "Fielder's Choice",
    reached_on_error: "ROE",
    roe: "ROE",
    sac_fly: "Sac Fly",
    sac_bunt: "Sac Bunt",
    drag_bunt: "Drag Bunt",
    walk: "Walk",
    strikeout: "Strikeout",
    hit_by_pitch: "HBP",
    hbp: "HBP",
    on_time: "On Time",
    ontime: "On Time",
    early: "Early",
    late: "Late",
    singles: "Single",
    doubles: "Double",
    triples: "Triple",
    home_runs: "Home Run",
    outs: "Out",
    "called strike": "Called Strike",
    "swinging strike": "Swinging Strike",
    "foul ball": "Foul Ball",
    "left field line": "Left Field Line",
    "right field line": "Right Field Line",
    "ground ball": "Ground Ball",
    "line drive": "Line Drive",
    "fly ball": "Fly Ball",
    "home run": "Home Run",
    "on time": "On Time",
    "fielder's choice": "Fielder's Choice",
    "fielders choice": "Fielder's Choice",
    "sac fly": "Sac Fly",
    "sac bunt": "Sac Bunt",
    "drag bunt": "Drag Bunt",
  };
  const pitchLocations = window.hittingLogPitchGrid?.locations || [];

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function normalizeHandedness(handedness) {
    return handedness === "right" || handedness === "left" ? handedness : null;
  }

  function normalizeDateOfBirth(dateOfBirth) {
    return window.hittingLogAgeEligibility?.normalizeDateOfBirth(dateOfBirth) || null;
  }

  function normalizeGuardianPermission(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function isMissingProfileColumnError(error, columnName) {
    const message = String(error?.message || "").toLowerCase();
    return (
      ["42703", "PGRST204"].includes(error?.code) && message.includes(columnName)
    ) || (
      message.includes(columnName) &&
      (message.includes("does not exist") || message.includes("could not find"))
    );
  }

  function isMissingEligibilityColumnError(error) {
    return isMissingProfileColumnError(error, "date_of_birth")
      || isMissingProfileColumnError(error, "guardian_permission_confirmed_at");
  }

  function logOperation(operation, details = {}) {
    console.info(`[DataStore] ${operation}`, {
      userId: authenticatedUser?.id || null,
      ...details,
    });
  }

  function logFailure(operation, error, details = {}) {
    console.error(`[DataStore] ${operation} failed`, {
      userId: authenticatedUser?.id || null,
      message: error?.message || String(error),
      ...details,
      error,
    });
  }

  function getLegacyCurrentUserEmail() {
    try {
      const savedUser = JSON.parse(localStorage.getItem(currentUserKey) || "null");
      return savedUser && typeof savedUser.email === "string" ? normalizeEmail(savedUser.email) : "";
    } catch (error) {
      logFailure("legacy user marker load", error);
      return "";
    }
  }

  function getLegacyGamesStorageKey() {
    const email = authenticatedUser?.email ? normalizeEmail(authenticatedUser.email) : getLegacyCurrentUserEmail();
    return email ? `${storageKey}-${email}` : "";
  }

  function readLegacyGames() {
    const key = getLegacyGamesStorageKey();
    if (!key) {
      return [];
    }

    try {
      const savedGames = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(savedGames) ? savedGames : [];
    } catch (error) {
      logFailure("legacy games load", error, { key });
      return [];
    }
  }

  async function getClient() {
    const client = await window.hittingLogSupabaseReady;
    if (!client) {
      throw new Error("Supabase data storage is not configured.");
    }
    return client;
  }

  function requireUser() {
    if (!authenticatedUser?.id) {
      throw new Error("An authenticated Supabase user is required for data access.");
    }
    return authenticatedUser;
  }

  async function getVerifiedUser(client) {
    const { data, error } = await client.auth.getUser();
    if (error) {
      throw error;
    }
    if (!data?.user?.id) {
      throw new Error("No authenticated Supabase user is available.");
    }
    return data.user;
  }

  function getLegacyAccount() {
    try {
      const accounts = JSON.parse(localStorage.getItem(accountsKey) || "[]");
      if (!Array.isArray(accounts) || !authenticatedUser?.email) {
        return null;
      }
      const email = normalizeEmail(authenticatedUser.email);
      return accounts.find((account) => normalizeEmail(account?.email || "") === email) || null;
    } catch (error) {
      logFailure("legacy profile load", error);
      return null;
    }
  }

  function removeLegacyAccount() {
    if (!authenticatedUser?.email) {
      return;
    }
    try {
      const accounts = JSON.parse(localStorage.getItem(accountsKey) || "[]");
      const authenticatedEmail = normalizeEmail(authenticatedUser.email);
      const remainingAccounts = Array.isArray(accounts)
        ? accounts.filter((account) => normalizeEmail(account?.email || "") !== authenticatedEmail)
        : [];
      if (remainingAccounts.length) {
        localStorage.setItem(accountsKey, JSON.stringify(remainingAccounts));
      } else {
        localStorage.removeItem(accountsKey);
      }
      logOperation("legacy profile cleanup succeeded");
    } catch (error) {
      logFailure("legacy profile cleanup", error);
    }
  }

  async function loadProfileFromCloud(client) {
    const user = requireUser();
    logOperation("profile load started");
    let result = await client
      .from(profilesTable)
      .select("user_id, athlete_name, sport_type, handedness, date_of_birth, guardian_permission_confirmed_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (isMissingEligibilityColumnError(result.error)) {
      console.warn("[DataStore] Profile schema does not include age eligibility fields; loading the backwards-compatible profile shape.", {
        userId: user.id,
        code: result.error.code || null,
      });
      result = await client
        .from(profilesTable)
        .select("user_id, athlete_name, sport_type, handedness, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
    }

    if (isMissingProfileColumnError(result.error, "handedness")) {
      console.warn("[DataStore] Profile schema does not include handedness; loading the backwards-compatible profile shape.", {
        userId: user.id,
        code: result.error.code || null,
      });
      result = await client
        .from(profilesTable)
        .select("user_id, athlete_name, sport_type, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
    }

    const { data, error } = result;
    if (error) {
      throw error;
    }

    profileCache = data
      ? {
          userId: data.user_id,
          athleteName: data.athlete_name || "",
          sportType: data.sport_type === "softball" ? "softball" : "baseball",
          handedness: normalizeHandedness(data.handedness),
          dateOfBirth: normalizeDateOfBirth(data.date_of_birth),
          guardianPermissionConfirmedAt: normalizeGuardianPermission(data.guardian_permission_confirmed_at),
        }
      : null;
    logOperation("profile load succeeded", { found: Boolean(data) });
    return profileCache;
  }

  async function saveProfile(profile, clientOverride) {
    const client = clientOverride || await getClient();
    const user = requireUser();
    const savedProfile = {
      athleteName: String(profile?.athleteName || "").trim(),
      sportType: profile?.sportType === "softball" ? "softball" : "baseball",
      handedness: normalizeHandedness(profile?.handedness),
      dateOfBirth: normalizeDateOfBirth(profile?.dateOfBirth),
      guardianPermissionConfirmedAt: normalizeGuardianPermission(profile?.guardianPermissionConfirmedAt),
    };
    logOperation("profile save started");

    try {
      let result = await client
        .from(profilesTable)
        .upsert({
          user_id: user.id,
          athlete_name: savedProfile.athleteName,
          sport_type: savedProfile.sportType,
          handedness: savedProfile.handedness,
          date_of_birth: savedProfile.dateOfBirth,
          guardian_permission_confirmed_at: savedProfile.guardianPermissionConfirmedAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select("user_id, athlete_name, sport_type, handedness, date_of_birth, guardian_permission_confirmed_at")
        .single();

      if (isMissingEligibilityColumnError(result.error)) {
        if (savedProfile.dateOfBirth || savedProfile.guardianPermissionConfirmedAt) {
          const schemaError = new Error("Date of birth cannot be saved until the profile database update is applied.");
          schemaError.code = "PROFILE_DATE_OF_BIRTH_SCHEMA_MISSING";
          throw schemaError;
        }

        console.warn("[DataStore] Profile schema does not include age eligibility fields; saving the backwards-compatible profile shape.", {
          userId: user.id,
          code: result.error.code || null,
        });
        result = await client
          .from(profilesTable)
          .upsert({
            user_id: user.id,
            athlete_name: savedProfile.athleteName,
            sport_type: savedProfile.sportType,
            handedness: savedProfile.handedness,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" })
          .select("user_id, athlete_name, sport_type, handedness")
          .single();
      }

      if (isMissingProfileColumnError(result.error, "handedness")) {
        if (savedProfile.handedness) {
          const schemaError = new Error("Hitter handedness cannot be saved until the profile database update is applied.");
          schemaError.code = "PROFILE_HANDEDNESS_SCHEMA_MISSING";
          throw schemaError;
        }

        console.warn("[DataStore] Profile schema does not include handedness; saving the backwards-compatible profile shape.", {
          userId: user.id,
          code: result.error.code || null,
        });
        result = await client
          .from(profilesTable)
          .upsert({
            user_id: user.id,
            athlete_name: savedProfile.athleteName,
            sport_type: savedProfile.sportType,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" })
          .select("user_id, athlete_name, sport_type")
          .single();
      }

      const { data, error } = result;
      if (error) {
        throw error;
      }
      if (data?.user_id !== user.id) {
        throw new Error("Supabase did not confirm the saved profile.");
      }

      profileCache = {
        userId: data.user_id,
        athleteName: data.athlete_name || "",
        sportType: data.sport_type === "softball" ? "softball" : "baseball",
        handedness: normalizeHandedness(data.handedness),
        dateOfBirth: normalizeDateOfBirth(data.date_of_birth),
        guardianPermissionConfirmedAt: normalizeGuardianPermission(data.guardian_permission_confirmed_at),
      };
      logOperation("profile save succeeded");
      return profileCache;
    } catch (error) {
      logFailure("profile save", error);
      throw error;
    }
  }

  async function migrateLegacyProfile(client) {
    if (profileCache) {
      removeLegacyAccount();
      return;
    }
    const legacyAccount = getLegacyAccount();
    const metadata = authenticatedUser?.user_metadata || {};
    const profile = {
      athleteName:
        legacyAccount?.athleteName ||
        metadata.athlete_name ||
        metadata.athleteName ||
        metadata.full_name ||
        "",
      sportType: legacyAccount?.sportType || metadata.sport_type || "baseball",
      handedness: null,
      dateOfBirth: normalizeDateOfBirth(metadata.date_of_birth),
      guardianPermissionConfirmedAt: normalizeGuardianPermission(metadata.guardian_permission_confirmed_at),
    };
    await saveProfile(profile, client);
    if (legacyAccount) {
      removeLegacyAccount();
    }
  }

  async function loadGamesFromCloud(client) {
    const user = requireUser();
    logOperation("games load started");
    try {
      const { data, error } = await client
        .from(gamesTable)
        .select("game_id, payload, updated_at")
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      gamesCache = (data || [])
        .map((row) => normalizeStoredGame(row.payload))
        .filter((game) => game && typeof game === "object");
      logOperation("games load succeeded", { count: gamesCache.length });
      return gamesCache;
    } catch (error) {
      logFailure("games load", error);
      throw error;
    }
  }

  async function upsertGamesToCloud(games, clientOverride) {
    const client = clientOverride || await getClient();
    const user = requireUser();
    const normalizedGames = games.map(normalizeStoredGame);
    if (!normalizedGames.length) {
      return [];
    }
    const rows = normalizedGames.map((game) => ({
      user_id: user.id,
      game_id: getGameIdentity(game),
      payload: game,
      updated_at: new Date().toISOString(),
    }));
    logOperation("games save started", { count: rows.length, gameIds: rows.map((row) => row.game_id) });

    try {
      const { data, error } = await client
        .from(gamesTable)
        .upsert(rows, { onConflict: "user_id,game_id" })
        .select("user_id, game_id");

      if (error) {
        throw error;
      }
      if (!Array.isArray(data) || data.length !== rows.length || data.some((row) => row.user_id !== user.id)) {
        throw new Error("Supabase did not confirm every saved game.");
      }
      logOperation("games save succeeded", { count: data.length, gameIds: data.map((row) => row.game_id) });
      return normalizedGames;
    } catch (error) {
      logFailure("games save", error, { gameIds: rows.map((row) => row.game_id) });
      throw error;
    }
  }

  async function migrateLegacyGames(client) {
    const legacyGames = readLegacyGames();
    if (!legacyGames.length) {
      return;
    }
    const gamesById = new Map(gamesCache.map((game) => [getGameIdentity(game), game]));
    const newLegacyGames = [];
    legacyGames.map(normalizeStoredGame).forEach((game) => {
      const gameId = getGameIdentity(game);
      if (!gamesById.has(gameId)) {
        gamesById.set(gameId, game);
        newLegacyGames.push(game);
      }
    });
    const mergedGames = Array.from(gamesById.values());
    logOperation("legacy games migration started", {
      localCount: legacyGames.length,
      newCloudCount: newLegacyGames.length,
    });
    await upsertGamesToCloud(newLegacyGames, client);
    gamesCache = mergedGames;
    const legacyKey = getLegacyGamesStorageKey();
    if (legacyKey) {
      localStorage.removeItem(legacyKey);
    }
    logOperation("legacy games migration succeeded", { count: legacyGames.length });
  }

  async function initializeDataStore() {
    if (initialized) {
      return { games: getSavedGames(), profile: profileCache, user: authenticatedUser };
    }

    const client = await getClient();
    try {
      authenticatedUser = await getVerifiedUser(client);
      logOperation("authenticated user load succeeded");
      await Promise.all([loadGamesFromCloud(client), loadProfileFromCloud(client)]);
      await migrateLegacyProfile(client);
      await migrateLegacyGames(client);
      localStorage.removeItem(currentUserKey);
      initialized = true;
      return { games: getSavedGames(), profile: profileCache, user: authenticatedUser };
    } catch (error) {
      logFailure("initialization", error);
      throw error;
    }
  }

  function clearDataStore() {
    gamesCache = [];
    profileCache = null;
    authenticatedUser = null;
    initialized = false;
    logOperation("in-memory data cleared");
  }

  function getGameIdentity(game) {
    if (!game || typeof game !== "object") {
      return "";
    }

    return game.id || `${game.date || ""}-${game.opponent || ""}`;
  }

  function normalizeStoredGame(game) {
    return game && typeof window.normalizeGame === "function" ? window.normalizeGame(game) : game;
  }

  function normalizeResultName(result) {
    if (typeof result !== "string") {
      return "";
    }

    const trimmed = result.trim();
    const lookupKey = trimmed.toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
    const compactKey = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");

    return (
      resultLabels[trimmed] ||
      resultLabels[lookupKey] ||
      resultLabels[lookupKey.replace(/_/g, " ")] ||
      resultLabels[compactKey] ||
      trimmed
    );
  }

  function getSavedGames() {
    return gamesCache.map((game) => normalizeStoredGame(game));
  }

  async function saveGame(game) {
    const games = getSavedGames();
    const savedGame = normalizeStoredGame(game);
    const gameId = getGameIdentity(savedGame);
    const existingIndex = games.findIndex((saved) => {
      const savedId = saved && saved.id ? saved.id : `${saved?.date || ""}-${saved?.opponent || ""}`;
      return savedId === gameId;
    });

    if (existingIndex >= 0) {
      games[existingIndex] = savedGame;
    } else {
      games.push(savedGame);
    }

    await upsertGamesToCloud([savedGame]);
    gamesCache = games;
    return savedGame;
  }

  async function saveGameBatch(games) {
    const normalizedGames = await upsertGamesToCloud(games);
    const gamesById = new Map(gamesCache.map((game) => [getGameIdentity(game), game]));
    normalizedGames.forEach((game) => gamesById.set(getGameIdentity(game), game));
    gamesCache = Array.from(gamesById.values());
    return normalizedGames;
  }

  async function deleteGame(gameId) {
    const client = await getClient();
    const user = requireUser();
    logOperation("game delete started", { gameId });
    try {
      const { data, error } = await client
        .from(gamesTable)
        .delete()
        .eq("user_id", user.id)
        .eq("game_id", gameId)
        .select("user_id, game_id");
      if (error) {
        throw error;
      }
      if (!Array.isArray(data) || data.length !== 1 || data[0].user_id !== user.id) {
        throw new Error("Supabase did not confirm the deleted game.");
      }
      gamesCache = gamesCache.filter((game) => getGameIdentity(game) !== gameId);
      logOperation("game delete succeeded", { gameId });
    } catch (error) {
      logFailure("game delete", error, { gameId });
      throw error;
    }
  }

  function getAllAtBats(games = getSavedGames()) {
    return games.flatMap((game) => {
      if (!Array.isArray(game.atBats)) {
        return [];
      }

      return game.atBats.map((atBat) => ({ ...atBat, game }));
    });
  }

  function getPitchLocationId(pitch) {
    const savedLocation =
      pitch && pitch.location && typeof pitch.location === "object"
        ? pitch.location
        : {
            id: typeof pitch?.location === "string" ? pitch.location : "",
            label: typeof pitch?.locationLabel === "string" ? pitch.locationLabel : "",
          };
    const locationMatch = pitchLocations.find((location) => {
      return (
        location.id === savedLocation.id ||
        location.label === savedLocation.id ||
        location.id === savedLocation.label ||
        location.label === savedLocation.label ||
        location.id === pitch?.locationId ||
        location.label === pitch?.locationId
      );
    });

    return locationMatch ? locationMatch.id : "";
  }

  function getAtBatOutcome(atBat) {
    return normalizeResultName(
      atBat?.finalOutcome ||
        atBat?.outcome ||
        atBat?.battedBallOutcome ||
        atBat?.result ||
        ""
    );
  }

  function hasSavedFinalOutcome(pitch) {
    return Boolean(
      normalizeResultName(pitch?.battedBallOutcome || "") ||
        normalizeResultName(pitch?.outcome || "")
    );
  }

  function isBattedBallPitch(pitch) {
    return Boolean(
      pitch?.result === "batted_ball" ||
        pitch?.primaryResult === "batted_ball" ||
        pitch?.battedBallType
    );
  }

  function findOutcomePitchIndex(pitches) {
    for (let index = pitches.length - 1; index >= 0; index -= 1) {
      if (hasSavedFinalOutcome(pitches[index]) || isBattedBallPitch(pitches[index])) {
        return index;
      }
    }

    for (let index = pitches.length - 1; index >= 0; index -= 1) {
      if (getPitchLocationId(pitches[index])) {
        return index;
      }
    }

    return -1;
  }

  function getPitchResultNames(pitch, atBat, isOutcomePitch = false) {
    const atBatOutcome = getAtBatOutcome(atBat);
    const names = [
      normalizeResultName(pitch?.chartResult || ""),
      normalizeResultName(pitch?.strikeType || pitch?.strikeDetail || ""),
      normalizeResultName(pitch?.result || pitch?.primaryResult || ""),
      normalizeResultName(pitch?.foulDirection || ""),
      normalizeResultName(pitch?.battedBallType || ""),
      normalizeResultName(pitch?.battedBallOutcome || pitch?.outcome || ""),
      normalizeResultName(atBat?.timing || pitch?.timing || ""),
    ].filter(Boolean);

    if ((isOutcomePitch || isBattedBallPitch(pitch)) && atBatOutcome) {
      names.push(atBatOutcome);
    }

    if ((pitch?.result === "hit_by_pitch" || pitch?.battedBallOutcome === "hit_by_pitch") && !names.includes("HBP")) {
      names.push("HBP");
    }

    return Array.from(new Set(names));
  }

  function getAllPitches(games = getSavedGames()) {
    return games.flatMap((game) => {
      if (!Array.isArray(game.atBats) && Number(game?.stats?.atBats || game?.atBatCount || game?.atBats || 0) > 0) {
        console.warn("Saved game has at-bat stats but no pitch/location detail for charts", game);
      }

      if (!Array.isArray(game.atBats)) {
        return [];
      }

      return game.atBats.flatMap((atBat) => {
        if (!Array.isArray(atBat.pitches)) {
          return [];
        }

        const outcomePitchIndex = findOutcomePitchIndex(atBat.pitches);

        return atBat.pitches.map((pitch, pitchIndex) => ({
          ...pitch,
          atBat,
          game,
          locationId: getPitchLocationId(pitch),
          resultNames: getPitchResultNames(pitch, atBat, pitchIndex === outcomePitchIndex),
        }));
      });
    });
  }

  function createLocationBuckets() {
    return pitchLocations.reduce((buckets, location) => {
      buckets[location.id] = { count: 0, hits: 0, outs: 0 };
      return buckets;
    }, {});
  }

  function getChartDataForFilter(filterName, games = getSavedGames(), pitchPredicate) {
    const selectedFilter = normalizeResultName(filterName || "Hot/Cold Zones");
    const buckets = createLocationBuckets();
    const matchingPitches = [];

    getAllPitches(games).forEach((pitch) => {
      if (typeof pitchPredicate === "function" && !pitchPredicate(pitch)) {
        return;
      }

      if (!pitch.locationId || !buckets[pitch.locationId]) {
        return;
      }

      if (selectedFilter === "Hot/Cold Zones") {
        const outcome = pitch.resultNames.find((name) => hitResults.has(name) || outResults.has(name));

        if (hitResults.has(outcome)) {
          buckets[pitch.locationId].hits += 1;
          matchingPitches.push(pitch);
        } else if (outResults.has(outcome)) {
          buckets[pitch.locationId].outs += 1;
          matchingPitches.push(pitch);
        }

        return;
      }

      if (pitch.resultNames.includes(selectedFilter)) {
        buckets[pitch.locationId].count += 1;
        matchingPitches.push(pitch);
      }
    });

    return {
      filterName: selectedFilter,
      buckets,
      matchingPitches,
      matchingItems: matchingPitches,
      totalMatches: matchingPitches.length,
    };
  }

  window.dataStorePitchLocations = pitchLocations;
  window.initializeHittingLogDataStore = initializeDataStore;
  window.clearHittingLogDataStore = clearDataStore;
  window.getHittingLogProfile = () => profileCache;
  window.saveHittingLogProfile = saveProfile;
  window.getHittingLogAuthenticatedUser = () => authenticatedUser;
  window.getSavedGames = getSavedGames;
  window.saveGame = saveGame;
  window.saveGameBatchToCloud = saveGameBatch;
  window.deleteGameFromCloud = deleteGame;
  window.getAllAtBats = getAllAtBats;
  window.getAllPitches = getAllPitches;
  window.normalizeResultName = normalizeResultName;
  window.getChartDataForFilter = getChartDataForFilter;
})();
