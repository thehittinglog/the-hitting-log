const storageKey = "hitting-log-games";
const accountsKey = "hitting-log-accounts";
const currentUserKey = "hitting-log-current-user";
const page = document.body.dataset.page;
const protectedPages = new Set(["dashboard", "games", "advanced", "charts", "account"]);
const authPages = new Set(["login", "signup"]);
const outcomeFields = [
  "single",
  "double",
  "triple",
  "home_run",
  "walk",
  "hit_by_pitch",
  "strikeout",
  "sac_bunt",
  "drag_bunt",
  "sac_fly",
  "reached_on_error",
  "fielders_choice",
  "ground_out",
  "line_out",
  "fly_out",
  "productive_out",
];
const legacyOutcomeFields = ["sacrifice_fly", "out", "error"];
const productiveOutOutcomeFields = new Set(["sac_fly", "sac_bunt"]);
const outOutcomeFields = new Set([
  "strikeout",
  "sac_bunt",
  "sac_fly",
  "fielders_choice",
  "ground_out",
  "line_out",
  "fly_out",
]);
const pitchLocations = [
  { id: "top-left-out", label: "Top Left", isZone: false },
  { id: "high-left-out", label: "High Left", isZone: false },
  { id: "high-mid-out", label: "High", isZone: false },
  { id: "high-right-out", label: "High Right", isZone: false },
  { id: "top-right-out", label: "Top Right", isZone: false },
  { id: "far-left-high-out", label: "Far Inside High", isZone: false },
  { id: "zone-1", label: "Zone 1", isZone: true },
  { id: "zone-2", label: "Zone 2", isZone: true },
  { id: "zone-3", label: "Zone 3", isZone: true },
  { id: "far-right-high-out", label: "Far Outside High", isZone: false },
  { id: "left-out", label: "Inside", isZone: false },
  { id: "zone-4", label: "Zone 4", isZone: true },
  { id: "zone-5", label: "Zone 5", isZone: true },
  { id: "zone-6", label: "Zone 6", isZone: true },
  { id: "right-out", label: "Outside", isZone: false },
  { id: "far-left-low-out", label: "Far Inside Low", isZone: false },
  { id: "zone-7", label: "Zone 7", isZone: true },
  { id: "zone-8", label: "Zone 8", isZone: true },
  { id: "zone-9", label: "Zone 9", isZone: true },
  { id: "far-right-low-out", label: "Far Outside Low", isZone: false },
  { id: "bottom-left-out", label: "Bottom Left", isZone: false },
  { id: "low-left-out", label: "Low Left", isZone: false },
  { id: "low-mid-out", label: "Low", isZone: false },
  { id: "low-right-out", label: "Low Right", isZone: false },
  { id: "bottom-right-out", label: "Bottom Right", isZone: false },
];
const chartFilterOptions = [
  { id: "hot_cold", label: "Hot/Cold Zones", type: "hotCold" },
  { id: "Called Strike", label: "Called Strike", type: "count" },
  { id: "Swinging Strike", label: "Swinging Strike", type: "count" },
  { id: "Foul Ball", label: "Foul Ball", type: "count" },
  { id: "Left Field Line", label: "Left Field Line", type: "count" },
  { id: "Right Field Line", label: "Right Field Line", type: "count" },
  { id: "Ground Ball", label: "Ground Ball", type: "count" },
  { id: "Line Drive", label: "Line Drive", type: "count" },
  { id: "Fly Ball", label: "Fly Ball", type: "count" },
  { id: "Single", label: "Single", type: "count" },
  { id: "Double", label: "Double", type: "count" },
  { id: "Triple", label: "Triple", type: "count" },
  { id: "Home Run", label: "Home Run", type: "count" },
  { id: "Out", label: "Out", type: "count" },
  { id: "Fielder's Choice", label: "Fielder's Choice", type: "count" },
  { id: "ROE", label: "ROE", type: "count" },
  { id: "Sac Fly", label: "Sac Fly", type: "count" },
  { id: "Sac Bunt", label: "Sac Bunt", type: "count" },
  { id: "Drag Bunt", label: "Drag Bunt", type: "count" },
  { id: "Walk", label: "Walk", type: "count" },
  { id: "Strikeout", label: "Strikeout", type: "count" },
  { id: "HBP", label: "HBP", type: "count" },
];

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function loadAccounts() {
  const savedAccounts = JSON.parse(localStorage.getItem(accountsKey) || "[]");
  return Array.isArray(savedAccounts) ? savedAccounts : [];
}

function saveAccounts(accounts) {
  localStorage.setItem(accountsKey, JSON.stringify(accounts));
}

function getCurrentUser() {
  const savedUser = JSON.parse(localStorage.getItem(currentUserKey) || "null");

  if (!savedUser || typeof savedUser.email !== "string") {
    return null;
  }

  return {
    email: normalizeEmail(savedUser.email),
  };
}

function setCurrentUser(email) {
  localStorage.setItem(
    currentUserKey,
    JSON.stringify({
      email: normalizeEmail(email),
    })
  );
}

function createId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function clearCurrentUser() {
  localStorage.removeItem(currentUserKey);
}

function getGamesStorageKey() {
  const currentUser = getCurrentUser();
  return currentUser ? `${storageKey}-${currentUser.email}` : storageKey;
}

function redirectTo(path) {
  window.location.replace(path);
}

function guardRoute() {
  const currentUser = getCurrentUser();

  if (protectedPages.has(page) && !currentUser) {
    redirectTo("login.html");
    return false;
  }

  if (authPages.has(page) && currentUser) {
    redirectTo("index.html");
    return false;
  }

  return true;
}

function updateAuthUI() {
  const currentUser = getCurrentUser();
  const userEmail = document.getElementById("user-email");
  const logoutButton = document.getElementById("logout-button");

  if (userEmail) {
    userEmail.textContent = currentUser ? currentUser.email : "";
  }

  if (logoutButton) {
    logoutButton.hidden = !currentUser;
    logoutButton.addEventListener("click", () => {
      clearCurrentUser();
      redirectTo("login.html");
    });
  }
}

function normalizePitchType(pitchType) {
  const normalized = String(pitchType || "unknown").trim().toLowerCase().replace(/\s+/g, "_");
  const normalizedPitchType = normalized === "screw" ? "screwball" : normalized;
  const allowedPitchTypes = new Set([
    "fastball",
    "changeup",
    "curve",
    "drop",
    "rise",
    "slider",
    "cutter",
    "screwball",
    "unknown",
  ]);

  return allowedPitchTypes.has(normalizedPitchType) ? normalizedPitchType : "unknown";
}

function normalizePitch(pitch) {
  const location =
    pitch.location && typeof pitch.location === "object"
      ? pitch.location
      : typeof pitch.location === "string"
        ? {
            id: pitch.location,
            label: pitch.location,
          }
      : {
          id: typeof pitch.locationId === "string" ? pitch.locationId : "",
          label: typeof pitch.locationLabel === "string" ? pitch.locationLabel : "",
        };
  const result =
    typeof pitch.result === "string"
      ? pitch.result
      : typeof pitch.pitch_result === "string"
        ? pitch.pitch_result
        : typeof pitch.swing_result === "string"
          ? pitch.swing_result
          : "";
  const pitchType = normalizePitchType(pitch.pitchType || pitch.pitch_type);
  const strikeType = typeof pitch.strikeType === "string" ? pitch.strikeType : "";
  const battedBallOutcome =
    typeof pitch.battedBallOutcome === "string"
      ? normalizeSavedBattedBallOutcome(pitch.battedBallOutcome)
      : typeof pitch.batted_ball_outcome === "string"
        ? normalizeSavedBattedBallOutcome(pitch.batted_ball_outcome)
        : typeof pitch.outcome === "string"
          ? normalizeSavedBattedBallOutcome(pitch.outcome)
          : "";
  const normalizedPitch = {
    location: {
      id: typeof location.id === "string" ? location.id : "",
      label: typeof location.label === "string" ? location.label : "",
      isZone: Boolean(location.isZone),
    },
    locationId: typeof location.id === "string" ? location.id : "",
    locationLabel: typeof location.label === "string" ? location.label : "",
    pitch_location: typeof location.id === "string" ? location.id : "",
    pitchType,
    pitch_type: pitchType,
    result,
  };

  [
    "primaryResult",
    "strikeDetail",
    "battedBallType",
    "batted_ball_type",
    "contact_type",
    "pitch_result",
    "swing_result",
    "hitLocation",
    "hit_location",
    "outcome",
  ].forEach((field) => {
    if (typeof pitch[field] === "string") {
      normalizedPitch[field] = pitch[field];
    }
  });

  [
    "hitLocationX",
    "hitLocationY",
    "hit_location_x",
    "hit_location_y",
  ].forEach((field) => {
    const value = Number(pitch[field]);
    if (Number.isFinite(value)) {
      normalizedPitch[field] = Math.min(1, Math.max(0, value));
    }
  });

  if (Number.isFinite(normalizedPitch.hitLocationX) && !Number.isFinite(normalizedPitch.hit_location_x)) {
    normalizedPitch.hit_location_x = normalizedPitch.hitLocationX;
  } else if (Number.isFinite(normalizedPitch.hit_location_x) && !Number.isFinite(normalizedPitch.hitLocationX)) {
    normalizedPitch.hitLocationX = normalizedPitch.hit_location_x;
  }

  if (Number.isFinite(normalizedPitch.hitLocationY) && !Number.isFinite(normalizedPitch.hit_location_y)) {
    normalizedPitch.hit_location_y = normalizedPitch.hitLocationY;
  } else if (Number.isFinite(normalizedPitch.hit_location_y) && !Number.isFinite(normalizedPitch.hitLocationY)) {
    normalizedPitch.hitLocationY = normalizedPitch.hit_location_y;
  }

  if (!normalizedPitch.battedBallType && typeof pitch.contact_type === "string" && pitch.contact_type) {
    normalizedPitch.battedBallType = pitch.contact_type;
  } else if (!normalizedPitch.battedBallType && typeof pitch.batted_ball_type === "string" && pitch.batted_ball_type) {
    normalizedPitch.battedBallType = pitch.batted_ball_type;
  }

  if (typeof pitch.hitLocation === "string" && pitch.hitLocation) {
    normalizedPitch.hitLocation = pitch.hitLocation;
    normalizedPitch.hit_location = pitch.hitLocation;
  } else if (typeof pitch.hit_location === "string" && pitch.hit_location) {
    normalizedPitch.hitLocation = pitch.hit_location;
    normalizedPitch.hit_location = pitch.hit_location;
  }

  if (strikeType) {
    normalizedPitch.strikeType = strikeType;
    normalizedPitch.strikeDetail = strikeType;
    normalizedPitch.result = strikeType;
  }

  if (battedBallOutcome) {
    normalizedPitch.battedBallOutcome = battedBallOutcome;
    normalizedPitch.outcome = battedBallOutcome;
  }

  return normalizedPitch;
}

function normalizeSavedBattedBallOutcome(outcome) {
  const outcomeMap = {
    single: "Single",
    double: "Double",
    triple: "Triple",
    home_run: "Home Run",
    out: "Out",
    fielders_choice: "Fielder's Choice",
    reached_on_error: "ROE",
    sac_fly: "Sac Fly",
    sac_bunt: "Sac Bunt",
    drag_bunt: "Drag Bunt",
    left_field_line: "Left Field Line",
    right_field_line: "Right Field Line",
  };

  return outcomeMap[outcome] || outcome;
}

function createStatsBucket() {
  return {
    single: 0,
    double: 0,
    triple: 0,
    home_run: 0,
    walk: 0,
    hit_by_pitch: 0,
    strikeout: 0,
    sac_bunt: 0,
    drag_bunt: 0,
    sac_fly: 0,
    reached_on_error: 0,
    fielders_choice: 0,
    ground_out: 0,
    line_out: 0,
    fly_out: 0,
    productive_out: 0,
  };
}

function normalizeLegacyOutcome(outcome, battedBallType) {
  if (outcome === "Out") {
    outcome = "out";
  }

  const legacyOutcomeMap = {
    sacrifice_fly: "sac_fly",
    error: "reached_on_error",
    hit_by_pitch: "hit_by_pitch",
    Single: "single",
    Double: "double",
    Triple: "triple",
    "Home Run": "home_run",
    "Fielder's Choice": "fielders_choice",
    ROE: "reached_on_error",
    "Sac Fly": "sac_fly",
    "Sac Bunt": "sac_bunt",
    "Drag Bunt": "drag_bunt",
    "Left Field Line": "left_field_line",
    "Right Field Line": "right_field_line",
  };

  if (legacyOutcomeMap[outcome]) {
    return legacyOutcomeMap[outcome];
  }

  if (outcome === "out") {
    if (battedBallType === "line_drive") {
      return "line_out";
    }

    if (battedBallType === "fly_ball" || battedBallType === "popup") {
      return "fly_out";
    }

    return "ground_out";
  }

  return outcome;
}

function addOutcomeToStats(stats, outcome) {
  if (outcome && Object.prototype.hasOwnProperty.call(stats, outcome)) {
    stats[outcome] += 1;
  }
}

function isOutOutcome(outcome) {
  return outOutcomeFields.has(outcome);
}

function isAutomaticallyProductiveOut(outcome) {
  return productiveOutOutcomeFields.has(outcome);
}

