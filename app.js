const storageKey = "hitting-log-games";
const accountsKey = "hitting-log-accounts";
const currentUserKey = "hitting-log-current-user";
const page = document.body.dataset.page;
const protectedPages = new Set(["dashboard", "games", "all-games", "advanced", "charts", "account"]);
const authPages = new Set(["login", "signup"]);
const PUBLIC_SIGNUP_ENABLED = true;
const DEFAULT_SPORT_TYPE = "baseball";
const PITCH_TYPES_BY_SPORT = {
  baseball: [
    { label: "4 Seam Fastball", value: "four_seam_fastball" },
    { label: "2 Seam Fastball", value: "two_seam_fastball" },
    { label: "Changeup", value: "changeup" },
    { label: "Sinker", value: "sinker" },
    { label: "Slider", value: "slider" },
    { label: "Cutter", value: "cutter" },
    { label: "12-6 Curve", value: "twelve_six_curve" },
    { label: "Sweeper Curve", value: "sweeper_curve" },
    { label: "Unknown", value: "Unknown" },
  ],
  softball: [
    { label: "Fastball", value: "fastball" },
    { label: "Changeup", value: "changeup" },
    { label: "Curve", value: "curve" },
    { label: "Screw", value: "screwball" },
    { label: "Drop", value: "drop" },
    { label: "Rise", value: "rise" },
    { label: "Drop-Curve", value: "drop_curve" },
    { label: "Unknown", value: "Unknown" },
  ],
};
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
const timingOptions = [
  { label: "On Time", value: "on_time" },
  { label: "Early", value: "early" },
  { label: "Late", value: "late" },
];
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
  { id: "On Time", label: "On Time", type: "count" },
  { id: "Early", label: "Early", type: "count" },
  { id: "Late", label: "Late", type: "count" },
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
  if (!Array.isArray(savedAccounts)) {
    return [];
  }

  return savedAccounts.map(({ password, ...account }) => account);
}

function saveAccounts(accounts) {
  const safeAccounts = accounts.map(({ password, ...account }) => account);
  localStorage.setItem(accountsKey, JSON.stringify(safeAccounts));
}

function removeStoredAccountPasswords() {
  const savedAccounts = JSON.parse(localStorage.getItem(accountsKey) || "[]");

  if (!Array.isArray(savedAccounts)) {
    return;
  }

  if (savedAccounts.some((account) => Object.prototype.hasOwnProperty.call(account, "password"))) {
    saveAccounts(savedAccounts);
  }
}

function normalizeSportType(sportType) {
  return sportType === "softball" ? "softball" : DEFAULT_SPORT_TYPE;
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

function getCurrentAccount() {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return null;
  }

  return loadAccounts().find((account) => normalizeEmail(account.email || "") === currentUser.email) || null;
}

function getCurrentSportType() {
  return normalizeSportType(getCurrentAccount()?.sportType);
}

function updateCurrentAccountSportType(sportType) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const accounts = loadAccounts();
  const accountIndex = accounts.findIndex((account) => normalizeEmail(account.email || "") === currentUser.email);

  if (accountIndex === -1) {
    return null;
  }

  accounts[accountIndex] = {
    ...accounts[accountIndex],
    sportType: normalizeSportType(sportType),
  };
  saveAccounts(accounts);
  return accounts[accountIndex];
}

function updateCurrentAccountProfile({ athleteName, sportType }) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const accounts = loadAccounts();
  const accountIndex = accounts.findIndex((account) => normalizeEmail(account.email || "") === currentUser.email);

  if (accountIndex === -1) {
    return null;
  }

  accounts[accountIndex] = {
    ...accounts[accountIndex],
    athleteName: String(athleteName || "").trim(),
    sportType: normalizeSportType(sportType),
  };
  saveAccounts(accounts);
  return accounts[accountIndex];
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
    redirectTo("/");
    return false;
  }

  if (authPages.has(page) && currentUser) {
    redirectTo("dashboard.html");
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
    logoutButton.addEventListener("click", async () => {
      if (window.hittingLogAuth) {
        await window.hittingLogAuth.logOut().catch(() => {});
      }
      clearCurrentUser();
      redirectTo("login.html");
    });
  }
}

function normalizePitchType(pitchType) {
  const normalized = String(pitchType || "unknown")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
  const pitchTypeMap = {
    "4_seam_fastball": "four_seam_fastball",
    "4seam_fastball": "four_seam_fastball",
    four_seam: "four_seam_fastball",
    "2_seam_fastball": "two_seam_fastball",
    "2seam_fastball": "two_seam_fastball",
    two_seam: "two_seam_fastball",
    "12_6_curve": "twelve_six_curve",
    "12_6": "twelve_six_curve",
    screw: "screwball",
    dropcurve: "drop_curve",
  };
  const normalizedPitchType = pitchTypeMap[normalized] || normalized;
  const allowedPitchTypes = new Set([
    "four_seam_fastball",
    "two_seam_fastball",
    "fastball",
    "changeup",
    "sinker",
    "curve",
    "twelve_six_curve",
    "sweeper_curve",
    "drop",
    "drop_curve",
    "rise",
    "slider",
    "cutter",
    "screwball",
    "unknown",
  ]);

  return allowedPitchTypes.has(normalizedPitchType) ? normalizedPitchType : "unknown";
}

