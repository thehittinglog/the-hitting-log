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
  const pitchLocations = [
    { id: "extreme-top-left-out", label: "Extreme Top Left", isZone: false },
    { id: "top-edge-left-out", label: "Top Edge Left", isZone: false },
    { id: "top-edge-mid-left-out", label: "Top Edge Mid Left", isZone: false },
    { id: "top-edge-mid-out", label: "Top Edge Middle", isZone: false },
    { id: "top-edge-mid-right-out", label: "Top Edge Mid Right", isZone: false },
    { id: "top-edge-right-out", label: "Top Edge Right", isZone: false },
    { id: "extreme-top-right-out", label: "Extreme Top Right", isZone: false },
    { id: "extreme-high-left-out", label: "Extreme High Left", isZone: false },
    { id: "top-left-out", label: "Top Left", isZone: false },
    { id: "high-left-out", label: "High Left", isZone: false },
    { id: "high-mid-out", label: "High", isZone: false },
    { id: "high-right-out", label: "High Right", isZone: false },
    { id: "top-right-out", label: "Top Right", isZone: false },
    { id: "extreme-high-right-out", label: "Extreme High Right", isZone: false },
    { id: "extreme-upper-left-out", label: "Extreme Upper Left", isZone: false },
    { id: "far-left-high-out", label: "Far Inside High", isZone: false },
    { id: "zone-1", label: "Zone 1", isZone: true },
    { id: "zone-2", label: "Zone 2", isZone: true },
    { id: "zone-3", label: "Zone 3", isZone: true },
    { id: "far-right-high-out", label: "Far Outside High", isZone: false },
    { id: "extreme-upper-right-out", label: "Extreme Upper Right", isZone: false },
    { id: "extreme-mid-left-out", label: "Extreme Inside", isZone: false },
    { id: "left-out", label: "Inside", isZone: false },
    { id: "zone-4", label: "Zone 4", isZone: true },
    { id: "zone-5", label: "Zone 5", isZone: true },
    { id: "zone-6", label: "Zone 6", isZone: true },
    { id: "right-out", label: "Outside", isZone: false },
    { id: "extreme-mid-right-out", label: "Extreme Outside", isZone: false },
    { id: "extreme-lower-left-out", label: "Extreme Lower Left", isZone: false },
    { id: "far-left-low-out", label: "Far Inside Low", isZone: false },
    { id: "zone-7", label: "Zone 7", isZone: true },
    { id: "zone-8", label: "Zone 8", isZone: true },
    { id: "zone-9", label: "Zone 9", isZone: true },
    { id: "far-right-low-out", label: "Far Outside Low", isZone: false },
    { id: "extreme-lower-right-out", label: "Extreme Lower Right", isZone: false },
    { id: "extreme-low-left-out", label: "Extreme Low Left", isZone: false },
    { id: "bottom-left-out", label: "Bottom Left", isZone: false },
    { id: "low-left-out", label: "Low Left", isZone: false },
    { id: "low-mid-out", label: "Low", isZone: false },
    { id: "low-right-out", label: "Low Right", isZone: false },
    { id: "bottom-right-out", label: "Bottom Right", isZone: false },
    { id: "extreme-low-right-out", label: "Extreme Low Right", isZone: false },
    { id: "extreme-bottom-left-out", label: "Extreme Bottom Left", isZone: false },
    { id: "bottom-edge-left-out", label: "Bottom Edge Left", isZone: false },
    { id: "bottom-edge-mid-left-out", label: "Bottom Edge Mid Left", isZone: false },
    { id: "bottom-edge-mid-out", label: "Bottom Edge Middle", isZone: false },
    { id: "bottom-edge-mid-right-out", label: "Bottom Edge Mid Right", isZone: false },
    { id: "bottom-edge-right-out", label: "Bottom Edge Right", isZone: false },
    { id: "extreme-bottom-right-out", label: "Extreme Bottom Right", isZone: false },
  ];

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function normalizeHandedness(handedness) {
    return handedness === "right" || handedness === "left" ? handedness : null;
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
    const { data, error } = await client
      .from(profilesTable)
      .select("user_id, athlete_name, sport_type, handedness, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    profileCache = data
      ? {
          userId: data.user_id,
          athleteName: data.athlete_name || "",
          sportType: data.sport_type === "softball" ? "softball" : "baseball",
          handedness: normalizeHandedness(data.handedness),
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
    };
    logOperation("profile save started");

    try {
      const { data, error } = await client
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