function createCalculatedStats(stats) {
  const hits = stats.single + stats.double + stats.triple + stats.home_run;
  const atBats =
    stats.single +
    stats.double +
    stats.triple +
    stats.home_run +
    stats.strikeout +
    stats.reached_on_error +
    stats.fielders_choice +
    stats.ground_out +
    stats.line_out +
    stats.fly_out;
  const totalBases =
    stats.single +
    (stats.double * 2) +
    (stats.triple * 3) +
    (stats.home_run * 4);
  const totalOuts =
    stats.strikeout +
    stats.sac_bunt +
    stats.sac_fly +
    stats.fielders_choice +
    stats.ground_out +
    stats.line_out +
    stats.fly_out;
  const productiveOuts = stats.productive_out + stats.sac_bunt + stats.sac_fly;
  const plateAppearances =
    atBats + stats.walk + stats.hit_by_pitch + stats.sac_bunt + stats.drag_bunt + stats.sac_fly;

  // BA = H / AB
  const battingAverage = atBats === 0 ? 0 : hits / atBats;

  // OBP = (H + BB + HBP) / (AB + BB + HBP + SF)
  const onBasePercentage =
    plateAppearances === 0 ? 0 : (hits + stats.walk + stats.hit_by_pitch) / plateAppearances;

  // SLG = TB / AB
  // TB = 1B + (2 x 2B) + (3 x 3B) + (4 x HR)
  const sluggingPercentage = atBats === 0 ? 0 : totalBases / atBats;

  // OPS = OBP + SLG
  const ops = onBasePercentage + sluggingPercentage;

  return {
    ...stats,
    hits,
    atBats,
    totalBases,
    totalOuts,
    productiveOuts,
    productiveOutPercent: totalOuts === 0 ? 0 : productiveOuts / totalOuts,
    plateAppearances,
    battingAverage,
    onBasePercentage,
    sluggingPercentage,
    ops,
  };
}

function calculateStatsFromAtBats(atBats) {
  const stats = createStatsBucket();

  atBats.forEach((atBat) => {
    addOutcomeToStats(stats, atBat.outcome);

    if (atBat.productiveOut === true && !isAutomaticallyProductiveOut(atBat.outcome)) {
      stats.productive_out += 1;
    }
  });

  return createCalculatedStats(stats);
}

function normalizeAtBat(atBat) {
  const pitches = Array.isArray(atBat.pitches) ? atBat.pitches.map(normalizePitch) : [];
  const rawPitcherVelocity = atBat.pitcherVelocity;
  const lastPitch = pitches.length ? pitches[pitches.length - 1] : null;
  const legacyBattedBallType =
    typeof atBat.battedBallType === "string"
      ? atBat.battedBallType
      : lastPitch && typeof lastPitch.battedBallType === "string"
        ? lastPitch.battedBallType
        : "";
  const rawOutcome =
    typeof atBat.finalOutcome === "string"
      ? atBat.finalOutcome
      : typeof atBat.outcome === "string"
        ? atBat.outcome
        : "";
  const outcome = normalizeLegacyOutcome(
    rawOutcome,
    legacyBattedBallType
  );

  if (
    rawOutcome &&
    lastPitch &&
    lastPitch.result === "batted_ball" &&
    !lastPitch.battedBallOutcome
  ) {
    lastPitch.battedBallOutcome = normalizeSavedBattedBallOutcome(rawOutcome);
    lastPitch.outcome = lastPitch.battedBallOutcome;
  }
  const calculatedCount = pitches.reduce(
    (count, pitch) => {
      if (pitch.result === "ball") {
        count.balls += 1;
      }

      if (
        pitch.result === "called_strike" ||
        pitch.result === "swinging_strike"
      ) {
        count.strikes += 1;
      }

      if (pitch.result === "foul_ball" && count.strikes < 2) {
        count.strikes += 1;
      }

      return count;
    },
    { balls: 0, strikes: 0 }
  );

  return {
    id: typeof atBat.id === "string" ? atBat.id : createId("at-bat"),
    pitcherHandedness: typeof atBat.pitcherHandedness === "string" ? atBat.pitcherHandedness : "",
    pitcherVelocity:
      typeof atBat.pitcherVelocity === "number"
        ? atBat.pitcherVelocity
        : rawPitcherVelocity !== "" && rawPitcherVelocity !== null && Number.isFinite(Number(rawPitcherVelocity))
          ? Number(rawPitcherVelocity)
          : "",
    hardHitBall: typeof atBat.hardHitBall === "boolean" ? atBat.hardHitBall : null,
    productiveOut: atBat.productiveOut === true || isAutomaticallyProductiveOut(outcome),
    pitches,
    finalOutcome: rawOutcome,
    outcome,
    balls: typeof atBat.balls === "number" ? atBat.balls : Math.min(calculatedCount.balls, 4),
    strikes:
      typeof atBat.strikes === "number" ? atBat.strikes : Math.min(calculatedCount.strikes, 3),
  };
}

function normalizeGame(game) {
  const tournamentGameNumber = Number(game.tournamentGameNumber);
  const normalizedGame = {
    id: typeof game.id === "string" ? game.id : createId("game"),
    date: game.date || "",
    opponent: game.opponent || "",
    tournamentId: typeof game.tournamentId === "string" && game.tournamentId ? game.tournamentId : null,
    tournamentName: typeof game.tournamentName === "string" && game.tournamentName ? game.tournamentName : null,
    tournamentGameNumber: Number.isFinite(tournamentGameNumber) && tournamentGameNumber > 0 ? tournamentGameNumber : null,
  };

  if (Array.isArray(game.atBats)) {
    const atBats = game.atBats.map(normalizeAtBat);
    const calculatedStats = calculateStatsFromAtBats(atBats);
    const { atBats: atBatCount, ...displayStats } = calculatedStats;

    return {
      ...normalizedGame,
      atBats,
      stats: calculatedStats,
      ...displayStats,
      atBatCount,
    };
  }

  const hasOutcomeFields = outcomeFields.some((field) => field in game);
  const hasLegacyOutcomeFields = legacyOutcomeFields.some((field) => field in game);

  if (hasOutcomeFields || hasLegacyOutcomeFields) {
    const stats = createStatsBucket();

    outcomeFields.forEach((field) => {
      stats[field] = Math.max(0, Number(game[field]) || 0);
    });

    // Map older aggregate saves into the newer outcome names.
    stats.sac_fly += Math.max(0, Number(game.sacrifice_fly) || 0);
    stats.reached_on_error += Math.max(0, Number(game.error) || 0);
    stats.ground_out += Math.max(0, Number(game.out) || 0);

    const calculatedStats = createCalculatedStats(stats);
    const { atBats: atBatCount, ...displayStats } = calculatedStats;

    return {
      ...normalizedGame,
      atBats: [],
      stats: calculatedStats,
      ...displayStats,
      atBatCount,
    };
  }

  const legacyAtBats = Math.max(0, Number(game.atBats) || 0);
  const legacyHits = Math.max(0, Math.min(legacyAtBats, Number(game.hits) || 0));
  const stats = createStatsBucket();

  stats.single = legacyHits;
  stats.ground_out = Math.max(0, legacyAtBats - legacyHits);

  const calculatedStats = createCalculatedStats(stats);
  const { atBats: atBatCount, ...displayStats } = calculatedStats;

  return {
    ...normalizedGame,
    atBats: [],
    stats: calculatedStats,
    ...displayStats,
    atBatCount,
  };
}

window.normalizeGame = normalizeGame;

function loadGames() {
  if (typeof window.getSavedGames === "function") {
    return window.getSavedGames().map(normalizeGame);
  }

  const savedGames = JSON.parse(localStorage.getItem(getGamesStorageKey()) || "[]");

  if (!Array.isArray(savedGames)) {
    return [];
  }

  return savedGames.map(normalizeGame);
}

function loadRawGames() {
  const storageKeys = Object.keys(localStorage).filter((key) => {
    return key === storageKey || key.startsWith(`${storageKey}-`);
  });
  const savedGames = storageKeys.flatMap((key) => {
    const gamesForKey = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(gamesForKey) ? gamesForKey : [];
  });

  if (!Array.isArray(savedGames)) {
    return [];
  }

  const normalizedGames = savedGames.map(normalizeGame);
  const uniqueGames = Array.from(
    normalizedGames
      .reduce((gamesById, game) => {
        gamesById.set(game.id || `${game.date}-${game.opponent}`, game);
        return gamesById;
      }, new Map())
      .values()
  );

  localStorage.setItem(getGamesStorageKey(), JSON.stringify(uniqueGames));
  return uniqueGames;
}

function upsertSavedGame(games, game) {
  const savedGame = normalizeGame(game);
  const existingIndex = games.findIndex((saved) => saved.id === savedGame.id);

  if (existingIndex >= 0) {
    games[existingIndex] = savedGame;
  } else {
    games.push(savedGame);
  }

  if (typeof window.saveGame === "function") {
    window.saveGame(savedGame);
  } else {
    saveGames(games);
  }

  return savedGame;
}

function saveGames(games) {
  const normalizedGames = games.map(normalizeGame);
  localStorage.setItem(getGamesStorageKey(), JSON.stringify(normalizedGames));
}

function sortGamesByDateDesc(games) {
  return games.slice().sort((a, b) => b.date.localeCompare(a.date));
}

function sortGamesByDateAsc(games) {
  return games.slice().sort((a, b) => a.date.localeCompare(b.date));
}

function formatRate(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return ".000";
  }

  const formattedValue = value.toFixed(3);
  return formattedValue.startsWith("0") ? formattedValue.slice(1) : formattedValue;
}

function formatPerGame(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function formatPercent(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0.0%";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function getGameStats(game) {
  return normalizeGame(game);
}

function getGameAtBatCount(gameStats) {
  if (gameStats && gameStats.stats && typeof gameStats.stats.atBats === "number") {
    return gameStats.stats.atBats;
  }

  if (gameStats && typeof gameStats.atBatCount === "number") {
    return gameStats.atBatCount;
  }

  if (gameStats && Array.isArray(gameStats.atBats)) {
    return gameStats.atBats.length;
  }

  return Math.max(0, Number(gameStats?.atBats) || 0);
}

function getTotals(games) {
  return games.reduce(
    (summary, game) => {
      const gameStats = getGameStats(game);

      outcomeFields.forEach((field) => {
        summary[field] += gameStats[field];
      });

      summary.atBats += getGameAtBatCount(gameStats);
      summary.hits += gameStats.hits;
      summary.totalBases += gameStats.totalBases;
      summary.plateAppearances += gameStats.plateAppearances;
      return summary;
    },
    {
      single: 0,
      double: 0,
      triple: 0,
      home_run: 0,
      walk: 0,
      hit_by_pitch: 0,
      strikeout: 0,
      sac_bunt: 0,
      drag_bunt: 0,
      sac_fly: 0,
      reached_on_error: 0,
      fielders_choice: 0,
      ground_out: 0,
      line_out: 0,
      fly_out: 0,
      productive_out: 0,
      atBats: 0,
      hits: 0,
      totalBases: 0,
      plateAppearances: 0,
    }
  );
}

function getRateStats(games) {
  return createCalculatedStats(getTotals(games));
}

function updateSummaryCards(games) {
  const totals = getRateStats(games);
  const summaryMap = {
    "games-count": games.length,
    "plate-appearances-total": totals.plateAppearances,
    "at-bats-total": totals.atBats,
    "hits-total": totals.hits,
    "walks-total": totals.walk,
    "batting-average": formatRate(totals.battingAverage),
    "on-base-percentage": formatRate(totals.onBasePercentage),
    "slugging-percentage": formatRate(totals.sluggingPercentage),
    "ops-total": formatRate(totals.ops),
  };

  Object.entries(summaryMap).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = String(value);
    }
  });
}

function appendCells(row, values) {
  values.forEach((value) => {
    const cell = document.createElement("td");
    cell.textContent = String(value);
    row.appendChild(cell);
  });
}

function appendGameCells(row, gameStats, options = {}) {
  const opponentLabel = options.opponentLabel || gameStats.opponent;
  const values = options.compact
    ? [gameStats.date, opponentLabel, getGameAtBatCount(gameStats), gameStats.hits, formatRate(gameStats.ops)]
    : [
        gameStats.date,
        opponentLabel,
        getGameAtBatCount(gameStats),
        gameStats.hits,
        formatRate(gameStats.battingAverage),
        formatRate(gameStats.ops),
      ];

  appendCells(row, values);

  if (options.withAction) {
    const actionCell = document.createElement("td");
    const actionButton = document.createElement("button");

    actionButton.type = "button";
    actionButton.className = "table-action-button";
    actionButton.textContent = "View / Edit Game";
    actionButton.dataset.gameId = gameStats.id;
    actionCell.appendChild(actionButton);
    row.appendChild(actionCell);
  }
}

function hasTournamentGame(game) {
  return Boolean(game.tournamentId || game.tournamentName);
}

function getTournamentKey(game) {
  return game.tournamentId || game.tournamentName || "";
}

function appendGroupHeader(tableBody, label, columnCount) {
  const row = document.createElement("tr");
  row.className = "game-group-row";
  const cell = document.createElement("td");
  cell.colSpan = columnCount;
  cell.textContent = label;
  row.appendChild(cell);
  tableBody.appendChild(row);
}

function sortTournamentGames(games) {
  return games.slice().sort((a, b) => {
    const gameNumberA = Number(a.tournamentGameNumber) || 0;
    const gameNumberB = Number(b.tournamentGameNumber) || 0;

    if (gameNumberA !== gameNumberB) {
      return gameNumberA - gameNumberB;
    }

    return a.date.localeCompare(b.date);
  });
}