function getStoredPitchType(pitchType) {
  return String(pitchType || "").trim() === "Unknown" ? "Unknown" : normalizePitchType(pitchType);
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
  const pitchType = getStoredPitchType(pitch.pitchType || pitch.pitch_type);
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

function normalizeTiming(value) {
  const timing = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  if (timing === "on_time" || timing === "ontime") {
    return "on_time";
  }

  if (timing === "early") {
    return "early";
  }

  if (timing === "late") {
    return "late";
  }

  return "";
}

function getTimingLabel(value) {
  const normalizedTiming = normalizeTiming(value);
  const match = timingOptions.find((option) => option.value === normalizedTiming);

  return match ? match.label : "";
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

function normalizeHardHitBallValue(value) {
  if (value === true || value === 1) {
    return true;
  }

  if (value === false || value === 0) {
    return false;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === "true" || normalizedValue === "yes" || normalizedValue === "1") {
      return true;
    }

    if (normalizedValue === "false" || normalizedValue === "no" || normalizedValue === "0") {
      return false;
    }
  }

  return null;
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
    hardHitBall: normalizeHardHitBallValue(atBat.hardHitBall),
    productiveOut: atBat.productiveOut === true || isAutomaticallyProductiveOut(outcome),
    timing: normalizeTiming(atBat.timing),
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
    finalScore: typeof game.finalScore === "string" ? game.finalScore : "",
    tournamentId: typeof game.tournamentId === "string" && game.tournamentId ? game.tournamentId : null,
    tournamentName: typeof game.tournamentName === "string" && game.tournamentName ? game.tournamentName : null,
    tournamentGameNumber: Number.isFinite(tournamentGameNumber) && tournamentGameNumber > 0 ? tournamentGameNumber : null,
    tournamentCompleted: game.tournamentCompleted === true,
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

function parseGameDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const [year, month, day] = String(dateValue).split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(dateValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function isGameWithinLastDays(game, days) {
  const gameDate = parseGameDate(game.date);

  if (!gameDate) {
    return false;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const rangeStart = new Date(todayStart);

  rangeStart.setDate(todayStart.getDate() - (days - 1));
  gameDate.setHours(0, 0, 0, 0);

  return gameDate >= rangeStart && gameDate <= todayStart;
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
  if (value === null || value === undefined) {
    return "N/A";
  }

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
    const text = typeof value === "object" && value !== null ? value.text : value;
    const metricKey = typeof value === "object" && value !== null ? value.metricKey : "";

    cell.textContent = String(text);

    if (metricKey && typeof window.applyMetricPerformanceColor === "function") {
      window.applyMetricPerformanceColor(cell, metricKey, text);
    }

    row.appendChild(cell);
  });
}

function appendGameCells(row, gameStats, options = {}) {
  const opponentLabel = options.opponentLabel || gameStats.opponent;
  const values = options.compact
    ? [
        gameStats.date,
        opponentLabel,
        getGameAtBatCount(gameStats),
        gameStats.hits,
        { text: formatRate(gameStats.ops), metricKey: "ops" },
      ]
    : [
        gameStats.date,
        opponentLabel,
        getGameAtBatCount(gameStats),
        gameStats.hits,
        { text: formatRate(gameStats.battingAverage), metricKey: "battingAverage" },
        { text: formatRate(gameStats.ops), metricKey: "ops" },
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

function formatDisplayDate(dateValue) {
  if (!dateValue) {
    return "No date";
  }

  const date = parseGameDate(dateValue);

  if (!date) {
    return String(dateValue);
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function appendSimpleGameRow(tableBody, gameStats, opponentLabel = gameStats.opponent, options = {}) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  const card = document.createElement("article");
  const date = document.createElement("strong");
  const opponent = document.createElement("p");
  const average = document.createElement("p");
  const averageValue = document.createElement("span");
  const performanceScore = document.createElement("p");
  const score = calculateHittingLogPerformanceScore(gameStats);

  row.className = "logged-game-card-row";
  if (options.clickable) {
    row.classList.add("clickable-game-row");
    row.tabIndex = 0;
    row.dataset.gameId = gameStats.id;
  }
  cell.colSpan = 1;
  card.className = "logged-game-card";
  date.className = "logged-game-date";
  date.textContent = formatDisplayDate(gameStats.date);
  opponent.className = "logged-game-opponent";
  opponent.textContent = `vs. ${opponentLabel || "Opponent"}`;
  average.className = "logged-game-average";
  average.append("Batting Average: ");
  averageValue.textContent = formatRate(gameStats.battingAverage);
  average.appendChild(averageValue);
  if (typeof window.applyMetricPerformanceColor === "function") {
    window.applyMetricPerformanceColor(averageValue, "battingAverage", averageValue.textContent);
  }
  performanceScore.className = "logged-game-score";
  performanceScore.textContent = `Hitting Log Performance Score: ${formatPerformanceScore(score)}`;
  applyPerformanceScoreStatus(performanceScore, score);

  card.appendChild(date);
  card.appendChild(opponent);
  if (gameStats.finalScore) {
    const finalScore = document.createElement("p");
    finalScore.className = "logged-game-final-score";
    finalScore.textContent = `Final Score: ${gameStats.finalScore}`;
    card.appendChild(finalScore);
  }
  card.appendChild(average);
  card.appendChild(performanceScore);
  cell.appendChild(card);
  row.appendChild(cell);
  tableBody.appendChild(row);
}

function hasTournamentGame(game) {
  return Boolean(game.tournamentId || game.tournamentName);
}

function getTournamentKey(game) {
  return game.tournamentId || game.tournamentName || "";
}

function getTournamentGroups(games) {
  const groups = new Map();

  games.forEach((game) => {
    if (!hasTournamentGame(game)) {
      return;
    }

    const tournamentKey = getTournamentKey(game);

    if (!groups.has(tournamentKey)) {
      groups.set(tournamentKey, {
        id: game.tournamentId || tournamentKey,
        name: game.tournamentName || "Tournament",
        completed: false,
        startDate: game.date || "",
        endDate: game.date || "",
        games: [],
      });
    }

    const group = groups.get(tournamentKey);
    group.completed = group.completed || game.tournamentCompleted === true;
    group.games.push(game);

    if (game.date && (!group.startDate || game.date < group.startDate)) {
      group.startDate = game.date;
    }

    if (game.date && (!group.endDate || game.date > group.endDate)) {
      group.endDate = game.date;
    }
  });

  return Array.from(groups.values()).sort((a, b) => b.endDate.localeCompare(a.endDate));
}

function formatTournamentDateRange(tournament) {
  if (!tournament?.startDate) {
    return "Dates unavailable";
  }

  if (!tournament.endDate || tournament.startDate === tournament.endDate) {
    return formatDisplayDate(tournament.startDate);
  }

  return `${formatDisplayDate(tournament.startDate)} – ${formatDisplayDate(tournament.endDate)}`;
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

function renderSimpleGamesTable(tableBody, games, options = {}) {
  games.forEach((game) => {
    const gameStats = getGameStats(game);
    appendSimpleGameRow(tableBody, gameStats, gameStats.opponent, options);
  });
}

function renderGameSummaryRow(tableBody, game, options = {}) {
  const gameStats = getGameStats(game);
  const row = document.createElement("tr");
  const dateCell = document.createElement("td");
  const opponentCell = document.createElement("td");
  const averageCell = document.createElement("td");
  const scoreCell = document.createElement("td");
  const score = calculateHittingLogPerformanceScore(gameStats);

  dateCell.textContent = formatDisplayDate(gameStats.date);
  opponentCell.textContent = gameStats.opponent || "Opponent";
  averageCell.textContent = formatRate(gameStats.battingAverage);
  scoreCell.textContent = score === null || score === undefined ? "N/A" : String(score);

  if (typeof window.applyMetricPerformanceColor === "function") {
    window.applyMetricPerformanceColor(averageCell, "battingAverage", averageCell.textContent);
  }

  applyPerformanceScoreStatus(scoreCell, score);

  if (options.clickable) {
    row.className = "clickable-game-row";
    row.tabIndex = 0;
    row.dataset.gameId = gameStats.id;
  }

  row.appendChild(dateCell);
  row.appendChild(opponentCell);
  row.appendChild(averageCell);
  row.appendChild(scoreCell);
  tableBody.appendChild(row);
}

function renderGameSummaryTable(tableBody, games, options = {}) {
  tableBody.innerHTML = "";
  games.forEach((game) => renderGameSummaryRow(tableBody, game, options));
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

  if (tbodyId === "games-table-body" && typeof limit !== "number") {
    renderGameSummaryTable(tableBody, visibleGames.filter((game) => isGameWithinLastDays(game, 7)));
  } else if (tbodyId === "review-games-table-body" && typeof limit !== "number") {
    renderGroupedGamesTable(tableBody, visibleGames, { withAction: true });
  } else {
    visibleGames.forEach((game) => {
      const gameStats = getGameStats(game);
      const row = document.createElement("tr");
      appendGameCells(row, gameStats, { compact: tbodyId === "recent-games-body" });
      tableBody.appendChild(row);
    });
  }

  if (emptyState) {
    emptyState.hidden = tableBody.children.length > 0;
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value);

    if (element.dataset.performanceMetric && typeof window.applyMetricPerformanceColor === "function") {
      window.applyMetricPerformanceColor(element, element.dataset.performanceMetric, value);
    }

    if (element.dataset.performanceScore !== undefined) {
      applyPerformanceScoreStatus(element, value);
      element.textContent = formatPerformanceScore(value);
    }
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
    four_seam_fastball: "4 Seam Fastball",
    two_seam_fastball: "2 Seam Fastball",
    fastball: "Fastball",
    changeup: "Changeup",
    sinker: "Sinker",
    curve: "Curve",
    twelve_six_curve: "12-6 Curve",
    sweeper_curve: "Sweeper Curve",
    drop: "Drop",
    drop_curve: "Drop-Curve",
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

function getSimplePitchResultLabel(pitch) {
  const rawResult =
    pitch?.primaryResult ||
    pitch?.result ||
    pitch?.pitch_result ||
    pitch?.swing_result ||
    pitch?.strikeType ||
    pitch?.strikeDetail ||
    "";

  if (rawResult === "ball") {
    return "Ball";
  }

  if (
    rawResult === "strike" ||
    rawResult === "called_strike" ||
    rawResult === "swinging_strike"
  ) {
    return "Strike";
  }

  if (rawResult === "foul_ball") {
    return "Foul";
  }

  if (rawResult === "hit_by_pitch") {
    return "HBP";
  }

  if (
    rawResult === "batted_ball" ||
    pitch?.battedBallType ||
    pitch?.batted_ball_type ||
    pitch?.battedBallOutcome ||
    pitch?.batted_ball_outcome
  ) {
    return "In Play";
  }

  return getPitchResultLabel(rawResult || "Unknown");
}

function renderSimplePitchSequence(sequenceElement, atBat) {
  sequenceElement.innerHTML = "";

  if (!atBat || !Array.isArray(atBat.pitches) || atBat.pitches.length === 0) {
    const emptyItem = document.createElement("p");
    emptyItem.className = "empty-state compact-empty";
    emptyItem.textContent = "No pitches logged yet.";
    sequenceElement.appendChild(emptyItem);
    return;
  }

  atBat.pitches.forEach((pitch, index) => {
    const item = document.createElement("article");
    item.className = "pitch-chip pitch-chip-simple";
    item.textContent = `Pitch ${index + 1}: ${getSimplePitchResultLabel(pitch)}`;
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

    const heading = document.createElement("div");
    const title = document.createElement("strong");
    heading.className = "saved-at-bat-heading";
    title.className = "saved-at-bat-title";
    title.textContent = `At-Bat ${index + 1} • ${getOutcomeLabel(atBat.finalOutcome || atBat.outcome || "Complete")}`;

    const sequence = document.createElement("div");
    sequence.className = "pitch-sequence";
    renderSimplePitchSequence(sequence, atBat);

    heading.appendChild(title);
    item.appendChild(heading);
    item.appendChild(sequence);
    listElement.appendChild(item);
  });
}

function initGamesPage(games) {
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
  const gamesEmpty = document.getElementById("empty-state");
  const activeTournamentsList = document.getElementById("active-tournaments-list");
  const activeTournamentsEmpty = document.getElementById("active-tournaments-empty");
  const tournamentDetailsView = document.getElementById("tournament-details-view");
  const tournamentDetailsTitle = document.getElementById("tournament-details-title");
  const tournamentDetailsDates = document.getElementById("tournament-details-dates");
  const tournamentDetailsCount = document.getElementById("tournament-details-count");
  const tournamentDetailsGames = document.getElementById("tournament-details-games");
  const tournamentDetailsEmpty = document.getElementById("tournament-details-empty");
  const tournamentDetailsAddGame = document.getElementById("tournament-details-add-game");
  const tournamentDetailsBack = document.getElementById("tournament-details-back");
  const tournamentCompletedToggle = document.getElementById("tournament-completed-toggle");
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
    !gamesEmpty ||
    !activeTournamentsList ||
    !activeTournamentsEmpty ||
    !tournamentDetailsView ||
    !tournamentDetailsTitle ||
    !tournamentDetailsDates ||
    !tournamentDetailsCount ||
    !tournamentDetailsGames ||
    !tournamentDetailsEmpty ||
    !tournamentDetailsAddGame ||
    !tournamentDetailsBack ||
    !tournamentCompletedToggle ||
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
    selectedTournamentId: "",
    reviewReturnView: "home",
    reviewGameId: "",
    editingAtBatIndex: null,
    editingAtBatDraft: null,
    workflowEditAtBatIndex: null,
    workflowEditOriginalAtBat: null,
    activePitchIndex: null,
    pendingProductiveOutOutcome: "",
    stepHistory: [],
    step: "at_bat_details",
    activePitchCompleted: false,
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
  function getPitchTypeOptions() {
    return PITCH_TYPES_BY_SPORT[getCurrentSportType()] || PITCH_TYPES_BY_SPORT[DEFAULT_SPORT_TYPE];
  }
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
    const tournamentGames = games.filter((game) => getTournamentKey(game) === tournamentId);
    const highestGameNumber = tournamentGames.reduce((highest, game) => {
      return Math.max(highest, Number(game.tournamentGameNumber) || 0);
    }, 0);

    return highestGameNumber + 1;
  }

  function createTournament(name) {
    return {
      id: createId("tournament"),
      name,
      completed: false,
    };
  }

  function getTournamentById(tournamentId) {
    return getTournamentGroups(games).find((tournament) => tournament.id === tournamentId) || null;
  }

  function getTournamentGameCountText(gameCount) {
    return `${gameCount} ${gameCount === 1 ? "Game" : "Games"} Logged`;
  }

  function renderRecentGames() {
    gamesTableBody.innerHTML = "";
    sortGamesByDateDesc(games)
      .slice(0, 5)
      .forEach((game) => appendSimpleGameRow(gamesTableBody, getGameStats(game), game.opponent, { clickable: true }));
    gamesEmpty.hidden = gamesTableBody.children.length > 0;
  }

  function openTournamentGame(tournament) {
    showNewGameView({
      id: tournament.id,
      name: tournament.name,
      completed: tournament.completed === true,
    });
  }

  function renderActiveTournaments() {
    const activeTournaments = getTournamentGroups(games).filter((tournament) => !tournament.completed);
    activeTournamentsList.innerHTML = "";

    activeTournaments.forEach((tournament) => {
      const card = document.createElement("article");
      const content = document.createElement("div");
      const name = document.createElement("h3");
      const date = document.createElement("p");
      const gameCount = document.createElement("p");
      const addGame = document.createElement("button");

      card.className = "tournament-card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Open ${tournament.name} tournament details`);
      content.className = "tournament-card-content";
      name.textContent = tournament.name;
      date.className = "tournament-card-date";
      date.textContent = `Starts ${formatDisplayDate(tournament.startDate)}`;
      gameCount.className = "tournament-card-count";
      gameCount.textContent = getTournamentGameCountText(tournament.games.length);
      addGame.type = "button";
      addGame.textContent = "Add Game";

      addGame.addEventListener("click", (event) => {
        event.stopPropagation();
        openTournamentGame(tournament);
      });
      card.addEventListener("click", (event) => {
        if (!event.target.closest("button")) {
          showTournamentDetails(tournament.id);
        }
      });
      card.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target === card) {
          event.preventDefault();
          showTournamentDetails(tournament.id);
        }
      });

      content.appendChild(name);
      content.appendChild(date);
      content.appendChild(gameCount);
      card.appendChild(content);
      card.appendChild(addGame);
      activeTournamentsList.appendChild(card);
    });

    activeTournamentsEmpty.hidden = activeTournaments.length > 0;
  }

  function renderGamesHome() {
    updateSummaryCards(games);
    renderRecentGames();
    renderActiveTournaments();
  }

  function renderTournamentDetails() {
    const tournament = getTournamentById(state.selectedTournamentId);

    if (!tournament) {
      showHomeView();
      return;
    }

    tournamentDetailsTitle.textContent = tournament.name;
    tournamentDetailsDates.textContent = formatTournamentDateRange(tournament);
    tournamentDetailsCount.textContent = getTournamentGameCountText(tournament.games.length);
    tournamentCompletedToggle.checked = tournament.completed;
    tournamentDetailsGames.innerHTML = "";
    sortTournamentGames(tournament.games).forEach((game) => {
      appendSimpleGameRow(tournamentDetailsGames, getGameStats(game), game.opponent, { clickable: true });
    });
    tournamentDetailsEmpty.hidden = tournamentDetailsGames.children.length > 0;
  }

  function showTournamentDetails(tournamentId) {
    state.selectedTournamentId = tournamentId;
    homeView.hidden = true;
    reviewListView.hidden = true;
    reviewView.hidden = true;
    tournamentDetailsView.hidden = false;
    choiceView.hidden = true;
    tournamentNameView.hidden = true;
    newGameView.hidden = true;
    renderTournamentDetails();
  }

  function setTournamentCompletion(tournamentId, completed) {
    games
      .filter((game) => getTournamentKey(game) === tournamentId)
      .slice()
      .forEach((game) => {
        upsertSavedGame(games, {
          ...game,
          tournamentCompleted: completed,
        });
      });

    if (state.activeTournament?.id === tournamentId) {
      state.activeTournament.completed = completed;
    }

    renderActiveTournaments();
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
      tournamentCompleted: tournament ? tournament.completed === true : false,
    };
  }

  function createDraftAtBat() {
    return {
      id: createId("at-bat"),
      pitcherHandedness: "Right-handed",
      pitcherVelocity: "",
      hardHitBall: null,
      productiveOut: false,
      timing: "",
      pitches: [],
      finalOutcome: "",
    };
  }

  function cloneAtBatForWorkflow(atBat) {
    return normalizeAtBat(JSON.parse(JSON.stringify(atBat || createDraftAtBat())));
  }

  function resetWorkflowEditState() {
    state.workflowEditAtBatIndex = null;
    state.workflowEditOriginalAtBat = null;
    state.activePitchIndex = null;
  }

  function setMessage(text, success = false) {
    formMessage.textContent = text;
    formMessage.classList.toggle("is-success", success);
  }

  function showHomeView() {
    homeView.hidden = false;
    reviewListView.hidden = true;
    reviewView.hidden = true;
    tournamentDetailsView.hidden = true;
    choiceView.hidden = true;
    tournamentNameView.hidden = true;
    newGameView.hidden = true;
    state.reviewGameId = "";
    state.editingAtBatIndex = null;
    state.editingAtBatDraft = null;
    state.selectedTournamentId = "";
    reviewMessage.textContent = "";
    renderGamesHome();
  }

  function showReviewListView() {
    homeView.hidden = true;
    reviewListView.hidden = false;
    reviewView.hidden = true;
    tournamentDetailsView.hidden = true;
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
    tournamentDetailsView.hidden = true;
    choiceView.hidden = false;
    tournamentNameView.hidden = true;
    newGameView.hidden = true;
  }

  function showTournamentNameView() {
    homeView.hidden = true;
    reviewListView.hidden = true;
    reviewView.hidden = true;
    tournamentDetailsView.hidden = true;
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
    tournamentDetailsView.hidden = true;
    choiceView.hidden = true;
    tournamentNameView.hidden = true;
    newGameView.hidden = false;
    dateInput.value = getDefaultDate();
    opponentInput.value = "";
    state.draftGame = createDraftGame();
    state.activeAtBat = null;
    state.activePitch = null;
    state.activePitchCompleted = false;
    resetWorkflowEditState();
    state.pendingProductiveOutOutcome = "";
    resetStepHistory();
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
      state.draftGame.tournamentCompleted = state.activeTournament.completed === true;
    } else {
      state.draftGame.tournamentId = null;
      state.draftGame.tournamentName = null;
      state.draftGame.tournamentGameNumber = null;
      state.draftGame.tournamentCompleted = false;
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

  function updateActivePitchLocation(location) {
    if (!state.activePitch) {
      state.activePitch = createPitch(location);
    }

    state.activePitch.location = {
      id: location.id,
      label: location.label,
      isZone: location.isZone,
    };
    state.activePitch.locationId = location.id;
    state.activePitch.locationLabel = location.label;
    state.activePitch.pitch_location = location.id;

    if (state.activeAtBat && Number.isInteger(state.activePitchIndex) && state.activePitchIndex >= 0) {
      state.activeAtBat.pitches[state.activePitchIndex] = state.activePitch;
    }
  }

  function getPitchLocationFromSavedPitch(pitch) {
    const locationId =
      (pitch && pitch.location && typeof pitch.location === "object" ? pitch.location.id : "") ||
      pitch?.locationId ||
      pitch?.pitch_location ||
      (typeof pitch?.location === "string" ? pitch.location : "");
    const locationLabel =
      (pitch && pitch.location && typeof pitch.location === "object" ? pitch.location.label : "") ||
      pitch?.locationLabel ||
      "";
    const matchingLocation = pitchLocations.find((location) => {
      return (
        location.id === locationId ||
        location.label === locationId ||
        location.id === locationLabel ||
        location.label === locationLabel
      );
    });

    return matchingLocation || pitchLocations.find((location) => location.id === "zone-5") || pitchLocations[0];
  }

  function setActivePitchFromIndex(index) {
    if (!state.activeAtBat || !Array.isArray(state.activeAtBat.pitches)) {
      state.activePitch = null;
      state.activePitchIndex = null;
      return;
    }

    const pitch = state.activeAtBat.pitches[index];

    if (!pitch) {
      state.activePitch = null;
      state.activePitchIndex = null;
      return;
    }

    state.activePitch = pitch;
    state.activePitchIndex = index;
    state.activePitchCompleted = true;
  }

  function startWorkflowEditAtBat(index) {
    const atBat = state.draftGame?.atBats?.[index];

    if (!atBat || state.activeAtBat) {
      return;
    }

    state.workflowEditAtBatIndex = index;
    state.workflowEditOriginalAtBat = cloneAtBatForWorkflow(atBat);
    state.activeAtBat = cloneAtBatForWorkflow(atBat);

    if (!Array.isArray(state.activeAtBat.pitches)) {
      state.activeAtBat.pitches = [];
    }

    if (state.activeAtBat.pitches.length === 0) {
      state.activeAtBat.pitches.push(createPitch(pitchLocations.find((location) => location.id === "zone-5") || pitchLocations[0]));
    }

    setActivePitchFromIndex(0);
    state.pendingProductiveOutOutcome = "";
    resetStepHistory();
    state.stepHistory.push("at_bat_details");
    state.step = "location";
    setMessage("", false);
    renderAtBats();
  }

  function cancelWorkflowEditAtBat() {
    state.activeAtBat = null;
    state.activePitch = null;
    state.activePitchCompleted = false;
    state.pendingProductiveOutOutcome = "";
    resetWorkflowEditState();
    resetStepHistory();
    state.step = "at_bat_details";
    setMessage("At-bat edit canceled.", false);
    renderAtBats();
  }

  function createButton(option, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.addEventListener("click", () => onClick(option.value));
    return button;
  }

  function goToStep(nextStep, { trackHistory = true } = {}) {
    if (trackHistory && state.step !== nextStep) {
      state.stepHistory.push(state.step);
    }

    state.step = nextStep;
    renderAtBats();
  }

  function backStep() {
    const previousStep = state.stepHistory.pop();

    if (!previousStep) {
      return;
    }

    if (
      previousStep === "location" &&
      state.activePitchCompleted &&
      state.activeAtBat &&
      state.activePitch &&
      !Number.isInteger(state.workflowEditAtBatIndex)
    ) {
      state.activeAtBat.pitches = state.activeAtBat.pitches.filter((pitch) => pitch !== state.activePitch);
      state.activePitchCompleted = false;
    }

    state.step = previousStep;
    renderAtBats();
  }

  function resetStepHistory() {
    state.stepHistory = [];
  }

  function renderBackButton() {
    const actions = document.createElement("div");
    const backButton = document.createElement("button");

    actions.className = "builder-actions game-entry-actions step-back-actions";
    backButton.type = "button";
    backButton.className = "secondary-button step-back-button";
    backButton.textContent = "Back";
    backButton.addEventListener("click", backStep);
    actions.appendChild(backButton);
    return actions;
  }

  function canGoBackStep() {
    return state.stepHistory.length > 0 && state.step !== "at_bat_details";
  }

  function renderOptionGroup(titleText, options, onClick, selectedValue = null, infoKey = "") {
    const wrap = document.createElement("div");
    wrap.className = "result-stack";

    const title = document.createElement("h4");
    title.textContent = titleText;

    if (infoKey) {
      title.dataset.metricInfo = infoKey;
      window.renderMetricInfoButton?.(title, infoKey);
    }

    wrap.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "choice-grid";
    options.forEach((option) => {
      const button = createButton(option, onClick);

      if (selectedValue !== null && String(option.value) === String(selectedValue)) {
        button.classList.add("is-selected");
        button.setAttribute("aria-pressed", "true");
      }

      grid.appendChild(button);
    });

    wrap.appendChild(grid);
    return wrap;
  }

  function renderHitLocationSelector() {
    const wrap = document.createElement("div");
    const title = document.createElement("h4");
    const helper = document.createElement("p");
    const fieldButton = document.createElement("button");
    const image = document.createElement("img");
    const selectedMarker = document.createElement("span");
    const selectedText = document.createElement("p");
    const nextButton = document.createElement("button");

    function clampCoordinate(value) {
      return Math.min(1, Math.max(0, value));
    }

    function hasSelectedLocation() {
      return Boolean(
        state.activePitch &&
        Number.isFinite(state.activePitch.hitLocationX) &&
        Number.isFinite(state.activePitch.hitLocationY)
      );
    }

    function updateSelectedMarker() {
      if (!hasSelectedLocation()) {
        selectedMarker.hidden = true;
        selectedText.textContent = "Tap the field image to set batted ball location.";
        nextButton.disabled = true;
        return;
      }

      const x = state.activePitch.hitLocationX;
      const y = state.activePitch.hitLocationY;
      selectedMarker.hidden = false;
      selectedMarker.style.left = `${x * 100}%`;
      selectedMarker.style.top = `${y * 100}%`;
      selectedText.textContent = `Selected location: x ${x.toFixed(2)}, y ${y.toFixed(2)}`;
      nextButton.disabled = false;
    }

    function selectHitPoint(event) {
      const bounds = fieldButton.getBoundingClientRect();
      if (!bounds.width || !bounds.height) {
        return;
      }

      const normalizedX = clampCoordinate((event.clientX - bounds.left) / bounds.width);
      const normalizedY = clampCoordinate((event.clientY - bounds.top) / bounds.height);

      handleHitLocation({
        x: normalizedX,
        y: normalizedY,
      });
      updateSelectedMarker();
    }

    wrap.className = "result-stack hit-location-wrap";
    title.textContent = "Batted Ball Location";
    helper.className = "hit-location-helper";
    helper.textContent = "Tap where the ball was hit, then continue.";

    fieldButton.type = "button";
    fieldButton.className = "hit-location-image-button";
    fieldButton.setAttribute("aria-label", "Tap the field where the ball was hit");
    fieldButton.addEventListener("click", selectHitPoint);

    image.className = "hit-location-image";
    image.src = "assets/spray-chart-placeholder.png";
    image.alt = "";
    image.draggable = false;

    selectedMarker.className = "hit-location-selected-marker";
    selectedMarker.hidden = true;

    selectedText.className = "hit-location-selection-text";

    nextButton.type = "button";
    nextButton.textContent = "Next";
    nextButton.addEventListener("click", () => {
      if (!hasSelectedLocation()) {
        return;
      }

      goToStep("batted_ball_outcome");
    });

    fieldButton.appendChild(image);
    fieldButton.appendChild(selectedMarker);

    wrap.appendChild(title);
    wrap.appendChild(helper);
    wrap.appendChild(fieldButton);
    wrap.appendChild(selectedText);
    wrap.appendChild(nextButton);
    updateSelectedMarker();
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

    getPitchTypeOptions().forEach((option) => {
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
    velocityText.dataset.metricInfo = "pitcherVelocity";
    window.renderMetricInfoButton?.(velocityText, "pitcherVelocity");
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
      goToStep("location");
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
      timing: normalizeTiming(atBat.timing),
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
      timing: isBattedEditOutcome(draft.outcome) ? normalizeTiming(draft.timing) : "",
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
      renderEditSelect("Timing", draft.timing, [
        { label: "Not Set", value: "" },
        ...timingOptions,
      ], (value) => {
        draft.timing = normalizeTiming(value);
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
    velocityText.dataset.metricInfo = "pitcherVelocity";
    window.renderMetricInfoButton?.(velocityText, "pitcherVelocity");
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
      renderGamesHome();
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
      const sequence = document.createElement("div");

      card.className = "saved-at-bat review-at-bat-card";
      heading.className = "review-at-bat-heading";
      title.className = "saved-at-bat-title";
      title.textContent = `At-Bat ${index + 1} • ${getOutcomeLabel(atBat.finalOutcome || atBat.outcome || "Complete")}`;
      editButton.type = "button";
      editButton.className = "saved-at-bat-edit-link";
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

      sequence.className = "pitch-sequence";
      renderSimplePitchSequence(sequence, atBat);

      card.appendChild(heading);
      card.appendChild(sequence);

      if (state.editingAtBatIndex === index && state.editingAtBatDraft) {
        card.appendChild(renderEditAtBatForm(atBat, index));
      }

      reviewAtBatList.appendChild(card);
    });
  }

  function showGameReview(gameId, returnView = "review-list") {
    state.reviewGameId = gameId;
    state.reviewReturnView = returnView;
    state.editingAtBatIndex = null;
    state.editingAtBatDraft = null;
    homeView.hidden = true;
    reviewListView.hidden = true;
    reviewView.hidden = false;
    tournamentDetailsView.hidden = true;
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
      const heading = document.createElement("div");
      const title = document.createElement("strong");
      const editButton = document.createElement("button");

      heading.className = "saved-at-bat-heading";
      title.className = "saved-at-bat-title";
      title.textContent = `At-Bat ${index + 1} • ${getOutcomeLabel(atBat.finalOutcome || atBat.outcome || "Complete")}`;
      editButton.type = "button";
      editButton.className = "saved-at-bat-edit-link";
      editButton.textContent = "Edit";
      editButton.disabled = Boolean(state.activeAtBat);
      editButton.addEventListener("click", () => {
        startWorkflowEditAtBat(index);
      });
      heading.appendChild(title);
      heading.appendChild(editButton);
      card.appendChild(heading);

      const sequence = document.createElement("div");
      sequence.className = "pitch-sequence";
      renderSimplePitchSequence(sequence, atBat);
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

    const isEditingWorkflow = Number.isInteger(state.workflowEditAtBatIndex);
    const heading = document.createElement("div");
    const title = document.createElement("strong");
    heading.className = "saved-at-bat-heading";
    title.className = "saved-at-bat-title";
    title.textContent = isEditingWorkflow
      ? `Editing At-Bat ${state.workflowEditAtBatIndex + 1}`
      : `At-Bat ${state.draftGame.atBats.length + 1}`;
    heading.appendChild(title);

    if (isEditingWorkflow) {
      const cancelEditButton = document.createElement("button");
      cancelEditButton.type = "button";
      cancelEditButton.className = "secondary-button saved-at-bat-edit-button";
      cancelEditButton.textContent = "Cancel Edit";
      cancelEditButton.addEventListener("click", cancelWorkflowEditAtBat);
      heading.appendChild(cancelEditButton);
    }

    card.appendChild(heading);

    const prompt = document.createElement("p");
    prompt.className = "section-copy";
    prompt.textContent =
      state.step === "at_bat_details"
        ? "Enter pitcher details before logging pitches."
        : state.step === "pitch_type"
          ? "Choose the pitch type."
        : state.step === "hard_hit_ball"
          ? "Answer the contact detail."
        : state.step === "productive_out"
          ? "Did this out move or score a runner?"
        : state.step === "timing"
          ? "Select your timing."
          : state.step === "batted_ball_location"
            ? "Choose the batted ball location."
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
      helper.textContent = "This is the catcher's perspective of the pitch location.";
      renderStrikeZoneLayout(zone, {
        interactive: true,
        onSelectLocation(location) {
          if (Number.isInteger(state.activePitchIndex) && state.activePitch) {
            updateActivePitchLocation(location);
          } else {
            state.activePitch = createPitch(location);
          }
          state.activePitchCompleted = false;
          goToStep("pitch_type");
        },
        selectedLocationId: state.activePitch ? getPitchLocationFromSavedPitch(state.activePitch).id : "",
      });
      card.appendChild(zone);
      card.appendChild(helper);
    }

    if (state.step === "pitch_type") {
      card.appendChild(renderOptionGroup("Pitch Type", getPitchTypeOptions(), handlePitchType, getStoredPitchType(state.activePitch?.pitchType || state.activePitch?.pitch_type || ""), "pitchType"));
    }

    if (state.step === "pitch_result") {
      card.appendChild(renderOptionGroup("Pitch Result", pitchResultOptions, handlePitchResult, state.activePitch?.primaryResult || state.activePitch?.result || ""));
    }

    if (state.step === "strike_type") {
      card.appendChild(renderOptionGroup("Strike Type", strikeOptions, handleStrikeType, state.activePitch?.strikeType || state.activePitch?.strikeDetail || ""));
    }

    if (state.step === "foul_direction") {
      card.appendChild(renderOptionGroup("Foul Direction", foulDirectionOptions, handleFoulDirection, state.activePitch?.foulDirection || ""));
    }

    if (state.step === "batted_ball_type") {
      card.appendChild(renderOptionGroup("Batted Ball Type", battedBallTypeOptions, handleBattedBallType, state.activePitch?.battedBallType || state.activePitch?.batted_ball_type || state.activePitch?.contact_type || ""));
    }

    if (state.step === "batted_ball_location") {
      card.appendChild(renderHitLocationSelector());
    }

    if (state.step === "batted_ball_outcome") {
      card.appendChild(renderOptionGroup("Batted Ball Outcome", battedBallOutcomeOptions, handleBattedBallOutcome, state.activePitch?.battedBallOutcome || state.activePitch?.batted_ball_outcome || state.activePitch?.outcome || ""));
    }

    if (state.step === "hard_hit_ball") {
      card.appendChild(renderOptionGroup("Hard hit ball?", hardHitBallOptions, handleHardHitBall, typeof state.activeAtBat?.hardHitBall === "boolean" ? state.activeAtBat.hardHitBall : null));
    }

    if (state.step === "productive_out") {
      card.appendChild(renderOptionGroup("Did this out move or score a runner?", productiveOutOptions, handleProductiveOut, state.activeAtBat?.productiveOut === true));
    }

    if (state.step === "timing") {
      card.appendChild(renderOptionGroup("How was your timing?", timingOptions, handleTiming, state.activeAtBat?.timing || ""));
    }

    if (state.step === "pitch_actions") {
      card.appendChild(renderActionButtons(true));
    }

    if (state.step === "end_at_bat") {
      card.appendChild(renderActionButtons(false));
    }

    if (canGoBackStep()) {
      card.appendChild(renderBackButton());
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
    endAtBat.textContent =
      state.step === "end_at_bat"
        ? Number.isInteger(state.workflowEditAtBatIndex)
          ? "Save Changes"
          : "Save At-Bat"
        : "Finish At-Bat";
    endAtBat.addEventListener("click", endAtBatFlow);
    actions.appendChild(endAtBat);

    return actions;
  }

  function completeCurrentPitch() {
    if (!state.activeAtBat || !state.activePitch) {
      return;
    }

    if (!state.activeAtBat.pitches.includes(state.activePitch)) {
      if (Number.isInteger(state.activePitchIndex) && state.activePitchIndex >= 0) {
        state.activeAtBat.pitches[state.activePitchIndex] = state.activePitch;
      } else {
        state.activeAtBat.pitches.push(state.activePitch);
        state.activePitchIndex = state.activeAtBat.pitches.length - 1;
      }
    }

    state.activePitchCompleted = true;
  }

  function handlePitchType(pitchType) {
    if (!state.activePitch) {
      return;
    }

    state.activePitch.pitchType = getStoredPitchType(pitchType);
    state.activePitch.pitch_type = state.activePitch.pitchType;
    goToStep("pitch_result");
  }

  function handlePitchResult(result) {
    if (!state.activePitch) {
      return;
    }

    state.activePitch.result = result;
    state.activePitch.primaryResult = result;
    state.activePitch.pitch_result = result;
    state.activePitch.swing_result = result;
    state.activePitchCompleted = false;
    delete state.activePitch.strikeType;
    delete state.activePitch.strikeDetail;
    delete state.activePitch.foulDirection;
    delete state.activePitch.battedBallType;
    delete state.activePitch.batted_ball_type;
    delete state.activePitch.contact_type;
    delete state.activePitch.hitLocation;
    delete state.activePitch.hit_location;
    delete state.activePitch.hitLocationX;
    delete state.activePitch.hitLocationY;
    delete state.activePitch.hit_location_x;
    delete state.activePitch.hit_location_y;
    delete state.activePitch.battedBallOutcome;
    delete state.activePitch.batted_ball_outcome;
    delete state.activePitch.outcome;
    delete state.activePitch.chartResult;
    state.activeAtBat.finalOutcome = "";
    state.activeAtBat.productiveOut = false;
    state.activeAtBat.hardHitBall = null;
    state.activeAtBat.timing = "";
    state.pendingProductiveOutOutcome = "";

    if (result === "strike") {
      goToStep("strike_type");
      return;
    }

    if (result === "batted_ball") {
      goToStep("batted_ball_type");
      return;
    }

    if (result === "foul_ball") {
      goToStep("foul_direction");
      return;
    }

    if (result === "hit_by_pitch") {
      state.activePitch.battedBallOutcome = "hit_by_pitch";
      state.activePitch.batted_ball_outcome = "hit_by_pitch";
      state.activePitch.outcome = "hit_by_pitch";
      state.activeAtBat.finalOutcome = "hit_by_pitch";
      completeCurrentPitch();
      goToStep("end_at_bat");
      return;
    }

    completeCurrentPitch();
    goToStep("pitch_actions");
  }

  function handleFoulDirection(direction) {
    state.activePitch.foulDirection = direction;
    state.activePitch.chartResult = direction;
    completeCurrentPitch();
    goToStep("pitch_actions");
  }

  function handleStrikeType(strikeType) {
    state.activePitch.strikeType = strikeType;
    state.activePitch.pitch_result = strikeType;
    state.activePitch.swing_result = strikeType;
    completeCurrentPitch();
    goToStep("pitch_actions");
  }

  function handleBattedBallType(battedBallType) {
    state.activePitch.battedBallType = battedBallType;
    state.activePitch.batted_ball_type = battedBallType;
    state.activePitch.contact_type = battedBallType;
    goToStep("batted_ball_location");
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

    if (hitLocation && typeof hitLocation === "object") {
      return;
    }

    goToStep("batted_ball_outcome");
  }

  function handleBattedBallOutcome(outcome) {
    state.activePitch.battedBallOutcome = outcome;
    state.activePitch.batted_ball_outcome = outcome;
    state.activePitch.outcome = outcome;
    state.activePitch.chartResult = outcome;
    state.activeAtBat.finalOutcome = outcome;
    state.activeAtBat.productiveOut = false;
    state.activeAtBat.hardHitBall = null;
    state.activeAtBat.timing = "";
    const normalizedOutcome = normalizeLegacyOutcome(outcome, state.activePitch.battedBallType || "");

    if (isAutomaticallyProductiveOut(normalizedOutcome)) {
      state.activeAtBat.productiveOut = true;
    }

    state.pendingProductiveOutOutcome = isOutOutcome(normalizedOutcome) ? normalizedOutcome : "";
    completeCurrentPitch();
    goToStep(isOutOutcome(normalizedOutcome) ? "productive_out" : "hard_hit_ball");
  }

  function handleProductiveOut(isProductiveOut) {
    if (!state.activeAtBat) {
      return;
    }

    state.activeAtBat.productiveOut =
      isProductiveOut || isAutomaticallyProductiveOut(state.pendingProductiveOutOutcome);
    state.pendingProductiveOutOutcome = "";
    goToStep("hard_hit_ball");
  }

  function handleHardHitBall(isHardHit) {
    if (!state.activeAtBat) {
      return;
    }

    state.activeAtBat.hardHitBall = isHardHit;
    goToStep("timing");
  }

  function handleTiming(timing) {
    if (!state.activeAtBat) {
      return;
    }

    state.activeAtBat.timing = normalizeTiming(timing);
    goToStep("end_at_bat");
  }

  function startNextPitch() {
    completeCurrentPitch();

    if (
      Number.isInteger(state.workflowEditAtBatIndex) &&
      Number.isInteger(state.activePitchIndex) &&
      state.activeAtBat?.pitches?.[state.activePitchIndex + 1]
    ) {
      setActivePitchFromIndex(state.activePitchIndex + 1);
      resetStepHistory();
      state.step = "location";
      renderAtBats();
      return;
    }

    state.activePitch = null;
    state.activePitchIndex = null;
    state.activePitchCompleted = false;
    resetStepHistory();
    state.step = "location";
    renderAtBats();
  }

  function endAtBatFlow() {
    if (!state.activeAtBat) {
      return;
    }

    completeCurrentPitch();

    if (
      Number.isInteger(state.workflowEditAtBatIndex) &&
      Number.isInteger(state.activePitchIndex) &&
      Array.isArray(state.activeAtBat.pitches)
    ) {
      state.activeAtBat.pitches = state.activeAtBat.pitches.slice(0, state.activePitchIndex + 1);
    }

    if (!state.activeAtBat.finalOutcome) {
      const lastPitch = state.activeAtBat.pitches[state.activeAtBat.pitches.length - 1];
      state.activeAtBat.finalOutcome = lastPitch ? lastPitch.battedBallOutcome || lastPitch.strikeType || lastPitch.result : "";
    }

    if (hasBallInPlay(state.activeAtBat) && !normalizeTiming(state.activeAtBat.timing)) {
      state.step = "timing";
      setMessage("Select your timing before saving this at-bat.");
      renderAtBats();
      return;
    }

    const wasEditingWorkflow = Number.isInteger(state.workflowEditAtBatIndex) && state.workflowEditAtBatIndex >= 0;

    if (wasEditingWorkflow) {
      state.draftGame.atBats[state.workflowEditAtBatIndex] = normalizeAtBat(state.activeAtBat);
    } else {
      state.draftGame.atBats.push(normalizeAtBat(state.activeAtBat));
    }

    syncDraftFields();
    if (state.draftGame.date && state.draftGame.opponent) {
      state.draftGame = upsertSavedGame(games, state.draftGame);
      renderGamesHome();
    }

    state.activeAtBat = null;
    state.activePitch = null;
    state.activePitchIndex = null;
    state.activePitchCompleted = false;
    state.pendingProductiveOutOutcome = "";
    resetWorkflowEditState();
    resetStepHistory();
    state.step = "at_bat_details";
    setMessage(wasEditingWorkflow ? "At-bat updated." : "At-bat saved to this game.", true);
    renderAtBats();
  }

  reviewGamesTableBody.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-game-id]");
    const row = event.target.closest(".clickable-game-row");
    const gameId = actionButton?.dataset.gameId || row?.dataset.gameId || "";

    if (gameId) {
      showGameReview(gameId, "review-list");
    }
  });

  reviewGamesTableBody.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const row = event.target.closest(".clickable-game-row");

    if (row?.dataset.gameId) {
      event.preventDefault();
      showGameReview(row.dataset.gameId, "review-list");
    }
  });

  gamesTableBody.addEventListener("click", (event) => {
    const row = event.target.closest(".clickable-game-row");

    if (row?.dataset.gameId) {
      showGameReview(row.dataset.gameId, "home");
    }
  });

  gamesTableBody.addEventListener("keydown", (event) => {
    const row = event.target.closest(".clickable-game-row");

    if ((event.key === "Enter" || event.key === " ") && row?.dataset.gameId) {
      event.preventDefault();
      showGameReview(row.dataset.gameId, "home");
    }
  });

  tournamentDetailsGames.addEventListener("click", (event) => {
    const row = event.target.closest(".clickable-game-row");

    if (row?.dataset.gameId) {
      showGameReview(row.dataset.gameId, "tournament");
    }
  });

  tournamentDetailsGames.addEventListener("keydown", (event) => {
    const row = event.target.closest(".clickable-game-row");

    if ((event.key === "Enter" || event.key === " ") && row?.dataset.gameId) {
      event.preventDefault();
      showGameReview(row.dataset.gameId, "tournament");
    }
  });

  reviewGamesButton.addEventListener("click", showReviewListView);
  reviewListBackButton.addEventListener("click", showHomeView);
  reviewBackButton.addEventListener("click", () => {
    if (state.reviewReturnView === "tournament" && state.selectedTournamentId) {
      showTournamentDetails(state.selectedTournamentId);
    } else if (state.reviewReturnView === "home") {
      showHomeView();
    } else {
      showReviewListView();
    }
  });
  addGameButton.addEventListener("click", showChoiceView);
  choiceBackButton.addEventListener("click", showHomeView);
  startTournamentButton.addEventListener("click", showTournamentNameView);
  tournamentBackButton.addEventListener("click", showChoiceView);
  singleGameButton.addEventListener("click", () => {
    showNewGameView(null);
  });
  backButton.addEventListener("click", showHomeView);
  tournamentDetailsBack.addEventListener("click", showHomeView);
  tournamentDetailsAddGame.addEventListener("click", () => {
    const tournament = getTournamentById(state.selectedTournamentId);

    if (tournament) {
      openTournamentGame(tournament);
    }
  });
  tournamentCompletedToggle.addEventListener("change", () => {
    const tournamentId = state.selectedTournamentId;

    if (!tournamentId) {
      return;
    }

    setTournamentCompletion(tournamentId, tournamentCompletedToggle.checked);
    renderTournamentDetails();
  });

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

    setTournamentCompletion(state.activeTournament.id, true);
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
    renderGamesHome();
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
    state.activePitchIndex = null;
    state.activePitchCompleted = false;
    resetWorkflowEditState();
    state.pendingProductiveOutOutcome = "";
    resetStepHistory();
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

  const requestedReviewGameId = new URLSearchParams(window.location.search).get("reviewGameId");
  if (requestedReviewGameId && games.some((game) => getGameStats(game).id === requestedReviewGameId)) {
    showGameReview(requestedReviewGameId, "home");
  } else {
    showHomeView();
  }
}

