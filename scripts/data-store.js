(function () {
  const storageKey = "hitting-log-games";
  const currentUserKey = "hitting-log-current-user";
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

  function getCurrentUser() {
    try {
      const savedUser = JSON.parse(localStorage.getItem(currentUserKey) || "null");
      return savedUser && typeof savedUser.email === "string" ? normalizeEmail(savedUser.email) : "";
    } catch (error) {
      return "";
    }
  }

  function getGamesStorageKey() {
    const currentUser = getCurrentUser();
    return currentUser ? `${storageKey}-${currentUser}` : storageKey;
  }

  function readGamesFromKey(key) {
    try {
      const savedGames = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(savedGames) ? savedGames : [];
    } catch (error) {
      return [];
    }
  }

  function getReadableGameKeys() {
    const currentKey = getGamesStorageKey();
    const keys = new Set([currentKey, storageKey]);

    try {
      Object.keys(localStorage)
        .filter((key) => key === storageKey || key.startsWith(`${storageKey}-`))
        .forEach((key) => keys.add(key));
    } catch (error) {
      return Array.from(keys);
    }

    return Array.from(keys);
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
    const gamesById = new Map();

    getReadableGameKeys().forEach((key) => {
      readGamesFromKey(key).forEach((game) => {
        const normalizedGame = normalizeStoredGame(game);
        const gameId = getGameIdentity(normalizedGame);

        if (gameId) {
          gamesById.set(gameId, normalizedGame);
        }
      });
    });

    return Array.from(gamesById.values());
  }

  function saveGame(game) {
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

    localStorage.setItem(getGamesStorageKey(), JSON.stringify(games));
    return savedGame;
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

  function getChartDataForFilter(filterName, games = getSavedGames()) {
    const selectedFilter = normalizeResultName(filterName || "Hot/Cold Zones");
    const buckets = createLocationBuckets();
    const matchingPitches = [];

    getAllPitches(games).forEach((pitch) => {
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
  window.getSavedGames = getSavedGames;
  window.saveGame = saveGame;
  window.getAllAtBats = getAllAtBats;
  window.getAllPitches = getAllPitches;
  window.normalizeResultName = normalizeResultName;
  window.getChartDataForFilter = getChartDataForFilter;
})();