function renderGroupedGamesTable(tableBody, games, options = {}) {
  const tournamentGroups = new Map();
  const singleGames = [];
  const columnCount = options.withAction ? 7 : 6;

  games.forEach((game) => {
    if (!hasTournamentGame(game)) {
      singleGames.push(game);
      return;
    }

    const tournamentKey = getTournamentKey(game);
    if (!tournamentGroups.has(tournamentKey)) {
      tournamentGroups.set(tournamentKey, {
        name: game.tournamentName || "Tournament",
        latestDate: game.date || "",
        games: [],
      });
    }

    const group = tournamentGroups.get(tournamentKey);
    group.latestDate = group.latestDate > game.date ? group.latestDate : game.date;
    group.games.push(game);
  });

  Array.from(tournamentGroups.values())
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate))
    .forEach((group) => {
      appendGroupHeader(tableBody, `Tournament: ${group.name}`, columnCount);
      sortTournamentGames(group.games).forEach((game, index) => {
        const gameStats = getGameStats(game);
        const row = document.createElement("tr");
        const gameNumber = gameStats.tournamentGameNumber || index + 1;

        if (options.withAction) {
          row.className = "clickable-game-row";
          row.tabIndex = 0;
          row.dataset.gameId = gameStats.id;
        }

        appendGameCells(row, gameStats, {
          opponentLabel: `Game ${gameNumber} vs ${gameStats.opponent}`,
          withAction: options.withAction,
        });
        tableBody.appendChild(row);
      });
    });

  if (singleGames.length) {
    appendGroupHeader(tableBody, "Single Games", columnCount);
    sortGamesByDateDesc(singleGames).forEach((game) => {
      const gameStats = getGameStats(game);
      const row = document.createElement("tr");

      if (options.withAction) {
        row.className = "clickable-game-row";
        row.tabIndex = 0;
        row.dataset.gameId = gameStats.id;
      }

      appendGameCells(row, gameStats, {
        opponentLabel: `Game vs ${gameStats.opponent}`,
        withAction: options.withAction,
      });
      tableBody.appendChild(row);
    });
  }
}

function renderGamesTable(games, tbodyId, emptyId, limit) {
  const tableBody = document.getElementById(tbodyId);
  const emptyState = document.getElementById(emptyId);

  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = "";

  const sortedGames = sortGamesByDateDesc(games);
  const visibleGames = typeof limit === "number" ? sortedGames.slice(0, limit) : sortedGames;

  if ((tbodyId === "games-table-body" || tbodyId === "review-games-table-body") && typeof limit !== "number") {
    renderGroupedGamesTable(tableBody, visibleGames, { withAction: tbodyId === "review-games-table-body" });
  } else {
    visibleGames.forEach((game) => {
      const gameStats = getGameStats(game);
      const row = document.createElement("tr");
      appendGameCells(row, gameStats, { compact: tbodyId === "recent-games-body" });
      tableBody.appendChild(row);
    });
  }

  if (emptyState) {
    emptyState.hidden = visibleGames.length > 0;
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value);
  }
}

function initDashboard(games) {
  updateSummaryCards(games);
  renderGamesTable(games, "recent-games-body", "recent-games-empty", 5);

  const sortedGames = sortGamesByDateDesc(games);
  const bestGame = sortedGames.reduce((best, game) => {
    const gameStats = getGameStats(game);

    if (!best || gameStats.hits > best.hits) {
      return gameStats;
    }

    return best;
  }, null);

  const lastFive = sortedGames.slice(0, 5);
  const lastFiveRates = getRateStats(lastFive);

  setText(
    "best-game",
    bestGame ? `${bestGame.hits} H vs ${bestGame.opponent}` : "No games yet"
  );
  setText("last-opponent", sortedGames[0] ? sortedGames[0].opponent : "None");
  setText("last-five-average", formatRate(lastFiveRates.battingAverage));
  setText("last-five-ops", formatRate(lastFiveRates.ops));
}

function createEmptyAtBat() {
  return {
    pitches: [],
    outcome: "",
    balls: 0,
    strikes: 0,
  };
}

function createEmptyGameDraft(date, opponent) {
  return {
    date,
    opponent,
    atBats: [],
  };
}

function getPitchResultLabel(result) {
  const labelMap = {
    ball: "Ball",
    strike: "Strike",
    called_strike: "Called Strike",
    swinging_strike: "Swinging Strike",
    foul_ball: "Foul Ball",
    hit_by_pitch: "HBP",
    batted_ball: "Batted Ball",
  };

  return labelMap[result] || result;
}

function getPitchTypeLabel(pitchType) {
  const labelMap = {
    fastball: "Fastball",
    changeup: "Changeup",
    curve: "Curve",
    drop: "Drop",
    rise: "Rise",
    slider: "Slider",
    cutter: "Cutter",
    screwball: "Screwball",
    unknown: "Unknown",
  };

  return labelMap[normalizePitchType(pitchType)] || "Unknown";
}

function getBattedBallTypeLabel(type) {
  const labelMap = {
    ground_ball: "Ground Ball",
    line_drive: "Line Drive",
    fly_ball: "Fly Ball",
  };

  return labelMap[type] || type;
}

function getHitLocationLabel(location) {
  const labelMap = {
    P: "P",
    C: "C",
    "1B": "1B",
    "2B": "2B",
    "3B": "3B",
    SS: "SS",
    LF: "LF",
    LCF: "LCF",
    CF: "CF",
    RCF: "RCF",
    RF: "RF",
  };

  return labelMap[location] || location;
}

function getFoulDirectionLabel(direction) {
  const labelMap = {
    left_field_line: "Left Field Line",
    right_field_line: "Right Field Line",
  };

  return labelMap[direction] || direction;
}

function getOutcomeLabel(outcome) {
  const labelMap = {
    single: "Single",
    double: "Double",
    triple: "Triple",
    home_run: "Home Run",
    walk: "Walk",
    hit_by_pitch: "Hit By Pitch",
    strikeout: "Strikeout",
    sac_bunt: "Sac Bunt",
    drag_bunt: "Drag Bunt",
    sac_fly: "Sac Fly",
    reached_on_error: "Reached On Error",
    fielders_choice: "Fielder's Choice",
    out: "Out",
    ground_out: "Ground Out",
    line_out: "Line Out",
    fly_out: "Fly Out",
    left_field_line: "Left Field Line",
    right_field_line: "Right Field Line",
  };

  return labelMap[outcome] || outcome;
}

function renderStrikeZoneLayout(
  zoneElement,
  {
    interactive = false,
    onSelectLocation,
    selectedLocationId = "",
    getCellStyle,
    getCountText,
  } = {}
) {
  zoneElement.innerHTML = "";

  pitchLocations.forEach((location) => {
    const cell = document.createElement(interactive ? "button" : "div");
    const label = document.createElement("span");
    const count = document.createElement("span");

    if (interactive) {
      cell.type = "button";
    }

    cell.className = `zone-cell ${location.isZone ? "is-zone" : "is-outside"}`;
    cell.setAttribute("aria-label", location.label);
    cell.dataset.locationId = location.id;

    if (location.id === selectedLocationId) {
      cell.classList.add("is-selected");
    }

    if (typeof getCellStyle === "function") {
      cell.style.cssText = getCellStyle(location) || "";
    }

    if (interactive && typeof onSelectLocation === "function") {
      cell.addEventListener("click", () => {
        onSelectLocation(location);
      });
    }

    label.className = "zone-label";
    label.textContent = location.isZone ? location.label.replace("Zone ", "") : "";

    count.className = "zone-count";
    count.textContent = typeof getCountText === "function" ? getCountText(location) : "";

    cell.appendChild(label);
    cell.appendChild(count);
    zoneElement.appendChild(cell);
  });
}

function renderPitchSequence(sequenceElement, atBat) {
  sequenceElement.innerHTML = "";

  if (!atBat || atBat.pitches.length === 0) {
    const emptyItem = document.createElement("p");
    emptyItem.className = "empty-state compact-empty";
    emptyItem.textContent = "No pitches logged yet.";
    sequenceElement.appendChild(emptyItem);
    return;
  }

  atBat.pitches.forEach((pitch, index) => {
    const item = document.createElement("article");
    item.className = "pitch-chip";
    const details = [];
    const locationLabel =
      pitch.locationLabel ||
      (pitch.location && typeof pitch.location.label === "string" ? pitch.location.label : "");

    details.push(getPitchTypeLabel(pitch.pitchType));

    if (pitch.strikeType || pitch.strikeDetail) {
      details.push(getPitchResultLabel(pitch.strikeType || pitch.strikeDetail));
    }

    if (pitch.foulDirection) {
      details.push(getFoulDirectionLabel(pitch.foulDirection));
    }

    if (pitch.battedBallType) {
      details.push(getBattedBallTypeLabel(pitch.battedBallType));
    }

    if (pitch.hitLocation || pitch.hit_location) {
      details.push(getHitLocationLabel(pitch.hitLocation || pitch.hit_location));
    }

    if (pitch.battedBallOutcome || pitch.outcome) {
      details.push(getOutcomeLabel(pitch.battedBallOutcome || pitch.outcome));
    }

    item.textContent =
      `Pitch ${index + 1}: ${locationLabel} - ${getPitchResultLabel(pitch.primaryResult || pitch.result)}` +
      (details.length ? ` (${details.join(", ")})` : "");
    sequenceElement.appendChild(item);
  });
}

function renderAtBatList(listElement, atBats) {
  listElement.innerHTML = "";

  if (atBats.length === 0) {
    const emptyItem = document.createElement("p");
    emptyItem.className = "empty-state compact-empty";
    emptyItem.textContent = "No at-bats saved in this game yet.";
    listElement.appendChild(emptyItem);
    return;
  }

  atBats.forEach((atBat, index) => {
    const item = document.createElement("article");
    item.className = "saved-at-bat";

    const title = document.createElement("strong");
    title.textContent = `At-Bat ${index + 1}: ${getOutcomeLabel(atBat.outcome)}`;

    const meta = document.createElement("p");
    meta.className = "section-copy";
    meta.textContent = `Final count: ${atBat.balls}-${atBat.strikes} | ${atBat.pitches.length} pitches`;

    const sequence = document.createElement("p");
    sequence.className = "saved-at-bat-sequence";
    sequence.textContent = atBat.pitches
      .map((pitch, pitchIndex) => {
        const details = [];
        const locationLabel =
          pitch.locationLabel ||
          (pitch.location && typeof pitch.location.label === "string" ? pitch.location.label : "");

        details.push(getPitchTypeLabel(pitch.pitchType));

        if (pitch.strikeType || pitch.strikeDetail) {
          details.push(getPitchResultLabel(pitch.strikeType || pitch.strikeDetail));
        }

        if (pitch.foulDirection) {
          details.push(getFoulDirectionLabel(pitch.foulDirection));
        }

        if (pitch.battedBallType) {
          details.push(getBattedBallTypeLabel(pitch.battedBallType));
        }

        if (pitch.hitLocation || pitch.hit_location) {
          details.push(getHitLocationLabel(pitch.hitLocation || pitch.hit_location));
        }

        if (pitch.battedBallOutcome || pitch.outcome) {
          details.push(getOutcomeLabel(pitch.battedBallOutcome || pitch.outcome));
        }

        return (
          `${pitchIndex + 1}. ${locationLabel} - ${getPitchResultLabel(pitch.primaryResult || pitch.result)}` +
          (details.length ? ` (${details.join(", ")})` : "")
        );
      })
      .join(" | ");

    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(sequence);
    listElement.appendChild(item);
  });
}