function initAllGamesPage(games) {
  const tableBody = document.getElementById("all-games-table-body");
  const emptyState = document.getElementById("all-games-empty");
  const pagination = document.getElementById("all-games-pagination");
  const gamesPerPage = 20;
  let currentPage = 1;

  if (!tableBody || !emptyState || !pagination) {
    return;
  }

  function getPageCount() {
    return Math.max(1, Math.ceil(games.length / gamesPerPage));
  }

  function renderPagination(pageCount) {
    pagination.innerHTML = "";
    pagination.hidden = games.length <= gamesPerPage;

    if (pagination.hidden) {
      return;
    }

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pagination-button";
      button.textContent = String(pageNumber);
      button.setAttribute("aria-label", `Go to page ${pageNumber}`);
      button.setAttribute("aria-current", pageNumber === currentPage ? "page" : "false");
      button.addEventListener("click", () => {
        currentPage = pageNumber;
        renderAllGames();
      });
      pagination.appendChild(button);
    }
  }

  function renderAllGames() {
    const sortedGames = sortGamesByDateDesc(games);
    const pageCount = getPageCount();
    const startIndex = (currentPage - 1) * gamesPerPage;
    const pageGames = sortedGames.slice(startIndex, startIndex + gamesPerPage);

    renderGameSummaryTable(tableBody, pageGames, { clickable: true });
    emptyState.hidden = sortedGames.length > 0;
    renderPagination(pageCount);
  }

  function openGame(gameId) {
    if (gameId) {
      window.location.href = `games.html?reviewGameId=${encodeURIComponent(gameId)}`;
    }
  }

  tableBody.addEventListener("click", (event) => {
    const row = event.target.closest(".clickable-game-row");
    openGame(row?.dataset.gameId || "");
  });

  tableBody.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const row = event.target.closest(".clickable-game-row");

    if (row?.dataset.gameId) {
      event.preventDefault();
      openGame(row.dataset.gameId);
    }
  });

  renderAllGames();
}