function initGamesPage(games) {
  updateSummaryCards(games);
  renderGamesTable(games, "games-table-body", "empty-state");

  const homeView = document.getElementById("games-home-view");
  const reviewListView = document.getElementById("game-review-list-view");
  const reviewGamesButton = document.getElementById("review-games-button");
  const reviewListBackButton = document.getElementById("review-list-back-button");
  const reviewGamesTableBody = document.getElementById("review-games-table-body");
  const reviewView = document.getElementById("game-review-view");
  const reviewTitle = document.getElementById("review-game-title");
  const reviewMeta = document.getElementById("review-game-meta");
  const reviewBackButton = document.getElementById("review-back-button");
  const reviewMessage = document.getElementById("review-message");
  const reviewAtBatList = document.getElementById("review-at-bat-list");
  const gamesTableBody = document.getElementById("games-table-body");
  const choiceView = document.getElementById("game-choice-view");
  const tournamentNameView = document.getElementById("tournament-name-view");
  const newGameView = document.getElementById("new-game-view");
  const addGameButton = document.getElementById("add-game-button");
  const choiceBackButton = document.getElementById("choice-back-button");
  const singleGameButton = document.getElementById("single-game-button");
  const startTournamentButton = document.getElementById("start-tournament-button");
  const tournamentBackButton = document.getElementById("tournament-back-button");
  const tournamentNameForm = document.getElementById("tournament-name-form");
  const tournamentNameInput = document.getElementById("tournament-name");
  const tournamentMessage = document.getElementById("tournament-message");
  const tournamentContext = document.getElementById("tournament-context");
  const tournamentGameActions = document.getElementById("tournament-game-actions");
  const gameCompletionActions = document.getElementById("game-completion-actions");
  const addTournamentGameButton = document.getElementById("add-tournament-game-button");
  const finishTournamentButton = document.getElementById("finish-tournament-button");
  const backButton = document.getElementById("back-to-games-button");
  const newGameForm = document.getElementById("new-game-form");
  const dateInput = document.getElementById("game-date");
  const opponentInput = document.getElementById("game-opponent");
  const formMessage = document.getElementById("form-message");
  const saveGameButton = document.getElementById("save-game-button");
  const addAtBatButton = document.getElementById("add-at-bat-button");
  const finishGameButton = document.getElementById("finish-game-button");
  const atBatList = document.getElementById("at-bat-list");

  if (
    !homeView ||
    !reviewListView ||
    !reviewGamesButton ||
    !reviewListBackButton ||
    !reviewGamesTableBody ||
    !reviewView ||
    !reviewTitle ||
    !reviewMeta ||
    !reviewBackButton ||
    !reviewMessage ||
    !reviewAtBatList ||
    !gamesTableBody ||
    !choiceView ||
    !tournamentNameView ||
    !newGameView ||
    !addGameButton ||
    !choiceBackButton ||
    !singleGameButton ||
    !startTournamentButton ||
    !tournamentBackButton ||
    !tournamentNameForm ||
    !tournamentNameInput ||
    !tournamentMessage ||
    !tournamentContext ||
    !tournamentGameActions ||
    !gameCompletionActions ||
    !addTournamentGameButton ||
    !finishTournamentButton ||
    !backButton ||
    !newGameForm ||
    !dateInput ||
    !opponentInput ||
    !formMessage ||
    !saveGameButton ||
    !addAtBatButton ||
    !finishGameButton ||
    !atBatList
  ) {
    return;
  }

  const state = {
    draftGame: null,
    activeAtBat: null,
    activePitch: null,
    activeTournament: null,
    reviewGameId: "",
    editingAtBatIndex: null,
    editingAtBatDraft: null,
    pendingProductiveOutOutcome: "",
    step: "at_bat_details",
  };

  const pitcherHandednessOptions = [
    { label: "Right-handed", value: "Right-handed" },
    { label: "Left-handed", value: "Left-handed" },
  ];
  const hardHitBallOptions = [
    { label: "Yes", value: true },
    { label: "No", value: false },
  ];
  const productiveOutOptions = [
    { label: "Yes", value: true },
    { label: "No", value: false },
  ];
  const pitchResultOptions = [
    { label: "Ball", value: "ball" },
    { label: "Strike", value: "strike" },
    { label: "Foul Ball", value: "foul_ball" },
    { label: "Batted Ball", value: "batted_ball" },
    { label: "HBP", value: "hit_by_pitch" },
  ];
  const pitchTypeOptions = [
    { label: "Fastball", value: "fastball" },
    { label: "Changeup", value: "changeup" },
    { label: "Curve", value: "curve" },
    { label: "Drop", value: "drop" },
    { label: "Rise", value: "rise" },
    { label: "Slider", value: "slider" },
    { label: "Cutter", value: "cutter" },
    { label: "Screwball", value: "screwball" },
    { label: "Unknown", value: "unknown" },
  ];
  const strikeOptions = [
    { label: "Called Strike", value: "called_strike" },
    { label: "Swinging Strike", value: "swinging_strike" },
  ];
  const battedBallTypeOptions = [
    { label: "Ground Ball", value: "ground_ball" },
    { label: "Line Drive", value: "line_drive" },
    { label: "Fly Ball", value: "fly_ball" },
  ];
  const hitLocationOptions = [
    { label: "P", value: "P" },
    { label: "C", value: "C" },
    { label: "1B", value: "1B" },
    { label: "2B", value: "2B" },
    { label: "3B", value: "3B" },
    { label: "SS", value: "SS" },
    { label: "LF", value: "LF" },
    { label: "CF", value: "CF" },
    { label: "RF", value: "RF" },
  ];
  const battedBallOutcomeOptions = [
    { label: "Single", value: "Single" },
    { label: "Double", value: "Double" },
    { label: "Triple", value: "Triple" },
    { label: "Home Run", value: "Home Run" },
    { label: "Out", value: "Out" },
    { label: "Fielder's Choice", value: "Fielder's Choice" },
    { label: "ROE", value: "ROE" },
    { label: "Sac Fly", value: "Sac Fly" },
    { label: "Sac Bunt", value: "Sac Bunt" },
    { label: "Drag Bunt", value: "Drag Bunt" },
  ];
  const editOutcomeOptions = [
    ...battedBallOutcomeOptions,
    { label: "Walk", value: "walk" },
    { label: "HBP", value: "hit_by_pitch" },
    { label: "Strikeout", value: "strikeout" },
  ];
  const editBattedBallTypeOptions = [
    { label: "None", value: "" },
    ...battedBallTypeOptions,
  ];
  const foulDirectionOptions = [
    { label: "Left Field Line", value: "Left Field Line" },
    { label: "Right Field Line", value: "Right Field Line" },
  ];

  function getDefaultDate() {
    return new Date().toISOString().split("T")[0];
  }

  function getNextTournamentGameNumber(tournamentId) {
    const tournamentGames = games.filter((game) => game.tournamentId === tournamentId);
    const highestGameNumber = tournamentGames.reduce((highest, game) => {
      return Math.max(highest, Number(game.tournamentGameNumber) || 0);
    }, 0);

    return highestGameNumber + 1;
  }

  function createTournament(name) {
    return {
      id: createId("tournament"),
      name,
    };
  }

  function createDraftGame() {
    const tournament = state.activeTournament;
    return {
      id: createId("game"),
      date: dateInput.value || getDefaultDate(),
      opponent: opponentInput.value.trim(),
      atBats: [],
      tournamentId: tournament ? tournament.id : null,
      tournamentName: tournament ? tournament.name : null,
      tournamentGameNumber: tournament ? getNextTournamentGameNumber(tournament.id) : null,
    };
  }

  function createDraftAtBat() {
    return {
      id: createId("at-bat"),
      pitcherHandedness: "Right-handed",
      pitcherVelocity: "",
      hardHitBall: null,
      productiveOut: false,
      pitches: [],
      finalOutcome: "",
    };
  }

  function setMessage(text, success = false) {
    formMessage.textContent = text;
    formMessage.classList.toggle("is-success", success);
  }

  function showHomeView() {
    homeView.hidden = false;
    reviewListView.hidden = true;
    reviewView.hidden = true;
    choiceView.hidden = true;
    tournamentNameView.hidden = true;
    newGameView.hidden = true;
    state.reviewGameId = "";
    state.editingAtBatIndex = null;
    state.editingAtBatDraft = null;
    reviewMessage.textContent = "";
    updateSummaryCards(games);
    renderGamesTable(games, "games-table-body", "empty-state");
  }

  function showReviewListView() {
    homeView.hidden = true;
    reviewListView.hidden = false;
    reviewView.hidden = true;
    choiceView.hidden = true;
    tournamentNameView.hidden = true;
    newGameView.hidden = true;
    state.reviewGameId = "";
    state.editingAtBatIndex = null;
    state.editingAtBatDraft = null;
    reviewMessage.textContent = "";
    reviewMessage.classList.remove("is-success");
    renderGamesTable(games, "review-games-table-body", "review-games-empty");
  }

  function showChoiceView() {
    homeView.hidden = true;
    reviewListView.hidden = true;
    reviewView.hidden = true;
    choiceView.hidden = false;
    tournamentNameView.hidden = true;
    newGameView.hidden = true;
  }

  function showTournamentNameView() {
    homeView.hidden = true;
    reviewListView.hidden = true;
    reviewView.hidden = true;
    choiceView.hidden = true;
    tournamentNameView.hidden = false;
    newGameView.hidden = true;
    tournamentNameInput.value = "";
    tournamentMessage.textContent = "";
    tournamentNameInput.focus();
  }

  function updateGameCompletionActions() {
    const hasSavedAtBats = Boolean(state.draftGame && state.draftGame.atBats.length > 0);
    const isTournamentGame = Boolean(state.activeTournament);

    gameCompletionActions.hidden = !hasSavedAtBats;
    gameCompletionActions.style.display = hasSavedAtBats ? "" : "none";
    saveGameButton.hidden = !hasSavedAtBats;
    saveGameButton.style.display = hasSavedAtBats ? "" : "none";
    finishGameButton.hidden = !hasSavedAtBats || isTournamentGame;
    finishGameButton.style.display = hasSavedAtBats && !isTournamentGame ? "" : "none";
    tournamentGameActions.hidden = !hasSavedAtBats || !isTournamentGame;
    tournamentGameActions.style.display = hasSavedAtBats && isTournamentGame ? "" : "none";
  }

  function updateTournamentContext() {
    const tournament = state.activeTournament;
    tournamentContext.hidden = !tournament;

    if (tournament) {
      const gameNumber = state.draftGame?.tournamentGameNumber || getNextTournamentGameNumber(tournament.id);
      tournamentContext.textContent = tournament.name + " - Game " + gameNumber;
    } else {
      tournamentContext.textContent = "";
    }

    updateGameCompletionActions();
  }

  function showNewGameView(tournament = null) {
    state.activeTournament = tournament;
    homeView.hidden = true;
    reviewListView.hidden = true;
    reviewView.hidden = true;
    choiceView.hidden = true;
    tournamentNameView.hidden = true;
    newGameView.hidden = false;
    dateInput.value = getDefaultDate();
    opponentInput.value = "";
    state.draftGame = createDraftGame();
    state.activeAtBat = null;
    state.activePitch = null;
    state.pendingProductiveOutOutcome = "";
    state.step = "at_bat_details";
    setMessage("", false);
    updateTournamentContext();
    renderAtBats();
  }

  function syncDraftFields() {
    if (!state.draftGame) {
      state.draftGame = createDraftGame();
    }

    state.draftGame.date = dateInput.value;
    state.draftGame.opponent = opponentInput.value.trim();

    if (state.activeTournament) {
      state.draftGame.tournamentId = state.activeTournament.id;
      state.draftGame.tournamentName = state.activeTournament.name;
      state.draftGame.tournamentGameNumber = state.draftGame.tournamentGameNumber || getNextTournamentGameNumber(state.activeTournament.id);
    } else {
      state.draftGame.tournamentId = null;
      state.draftGame.tournamentName = null;
      state.draftGame.tournamentGameNumber = null;
    }
  }

  function createPitch(location, result = "") {
    return {
      location: {
        id: location.id,
        label: location.label,
        isZone: location.isZone,
      },
      locationId: location.id,
      locationLabel: location.label,
      pitch_location: location.id,
      pitchType: "unknown",
      pitch_type: "unknown",
      result,
    };
  }

  function createButton(option, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.addEventListener("click", () => onClick(option.value));
    return button;
  }

  function renderOptionGroup(titleText, options, onClick) {
    const wrap = document.createElement("div");
    wrap.className = "result-stack";

    const title = document.createElement("h4");
    title.textContent = titleText;
    wrap.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "choice-grid";
    options.forEach((option) => {
      grid.appendChild(createButton(option, onClick));
    });

    wrap.appendChild(grid);
    return wrap;
  }

  function renderHitLocationSelector() {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const viewBoxWidth = 500;
    const viewBoxHeight = 360;
    const wrap = document.createElement("div");
    const title = document.createElement("h4");
    const helper = document.createElement("p");
    const svg = document.createElementNS(svgNamespace, "svg");
    const labels = [
      { text: "CF", x: 250, y: 58 },
      { text: "LF", x: 122, y: 118 },
      { text: "RF", x: 378, y: 118 },
      { text: "SS", x: 197, y: 180 },
      { text: "2B", x: 303, y: 180 },
      { text: "3B", x: 162, y: 244 },
      { text: "1B", x: 338, y: 244 },
      { text: "P", x: 250, y: 256 },
      { text: "C", x: 250, y: 348 },
    ];

    function createSvgElement(name, attributes) {
      const element = document.createElementNS(svgNamespace, name);
      Object.entries(attributes || {}).forEach(([key, value]) => {
        element.setAttribute(key, String(value));
      });
      return element;
    }

    function createBase(x, y) {
      return createSvgElement("rect", {
        class: "reference-field-base",
        x: x - 7,
        y: y - 7,
        width: 14,
        height: 14,
        transform: "rotate(45 " + x + " " + y + ")",
      });
    }

    function clampCoordinate(value) {
      return Math.min(1, Math.max(0, value));
    }

    function getSvgPoint(event) {
      const matrix = svg.getScreenCTM();
      if (!matrix) {
        return null;
      }
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      return point.matrixTransform(matrix.inverse());
    }

    function selectHitPoint(event) {
      const point = getSvgPoint(event);
      if (!point) {
        return;
      }

      const normalizedX = clampCoordinate(point.x / viewBoxWidth);
      const normalizedY = clampCoordinate(1 - point.y / viewBoxHeight);
      selectedMarker.setAttribute("cx", point.x.toFixed(1));
      selectedMarker.setAttribute("cy", point.y.toFixed(1));
      selectedMarker.removeAttribute("hidden");
      window.setTimeout(() => handleHitLocation({
        x: normalizedX,
        y: normalizedY,
        svgX: point.x,
        svgY: point.y,
      }), 120);
    }

    wrap.className = "result-stack hit-location-wrap";
    title.textContent = "Hit Location";
    helper.className = "hit-location-helper";
    helper.textContent = "This field is from the catcher\x27s perspective.";

    svg.classList.add("reference-hit-field");
    svg.setAttribute("viewBox", "0 0 " + viewBoxWidth + " " + viewBoxHeight);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Tap the field where the ball was hit");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    svg.appendChild(createSvgElement("path", {
      class: "reference-field-boundary",
      d: "M42 142 C116 -18 384 -18 458 142 L352 252 M148 252 L42 142",
    }));
    svg.appendChild(createSvgElement("path", {
      class: "reference-field-inner-arc",
      d: "M148 252 C164 160 216 124 250 124 C284 124 336 160 352 252",
    }));
    svg.appendChild(createSvgElement("path", {
      class: "reference-field-diamond",
      d: "M250 312 L330 232 L250 152 L170 232 Z",
    }));
    svg.appendChild(createSvgElement("path", {
      class: "reference-field-line",
      d: "M250 312 L170 232 L148 252",
    }));
    svg.appendChild(createSvgElement("path", {
      class: "reference-field-line",
      d: "M250 312 L330 232 L352 252",
    }));
    svg.appendChild(createSvgElement("path", {
      class: "reference-field-home-arc",
      d: "M208 302 C208 338 292 338 292 302",
    }));
    svg.appendChild(createSvgElement("circle", {
      class: "reference-field-pitcher-circle",
      cx: 250,
      cy: 250,
      r: 24,
    }));
    svg.appendChild(createBase(330, 232));
    svg.appendChild(createBase(250, 152));
    svg.appendChild(createBase(170, 232));
    svg.appendChild(createSvgElement("path", {
      class: "reference-field-home-plate",
      d: "M240 316 L260 316 L260 326 L250 334 L240 326 Z",
    }));

    labels.forEach((labelData) => {
      const label = createSvgElement("text", {
        class: "reference-field-label",
        x: labelData.x,
        y: labelData.y,
        "text-anchor": "middle",
      });
      label.textContent = labelData.text;
      svg.appendChild(label);
    });

    const fairTerritory = createSvgElement("path", {
      class: "reference-field-fair-territory",
      d: "M250 312 L42 142 C116 -18 384 -18 458 142 Z",
      "aria-label": "Fair territory tap area",
    });
    fairTerritory.addEventListener("click", selectHitPoint);
    svg.appendChild(fairTerritory);

    const selectedMarker = createSvgElement("circle", {
      class: "reference-field-selected-marker",
      cx: 250,
      cy: 250,
      r: 8,
      hidden: true,
    });
    svg.appendChild(selectedMarker);

    wrap.appendChild(title);
    wrap.appendChild(helper);
    wrap.appendChild(svg);
    return wrap;
  }

  function renderPitchTypeModal() {
    const backdrop = document.createElement("div");
    const modal = document.createElement("div");
    const title = document.createElement("h4");
    const grid = document.createElement("div");

    backdrop.className = "pitch-type-modal-backdrop";
    backdrop.setAttribute("role", "presentation");
    modal.className = "pitch-type-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "pitch-type-modal-title");
    title.id = "pitch-type-modal-title";
    title.textContent = "What type of pitch was this?";
    grid.className = "choice-grid pitch-type-grid";

    pitchTypeOptions.forEach((option) => {
      grid.appendChild(createButton(option, handlePitchType));
    });

    modal.appendChild(title);
    modal.appendChild(grid);
    backdrop.appendChild(modal);
    return backdrop;
  }

  function renderAtBatDetails() {
    const wrap = document.createElement("div");
    wrap.className = "result-stack";

    const title = document.createElement("h4");
    title.textContent = "Pitcher Details";
    wrap.appendChild(title);

    const handednessLabel = document.createElement("label");
    const handednessText = document.createElement("span");
    const handednessSelect = document.createElement("select");
    handednessText.textContent = "Pitcher Handedness";
    pitcherHandednessOptions.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      handednessSelect.appendChild(optionElement);
    });
    handednessSelect.value = state.activeAtBat.pitcherHandedness || "Right-handed";
    handednessSelect.addEventListener("change", () => {
      state.activeAtBat.pitcherHandedness = handednessSelect.value;
    });
    handednessLabel.appendChild(handednessText);
    handednessLabel.appendChild(handednessSelect);
    wrap.appendChild(handednessLabel);

    const velocityLabel = document.createElement("label");
    const velocityText = document.createElement("span");
    const velocityInput = document.createElement("input");
    velocityText.textContent = "Pitcher Velocity";
    velocityInput.type = "number";
    velocityInput.placeholder = "MPH";
    velocityInput.inputMode = "numeric";
    velocityInput.min = "0";
    velocityInput.value = state.activeAtBat.pitcherVelocity || "";
    velocityInput.addEventListener("input", () => {
      state.activeAtBat.pitcherVelocity = velocityInput.value === "" ? "" : Number(velocityInput.value);
    });
    velocityLabel.appendChild(velocityText);
    velocityLabel.appendChild(velocityInput);
    wrap.appendChild(velocityLabel);

    const actions = document.createElement("div");
    actions.className = "builder-actions game-entry-actions";
    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.textContent = "Start Pitch Logging";
    startButton.addEventListener("click", () => {
      state.step = "location";
      renderAtBats();
    });
    actions.appendChild(startButton);
    wrap.appendChild(actions);

    return wrap;
  }

  function getReviewGame() {
    return games.find((game) => game.id === state.reviewGameId) || null;
  }

  function getEditOutcomeValue(atBat) {
    const outcomeMap = {
      single: "Single",
      double: "Double",
      triple: "Triple",
      home_run: "Home Run",
      walk: "walk",
      hit_by_pitch: "hit_by_pitch",
      strikeout: "strikeout",
      reached_on_error: "ROE",
      fielders_choice: "Fielder's Choice",
      sac_fly: "Sac Fly",
      sac_bunt: "Sac Bunt",
      drag_bunt: "Drag Bunt",
      ground_out: "Out",
      line_out: "Out",
      fly_out: "Out",
    };
    const matchingOption = editOutcomeOptions.find((option) => option.value === atBat.finalOutcome);

    if (matchingOption) {
      return matchingOption.value;
    }

    return outcomeMap[atBat.outcome] || "Out";
  }

  function isBattedEditOutcome(outcome) {
    return outcome !== "walk" && outcome !== "hit_by_pitch" && outcome !== "strikeout";
  }

  function getBattedBallTypeFromOutcome(outcome) {
    if (outcome === "line_out") {
      return "line_drive";
    }

    if (outcome === "fly_out" || outcome === "sac_fly") {
      return "fly_ball";
    }

    if (outcome === "ground_out" || outcome === "fielders_choice") {
      return "ground_ball";
    }

    return "";
  }

  function createEditDraft(atBat) {
    const battedBallType = getAtBatBattedBallType(atBat) || getBattedBallTypeFromOutcome(atBat.outcome);

    return {
      pitcherHandedness: atBat.pitcherHandedness || "Right-handed",
      pitcherVelocity: atBat.pitcherVelocity === "" || atBat.pitcherVelocity === null ? "" : atBat.pitcherVelocity,
      outcome: getEditOutcomeValue(atBat),
      battedBallType,
      hardHitBall: typeof atBat.hardHitBall === "boolean" ? atBat.hardHitBall : null,
      productiveOut: atBat.productiveOut === true,
    };
  }

  function updateLastPitchForEdit(atBat, draft, normalizedOutcome) {
    if (!Array.isArray(atBat.pitches) || atBat.pitches.length === 0) {
      return;
    }

    const lastPitch = atBat.pitches[atBat.pitches.length - 1];

    delete lastPitch.strikeType;
    delete lastPitch.strikeDetail;
    delete lastPitch.battedBallType;
    delete lastPitch.battedBallOutcome;
    delete lastPitch.outcome;
    delete lastPitch.chartResult;

    if (draft.outcome === "walk") {
      lastPitch.result = "ball";
      return;
    }

    if (draft.outcome === "hit_by_pitch") {
      lastPitch.result = "hit_by_pitch";
      lastPitch.battedBallOutcome = "hit_by_pitch";
      lastPitch.outcome = "hit_by_pitch";
      return;
    }

    if (draft.outcome === "strikeout") {
      lastPitch.result = "swinging_strike";
      lastPitch.strikeType = "swinging_strike";
      lastPitch.strikeDetail = "swinging_strike";
      return;
    }

    lastPitch.result = "batted_ball";
    lastPitch.battedBallOutcome = draft.outcome;
    lastPitch.outcome = draft.outcome;
    lastPitch.chartResult = draft.outcome;

    if (draft.battedBallType) {
      lastPitch.battedBallType = draft.battedBallType;
    } else if (normalizedOutcome === "line_out") {
      lastPitch.battedBallType = "line_drive";
    } else if (normalizedOutcome === "fly_out") {
      lastPitch.battedBallType = "fly_ball";
    } else if (normalizedOutcome === "ground_out") {
      lastPitch.battedBallType = "ground_ball";
    }
  }

  function createEditedAtBat(originalAtBat, draft) {
    const battedBallType = isBattedEditOutcome(draft.outcome) ? draft.battedBallType : "";
    const normalizedOutcome = normalizeLegacyOutcome(draft.outcome, battedBallType);
    const editedAtBat = {
      ...originalAtBat,
      pitcherHandedness: draft.pitcherHandedness,
      pitcherVelocity: draft.pitcherVelocity,
      battedBallType,
      hardHitBall: draft.hardHitBall,
      productiveOut: isOutOutcome(normalizedOutcome)
        ? draft.productiveOut || isAutomaticallyProductiveOut(normalizedOutcome)
        : false,
      finalOutcome: draft.outcome,
      outcome: normalizedOutcome,
      pitches: Array.isArray(originalAtBat.pitches)
        ? originalAtBat.pitches.map((pitch) => ({
            ...pitch,
            location: pitch.location && typeof pitch.location === "object" ? { ...pitch.location } : pitch.location,
          }))
        : [],
    };

    updateLastPitchForEdit(editedAtBat, { ...draft, battedBallType }, normalizedOutcome);
    return normalizeAtBat(editedAtBat);
  }

  function renderEditSelect(labelText, value, options, onChange) {
    const label = document.createElement("label");
    const text = document.createElement("span");
    const select = document.createElement("select");

    text.textContent = labelText;
    options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = String(option.value);
      optionElement.textContent = option.label;
      select.appendChild(optionElement);
    });
    select.value = value === null ? "" : String(value);
    select.addEventListener("change", () => onChange(select.value));
    label.appendChild(text);
    label.appendChild(select);
    return label;
  }

  function renderEditAtBatForm(atBat, index) {
    const draft = state.editingAtBatDraft;
    const form = document.createElement("div");
    const fieldGrid = document.createElement("div");
    const actions = document.createElement("div");
    const saveButton = document.createElement("button");
    const cancelButton = document.createElement("button");
    const normalizedOutcome = normalizeLegacyOutcome(draft.outcome, draft.battedBallType);

    form.className = "at-bat-edit-form";
    fieldGrid.className = "edit-field-grid";

    fieldGrid.appendChild(
      renderEditSelect("At-Bat Result", draft.outcome, editOutcomeOptions, (value) => {
        draft.outcome = value;

        if (!isBattedEditOutcome(draft.outcome)) {
          draft.battedBallType = "";
        }

        if (!isOutOutcome(normalizeLegacyOutcome(draft.outcome, draft.battedBallType))) {
          draft.productiveOut = false;
        }

        renderReviewGame();
      })
    );
    fieldGrid.appendChild(
      renderEditSelect("Batted Ball Type", draft.battedBallType, editBattedBallTypeOptions, (value) => {
        draft.battedBallType = value;
        renderReviewGame();
      })
    );
    fieldGrid.appendChild(
      renderEditSelect("Hard Hit Ball", draft.hardHitBall === null ? "" : String(draft.hardHitBall), [
        { label: "Not Set", value: "" },
        { label: "Yes", value: "true" },
        { label: "No", value: "false" },
      ], (value) => {
        draft.hardHitBall = value === "" ? null : value === "true";
      })
    );
    fieldGrid.appendChild(
      renderEditSelect("Productive Out", draft.productiveOut ? "true" : "false", productiveOutOptions.map((option) => ({
        label: option.label,
        value: String(option.value),
      })), (value) => {
        draft.productiveOut = value === "true";
      })
    );
    fieldGrid.appendChild(
      renderEditSelect("Pitcher Handedness", draft.pitcherHandedness, pitcherHandednessOptions, (value) => {
        draft.pitcherHandedness = value;
      })
    );

    const velocityLabel = document.createElement("label");
    const velocityText = document.createElement("span");
    const velocityInput = document.createElement("input");
    velocityText.textContent = "Pitcher Velocity";
    velocityInput.type = "number";
    velocityInput.placeholder = "MPH";
    velocityInput.inputMode = "numeric";
    velocityInput.min = "0";
    velocityInput.value = draft.pitcherVelocity || "";
    velocityInput.addEventListener("input", () => {
      draft.pitcherVelocity = velocityInput.value === "" ? "" : Number(velocityInput.value);
    });
    velocityLabel.appendChild(velocityText);
    velocityLabel.appendChild(velocityInput);
    fieldGrid.appendChild(velocityLabel);

    actions.className = "builder-actions game-entry-actions";
    saveButton.type = "button";
    saveButton.textContent = "Save At-Bat";
    saveButton.addEventListener("click", () => {
      const game = getReviewGame();

      if (!game || !Array.isArray(game.atBats)) {
        return;
      }

      game.atBats[index] = createEditedAtBat(atBat, draft);
      const savedGame = upsertSavedGame(games, game);
      state.reviewGameId = savedGame.id;
      state.editingAtBatIndex = null;
      state.editingAtBatDraft = null;
      reviewMessage.textContent = "At-bat updated.";
      reviewMessage.classList.add("is-success");
      updateSummaryCards(games);
      renderGamesTable(games, "games-table-body", "empty-state");
      renderGamesTable(games, "review-games-table-body", "review-games-empty");
      renderReviewGame();
    });

    cancelButton.type = "button";
    cancelButton.className = "secondary-button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      state.editingAtBatIndex = null;
      state.editingAtBatDraft = null;
      renderReviewGame();
    });

    if (!isOutOutcome(normalizedOutcome)) {
      draft.productiveOut = false;
    }

    actions.appendChild(saveButton);
    actions.appendChild(cancelButton);
    form.appendChild(fieldGrid);
    form.appendChild(actions);
    return form;
  }

  function renderReviewGame() {
    const game = getReviewGame();

    if (!game) {
      showHomeView();
      return;
    }

    const gameStats = getGameStats(game);
    reviewTitle.textContent = `Review Game vs ${gameStats.opponent || "Opponent"}`;
    reviewMeta.textContent =
      `${gameStats.date || "No date"} | ${getGameAtBatCount(gameStats)} at-bats | ${gameStats.hits} hits`;
    reviewAtBatList.innerHTML = "";

    if (!Array.isArray(gameStats.atBats) || gameStats.atBats.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state compact-empty";
      empty.textContent = "No at-bats were recorded for this game.";
      reviewAtBatList.appendChild(empty);
      return;
    }

    gameStats.atBats.forEach((atBat, index) => {
      const card = document.createElement("article");
      const heading = document.createElement("div");
      const title = document.createElement("strong");
      const editButton = document.createElement("button");
      const meta = document.createElement("p");
      const sequence = document.createElement("div");

      card.className = "saved-at-bat review-at-bat-card";
      heading.className = "review-at-bat-heading";
      title.textContent = `At-Bat ${index + 1}: ${getOutcomeLabel(atBat.outcome)}`;
      editButton.type = "button";
      editButton.className = "secondary-button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        state.editingAtBatIndex = index;
        state.editingAtBatDraft = createEditDraft(atBat);
        reviewMessage.textContent = "";
        reviewMessage.classList.remove("is-success");
        renderReviewGame();
      });
      heading.appendChild(title);
      heading.appendChild(editButton);

      meta.className = "section-copy";
      meta.textContent =
        `Final count: ${atBat.balls}-${atBat.strikes} | ${atBat.pitches.length} pitches` +
        (atBat.productiveOut ? " | Productive out" : "");

      sequence.className = "pitch-sequence";
      renderPitchSequence(sequence, atBat);

      card.appendChild(heading);
      card.appendChild(meta);
      card.appendChild(sequence);

      if (state.editingAtBatIndex === index && state.editingAtBatDraft) {
        card.appendChild(renderEditAtBatForm(atBat, index));
      }

      reviewAtBatList.appendChild(card);
    });
  }

  function showGameReview(gameId) {
    state.reviewGameId = gameId;
    state.editingAtBatIndex = null;
    state.editingAtBatDraft = null;
    homeView.hidden = true;
    reviewListView.hidden = true;
    reviewView.hidden = false;
    choiceView.hidden = true;
    tournamentNameView.hidden = true;
    newGameView.hidden = true;
    reviewMessage.textContent = "";
    reviewMessage.classList.remove("is-success");
    renderReviewGame();
  }

  function renderAtBats() {
    atBatList.innerHTML = "";
    updateGameCompletionActions();

    if (!state.draftGame) {
      return;
    }

    if (state.draftGame.atBats.length === 0 && !state.activeAtBat) {
      return;
    }

    state.draftGame.atBats.forEach((atBat, index) => {
      const card = document.createElement("article");
      card.className = "saved-at-bat";
      const title = document.createElement("strong");
      title.textContent = `At-Bat ${index + 1}: ${getOutcomeLabel(atBat.finalOutcome || atBat.outcome || "Complete")}`;
      card.appendChild(title);

      const sequence = document.createElement("div");
      sequence.className = "pitch-sequence";
      renderPitchSequence(sequence, atBat);
      card.appendChild(sequence);
      atBatList.appendChild(card);
    });

    if (state.activeAtBat) {
      atBatList.appendChild(renderActiveAtBatCard());
    }

    updateGameCompletionActions();
  }

  function renderActiveAtBatCard() {
    const card = document.createElement("article");
    card.className = "saved-at-bat at-bat-card";

    const title = document.createElement("strong");
    title.textContent = `At-Bat ${state.draftGame.atBats.length + 1}`;
    card.appendChild(title);

    const prompt = document.createElement("p");
    prompt.className = "section-copy";
    prompt.textContent =
      state.step === "at_bat_details"
        ? "Enter pitcher details before logging pitches."
        : state.step === "pitch_type"
          ? "Choose the pitch type."
        : state.step === "hit_location"
          ? "Choose where the ball was hit."
        : state.step === "hard_hit_ball"
          ? "Answer the contact detail."
          : state.step === "productive_out"
            ? "Did this out move or score a runner?"
          : state.step === "end_at_bat"
            ? "Review and save this at-bat."
            : state.activePitch
              ? "Pitch Result."
              : "Select a pitch location.";
    card.appendChild(prompt);

    if (state.step === "at_bat_details") {
      card.appendChild(renderAtBatDetails());
    }

    if (
      state.step === "location"
    ) {
      const zone = document.createElement("div");
      zone.className = "location-grid";
      zone.setAttribute("aria-label", "Pitch location selector");
      const helper = document.createElement("p");
      helper.className = "pitch-location-helper";
      helper.textContent = "This grid is from the catcher's perspective.";
      renderStrikeZoneLayout(zone, {
        interactive: true,
        onSelectLocation(location) {
          state.activePitch = createPitch(location);
          state.step = "pitch_type";
          renderAtBats();
        },
        selectedLocationId: state.activePitch ? state.activePitch.location.id : "",
      });
      card.appendChild(helper);
      card.appendChild(zone);
    }

    if (state.step === "pitch_type") {
      card.appendChild(renderOptionGroup("Pitch Type", pitchTypeOptions, handlePitchType));
    }

    if (state.step === "pitch_result") {
      card.appendChild(renderOptionGroup("Pitch Result", pitchResultOptions, handlePitchResult));
    }

    if (state.step === "strike_type") {
      card.appendChild(renderOptionGroup("Strike Type", strikeOptions, handleStrikeType));
    }

    if (state.step === "foul_direction") {
      card.appendChild(renderOptionGroup("Foul Direction", foulDirectionOptions, handleFoulDirection));
    }

    if (state.step === "batted_ball_type") {
      card.appendChild(renderOptionGroup("Batted Ball Type", battedBallTypeOptions, handleBattedBallType));
    }

    if (state.step === "hit_location") {
      card.appendChild(renderHitLocationSelector());
    }

    if (state.step === "batted_ball_outcome") {
      card.appendChild(renderOptionGroup("Batted Ball Outcome", battedBallOutcomeOptions, handleBattedBallOutcome));
    }

    if (state.step === "hard_hit_ball") {
      card.appendChild(renderOptionGroup("Hard hit ball?", hardHitBallOptions, handleHardHitBall));
    }

    if (state.step === "productive_out") {
      card.appendChild(renderOptionGroup("Did this out move or score a runner?", productiveOutOptions, handleProductiveOut));
    }

    if (state.step === "pitch_actions") {
      card.appendChild(renderActionButtons(true));
    }

    if (state.step === "end_at_bat") {
      card.appendChild(renderActionButtons(false));
    }

    const sequence = document.createElement("div");
    sequence.className = "pitch-sequence-wrap";
    const sequenceTitle = document.createElement("h4");
    sequenceTitle.textContent = "Pitch Sequence";
    const sequenceList = document.createElement("div");
    sequenceList.className = "pitch-sequence";
    renderPitchSequence(sequenceList, state.activeAtBat);
    sequence.appendChild(sequenceTitle);
    sequence.appendChild(sequenceList);
    card.appendChild(sequence);

    return card;
  }

  function renderActionButtons(showNextPitch) {
    const actions = document.createElement("div");
    actions.className = "builder-actions game-entry-actions";

    if (showNextPitch) {
      const nextPitch = document.createElement("button");
      nextPitch.type = "button";
      nextPitch.textContent = "Next Pitch";
      nextPitch.addEventListener("click", startNextPitch);
      actions.appendChild(nextPitch);
    }

    const endAtBat = document.createElement("button");
    endAtBat.type = "button";
    endAtBat.textContent = "Finish At-Bat";
    endAtBat.addEventListener("click", endAtBatFlow);
    actions.appendChild(endAtBat);

    return actions;
  }

  function completeCurrentPitch() {
    if (!state.activeAtBat || !state.activePitch) {
      return;
    }

    state.activeAtBat.pitches.push(state.activePitch);
    state.activePitch = null;
  }

  function handlePitchType(pitchType) {
    if (!state.activePitch) {
      return;
    }

    state.activePitch.pitchType = normalizePitchType(pitchType);
    state.activePitch.pitch_type = state.activePitch.pitchType;
    state.step = "pitch_result";
    renderAtBats();
  }

  function handlePitchResult(result) {
    if (!state.activePitch) {
      return;
    }

    state.activePitch.result = result;
    state.activePitch.primaryResult = result;
    state.activePitch.pitch_result = result;
    state.activePitch.swing_result = result;

    if (result === "strike") {
      state.step = "strike_type";
      renderAtBats();
      return;
    }

    if (result === "batted_ball") {
      state.step = "batted_ball_type";
      renderAtBats();
      return;
    }

    if (result === "foul_ball") {
      state.step = "foul_direction";
      renderAtBats();
      return;
    }

    if (result === "hit_by_pitch") {
      state.activePitch.battedBallOutcome = "hit_by_pitch";
      state.activePitch.batted_ball_outcome = "hit_by_pitch";
      state.activePitch.outcome = "hit_by_pitch";
      state.activeAtBat.finalOutcome = "hit_by_pitch";
      completeCurrentPitch();
      state.step = "end_at_bat";
      renderAtBats();
      return;
    }

    completeCurrentPitch();
    state.step = "pitch_actions";
    renderAtBats();
  }

  function handleFoulDirection(direction) {
    state.activePitch.foulDirection = direction;
    state.activePitch.chartResult = direction;
    completeCurrentPitch();
    state.step = "pitch_actions";
    renderAtBats();
  }

  function handleStrikeType(strikeType) {
    state.activePitch.strikeType = strikeType;
    state.activePitch.pitch_result = strikeType;
    state.activePitch.swing_result = strikeType;
    completeCurrentPitch();
    state.step = "pitch_actions";
    renderAtBats();
  }

  function handleBattedBallType(battedBallType) {
    state.activePitch.battedBallType = battedBallType;
    state.activePitch.batted_ball_type = battedBallType;
    state.activePitch.contact_type = battedBallType;
    state.step = "hit_location";
    renderAtBats();
  }

  function handleHitLocation(hitLocation) {
    if (!state.activePitch) {
      return;
    }

    if (hitLocation && typeof hitLocation === "object") {
      const hitLocationX = Number(hitLocation.x);
      const hitLocationY = Number(hitLocation.y);
      const normalizedX = Number.isFinite(hitLocationX) ? Math.min(1, Math.max(0, hitLocationX)) : 0;
      const normalizedY = Number.isFinite(hitLocationY) ? Math.min(1, Math.max(0, hitLocationY)) : 0;
      const coordinateLabel = "x:" + normalizedX.toFixed(2) + ",y:" + normalizedY.toFixed(2);

      state.activePitch.hitLocation = coordinateLabel;
      state.activePitch.hit_location = coordinateLabel;
      state.activePitch.hitLocationX = normalizedX;
      state.activePitch.hitLocationY = normalizedY;
      state.activePitch.hit_location_x = normalizedX;
      state.activePitch.hit_location_y = normalizedY;
    } else {
      state.activePitch.hitLocation = hitLocation;
      state.activePitch.hit_location = hitLocation;
    }

    state.step = "batted_ball_outcome";
    renderAtBats();
  }

  function handleBattedBallOutcome(outcome) {
    state.activePitch.battedBallOutcome = outcome;
    state.activePitch.batted_ball_outcome = outcome;
    state.activePitch.outcome = outcome;
    state.activePitch.chartResult = outcome;
    state.activeAtBat.finalOutcome = outcome;
    const normalizedOutcome = normalizeLegacyOutcome(outcome, state.activePitch.battedBallType || "");

    if (isAutomaticallyProductiveOut(normalizedOutcome)) {
      state.activeAtBat.productiveOut = true;
    }

    state.pendingProductiveOutOutcome = isOutOutcome(normalizedOutcome) ? normalizedOutcome : "";
    completeCurrentPitch();
    state.step = isOutOutcome(normalizedOutcome) ? "productive_out" : "hard_hit_ball";
    renderAtBats();
  }

  function handleProductiveOut(isProductiveOut) {
    if (!state.activeAtBat) {
      return;
    }

    state.activeAtBat.productiveOut =
      isProductiveOut || isAutomaticallyProductiveOut(state.pendingProductiveOutOutcome);
    state.pendingProductiveOutOutcome = "";
    state.step = "hard_hit_ball";
    renderAtBats();
  }

  function handleHardHitBall(isHardHit) {
    if (!state.activeAtBat) {
      return;
    }

    state.activeAtBat.hardHitBall = isHardHit;
    state.step = "end_at_bat";
    renderAtBats();
  }

  function startNextPitch() {
    state.activePitch = null;
    state.step = "location";
    renderAtBats();
  }

  function endAtBatFlow() {
    if (!state.activeAtBat) {
      return;
    }

    if (!state.activeAtBat.finalOutcome) {
      const lastPitch = state.activeAtBat.pitches[state.activeAtBat.pitches.length - 1];
      state.activeAtBat.finalOutcome = lastPitch ? lastPitch.battedBallOutcome || lastPitch.strikeType || lastPitch.result : "";
    }

    state.draftGame.atBats.push(normalizeAtBat(state.activeAtBat));
    syncDraftFields();
    if (state.draftGame.date && state.draftGame.opponent) {
      state.draftGame = upsertSavedGame(games, state.draftGame);
      updateSummaryCards(games);
      renderGamesTable(games, "games-table-body", "empty-state");
    }

    state.activeAtBat = null;
    state.activePitch = null;
    state.pendingProductiveOutOutcome = "";
    state.step = "at_bat_details";
    setMessage("At-bat saved to this game.", true);
    renderAtBats();
  }

  reviewGamesTableBody.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-game-id]");
    const row = event.target.closest(".clickable-game-row");
    const gameId = actionButton?.dataset.gameId || row?.dataset.gameId || "";

    if (gameId) {
      showGameReview(gameId);
    }
  });

  reviewGamesTableBody.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const row = event.target.closest(".clickable-game-row");

    if (row?.dataset.gameId) {
      event.preventDefault();
      showGameReview(row.dataset.gameId);
    }
  });

  reviewGamesButton.addEventListener("click", showReviewListView);
  reviewListBackButton.addEventListener("click", showHomeView);
  reviewBackButton.addEventListener("click", showReviewListView);
  addGameButton.addEventListener("click", showChoiceView);
  choiceBackButton.addEventListener("click", showHomeView);
  startTournamentButton.addEventListener("click", showTournamentNameView);
  tournamentBackButton.addEventListener("click", showChoiceView);
  singleGameButton.addEventListener("click", () => {
    showNewGameView(null);
  });
  backButton.addEventListener("click", showHomeView);

  tournamentNameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const tournamentName = tournamentNameInput.value.trim();

    if (!tournamentName) {
      tournamentMessage.textContent = "Enter a tournament name before continuing.";
      return;
    }

    showNewGameView(createTournament(tournamentName));
  });

  addTournamentGameButton.addEventListener("click", () => {
    if (!state.activeTournament) {
      return;
    }

    if (state.activeAtBat) {
      setMessage("Finish the current at-bat before starting another game.");
      return;
    }

    showNewGameView(state.activeTournament);
  });

  finishTournamentButton.addEventListener("click", () => {
    if (state.activeAtBat) {
      setMessage("Finish the current at-bat before finishing the tournament.");
      return;
    }

    state.activeTournament = null;
    showHomeView();
  });

  function saveDraftGame(message) {
    syncDraftFields();

    if (!state.draftGame.date || !state.draftGame.opponent) {
      setMessage("Enter a date and opponent before saving the game.");
      return false;
    }

    if (state.activeAtBat) {
      setMessage("Finish the current at-bat before saving the game.");
      return false;
    }

    state.draftGame = upsertSavedGame(games, state.draftGame);
    updateSummaryCards(games);
    renderGamesTable(games, "games-table-body", "empty-state");
    setMessage(message, true);
    return true;
  }

  newGameForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  addAtBatButton.addEventListener("click", () => {
    syncDraftFields();
    if (!state.draftGame.date || !state.draftGame.opponent) {
      setMessage("Enter a date and opponent before adding an at-bat.");
      return;
    }

    if (state.activeAtBat) {
      setMessage("Finish the current at-bat before adding another one.");
      return;
    }

    state.activeAtBat = createDraftAtBat();
    state.activePitch = null;
    state.pendingProductiveOutOutcome = "";
    state.step = "at_bat_details";
    setMessage("", false);
    renderAtBats();
  });

  saveGameButton.addEventListener("click", () => {
    if (saveDraftGame(state.activeTournament ? "Tournament game saved." : "Game saved.")) {
      updateTournamentContext();
      renderAtBats();
    }
  });

  finishGameButton.addEventListener("click", () => {
    if (state.activeTournament) {
      return;
    }

    if (saveDraftGame("Game finished.")) {
      showHomeView();
    }
  });

  dateInput.value = getDefaultDate();
  showHomeView();
}

function initAdvancedPage(games) {
  const totals = getRateStats(games);
  const allAtBats = games.flatMap((game) => (Array.isArray(game.atBats) ? game.atBats : []));
  const hardHitMetrics = getHardHitMetrics(allAtBats);
  const advancedPercentMetrics = getAdvancedPercentMetrics(allAtBats, totals);
  const gameCount = games.length;
  const hitGames = games.filter((game) => getGameStats(game).hits > 0);
  const multiHitGames = games.filter((game) => getGameStats(game).hits >= 2);
  const zeroHitGames = games.filter((game) => getGameStats(game).hits === 0);
  const sortedGames = sortGamesByDateDesc(games);
  const recentThree = sortedGames.slice(0, 3);
  const recentThreeRates = getRateStats(recentThree);
  const bestGame = sortedGames.reduce((best, game) => {
    const gameStats = getGameStats(game);

    if (!best || gameStats.hits > best.hits) {
      return gameStats;
    }

    return best;
  }, null);

  setText("hard-hit-percent", formatPercent(hardHitMetrics.hardHitPercent));
  setText("two-strike-percent", formatPercent(hardHitMetrics.twoStrikePercent));
  setText("hard-hit-two-strike-percent", formatPercent(hardHitMetrics.hardHitTwoStrikePercent));
  setText("productive-out-percent", formatPercent(totals.productiveOutPercent));
  setText("line-drive-percent", formatPercent(advancedPercentMetrics.lineDrivePercent));
  setText("ground-ball-percent", formatPercent(advancedPercentMetrics.groundBallPercent));
  setText("fly-ball-percent", formatPercent(advancedPercentMetrics.flyBallPercent));
  setText("extra-base-hit-percent", formatPercent(advancedPercentMetrics.extraBaseHitPercent));
  setText("chase-rate", formatPercent(advancedPercentMetrics.chaseRate));
  setText("contact-rate", formatPercent(advancedPercentMetrics.contactRate));
  setText("quality-at-bat-percent", formatPercent(advancedPercentMetrics.qualityAtBatPercent));
  setText("advanced-average", formatRate(totals.battingAverage));
  setText("advanced-obp", formatRate(totals.onBasePercentage));
  setText("advanced-slg", formatRate(totals.sluggingPercentage));
  setText("advanced-ops", formatRate(totals.ops));
  setText("hits-per-game", gameCount ? formatPerGame(totals.hits / gameCount) : "0.00");
  setText("at-bats-per-game", gameCount ? formatPerGame(totals.atBats / gameCount) : "0.00");
  setText("multi-hit-games", multiHitGames.length);
  setText("zero-hit-games", zeroHitGames.length);
  setText("best-single-game", bestGame ? `${bestGame.hits} Hits` : "0 Hits");
  setText("games-with-hit", hitGames.length);
  setText("recent-three-average", formatRate(recentThreeRates.battingAverage));
  setText("recent-three-ops", formatRate(recentThreeRates.ops));
  setText(
    "advanced-last-game",
    sortedGames[0] ? `${sortedGames[0].date} vs ${sortedGames[0].opponent}` : "No games yet"
  );
}