function initAdvancedPage(games) {
  const totals = getRateStats(games);
  const allAtBats = games.flatMap((game) => (Array.isArray(game.atBats) ? game.atBats : []));
  const hardHitMetrics = getHardHitMetrics(allAtBats);
  const advancedPercentMetrics = getAdvancedPercentMetrics(allAtBats, totals);
  const timingMetrics = getTimingMetrics(allAtBats);
  const performanceScore = calculateHittingLogPerformanceScore({ atBats: allAtBats, stats: totals });
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

  setText("hitting-log-performance-score", performanceScore);
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
  setText("on-time-percent", formatPercent(timingMetrics.onTimePercent));
  setText("early-percent", formatPercent(timingMetrics.earlyPercent));
  setText("late-percent", formatPercent(timingMetrics.latePercent));
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

        if (isBallInPlay) {
          summary.twoStrikeBallsInPlay += 1;

          if (isHardHit) {
            summary.twoStrikeHardHits += 1;
          }
        }
      }

      return summary;
    },
    {
      plateAppearances: 0,
      ballsInPlay: 0,
      hardHitBalls: 0,
      twoStrikeAtBats: 0,
      twoStrikeBallsInPlay: 0,
      twoStrikeHardHits: 0,
    }
  );

  return {
    hardHitPercent: metrics.ballsInPlay === 0 ? 0 : metrics.hardHitBalls / metrics.ballsInPlay,
    twoStrikePercent: metrics.plateAppearances === 0 ? 0 : metrics.twoStrikeAtBats / metrics.plateAppearances,
    hardHitTwoStrikePercent:
      metrics.twoStrikeBallsInPlay === 0
        ? null
        : metrics.twoStrikeHardHits / metrics.twoStrikeBallsInPlay,
    twoStrikeAtBats: metrics.twoStrikeAtBats,
    twoStrikeBallsInPlay: metrics.twoStrikeBallsInPlay,
    twoStrikeHardHits: metrics.twoStrikeHardHits,
  };
}

function getTimingMetrics(atBats) {
  const metrics = atBats.reduce(
    (summary, atBat) => {
      const timing = normalizeTiming(atBat.timing);

      if (!timing) {
        return summary;
      }

      summary.total += 1;

      if (timing === "on_time") {
        summary.onTime += 1;
      } else if (timing === "early") {
        summary.early += 1;
      } else if (timing === "late") {
        summary.late += 1;
      }

      return summary;
    },
    {
      total: 0,
      onTime: 0,
      early: 0,
      late: 0,
    }
  );

  return {
    onTimePercent: metrics.total === 0 ? 0 : metrics.onTime / metrics.total,
    earlyPercent: metrics.total === 0 ? 0 : metrics.early / metrics.total,
    latePercent: metrics.total === 0 ? 0 : metrics.late / metrics.total,
  };
}

function calculateHittingLogPerformanceScore(source) {
  const atBats = Array.isArray(source?.atBats) ? source.atBats : [];

  if (atBats.length === 0) {
    return null;
  }

  const totals = source?.stats || getRateStats([{ atBats }]);
  const hardHitMetrics = getHardHitMetrics(atBats);
  const advancedPercentMetrics = getAdvancedPercentMetrics(atBats, totals);
  const totalOuts = atBats.filter((atBat) => isOutOutcome(atBat.outcome)).length;
  const twoStrikePercent = hardHitMetrics.twoStrikePercent * 100;
  const hasHardHitTwoStrikePercent = hardHitMetrics.hardHitTwoStrikePercent !== null;
  const hardHitTwoStrikePercent = hasHardHitTwoStrikePercent
    ? hardHitMetrics.hardHitTwoStrikePercent * 100
    : null;
  const twoStrikeAdjustment = hasHardHitTwoStrikePercent
    ? 100 - (twoStrikePercent * ((100 - hardHitTwoStrikePercent) / 100))
    : 100 - twoStrikePercent;
  const components = [
    { value: hardHitMetrics.hardHitPercent * 100, weight: 0.45 },
    { value: advancedPercentMetrics.qualityAtBatPercent * 100, weight: 0.25 },
    { value: twoStrikeAdjustment, weight: 0.10 },
  ];

  if (totalOuts > 0) {
    components.splice(2, 0, {
      value: advancedPercentMetrics.productiveOutPercent * 100,
      weight: 0.20,
    });
  }

  const availableComponents = components.filter((component) => Number.isFinite(component.value));

  if (availableComponents.length === 0) {
    return null;
  }

  const totalWeight = availableComponents.reduce((sum, component) => sum + component.weight, 0);
  const rawScore = availableComponents.reduce((sum, component) => {
    return sum + (component.value * (component.weight / totalWeight));
  }, 0);

  return Math.min(100, Math.max(0, Math.round(rawScore)));
}