function getAdvancedPercentMetrics(atBats, totals) {
  const metrics = atBats.reduce(
    (summary, atBat) => {
      const battedBallType = getAtBatBattedBallType(atBat);
      const isBallInPlay = hasBallInPlay(atBat);
      const isQualityAtBat = getIsQualityAtBat(atBat);
      const isOut = isOutOutcome(atBat.outcome);

      summary.plateAppearances += 1;

      if (isBallInPlay) {
        summary.ballsInPlay += 1;
      }

      if (battedBallType === "line_drive") {
        summary.lineDrives += 1;
      } else if (battedBallType === "ground_ball") {
        summary.groundBalls += 1;
      } else if (battedBallType === "fly_ball") {
        summary.flyBalls += 1;
      }

      if (isQualityAtBat) {
        summary.qualityAtBats += 1;
      }

      if (isOut) {
        summary.totalOuts += 1;

        if (atBat.productiveOut === true || isAutomaticallyProductiveOut(atBat.outcome)) {
          summary.productiveOuts += 1;
        }
      }

      if (Array.isArray(atBat.pitches)) {
        atBat.pitches.forEach((pitch) => {
          const isSwing = getIsSwing(pitch);
          const zoneStatus = getPitchZoneStatus(pitch);

          if (zoneStatus === false) {
            summary.outOfZonePitches += 1;

            if (isSwing) {
              summary.outOfZoneSwings += 1;
            }
          }

          if (isSwing) {
            summary.swings += 1;

            if (getIsContact(pitch)) {
              summary.contactSwings += 1;
            }
          }
        });
      }

      return summary;
    },
    {
      plateAppearances: 0,
      ballsInPlay: 0,
      lineDrives: 0,
      groundBalls: 0,
      flyBalls: 0,
      qualityAtBats: 0,
      totalOuts: 0,
      productiveOuts: 0,
      outOfZonePitches: 0,
      outOfZoneSwings: 0,
      swings: 0,
      contactSwings: 0,
    }
  );
  const extraBaseHits = totals.double + totals.triple + totals.home_run;

  return {
    lineDrivePercent: metrics.ballsInPlay === 0 ? 0 : metrics.lineDrives / metrics.ballsInPlay,
    groundBallPercent: metrics.ballsInPlay === 0 ? 0 : metrics.groundBalls / metrics.ballsInPlay,
    flyBallPercent: metrics.ballsInPlay === 0 ? 0 : metrics.flyBalls / metrics.ballsInPlay,
    extraBaseHitPercent: totals.hits === 0 ? 0 : extraBaseHits / totals.hits,
    chaseRate: metrics.outOfZonePitches === 0 ? 0 : metrics.outOfZoneSwings / metrics.outOfZonePitches,
    contactRate: metrics.swings === 0 ? 0 : metrics.contactSwings / metrics.swings,
    qualityAtBatPercent:
      metrics.plateAppearances === 0 ? 0 : metrics.qualityAtBats / metrics.plateAppearances,
    productiveOutPercent: metrics.totalOuts === 0 ? 0 : metrics.productiveOuts / metrics.totalOuts,
  };
}

function getHardHitMetrics(atBats) {
  const metrics = atBats.reduce(
    (summary, atBat) => {
      const isBallInPlay = hasBallInPlay(atBat);
      const isTwoStrikeAtBat = reachedTwoStrikes(atBat);
      const isHardHit = atBat.hardHitBall === true;

      summary.plateAppearances += 1;

      if (isBallInPlay) {
        summary.ballsInPlay += 1;

        if (isHardHit) {
          summary.hardHitBalls += 1;
        }
      }

      if (isTwoStrikeAtBat) {
        summary.twoStrikeAtBats += 1;

        if (isHardHit && isBallInPlay) {
          summary.hardHitTwoStrikeAtBats += 1;
        }
      }

      return summary;
    },
    {
      plateAppearances: 0,
      ballsInPlay: 0,
      hardHitBalls: 0,
      twoStrikeAtBats: 0,
      hardHitTwoStrikeAtBats: 0,
    }
  );

  return {
    hardHitPercent: metrics.ballsInPlay === 0 ? 0 : metrics.hardHitBalls / metrics.ballsInPlay,
    twoStrikePercent: metrics.plateAppearances === 0 ? 0 : metrics.twoStrikeAtBats / metrics.plateAppearances,
    hardHitTwoStrikePercent:
      metrics.twoStrikeAtBats === 0 ? 0 : metrics.hardHitTwoStrikeAtBats / metrics.twoStrikeAtBats,
  };
}

function hasBallInPlay(atBat) {
  const contactOutcomes = new Set([
    "single",
    "double",
    "triple",
    "home_run",
    "reached_on_error",
    "fielders_choice",
    "ground_out",
    "line_out",
    "fly_out",
    "sac_fly",
    "sac_bunt",
    "drag_bunt",
  ]);

  if (contactOutcomes.has(atBat.outcome)) {
    return true;
  }

  return Array.isArray(atBat.pitches) && atBat.pitches.some((pitch) => {
    return pitch.result === "batted_ball" || Boolean(pitch.battedBallType || pitch.battedBallOutcome);
  });
}

function getAtBatBattedBallType(atBat) {
  if (typeof atBat.battedBallType === "string" && atBat.battedBallType) {
    return atBat.battedBallType;
  }

  if (!Array.isArray(atBat.pitches)) {
    return "";
  }

  const battedBallPitch = atBat.pitches.find((pitch) => typeof pitch.battedBallType === "string" && pitch.battedBallType);
  return battedBallPitch ? battedBallPitch.battedBallType : "";
}

function getIsSwing(pitch) {
  const result = pitch.result || "";
  const strikeType = pitch.strikeType || pitch.strikeDetail || "";

  return (
    result === "swinging_strike" ||
    result === "foul_ball" ||
    result === "batted_ball" ||
    strikeType === "swinging_strike" ||
    Boolean(pitch.battedBallType || pitch.battedBallOutcome)
  );
}