const performanceScoreClasses = [
  "performance-score-needs-work",
  "performance-score-good",
  "performance-score-exceptional",
];

function getPerformanceScoreStatus(score) {
  if (score === null || score === undefined) {
    return null;
  }

  const numericScore = Number(score);

  if (!Number.isFinite(numericScore)) {
    return null;
  }

  const normalizedScore = Math.min(100, Math.max(0, Math.round(numericScore)));

  if (normalizedScore >= 65) {
    return {
      label: "Exceptional",
      className: "performance-score-exceptional",
    };
  }

  if (normalizedScore >= 50) {
    return {
      label: "Good",
      className: "performance-score-good",
    };
  }

  return {
    label: "Needs Work",
    className: "performance-score-needs-work",
  };
}

function formatPerformanceScore(score) {
  if (score === null || score === undefined) {
    return "N/A";
  }

  const numericScore = Number(score);

  if (!Number.isFinite(numericScore)) {
    return "N/A";
  }

  const normalizedScore = Math.min(100, Math.max(0, Math.round(numericScore)));
  const status = getPerformanceScoreStatus(normalizedScore);

  return `${normalizedScore} - ${status.label}`;
}

function applyPerformanceScoreStatus(element, score) {
  const status = getPerformanceScoreStatus(score);

  element.classList.remove(...performanceScoreClasses);

  if (!status) {
    delete element.dataset.performanceScoreStatus;
    return;
  }

  element.classList.add(status.className);
  element.dataset.performanceScoreStatus = status.label;
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
  const startDateInput = document.getElementById("chart-start-date");
  const endDateInput = document.getElementById("chart-end-date");
  const generateButton = document.getElementById("generate-chart-button");
  const chartsEmpty = document.getElementById("charts-empty");
  const zoneMap = document.getElementById("chart-zone-map") || document.getElementById("zone-map");
  const filterTotal = document.getElementById("chart-filter-total");
  const chartLegend = document.getElementById("chart-legend");
  const chartZoneTitle = document.getElementById("chart-zone-title");

  if (!filterSelect || !startDateInput || !endDateInput || !generateButton || !chartsEmpty || !zoneMap || !filterTotal || !chartLegend || !chartZoneTitle) {
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

  function normalizeChartDate(value) {
    const trimmed = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
  }

  function getChartDateRange() {
    return {
      startDate: normalizeChartDate(startDateInput.value),
      endDate: normalizeChartDate(endDateInput.value),
    };
  }

  function isGameInChartDateRange(game, dateRange) {
    const gameDate = normalizeChartDate(game?.date);

    if (!gameDate) {
      return false;
    }

    if (dateRange.startDate && gameDate < dateRange.startDate) {
      return false;
    }

    if (dateRange.endDate && gameDate > dateRange.endDate) {
      return false;
    }

    return true;
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

  function isMatchingTiming(timing, filterId) {
    const timingLabel = getTimingLabel(timing);

    return Boolean(timingLabel && timingLabel === filterId);
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
    const timing = normalizeTiming(atBat.timing);

    atBat.pitches.forEach((pitch) => {
      const battedBallOutcome = getSavedPitchBattedBallOutcome(pitch, atBat);
      const locationId = getPitchLocationId(pitch);

      if (battedBallOutcome && locationId) {
        entries.push({ locationId, battedBallOutcome, timing });
      }
    });

    if (entries.length === 0 && atBatOutcome) {
      const lastLocatedPitch = atBat.pitches.slice().reverse().find((pitch) => getPitchLocationId(pitch));

      if (lastLocatedPitch) {
        entries.push({
          locationId: getPitchLocationId(lastLocatedPitch),
          battedBallOutcome: atBatOutcome,
          timing,
        });
      }
    }

    return entries;
  }

  function getChartEntries() {
    const entries = [];

    const dateRange = getChartDateRange();

    games.filter((game) => isGameInChartDateRange(game, dateRange)).forEach((game) => {
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

    getChartEntries().forEach(({ locationId, battedBallOutcome, timing }) => {
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

      if (isMatchingOutcome(battedBallOutcome, filterId) || isMatchingTiming(timing, filterId)) {
        buckets[locationId].count += 1;
        totalMatches += 1;
      }
    });

    return { buckets, totalMatches };
  }

  function getZoneCellStyle(bucket, filterType, maxCount, filterId) {
    const emptyCellStyle = "background: var(--panel-solid); color: var(--muted); border-color: var(--line);";

    if (!bucket || maxCount === 0) {
      return emptyCellStyle;
    }

    if (filterType === "hotCold") {
      const total = bucket.hits + bucket.outs;

      if (total === 0) {
        return emptyCellStyle;
      }

      const hitShare = bucket.hits / total;
      const outShare = bucket.outs / total;

      if (hitShare > outShare) {
        const opacity = Math.max(0.2, hitShare * (total / Math.max(1, maxCount)));
        return `background: rgba(169, 31, 36, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(169, 31, 36, 0.45);`;
      }

      const opacity = Math.max(0.2, outShare * (total / Math.max(1, maxCount)));
      return `background: rgba(7, 50, 79, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(7, 50, 79, 0.45);`;
    }

    if (bucket.count === 0 || maxCount === 0) {
      return emptyCellStyle;
    }

    const opacity = Math.max(0.16, bucket.count / maxCount);

    if (filterId === "outs") {
      return `background: rgba(7, 50, 79, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(7, 50, 79, 0.45);`;
    }

    return `background: rgba(169, 31, 36, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(169, 31, 36, 0.45);`;
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

  startDateInput.addEventListener("change", () => {
    renderZoneMap(filterSelect.value);
  });

  endDateInput.addEventListener("change", () => {
    renderZoneMap(filterSelect.value);
  });

  filterSelect.value = filterSelect.value || "hot_cold";
  renderZoneMap(filterSelect.value);
}

window.renderChartsPage = function renderChartsPage() {
  initChartsPage(loadRawGames());
};

function initAccountPage() {
  const sportTypeValue = document.getElementById("sport-type-value");
  const athleteNameValue = document.getElementById("profile-athlete-name");
  const profileEmailValue = document.getElementById("profile-email");
  const securityEmailValue = document.getElementById("security-email");
  const editButton = document.getElementById("edit-profile-button");
  const profileForm = document.getElementById("profile-edit-form");
  const emailInput = document.getElementById("profile-email-input");
  const athleteNameInput = document.getElementById("profile-athlete-name-input");
  const sportTypeInput = document.getElementById("profile-sport-type-input");
  const saveButton = document.getElementById("profile-save-button");
  const cancelButton = document.getElementById("profile-cancel-button");
  const profileMessage = document.getElementById("profile-message");
  const passwordResetButton = document.getElementById("password-reset-button");
  const securityMessage = document.getElementById("security-message");
  const accountLogoutButton = document.getElementById("account-logout-button");
  const deleteButton = document.getElementById("delete-account-button");
  const deleteModal = document.getElementById("delete-account-modal");
  const deleteConfirmation = document.getElementById("delete-account-confirmation");
  const confirmDeleteButton = document.getElementById("confirm-delete-account-button");
  const cancelDeleteButton = document.getElementById("cancel-delete-account-button");
  const deleteMessage = document.getElementById("delete-account-message");

  if (!sportTypeValue || !editButton || !profileForm) {
    return;
  }

  const localAccount = getCurrentAccount();
  let profile = {
    email: getCurrentUser()?.email || "",
    athleteName: localAccount?.athleteName || "",
    sportType: getCurrentSportType(),
    metadata: {},
  };
  let isSaving = false;
  let lastModalFocus = null;

  function sportLabel(sportType) {
    return normalizeSportType(sportType) === "softball" ? "Softball" : "Baseball";
  }

  function renderProfile() {
    sportTypeValue.textContent = sportLabel(profile.sportType);
    athleteNameValue.textContent = profile.athleteName || "Not set";
    profileEmailValue.textContent = profile.email || "Unavailable";
    securityEmailValue.textContent = profile.email || "your account email";
    emailInput.value = profile.email;
    athleteNameInput.value = profile.athleteName;
    sportTypeInput.value = normalizeSportType(profile.sportType);
  }

  function setProfileFormOpen(isOpen) {
    profileForm.hidden = !isOpen;
    editButton.setAttribute("aria-expanded", String(isOpen));
    editButton.hidden = isOpen;

    if (isOpen) {
      athleteNameInput.focus();
    }
  }

  function closeDeleteModal() {
    deleteModal.hidden = true;
    document.body.classList.remove("has-account-modal");
    deleteConfirmation.value = "";
    confirmDeleteButton.disabled = true;
    lastModalFocus?.focus();
  }

  renderProfile();

  editButton.addEventListener("click", () => {
    renderProfile();
    setAuthFormMessage(profileMessage, "");
    setProfileFormOpen(true);
  });

  cancelButton.addEventListener("click", () => {
    renderProfile();
    setAuthFormMessage(profileMessage, "");
    setProfileFormOpen(false);
    editButton.focus();
  });

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const athleteName = athleteNameInput.value.trim();
    const sportType = normalizeSportType(sportTypeInput.value);

    if (!athleteName) {
      setAuthFormMessage(profileMessage, "Enter an athlete name before saving.", "error");
      athleteNameInput.focus();
      return;
    }

    isSaving = true;
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
    setAuthFormMessage(profileMessage, "Saving your profile...");

    try {
      if (!window.hittingLogAuth?.updateProfile) {
        throw new Error("Profile updates are temporarily unavailable.");
      }

      const metadata = {
        ...profile.metadata,
        athlete_name: athleteName,
        sport_type: sportType,
      };
      const { data, error } = await window.hittingLogAuth.updateProfile(metadata);

      if (error) {
        throw error;
      }

      profile = {
        email: data?.user?.email || profile.email,
        athleteName,
        sportType,
        metadata: data?.user?.user_metadata || metadata,
      };
      updateCurrentAccountProfile({ athleteName, sportType });
      renderProfile();
      setProfileFormOpen(false);
      setAuthFormMessage(profileMessage, "Profile updated successfully.", "success");
    } catch (error) {
      console.error("Unable to update profile:", error);
      setAuthFormMessage(profileMessage, error.message || "Unable to update your profile. Please try again.", "error");
    } finally {
      isSaving = false;
      saveButton.disabled = false;
      saveButton.textContent = "Save Changes";
    }
  });

  passwordResetButton.addEventListener("click", async () => {
    if (!profile.email) {
      setAuthFormMessage(securityMessage, "Your account email is unavailable. Please sign in again.", "error");
      return;
    }

    passwordResetButton.disabled = true;
    passwordResetButton.textContent = "Sending...";
    setAuthFormMessage(securityMessage, "Sending password reset email...");

    try {
      const { error } = await window.hittingLogAuth.requestPasswordReset({
        email: profile.email,
        redirectTo: "https://thehittinglog.com/reset-password",
      });

      if (error) {
        throw error;
      }

      setAuthFormMessage(securityMessage, "Password reset email sent successfully.", "success");
    } catch (error) {
      console.error("Unable to send password reset email:", error);
      setAuthFormMessage(securityMessage, error.message || "Unable to send the password reset email. Please try again.", "error");
    } finally {
      passwordResetButton.disabled = false;
      passwordResetButton.textContent = "Send Password Reset Email";
    }
  });

  accountLogoutButton.addEventListener("click", () => {
    document.getElementById("logout-button")?.click();
  });

  deleteButton.addEventListener("click", () => {
    lastModalFocus = document.activeElement;
    deleteModal.hidden = false;
    document.body.classList.add("has-account-modal");
    deleteConfirmation.focus();
  });

  deleteConfirmation.addEventListener("input", () => {
    confirmDeleteButton.disabled = deleteConfirmation.value !== "DELETE";
  });

  cancelDeleteButton.addEventListener("click", closeDeleteModal);
  deleteModal.addEventListener("click", (event) => {
    if (event.target === deleteModal) {
      closeDeleteModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !deleteModal.hidden) {
      closeDeleteModal();
    }
  });

  confirmDeleteButton.addEventListener("click", () => {
    if (deleteConfirmation.value !== "DELETE") {
      return;
    }

    // TODO: Call a secure server-side account deletion endpoint here when one is available.
    closeDeleteModal();
    setAuthFormMessage(
      deleteMessage,
      "Account deletion is not available yet. Your account and data were not deleted.",
    );
  });

  (async () => {
    try {
      const { data, error } = await window.hittingLogAuth.getCurrentSession();

      if (error) {
        throw error;
      }

      const user = data?.session?.user;
      if (!user) {
        throw new Error("Your account session could not be loaded. Please sign in again.");
      }

      const metadata = user.user_metadata || {};
      profile = {
        email: user.email || profile.email,
        athleteName: metadata.athlete_name || metadata.athleteName || metadata.full_name || profile.athleteName,
        sportType: normalizeSportType(metadata.sport_type || profile.sportType),
        metadata,
      };
      updateCurrentAccountProfile(profile);
      renderProfile();
    } catch (error) {
      console.error("Unable to load account profile:", error);
      setAuthFormMessage(profileMessage, error.message || "Unable to load your profile.", "error");
    }
  })();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setAuthFormMessage(element, message, status = "") {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle("is-success", status === "success");
  element.classList.toggle("is-error", status === "error");
}

function initForgotPasswordPage() {
  const form = document.getElementById("forgot-password-form");
  const emailInput = document.getElementById("forgot-password-email");
  const message = document.getElementById("forgot-password-message");

  if (!form || !emailInput || !message) {
    return;
  }

  let isSubmitting = false;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const email = normalizeEmail(emailInput.value.trim());
    const submitButton = form.querySelector("button[type='submit']");

    if (!email) {
      setAuthFormMessage(message, "Enter your email address.", "error");
      emailInput.focus();
      return;
    }

    if (!isValidEmail(email)) {
      setAuthFormMessage(message, "Enter a valid email address.", "error");
      emailInput.focus();
      return;
    }

    if (!window.hittingLogAuth?.requestPasswordReset) {
      setAuthFormMessage(message, "Password reset is temporarily unavailable. Please try again.", "error");
      return;
    }

    isSubmitting = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending Reset Link...";
    }
    setAuthFormMessage(message, "Sending your secure password-reset link...");

    try {
      // Add https://thehittinglog.com/reset-password to the Supabase Auth redirect allow list.
      // Preview and local reset URLs must be allowed separately when they are used for testing.
      const { error } = await window.hittingLogAuth.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("Supabase password-reset request failed:", error);
        setAuthFormMessage(message, "We couldn't send the reset link. Please try again in a moment.", "error");
        return;
      }

      form.reset();
      setAuthFormMessage(
        message,
        "If an account exists for that email address, a password-reset link has been sent. Please check your inbox and spam folder.",
        "success",
      );
    } catch (error) {
      console.error("Password-reset request error:", error);
      setAuthFormMessage(message, "We couldn't send the reset link. Please try again in a moment.", "error");
    } finally {
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send Reset Link";
      }
    }
  });
}