function getIsContact(pitch) {
  const result = pitch.result || "";

  return result === "foul_ball" || result === "batted_ball" || Boolean(pitch.battedBallType || pitch.battedBallOutcome);
}

function getPitchZoneStatus(pitch) {
  const location = pitch.location && typeof pitch.location === "object" ? pitch.location : null;
  const locationId =
    (location && typeof location.id === "string" ? location.id : "") ||
    (typeof pitch.locationId === "string" ? pitch.locationId : "") ||
    (typeof pitch.location === "string" ? pitch.location : "");
  const locationLabel =
    (location && typeof location.label === "string" ? location.label : "") ||
    (typeof pitch.locationLabel === "string" ? pitch.locationLabel : "");

  if (location && typeof location.isZone === "boolean") {
    return location.isZone;
  }

  if (/^zone-[1-9]$/.test(locationId) || /^Zone [1-9]$/.test(locationLabel)) {
    return true;
  }

  if (locationId || locationLabel) {
    return false;
  }

  return null;
}

function getIsQualityAtBat(atBat) {
  const qualityOutcomes = new Set([
    "single",
    "double",
    "triple",
    "home_run",
    "walk",
    "hit_by_pitch",
    "sac_fly",
    "sac_bunt",
    "drag_bunt",
  ]);

  return (
    qualityOutcomes.has(atBat.outcome) ||
    atBat.hardHitBall === true ||
    (Array.isArray(atBat.pitches) && atBat.pitches.length >= 6)
  );
}

function reachedTwoStrikes(atBat) {
  if (!Array.isArray(atBat.pitches)) {
    return false;
  }

  let strikes = 0;

  return atBat.pitches.some((pitch) => {
    const result = pitch.result || "";
    const strikeType = pitch.strikeType || pitch.strikeDetail || "";

    if (
      result === "strike" ||
      result === "called_strike" ||
      result === "swinging_strike" ||
      strikeType === "called_strike" ||
      strikeType === "swinging_strike"
    ) {
      strikes += 1;
    }

    if (result === "foul_ball" && strikes < 2) {
      strikes += 1;
    }

    return strikes >= 2;
  });
}

function createChartBar(widthClass, percentageText) {
  const track = document.createElement("div");
  track.className = "chart-track";

  const fill = document.createElement("div");
  fill.className = `chart-fill ${widthClass}`;
  fill.style.width = percentageText;

  track.appendChild(fill);

  return track;
}

function initChartsPage(games) {
  const filterSelect = document.getElementById("chart-filter");
  const generateButton = document.getElementById("generate-chart-button");
  const chartsEmpty = document.getElementById("charts-empty");
  const zoneMap = document.getElementById("chart-zone-map") || document.getElementById("zone-map");
  const filterTotal = document.getElementById("chart-filter-total");
  const chartLegend = document.getElementById("chart-legend");
  const chartZoneTitle = document.getElementById("chart-zone-title");

  if (!filterSelect || !generateButton || !chartsEmpty || !zoneMap || !filterTotal || !chartLegend || !chartZoneTitle) {
    return;
  }

  if (zoneMap.dataset.initialized === "true") {
    renderZoneMap(filterSelect.value || "hot_cold");
    return;
  }

  zoneMap.dataset.initialized = "true";

  function createLocationBuckets() {
    return pitchLocations.reduce((buckets, location) => {
      buckets[location.id] = {
        count: 0,
        hits: 0,
        outs: 0,
      };
      return buckets;
    }, {});
  }

  function getPitchLocationId(pitch) {
    const savedLocation =
      pitch.location && typeof pitch.location === "object"
        ? pitch.location
        : {
            id: typeof pitch.location === "string" ? pitch.location : "",
            label: typeof pitch.locationLabel === "string" ? pitch.locationLabel : "",
          };
    const locationMatch = pitchLocations.find((location) => {
      return (
        location.id === savedLocation.id ||
        location.label === savedLocation.id ||
        location.id === savedLocation.label ||
        location.label === savedLocation.label
      );
    });

    if (locationMatch) {
      return locationMatch.id;
    }

    if (typeof pitch.locationId === "string") {
      const legacyMatch = pitchLocations.find((location) => {
        return location.id === pitch.locationId || location.label === pitch.locationId;
      });

      return legacyMatch ? legacyMatch.id : pitch.locationId;
    }

    return "";
  }

  function isHitOutcome(outcome) {
    return ["Single", "Double", "Triple", "Home Run", "single", "double", "triple", "home_run"].includes(outcome);
  }

  function isOutOutcome(outcome) {
    return outcome === "Out" || outcome === "out";
  }

  function isMatchingOutcome(outcome, filterId) {
    const outcomeMap = {
      singles: ["Single", "single"],
      doubles: ["Double", "double"],
      triples: ["Triple", "triple"],
      home_runs: ["Home Run", "home_run"],
      outs: ["Out", "out"],
    };

    return Boolean(outcomeMap[filterId] && outcomeMap[filterId].includes(outcome));
  }

  function getAtBatOutcome(atBat) {
    if (typeof atBat.finalOutcome === "string" && atBat.finalOutcome) {
      return normalizeSavedBattedBallOutcome(atBat.finalOutcome);
    }

    if (typeof atBat.outcome === "string" && atBat.outcome) {
      return normalizeSavedBattedBallOutcome(atBat.outcome);
    }

    return "";
  }

  function getSavedPitchBattedBallOutcome(pitch, atBat) {
    if (typeof pitch.battedBallOutcome === "string" && pitch.battedBallOutcome) {
      return normalizeSavedBattedBallOutcome(pitch.battedBallOutcome);
    }

    if (typeof pitch.outcome === "string" && pitch.outcome) {
      return normalizeSavedBattedBallOutcome(pitch.outcome);
    }

    if (
      pitch.result === "batted_ball" ||
      pitch.primaryResult === "batted_ball" ||
      pitch.battedBallType
    ) {
      return getAtBatOutcome(atBat);
    }

    return "";
  }

  function getChartPitchEntries(atBat) {
    const entries = [];
    const atBatOutcome = getAtBatOutcome(atBat);

    atBat.pitches.forEach((pitch) => {
      const battedBallOutcome = getSavedPitchBattedBallOutcome(pitch, atBat);
      const locationId = getPitchLocationId(pitch);

      if (battedBallOutcome && locationId) {
        entries.push({ locationId, battedBallOutcome });
      }
    });

    if (entries.length === 0 && atBatOutcome) {
      const lastLocatedPitch = atBat.pitches.slice().reverse().find((pitch) => getPitchLocationId(pitch));

      if (lastLocatedPitch) {
        entries.push({
          locationId: getPitchLocationId(lastLocatedPitch),
          battedBallOutcome: atBatOutcome,
        });
      }
    }

    return entries;
  }

  function getChartEntries() {
    const entries = [];

    games.forEach((game) => {
      if (!Array.isArray(game.atBats)) {
        return;
      }

      game.atBats.forEach((atBat) => {
        if (!Array.isArray(atBat.pitches)) {
          return;
        }

        getChartPitchEntries(atBat).forEach((entry) => {
          if (bucketsHaveLocation(entry.locationId)) {
            entries.push(entry);
          }
        });
      });
    });

    return entries;
  }

  function bucketsHaveLocation(locationId) {
    return pitchLocations.some((location) => location.id === locationId);
  }

  function getFilterById(filterId) {
    return chartFilterOptions.find((filter) => filter.id === filterId) || chartFilterOptions[0];
  }

  function collectZoneData(filterId) {
    const buckets = createLocationBuckets();
    let totalMatches = 0;

    getChartEntries().forEach(({ locationId, battedBallOutcome }) => {
      if (!buckets[locationId]) {
        return;
      }

      if (filterId === "hot_cold") {
        if (isHitOutcome(battedBallOutcome)) {
          buckets[locationId].hits += 1;
          totalMatches += 1;
        } else if (isOutOutcome(battedBallOutcome)) {
          buckets[locationId].outs += 1;
          totalMatches += 1;
        }

        return;
      }

      if (isMatchingOutcome(battedBallOutcome, filterId)) {
        buckets[locationId].count += 1;
        totalMatches += 1;
      }
    });

    return { buckets, totalMatches };
  }

  function getZoneCellStyle(bucket, filterType, maxCount, filterId) {
    if (filterType === "hotCold") {
      const total = bucket.hits + bucket.outs;

      if (total === 0) {
        return "";
      }

      const hitShare = bucket.hits / total;
      const outShare = bucket.outs / total;

      if (hitShare > outShare) {
        const opacity = Math.max(0.2, hitShare * (total / Math.max(1, maxCount)));
        return `background: rgba(228, 0, 44, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(228, 0, 44, 0.45);`;
      }

      const opacity = Math.max(0.2, outShare * (total / Math.max(1, maxCount)));
      return `background: rgba(12, 35, 64, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(12, 35, 64, 0.45);`;
    }

    if (bucket.count === 0 || maxCount === 0) {
      return "";
    }

    const opacity = Math.max(0.16, bucket.count / maxCount);

    if (filterId === "outs") {
      return `background: rgba(12, 35, 64, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(12, 35, 64, 0.45);`;
    }

    return `background: rgba(228, 0, 44, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(228, 0, 44, 0.45);`;
  }

  function renderLegend(filterType) {
    if (filterType === "hotCold") {
      chartLegend.innerHTML = `
        <span class="legend-swatch legend-hit"></span>
        <span>Red = Single, Double, Triple, Home Run</span>
        <span class="legend-swatch legend-out"></span>
        <span>Navy = Out</span>
      `;
      return;
    }

    if (filterSelect.value === "outs") {
      chartLegend.innerHTML = `
        <span class="legend-swatch legend-out"></span>
        <span>Darker navy = more Out results in that location</span>
      `;
      return;
    }

    chartLegend.innerHTML = `
      <span class="legend-swatch legend-hit"></span>
      <span>Darker red = more matching results in that location</span>
    `;
  }

  function renderZoneMap(filterId) {
    const selectedFilter = getFilterById(filterId);
    const zoneData = collectZoneData(filterId);
    const buckets = zoneData.buckets;
    const maxCount =
      selectedFilter.type === "hotCold"
        ? Math.max(
            ...Object.values(buckets).map((bucket) => bucket.hits + bucket.outs),
            0
          )
        : Math.max(...Object.values(buckets).map((bucket) => bucket.count), 0);

    filterTotal.textContent = String(zoneData.totalMatches);
    chartZoneTitle.textContent = selectedFilter.label;
    chartsEmpty.hidden = zoneData.totalMatches > 0;
    renderLegend(selectedFilter.type);

    // Render the chart map with the same zone layout as the at-bat input.
    renderStrikeZoneLayout(zoneMap, {
      interactive: false,
      getCellStyle(location) {
        const bucket = buckets[location.id];
        return getZoneCellStyle(bucket, selectedFilter.type, maxCount, selectedFilter.id);
      },
      getCountText(location) {
        const bucket = buckets[location.id];
        const countValue =
          selectedFilter.type === "hotCold" ? bucket.hits + bucket.outs : bucket.count;
        return countValue > 0 ? String(countValue) : "";
      },
    });
  }

  generateButton.addEventListener("click", () => {
    renderZoneMap(filterSelect.value);
  });

  filterSelect.addEventListener("change", () => {
    renderZoneMap(filterSelect.value);
  });

  filterSelect.value = filterSelect.value || "hot_cold";
  renderZoneMap(filterSelect.value);
}

window.renderChartsPage = function renderChartsPage() {
  initChartsPage(loadRawGames());
};

function initLoginPage() {
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const loginMessage = document.getElementById("login-message");

  if (!loginForm || !loginMessage || !emailInput || !passwordInput) {
    return;
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = normalizeEmail(emailInput.value);
    const password = passwordInput.value;
    const accounts = loadAccounts();
    const account = accounts.find((savedAccount) => savedAccount.email === email);

    loginMessage.classList.remove("is-success");

    if (!account || account.password !== password) {
      loginMessage.textContent = "Incorrect email or password.";
      return;
    }

    setCurrentUser(email);
    loginMessage.textContent = "Login successful. Redirecting...";
    loginMessage.classList.add("is-success");
    redirectTo("index.html");
  });
}

function initSignupPage() {
  const signupForm = document.getElementById("signup-form");
  const emailInput = document.getElementById("signup-email");
  const passwordInput = document.getElementById("signup-password");
  const signupMessage = document.getElementById("signup-message");

  if (!signupForm || !signupMessage || !emailInput || !passwordInput) {
    return;
  }

  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = normalizeEmail(emailInput.value);
    const password = passwordInput.value;
    const accounts = loadAccounts();
    const accountExists = accounts.some((account) => account.email === email);

    signupMessage.classList.remove("is-success");

    if (!email || !password) {
      signupMessage.textContent = "Enter an email and password.";
      return;
    }

    if (accountExists) {
      signupMessage.textContent = "An account with that email already exists.";
      return;
    }

    accounts.push({ email, password });
    saveAccounts(accounts);
    setCurrentUser(email);
    signupMessage.textContent = "Account created. Redirecting...";
    signupMessage.classList.add("is-success");
    redirectTo("index.html");
  });
}

if (guardRoute()) {
  updateAuthUI();

  const games = loadGames();

  if (page === "dashboard") {
    initDashboard(games);
  }

  if (page === "games") {
    initGamesPage(games);
  }

  if (page === "advanced") {
    initAdvancedPage(games);
  }

  if (page === "login") {
    initLoginPage();
  }

  if (page === "signup") {
    initSignupPage();
  }
}