function initResetPasswordPage() {
  const form = document.getElementById("reset-password-form");
  const passwordInput = document.getElementById("reset-password-new");
  const confirmPasswordInput = document.getElementById("reset-password-confirm");
  const message = document.getElementById("reset-password-message");
  const requestLink = document.getElementById("request-new-reset-link");

  if (!form || !passwordInput || !confirmPasswordInput || !message || !requestLink) {
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  const queryParameters = new URLSearchParams(window.location.search);
  const hashParameters = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const recoveryType = queryParameters.get("type") || hashParameters.get("type");
  const hasRecoveryParameters = Boolean(
    recoveryType === "recovery" ||
      queryParameters.get("code") ||
      queryParameters.get("token_hash") ||
      (hashParameters.get("access_token") && hashParameters.get("refresh_token")),
  );
  const hasRecoveryError = Boolean(
    queryParameters.get("error") ||
      queryParameters.get("error_code") ||
      hashParameters.get("error") ||
      hashParameters.get("error_code"),
  );
  let recoveryReady = false;
  let passwordUpdated = false;
  let isSubmitting = false;
  let authSubscription = null;

  function setFormEnabled(isEnabled) {
    passwordInput.disabled = !isEnabled;
    confirmPasswordInput.disabled = !isEnabled;
    if (submitButton) {
      submitButton.disabled = !isEnabled;
    }
  }

  function showInvalidLink() {
    if (passwordUpdated) {
      return;
    }
    recoveryReady = false;
    setFormEnabled(false);
    requestLink.hidden = false;
    setAuthFormMessage(
      message,
      "This password-reset link is invalid or has expired. Please request a new reset link.",
      "error",
    );
  }

  function allowPasswordUpdate() {
    if (passwordUpdated) {
      return;
    }
    recoveryReady = true;
    requestLink.hidden = true;
    setFormEnabled(true);
    setAuthFormMessage(message, "Your reset link is valid. Create your new password below.");
    passwordInput.focus();
  }

  setFormEnabled(false);
  setAuthFormMessage(message, "Validating your password-reset link...");

  (async () => {
    if (!window.hittingLogAuth?.getCurrentSession || !window.hittingLogAuth?.onAuthStateChange) {
      showInvalidLink();
      return;
    }

    try {
      const listener = await window.hittingLogAuth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          allowPasswordUpdate();
        }
      });
      authSubscription = listener?.data?.subscription || null;

      if (hasRecoveryError) {
        showInvalidLink();
        return;
      }

      const { data, error } = await window.hittingLogAuth.getCurrentSession();
      if (error) {
        console.error("Supabase recovery-session check failed:", error);
      }

      if (data?.session && hasRecoveryParameters) {
        allowPasswordUpdate();
        return;
      }

      if (!recoveryReady) {
        showInvalidLink();
      }
    } catch (error) {
      console.error("Password recovery initialization error:", error);
      showInvalidLink();
    }
  })();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting || !recoveryReady) {
      if (!recoveryReady) {
        showInvalidLink();
      }
      return;
    }

    const newPassword = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword.length < 8) {
      setAuthFormMessage(message, "Password must be at least 8 characters.", "error");
      passwordInput.focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      setAuthFormMessage(message, "Passwords do not match.", "error");
      confirmPasswordInput.focus();
      return;
    }

    isSubmitting = true;
    setFormEnabled(false);
    if (submitButton) {
      submitButton.textContent = "Updating Password...";
    }
    setAuthFormMessage(message, "Updating your password...");

    try {
      const { data: sessionData, error: sessionError } = await window.hittingLogAuth.getCurrentSession();
      if (sessionError || !sessionData?.session) {
        if (sessionError) {
          console.error("Supabase recovery session expired before update:", sessionError);
        }
        showInvalidLink();
        return;
      }

      const { error } = await window.hittingLogAuth.updatePassword(newPassword);
      if (error) {
        console.error("Supabase password update failed:", error);
        setAuthFormMessage(message, "We couldn't update your password. Please try again.", "error");
        setFormEnabled(true);
        return;
      }

      passwordUpdated = true;
      recoveryReady = false;
      form.reset();
      setFormEnabled(false);
      setAuthFormMessage(message, "Your password has been updated successfully.", "success");

      try {
        await window.hittingLogAuth.logOut();
      } catch (error) {
        console.error("Sign out after password reset failed:", error);
      }
      clearCurrentUser();
      window.setTimeout(() => redirectTo("/login"), 2000);
    } catch (error) {
      console.error("Password update error:", error);
      setAuthFormMessage(message, "We couldn't update your password. Please try again.", "error");
      setFormEnabled(true);
    } finally {
      isSubmitting = false;
      if (submitButton) {
        submitButton.textContent = "Update Password";
      }
    }
  });

  window.addEventListener("beforeunload", () => {
    authSubscription?.unsubscribe();
  });
}

function initLoginPage() {
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const loginMessage = document.getElementById("login-message");

  if (!loginForm || !loginMessage || !emailInput || !passwordInput) {
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = normalizeEmail(emailInput.value);
    const password = passwordInput.value;

    loginMessage.classList.remove("is-success");

    if (!window.hittingLogAuth) {
      loginMessage.textContent = "Login is temporarily unavailable. Please try again.";
      return;
    }

    const submitButton = loginForm.querySelector("button[type='submit']");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Signing in...";
    }

    try {
      const { data, error } = await window.hittingLogAuth.logIn({ email, password });

      if (error || !data?.user?.email) {
        loginMessage.textContent = "Incorrect email or password.";
        return;
      }

      const accounts = loadAccounts();
      if (!accounts.some((account) => normalizeEmail(account.email || "") === email)) {
        accounts.push({
          email,
          sportType: normalizeSportType(data.user.user_metadata?.sport_type),
        });
        saveAccounts(accounts);
      }

      setCurrentUser(data.user.email);
      loginMessage.textContent = "Login successful. Redirecting...";
      loginMessage.classList.add("is-success");
      redirectTo("dashboard.html");
    } catch (error) {
      loginMessage.textContent = "Incorrect email or password.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Sign In";
      }
    }
  });
}

function initSignupPage() {
  const signupForm = document.getElementById("signup-form");
  const emailInput = document.getElementById("signup-email");
  const passwordInput = document.getElementById("signup-password");
  const sportTypeInput = document.getElementById("signup-sport-type");
  const signupMessage = document.getElementById("signup-message");

  if (!signupForm || !signupMessage || !emailInput || !passwordInput || !sportTypeInput) {
    return;
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = normalizeEmail(emailInput.value);
    const password = passwordInput.value;
    const sportType = normalizeSportType(sportTypeInput.value);
    const submitButton = signupForm.querySelector("button[type='submit']");

    signupMessage.classList.remove("is-success");

    if (!PUBLIC_SIGNUP_ENABLED || !window.hittingLogAuth?.PUBLIC_SIGNUP_ENABLED) {
      signupMessage.textContent = "Account creation is temporarily unavailable.";
      return;
    }

    if (password.length < 8) {
      signupMessage.textContent = "Password must be at least 8 characters.";
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Creating account...";
    }

    try {
      await window.hittingLogSupabaseReady;
      const { data, error } = await window.hittingLogAuth.signUp({
        email,
        password,
        options: {
          data: { sport_type: sportType },
          emailRedirectTo: `${window.location.origin}/login.html`,
        },
      });

      if (error) {
        signupMessage.textContent = error.message || "Unable to create your account. Please try again.";
        return;
      }

      const accounts = loadAccounts();
      if (!accounts.some((account) => normalizeEmail(account.email || "") === email)) {
        accounts.push({ email, sportType });
        saveAccounts(accounts);
      }

      signupMessage.classList.add("is-success");

      if (data?.session && data.user?.email) {
        setCurrentUser(data.user.email);
        signupMessage.textContent = "Account created. Redirecting...";
        redirectTo("dashboard.html");
        return;
      }

      signupMessage.textContent = "Account created! Check your email to confirm it, then log in.";
      signupForm.reset();
    } catch (error) {
      signupMessage.textContent = "Unable to create your account. Please try again.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Create Account";
      }
    }
  });
}

removeStoredAccountPasswords();

if (guardRoute()) {
  updateAuthUI();

  const games = loadGames();

  if (page === "dashboard") {
    initDashboard(games);
  }

  if (page === "games") {
    initGamesPage(games);
  }

  if (page === "all-games") {
    initAllGamesPage(games);
  }

  if (page === "advanced") {
    initAdvancedPage(games);
  }

  if (page === "account") {
    initAccountPage();
  }

  if (page === "login") {
    initLoginPage();
  }

  if (page === "signup") {
    initSignupPage();
  }

  if (page === "forgot-password") {
    initForgotPasswordPage();
  }

  if (page === "reset-password") {
    initResetPasswordPage();
  }
}
