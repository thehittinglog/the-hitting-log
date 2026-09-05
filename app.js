let currentSupabaseUser = null;
const page = document.body.dataset.page;
const protectedPages = new Set(["dashboard", "games", "all-games", "advanced", "charts", "account"]);
const authPages = new Set(["login", "signup"]);
const PUBLIC_SIGNUP_ENABLED = true;
const DEFAULT_SPORT_TYPE = "baseball";
const PITCH_TYPES_BY_SPORT = {
  baseball: [
    { label: "4 Seam Fastball", filterLabel: "4-Seam Fastball", value: "four_seam_fastball" },
    { label: "2 Seam Fastball", filterLabel: "2-Seam Fastball", value: "two_seam_fastball" },
    { label: "Changeup", filterLabel: "Changeup", value: "changeup" },
    { label: "Sinker", filterLabel: "Sinker", value: "sinker" },
    { label: "Slider", filterLabel: "Slider", value: "slider" },
    { label: "Cutter", filterLabel: "Cutter", value: "cutter" },
    { label: "12-6 Curve", filterLabel: "Curveball", value: "twelve_six_curve" },
    { label: "Sweeper Curve", filterLabel: "Sweeper", value: "sweeper_curve" },
    { label: "Unknown", filterLabel: "Unknown", value: "Unknown" },
  ],
  softball: [
    { label: "Fastball", filterLabel: "Fastball", value: "fastball" },
    { label: "Changeup", filterLabel: "Changeup", value: "changeup" },
    { label: "Curve", filterLabel: "Curveball", value: "curve" },
    { label: "Screw", filterLabel: "Screwball", value: "screwball" },
    { label: "Drop", filterLabel: "Drop Ball", value: "drop" },
    { label: "Rise", filterLabel: "Rise Ball", value: "rise" },
    { label: "Drop-Curve", filterLabel: "Drop Curve", value: "drop_curve" },
    { label: "Unknown", filterLabel: "Unknown", value: "Unknown" },
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
const ballInPlayOutcomeFields = new Set([
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
const hardHitIneligibleOutcomeFields = new Set(["sac_bunt", "drag_bunt"]);
const timingOptions = [
  { label: "On Time", value: "on_time" },
  { label: "Early", value: "early" },
  { label: "Late", value: "late" },
];
const pitchLocations = window.hittingLogPitchGrid?.locations || [];
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

function getErrorMessage(error, fallbackMessage = "Something went wrong. Please try again.") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message
  ) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return fallbackMessage;
}

function getSignupErrorMessage(error) {
  const message = getErrorMessage(error, "");

  if (/already (?:been )?registered|already exists|user already registered|identity already exists/i.test(message)) {
    return "An account already exists with this email. Please sign in instead.";
  }

  if (/invalid email|email.*invalid|unable to validate email/i.test(message)) {
    return "Please enter a valid email address.";
  }

  if (/password.*(?:weak|short|least|characters)|weak password/i.test(message)) {
    return "Your password does not meet the security requirements.";
  }

  if (/rate limit|too many requests|email rate limit|over_email_send_rate_limit/i.test(message)) {
    return "Too many account attempts were made. Please wait a few minutes and try again.";
  }

  if (/error sending confirmation email|confirmation email.*(?:failed|error)|email.*send.*(?:failed|error)/i.test(message)) {
    return "We couldn’t send your confirmation email, so the account was not created. Please try again later or contact support.";
  }

  if (/database error|saving new user/i.test(message)) {
    return "Your login was created, but we could not finish setting up your account. Please contact support.";
  }

  if (/failed to fetch|network|load failed|fetch.*failed|connection/i.test(message)) {
    return "We could not connect to the server. Please check your connection and try again.";
  }

  return "We couldn’t create your account. Please try again or contact support.";
}

function getWeakPasswordMessage(error) {
  const requirementsMessage =
    typeof error?.weak_password?.message === "string"
      ? error.weak_password.message.trim()
      : typeof error?.message === "string"
        ? error.message.trim()
        : "";

  if (requirementsMessage && !/^(?:weak password|password is too weak)\.?$/i.test(requirementsMessage)) {
    return requirementsMessage;
  }

  const reasonMessages = {
    length: "Your password must meet the minimum length requirement.",
    characters: "Your password must include all required character types.",
    pwned: "Choose a password that has not appeared in a known data breach.",
  };
  const requirements = Array.isArray(error?.reasons)
    ? error.reasons.map((reason) => reasonMessages[reason]).filter(Boolean)
    : [];

  if (requirements.length) {
    return requirements.join(" ");
  }

  return "That password does not meet the password requirements. Please choose a stronger password.";
}

function getPasswordUpdateErrorMessage(error) {
  switch (error?.code) {
    case "same_password":
      return "Your new password must be different from your current password.";
    case "weak_password":
      return getWeakPasswordMessage(error);
    case "reauthentication_needed":
      return "For security, please request a new password-reset link and try again.";
    case "session_expired":
    case "session_not_found":
      return "This password-reset link has expired. Please request a new one.";
    default:
      return "We couldn't update your password. Please try again or request a new reset link.";
  }
}

function removeStoredAccountPasswords() {
  // Legacy account records are read only by the one-time cloud migration.
  // They are never used as the application's source of truth.
}

function normalizeSportType(sportType) {
  return sportType === "softball" ? "softball" : DEFAULT_SPORT_TYPE;
}

function normalizeHitterHandedness(handedness) {
  return handedness === "right" || handedness === "left" ? handedness : null;
}

function getCurrentUser() {
  if (!currentSupabaseUser?.id || typeof currentSupabaseUser.email !== "string") {
    return null;
  }

  return {
    id: currentSupabaseUser.id,
    email: normalizeEmail(currentSupabaseUser.email),
  };
}

function setCurrentUser(user) {
  currentSupabaseUser = user?.id ? user : null;
}

function getCurrentAccount() {
  return typeof window.getHittingLogProfile === "function" ? window.getHittingLogProfile() : null;
}

function getCurrentSportType() {
  return normalizeSportType(
    getCurrentAccount()?.sportType ||
    currentSupabaseUser?.user_metadata?.sport_type
  );
}

function getPitchTypesForSport(sportType = getCurrentSportType()) {
  const normalizedSportType = normalizeSportType(sportType);
  return PITCH_TYPES_BY_SPORT[normalizedSportType] || PITCH_TYPES_BY_SPORT[DEFAULT_SPORT_TYPE];
}

window.getPitchTypesForSport = getPitchTypesForSport;

async function updateCurrentAccountSportType(sportType) {
  const profile = getCurrentAccount() || {};
  return updateCurrentAccountProfile({
    athleteName: profile.athleteName || "",
    sportType,
    handedness: profile.handedness,
  });
}

async function updateCurrentAccountProfile({ athleteName, sportType, handedness }) {
  if (typeof window.saveHittingLogProfile !== "function") {
    throw new Error("Supabase profile storage is unavailable.");
  }
  return window.saveHittingLogProfile({
    athleteName: String(athleteName || "").trim(),
    sportType: normalizeSportType(sportType),
    handedness: normalizeHitterHandedness(handedness),
  });
}

function createId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function clearCurrentUser() {
  currentSupabaseUser = null;
  window.clearHittingLogDataStore?.();
}

function redirectTo(path) {
  window.location.replace(path);
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
      try {
        if (!window.hittingLogAuth) {
          throw new Error("Supabase authentication is unavailable.");
        }
        console.info("[Auth] Supabase logout started", { userId: currentUser?.id || null });
        const { error } = await window.hittingLogAuth.logOut();
        if (error) {
          throw error;
        }
        console.info("[Auth] Supabase logout succeeded", { userId: currentUser?.id || null });
        clearCurrentUser();
        redirectTo("login.html");
      } catch (error) {
        console.error("[Auth] Supabase logout failed", error);
        window.alert("We couldn't log you out. Please check your connection and try again.");
      }
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

window.normalizePitchType = normalizePitchType;

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
    id: typeof pitch.id === "string" && pitch.id ? pitch.id : createId("pitch"),
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
    "foulDirection",
    "chartResult",
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
    normalizedPitch.batted_ball_outcome = battedBallOutcome;
    normalizedPitch.outcome = battedBallOutcome;
  }

  return normalizedPitch;
}

function getNextPitchNumber(atBat) {
  return (Array.isArray(atBat?.pitches) ? atBat.pitches.length : 0) + 1;
}

function replacePitchInSequence(pitches, editedPitch, stableId, fallbackIndex) {
  if (!Array.isArray(pitches)) {
    return null;
  }

  const stableIndex = stableId
    ? pitches.findIndex((pitch) => pitch?.id === stableId)
    : -1;
  const targetIndex = stableIndex >= 0 ? stableIndex : fallbackIndex;
  const originalPitch = pitches[targetIndex];

  if (!originalPitch || !Number.isInteger(targetIndex)) {
    return null;
  }

  const nextPitches = pitches.slice();
  nextPitches[targetIndex] = {
    ...editedPitch,
    id: originalPitch.id || stableId || editedPitch?.id || createId("pitch"),
  };
  return { pitches: nextPitches, targetIndex };
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

function isHardHitEligible(atBat) {
  if (!atBat || typeof atBat !== "object") {
    return false;
  }

  const pitches = Array.isArray(atBat.pitches) ? atBat.pitches : [];
  const battedBallPitch = pitches.slice().reverse().find((pitch) => {
    return (
      pitch?.result === "batted_ball" ||
      pitch?.primaryResult === "batted_ball" ||
      pitch?.battedBallOutcome ||
      pitch?.batted_ball_outcome
    );
  });
  const rawOutcome =
    atBat.finalOutcome ||
    atBat.outcome ||
    battedBallPitch?.battedBallOutcome ||
    battedBallPitch?.batted_ball_outcome ||
    battedBallPitch?.outcome ||
    "";
  const battedBallType =
    atBat.battedBallType ||
    atBat.batted_ball_type ||
    battedBallPitch?.battedBallType ||
    battedBallPitch?.batted_ball_type ||
    "";
  const normalizedOutcome = normalizeLegacyOutcome(rawOutcome, battedBallType);

  if (normalizedOutcome) {
    return (
      ballInPlayOutcomeFields.has(normalizedOutcome) &&
      !hardHitIneligibleOutcomeFields.has(normalizedOutcome)
    );
  }

  return hasBallInPlay(atBat);
}

window.isHardHitEligible = isHardHitEligible;

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
    productiveOutPercent: totalOuts === 0 ? null : productiveOuts / totalOuts,
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
    hardHitBall: isHardHitEligible({
      ...atBat,
      pitches,
      finalOutcome: rawOutcome,
      outcome,
    })
      ? normalizeHardHitBallValue(atBat.hardHitBall)
      : null,
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
  return [];
}

function loadRawGames() {
  return loadGames();
}

let hlpScores = { overallScore: null, gameScores: {}, tournamentScores: {} };

function normalizeHlpScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 100 ? value : null;
}

async function refreshHlpScores() {
  if (!window.hittingLogAuth?.getCurrentSession) {
    hlpScores = { overallScore: null, gameScores: {}, tournamentScores: {} };
    return;
  }
  const { data, error } = await window.hittingLogAuth.getCurrentSession();
  if (error || !data?.session?.access_token) {
    hlpScores = { overallScore: null, gameScores: {}, tournamentScores: {} };
    return;
  }
  const response = await fetch("/api/hlp-scores", {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to load HLP scores.");
  const body = await response.json();
  hlpScores = {
    overallScore: normalizeHlpScore(body?.overallScore),
    gameScores: body?.gameScores && typeof body.gameScores === "object" ? body.gameScores : {},
    tournamentScores: body?.tournamentScores && typeof body.tournamentScores === "object" ? body.tournamentScores : {},
  };
}

async function refreshHlpScoresSafely() {
  try {
    await refreshHlpScores();
  } catch (error) {
    console.error("[HLP] Scores are temporarily unavailable", { code: "score_load_failed" });
  }
}

function getGameHlpScore(gameId) {
  return normalizeHlpScore(hlpScores.gameScores?.[gameId]);
}

function getTournamentHlpScore(tournamentId) {
  return normalizeHlpScore(hlpScores.tournamentScores?.[tournamentId]);
}

function getOverallHlpScore() {
  return normalizeHlpScore(hlpScores.overallScore);
}

async function upsertSavedGame(games, game) {
  const savedGame = normalizeGame(game);
  const existingIndex = games.findIndex((saved) => saved.id === savedGame.id);
  const previousGame = existingIndex >= 0 ? games[existingIndex] : null;

  if (existingIndex >= 0) {
    games[existingIndex] = savedGame;
  } else {
    games.push(savedGame);
  }

  try {
    if (typeof window.saveGame !== "function") {
      throw new Error("Supabase game storage is unavailable.");
    }
    await window.saveGame(savedGame);
  } catch (error) {
    if (existingIndex >= 0) {
      games[existingIndex] = previousGame;
    } else {
      games.splice(games.findIndex((saved) => saved.id === savedGame.id), 1);
    }
    throw error;
  }

  await refreshHlpScoresSafely();

  return savedGame;
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

function calculateRateMetric(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
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
    const performanceScore = typeof value === "object" && value !== null
      ? value.performanceScore
      : undefined;

    cell.textContent = String(text);

    if (metricKey && typeof window.applyMetricPerformanceColor === "function") {
      window.applyMetricPerformanceColor(cell, metricKey, text);
    }

    if (performanceScore !== undefined) {
      applyPerformanceScoreStatus(cell, performanceScore);
    }

    row.appendChild(cell);
  });
}

function appendGameCells(row, gameStats, options = {}) {
  const opponentLabel = options.opponentLabel || gameStats.opponent;
  const performanceScore = options.compact
    ? getGameHlpScore(gameStats.id)
    : undefined;
  const values = options.compact
    ? [
        gameStats.date,
        opponentLabel,
        getGameAtBatCount(gameStats),
        gameStats.hits,
        {
          text: performanceScore === null ? "N/A" : performanceScore,
          performanceScore,
        },
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
  const score = getGameHlpScore(gameStats.id);

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

function formatCompactGameDate(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString || "");

  if (!match) {
    return formatDisplayDate(dateString);
  }

  return `${match[2]}/${match[3]}/${match[1].slice(-2)}`;
}

function appendRecentGameRow(tableBody, gameStats) {
  const row = document.createElement("tr");
  const date = document.createElement("td");
  const opponent = document.createElement("td");
  const average = document.createElement("td");
  const performanceScore = document.createElement("td");
  const score = getGameHlpScore(gameStats.id);

  row.className = "recent-game-row clickable-game-row";
  row.tabIndex = 0;
  row.dataset.gameId = gameStats.id;
  date.className = "recent-game-date";
  date.textContent = formatCompactGameDate(gameStats.date);
  opponent.className = "recent-game-opponent";
  opponent.textContent = gameStats.opponent || "Opponent";
  average.className = "recent-game-average";
  average.textContent = formatRate(gameStats.battingAverage);
  performanceScore.className = "recent-game-hlp";
  performanceScore.textContent = score === null || score === undefined ? "N/A" : String(score);

  if (typeof window.applyMetricPerformanceColor === "function") {
    window.applyMetricPerformanceColor(
      average,
      "battingAverage",
      formatRate(gameStats.battingAverage)
    );
  }
  applyPerformanceScoreStatus(performanceScore, score);

  row.appendChild(date);
  row.appendChild(opponent);
  row.appendChild(average);
  row.appendChild(performanceScore);
  tableBody.appendChild(row);
}

function appendTournamentGameRow(tableBody, gameStats, index) {
  const row = document.createElement("tr");
  const gameNumber = document.createElement("td");
  const date = document.createElement("td");
  const opponent = document.createElement("td");
  const average = document.createElement("td");
  const performanceScore = document.createElement("td");
  const score = getGameHlpScore(gameStats.id);

  row.className = "tournament-game-row clickable-game-row";
  row.tabIndex = 0;
  row.dataset.gameId = gameStats.id;
  gameNumber.className = "tournament-game-number";
  gameNumber.textContent = String(index + 1);
  date.className = "tournament-game-date";
  date.textContent = formatCompactGameDate(gameStats.date);
  opponent.className = "tournament-game-opponent";
  opponent.textContent = gameStats.opponent || "Opponent";
  average.className = "tournament-game-average";
  average.textContent = formatRate(gameStats.battingAverage);
  performanceScore.className = "tournament-game-hlp";
  performanceScore.textContent = score === null || score === undefined ? "—" : String(score);

  if (typeof window.applyMetricPerformanceColor === "function") {
    window.applyMetricPerformanceColor(
      average,
      "battingAverage",
      formatRate(gameStats.battingAverage)
    );
  }
  applyPerformanceScoreStatus(performanceScore, score);

  row.appendChild(gameNumber);
  row.appendChild(date);
  row.appendChild(opponent);
  row.appendChild(average);
  row.appendChild(performanceScore);
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
  const score = getGameHlpScore(gameStats.id);

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

function renderPitchSequence(sequenceElement, atBat, { onEditPitch, editingPitchId = "", disabled = false } = {}) {
  sequenceElement.innerHTML = "";

  if (!atBat || atBat.pitches.length === 0) {
    const emptyItem = document.createElement("p");
    emptyItem.className = "empty-state compact-empty";
    emptyItem.textContent = "No pitches logged yet.";
    sequenceElement.appendChild(emptyItem);
    return;
  }

  atBat.pitches.forEach((pitch, index) => {
    const item = document.createElement(typeof onEditPitch === "function" ? "button" : "article");
    item.className = typeof onEditPitch === "function"
      ? "pitch-chip pitch-sequence-edit-button"
      : "pitch-chip";
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

    if (typeof onEditPitch === "function") {
      item.type = "button";
      item.disabled = disabled;
      item.setAttribute("aria-label", `Edit Pitch ${index + 1}`);
      if (pitch.id && pitch.id === editingPitchId) {
        item.classList.add("is-editing");
        item.setAttribute("aria-current", "true");
      }
      item.addEventListener("click", () => onEditPitch(pitch, index));
    }
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

function initGamesPage(games, membershipState = null) {
  const homeView = document.getElementById("games-home-view");
  const reviewListView = document.getElementById("game-review-list-view");
  const reviewGamesButton = document.getElementById("review-games-button");
  const reviewListBackButton = document.getElementById("review-list-back-button");
  const reviewGamesTableBody = document.getElementById("review-games-table-body");
  const reviewView = document.getElementById("game-review-view");
  const reviewTitle = document.getElementById("review-game-title");
  const reviewDetails = document.getElementById("review-game-details");
  const reviewDate = document.getElementById("review-game-date");
  const reviewOpponent = document.getElementById("review-game-opponent");
  const reviewMeta = document.getElementById("review-game-meta");
  const editGameDetailsButton = document.getElementById("edit-game-details-button");
  const gameDetailsForm = document.getElementById("review-game-details-form");
  const gameDateInput = document.getElementById("review-game-date-input");
  const gameOpponentInput = document.getElementById("review-game-opponent-input");
  const saveGameDetailsButton = document.getElementById("save-game-details-button");
  const cancelGameDetailsButton = document.getElementById("cancel-game-details-button");
  const reviewBackButton = document.getElementById("review-back-button");
  const reviewMessage = document.getElementById("review-message");
  const reviewAtBatList = document.getElementById("review-at-bat-list");
  const deleteGameButton = document.getElementById("delete-game-button");
  const deleteGameModal = document.getElementById("delete-game-modal");
  const confirmDeleteGameButton = document.getElementById("confirm-delete-game-button");
  const cancelDeleteGameButton = document.getElementById("cancel-delete-game-button");
  const deleteGameMessage = document.getElementById("delete-game-message");
  const gamesTableBody = document.getElementById("games-table-body");
  const gamesEmpty = document.getElementById("empty-state");
  const gamesMessage = document.getElementById("games-message");
  const tournamentsList = document.getElementById("tournaments-list");
  const tournamentsEmpty = document.getElementById("tournaments-empty");
  const tournamentDetailsView = document.getElementById("tournament-details-view");
  const tournamentDetailsTitle = document.getElementById("tournament-details-title");
  const tournamentDetailsDates = document.getElementById("tournament-details-dates");
  const tournamentDetailsCount = document.getElementById("tournament-details-count");
  const tournamentDetailsGames = document.getElementById("tournament-details-games");
  const tournamentDetailsEmpty = document.getElementById("tournament-details-empty");
  const tournamentDetailsAddGame = document.getElementById("tournament-details-add-game");
  const tournamentDetailsBack = document.getElementById("tournament-details-back");
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
    !reviewDetails ||
    !reviewDate ||
    !reviewOpponent ||
    !reviewMeta ||
    !editGameDetailsButton ||
    !gameDetailsForm ||
    !gameDateInput ||
    !gameOpponentInput ||
    !saveGameDetailsButton ||
    !cancelGameDetailsButton ||
    !reviewBackButton ||
    !reviewMessage ||
    !reviewAtBatList ||
    !deleteGameButton ||
    !deleteGameModal ||
    !confirmDeleteGameButton ||
    !cancelDeleteGameButton ||
    !deleteGameMessage ||
    !gamesTableBody ||
    !gamesEmpty ||
    !gamesMessage ||
    !tournamentsList ||
    !tournamentsEmpty ||
    !tournamentDetailsView ||
    !tournamentDetailsTitle ||
    !tournamentDetailsDates ||
    !tournamentDetailsCount ||
    !tournamentDetailsGames ||
    !tournamentDetailsEmpty ||
    !tournamentDetailsAddGame ||
    !tournamentDetailsBack ||
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

  const gamesOwnerUserId = getCurrentUser()?.id || "";
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
    editingPitchAtBatIndex: null,
    editingPitchIndex: null,
    editingPitchDraft: null,
    deletingPitchAtBatIndex: null,
    deletingPitchIndex: null,
    pitchEditSaving: false,
    gameDetailsEditing: false,
    gameDetailsSaving: false,
    gameDeleting: false,
    workflowEditAtBatIndex: null,
    workflowEditOriginalAtBat: null,
    editingWorkflowPitchId: "",
    editingWorkflowPitchIndex: null,
    editingWorkflowPitchOriginal: null,
    editingWorkflowAtBatSnapshot: null,
    workflowPitchSaving: false,
    activePitchIndex: null,
    pendingProductiveOutOutcome: "",
    stepHistory: [],
    step: "at_bat_details",
    activePitchCompleted: false,
  };
  let lastDeleteGameModalFocus = null;
  const gameLimit = Number.isInteger(membershipState?.entitlements?.gameLimit)
    ? membershipState.entitlements.gameLimit
    : 10;
  const hasUnlimitedGames = membershipState?.entitlements?.unlimitedGames === true;

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
    return getPitchTypesForSport();
  }
  const strikeOptions = [
    { label: "Called Strike", value: "called_strike" },
    { label: "Swinging Strike", value: "swinging_strike" },
  ];
  const editablePitchResultOptions = [
    ...pitchResultOptions.slice(0, 1),
    ...strikeOptions,
    ...pitchResultOptions.slice(2),
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
      .forEach((game) => appendRecentGameRow(gamesTableBody, getGameStats(game)));
    gamesEmpty.hidden = gamesTableBody.children.length > 0;
  }

  function openTournamentGame(tournament) {
    if (!ensureCanCreateGame(gamesMessage)) {
      return;
    }

    showNewGameView({
      id: tournament.id,
      name: tournament.name,
      completed: tournament.completed === true,
    });
  }

  function renderTournaments() {
    const tournaments = getTournamentGroups(games)
      .slice()
      .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""))
      .slice(0, 3);
    tournamentsList.innerHTML = "";

    tournaments.forEach((tournament) => {
      const row = document.createElement("tr");
      const date = document.createElement("td");
      const name = document.createElement("td");
      const totalGames = document.createElement("td");
      const performanceScore = document.createElement("td");
      const score = getTournamentHlpScore(tournament.id);

      row.className = "recent-tournament-row";
      row.tabIndex = 0;
      row.dataset.tournamentId = tournament.id;
      row.setAttribute("aria-label", `Open ${tournament.name} tournament details`);
      date.className = "recent-tournament-date";
      date.textContent = formatCompactGameDate(tournament.startDate);
      name.className = "recent-tournament-name";
      name.textContent = tournament.name;
      totalGames.className = "recent-tournament-games";
      totalGames.textContent = String(tournament.games.length);
      performanceScore.className = "recent-tournament-hlp";
      performanceScore.textContent = score === null || score === undefined ? "—" : String(score);
      applyPerformanceScoreStatus(performanceScore, score);

      row.addEventListener("click", () => {
        showTournamentDetails(tournament.id);
      });
      row.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target === row) {
          event.preventDefault();
          showTournamentDetails(tournament.id);
        }
      });

      row.appendChild(date);
      row.appendChild(name);
      row.appendChild(totalGames);
      row.appendChild(performanceScore);
      tournamentsList.appendChild(row);
    });

    tournamentsEmpty.hidden = tournaments.length > 0;
  }

  function renderGamesHome() {
    updateSummaryCards(games);
    renderRecentGames();
    renderTournaments();
    addGameButton.textContent = hasReachedGameLimit() ? "Upgrade to Add Games" : "Add Game";
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
    tournamentDetailsGames.innerHTML = "";
    sortTournamentGames(tournament.games).forEach((game, index) => {
      appendTournamentGameRow(tournamentDetailsGames, getGameStats(game), index);
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

  async function setTournamentCompletion(tournamentId, completed) {
    const previousGames = games.slice();
    const updatedGames = [];
    games.forEach((game, index) => {
      if (getTournamentKey(game) === tournamentId) {
        games[index] = normalizeGame({
          ...game,
          tournamentCompleted: completed,
        });
        updatedGames.push(games[index]);
      }
    });
    try {
      if (typeof window.saveGameBatchToCloud !== "function") {
        throw new Error("Supabase game storage is unavailable.");
      }
      await window.saveGameBatchToCloud(updatedGames);
    } catch (error) {
      games.splice(0, games.length, ...previousGames);
      throw error;
    }

    if (state.activeTournament?.id === tournamentId) {
      state.activeTournament.completed = completed;
    }

    renderTournaments();
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

  function resetWorkflowPitchEditState() {
    state.editingWorkflowPitchId = "";
    state.editingWorkflowPitchIndex = null;
    state.editingWorkflowPitchOriginal = null;
    state.editingWorkflowAtBatSnapshot = null;
    state.workflowPitchSaving = false;
  }

  function resetWorkflowEditState() {
    state.workflowEditAtBatIndex = null;
    state.workflowEditOriginalAtBat = null;
    state.activePitchIndex = null;
    resetWorkflowPitchEditState();
  }

  function setMessage(text, success = false) {
    formMessage.textContent = text;
    formMessage.classList.toggle("is-success", success);
    formMessage.classList.remove("is-error");
  }

  function hasReachedGameLimit() {
    return !hasUnlimitedGames && games.length >= gameLimit;
  }

  function showGameLimitMessage(target = gamesMessage) {
    const link = document.createElement("a");
    link.href = "/account";
    link.textContent = "Upgrade to Pro or Pro Plus";
    target.replaceChildren(
      document.createTextNode(`Your Free plan includes ${gameLimit} games. Your existing data is safe. `),
      link,
      document.createTextNode(" to continue logging games."),
    );
    target.classList.remove("is-success");
    target.classList.add("is-error");
  }

  function ensureCanCreateGame(target = gamesMessage) {
    if (!hasReachedGameLimit()) {
      return true;
    }

    showGameLimitMessage(target);
    return false;
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
    state.gameDetailsEditing = false;
    state.gameDetailsSaving = false;
    state.gameDeleting = false;
    state.editingAtBatIndex = null;
    state.editingAtBatDraft = null;
    resetPitchReviewState();
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
    state.gameDetailsEditing = false;
    state.gameDetailsSaving = false;
    state.gameDeleting = false;
    state.editingAtBatIndex = null;
    state.editingAtBatDraft = null;
    resetPitchReviewState();
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
      id: createId("pitch"),
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

    if (
      !state.editingWorkflowPitchId &&
      state.activeAtBat &&
      Number.isInteger(state.activePitchIndex) &&
      state.activePitchIndex >= 0
    ) {
      state.activeAtBat.pitches[state.activePitchIndex] = state.activePitch;
    }
  }

  function findPitchLocationFromSavedPitch(pitch) {
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

    return matchingLocation || null;
  }

  function getPitchLocationFromSavedPitch(pitch) {
    return findPitchLocationFromSavedPitch(pitch) ||
      pitchLocations.find((location) => location.id === "zone-5") ||
      pitchLocations[0];
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

  function isEditingWorkflowPitch() {
    return Boolean(
      state.editingWorkflowPitchId &&
      Number.isInteger(state.editingWorkflowPitchIndex)
    );
  }

  function getWorkflowPitchResultSelection(pitch) {
    const result = getEditablePitchResult(pitch);
    return result === "called_strike" || result === "swinging_strike"
      ? "strike"
      : result;
  }

  function captureWorkflowAtBatSnapshot() {
    return {
      finalOutcome: state.activeAtBat?.finalOutcome || "",
      outcome: state.activeAtBat?.outcome || "",
      productiveOut: state.activeAtBat?.productiveOut === true,
      hardHitBall: state.activeAtBat?.hardHitBall ?? null,
      timing: state.activeAtBat?.timing || "",
      pendingProductiveOutOutcome: state.pendingProductiveOutOutcome || "",
    };
  }

  function restoreWorkflowAtBatSnapshot() {
    const snapshot = state.editingWorkflowAtBatSnapshot;
    if (!snapshot || !state.activeAtBat) {
      return;
    }

    state.activeAtBat.finalOutcome = snapshot.finalOutcome;
    state.activeAtBat.outcome = snapshot.outcome;
    state.activeAtBat.productiveOut = snapshot.productiveOut;
    state.activeAtBat.hardHitBall = snapshot.hardHitBall;
    state.activeAtBat.timing = snapshot.timing;
    state.pendingProductiveOutOutcome = snapshot.pendingProductiveOutOutcome;
  }

  function beginWorkflowPitchEdit(pitch, index) {
    if (
      state.workflowPitchSaving ||
      !state.activeAtBat ||
      !Array.isArray(state.activeAtBat.pitches) ||
      !state.activeAtBat.pitches[index]
    ) {
      return;
    }

    if (
      state.activePitch &&
      !state.activePitchCompleted &&
      !isEditingWorkflowPitch() &&
      !state.activeAtBat.pitches.includes(state.activePitch)
    ) {
      setMessage("Finish the pitch you are entering before editing an earlier pitch.");
      return;
    }

    if (isEditingWorkflowPitch()) {
      restoreWorkflowAtBatSnapshot();
    }

    const savedPitch = state.activeAtBat.pitches[index];
    const pitchId = savedPitch.id || pitch?.id || createId("pitch");
    if (!savedPitch.id) savedPitch.id = pitchId;

    state.editingWorkflowPitchId = pitchId;
    state.editingWorkflowPitchIndex = index;
    state.editingWorkflowPitchOriginal = cloneSavedPitch(savedPitch);
    state.editingWorkflowAtBatSnapshot = captureWorkflowAtBatSnapshot();
    state.activePitch = cloneSavedPitch(savedPitch);
    state.activePitch.id = pitchId;
    state.activePitchIndex = index;
    state.activePitchCompleted = true;
    state.pendingProductiveOutOutcome = "";
    resetStepHistory();
    state.step = "location";
    setMessage("", false);
    renderAtBats();
  }

  function cancelWorkflowPitchEdit() {
    if (state.workflowPitchSaving || !isEditingWorkflowPitch()) {
      return;
    }

    restoreWorkflowAtBatSnapshot();
    state.activePitch = null;
    state.activePitchIndex = null;
    state.activePitchCompleted = false;
    resetWorkflowPitchEditState();
    resetStepHistory();
    state.step = "location";
    setMessage("Pitch edit canceled.", false);
    renderAtBats();
  }

  async function updateWorkflowPitch() {
    if (
      state.workflowPitchSaving ||
      !isEditingWorkflowPitch() ||
      !state.activeAtBat ||
      !state.activePitch
    ) {
      return;
    }

    const replacement = replacePitchInSequence(
      state.activeAtBat.pitches.map(cloneSavedPitch),
      state.activePitch,
      state.editingWorkflowPitchId,
      state.editingWorkflowPitchIndex
    );

    if (!replacement) {
      setMessage("We couldn't find that pitch. Select it again and retry.");
      return;
    }

    const targetIndex = replacement.targetIndex;
    const updatedPitches = replacement.pitches.map((pitch, index) => index === targetIndex
      ? normalizePitch({
          ...pitch,
          id: state.editingWorkflowPitchId,
        })
      : pitch);
    const snapshot = state.editingWorkflowAtBatSnapshot;
    const snapshotAtBat = snapshot ? {
      ...state.activeAtBat,
      finalOutcome: snapshot.finalOutcome,
      outcome: snapshot.outcome,
    } : state.activeAtBat;
    const explicitlyChangedFinalOutcome = Boolean(
      snapshot &&
      state.activeAtBat.finalOutcome &&
      state.activeAtBat.finalOutcome !== snapshot.finalOutcome
    );
    if (
      targetIndex < updatedPitches.length - 1 ||
      (
        snapshot &&
        !explicitlyChangedFinalOutcome &&
        pitchesSupportSavedAtBatResult(snapshotAtBat, updatedPitches)
      )
    ) {
      restoreWorkflowAtBatSnapshot();
    }
    const updatedAtBat = normalizeAtBat({
      ...state.activeAtBat,
      balls: undefined,
      strikes: undefined,
      pitches: updatedPitches,
    });

    state.workflowPitchSaving = true;
    renderAtBats();

    try {
      if (Number.isInteger(state.workflowEditAtBatIndex)) {
        syncDraftFields();
        const updatedGame = {
          ...state.draftGame,
          atBats: state.draftGame.atBats.map((atBat, index) => (
            index === state.workflowEditAtBatIndex ? updatedAtBat : atBat
          )),
        };
        state.draftGame = await upsertSavedGame(games, updatedGame);
        state.activeAtBat = cloneAtBatForWorkflow(
          state.draftGame.atBats[state.workflowEditAtBatIndex]
        );
        state.workflowEditOriginalAtBat = cloneAtBatForWorkflow(state.activeAtBat);
        renderGamesHome();
      } else {
        state.activeAtBat = updatedAtBat;
      }
    } catch (error) {
      state.workflowPitchSaving = false;
      console.error("Unable to update pitch:", error);
      setMessage("We couldn't update this pitch. Please try again.");
      renderAtBats();
      return;
    }

    state.activePitch = null;
    state.activePitchIndex = null;
    state.activePitchCompleted = false;
    resetWorkflowPitchEditState();
    resetStepHistory();
    state.step = "location";
    setMessage("Pitch updated.", true);
    renderAtBats();
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

    state.activePitch = null;
    state.activePitchIndex = null;
    state.activePitchCompleted = false;
    resetWorkflowPitchEditState();
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

  function currentUserOwnsLoadedGames() {
    return Boolean(gamesOwnerUserId && getCurrentUser()?.id === gamesOwnerUserId);
  }

  function setGameDetailsEditing(isEditing) {
    const game = getReviewGame();

    state.gameDetailsEditing = isEditing;
    reviewDetails.hidden = isEditing;
    gameDetailsForm.hidden = !isEditing;
    editGameDetailsButton.hidden = isEditing;
    editGameDetailsButton.setAttribute("aria-expanded", String(isEditing));

    if (isEditing && game) {
      gameDateInput.value = game.date || "";
      gameOpponentInput.value = game.opponent || "";
      gameDateInput.focus();
    }
  }

  function closeDeleteGameModal({ restoreFocus = true } = {}) {
    deleteGameModal.hidden = true;
    document.body.classList.remove("has-game-modal");
    deleteGameMessage.textContent = "";
    deleteGameMessage.classList.remove("is-error");

    if (restoreFocus) {
      lastDeleteGameModalFocus?.focus();
    }
  }

  function openDeleteGameModal() {
    lastDeleteGameModalFocus = document.activeElement;
    deleteGameMessage.textContent = "";
    deleteGameMessage.classList.remove("is-error");
    deleteGameModal.hidden = false;
    document.body.classList.add("has-game-modal");
    confirmDeleteGameButton.focus();
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
      hardHitBall:
        isHardHitEligible(atBat) && typeof atBat.hardHitBall === "boolean"
          ? atBat.hardHitBall
          : null,
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
    const hardHitEligible = isHardHitEligible({
      ...originalAtBat,
      battedBallType,
      finalOutcome: draft.outcome,
      outcome: normalizedOutcome,
    });
    const editedAtBat = {
      ...originalAtBat,
      pitcherHandedness: draft.pitcherHandedness,
      pitcherVelocity: draft.pitcherVelocity,
      battedBallType,
      hardHitBall: hardHitEligible ? draft.hardHitBall : null,
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

  function resetPitchReviewState() {
    state.editingPitchAtBatIndex = null;
    state.editingPitchIndex = null;
    state.editingPitchDraft = null;
    state.deletingPitchAtBatIndex = null;
    state.deletingPitchIndex = null;
    state.pitchEditSaving = false;
  }

  function cloneSavedPitch(pitch) {
    return {
      ...pitch,
      location: pitch.location && typeof pitch.location === "object"
        ? { ...pitch.location }
        : pitch.location,
    };
  }

  function getEditablePitchResult(pitch) {
    const strikeResult = pitch?.strikeType || pitch?.strikeDetail;

    if (strikeResult === "called_strike" || strikeResult === "swinging_strike") {
      return strikeResult;
    }

    const savedResult =
      pitch?.primaryResult ||
      pitch?.result ||
      pitch?.pitch_result ||
      pitch?.swing_result ||
      "";

    if (savedResult === "hit_by_pitch") {
      return "hit_by_pitch";
    }

    if (
      savedResult === "batted_ball" ||
      pitch?.battedBallType ||
      pitch?.batted_ball_type ||
      (
        !savedResult &&
        (pitch?.battedBallOutcome || pitch?.batted_ball_outcome)
      )
    ) {
      return "batted_ball";
    }

    return editablePitchResultOptions.some((option) => option.value === savedResult)
      ? savedResult
      : "";
  }

  function isInPlayPitch(pitch) {
    return getEditablePitchResult(pitch) === "batted_ball";
  }

  function createPitchEditDraft(pitch) {
    const location = findPitchLocationFromSavedPitch(pitch);

    return {
      locationId: location?.id || "",
      result: getEditablePitchResult(pitch),
      error: "",
    };
  }

  function applyPitchEdit(originalPitch, draft) {
    const location = pitchLocations.find((option) => option.id === draft.locationId);
    const editedPitch = cloneSavedPitch(originalPitch);
    const selectedResult = draft.result;

    editedPitch.location = {
      id: location.id,
      label: location.label,
      isZone: location.isZone,
    };
    editedPitch.locationId = location.id;
    editedPitch.locationLabel = location.label;
    editedPitch.pitch_location = location.id;
    editedPitch.result = selectedResult;
    editedPitch.primaryResult = selectedResult;
    editedPitch.pitch_result = selectedResult;
    editedPitch.swing_result = selectedResult;

    delete editedPitch.strikeType;
    delete editedPitch.strikeDetail;

    if (selectedResult === "called_strike" || selectedResult === "swinging_strike") {
      editedPitch.strikeType = selectedResult;
      editedPitch.strikeDetail = selectedResult;
    }

    if (selectedResult !== "foul_ball") {
      delete editedPitch.foulDirection;
    }

    if (selectedResult !== "batted_ball") {
      [
        "battedBallType",
        "batted_ball_type",
        "contact_type",
        "hitLocation",
        "hit_location",
        "hitLocationX",
        "hitLocationY",
        "hit_location_x",
        "hit_location_y",
        "battedBallOutcome",
        "batted_ball_outcome",
        "outcome",
        "chartResult",
      ].forEach((field) => delete editedPitch[field]);
    }

    if (selectedResult === "hit_by_pitch") {
      editedPitch.battedBallOutcome = "hit_by_pitch";
      editedPitch.batted_ball_outcome = "hit_by_pitch";
      editedPitch.outcome = "hit_by_pitch";
    }

    return editedPitch;
  }

  function pitchesSupportSavedAtBatResult(atBat, pitches) {
    if (!atBat.finalOutcome && !atBat.outcome) {
      return true;
    }

    const savedOutcome = getEditOutcomeValue(atBat);

    if (isBattedEditOutcome(savedOutcome)) {
      return pitches.some(isInPlayPitch);
    }

    if (savedOutcome === "hit_by_pitch") {
      return pitches.some((pitch) => getEditablePitchResult(pitch) === "hit_by_pitch");
    }

    if (savedOutcome === "strikeout") {
      return pitches.some((pitch) => {
        const result = getEditablePitchResult(pitch);
        return result === "strike" || result === "called_strike" || result === "swinging_strike";
      });
    }

    if (savedOutcome === "walk") {
      return pitches.some((pitch) => getEditablePitchResult(pitch) === "ball");
    }

    return true;
  }

  function pitchResultConflictsWithSavedAtBat(atBat, pitchResult) {
    if (!atBat.finalOutcome && !atBat.outcome) {
      return false;
    }

    const savedOutcome = getEditOutcomeValue(atBat);

    if (pitchResult === "hit_by_pitch") {
      return savedOutcome !== "hit_by_pitch";
    }

    if (pitchResult === "batted_ball") {
      return !isBattedEditOutcome(savedOutcome);
    }

    return false;
  }

  async function saveReviewPitchChange(game, atBatIndex, pitches, successMessage) {
    const updatedAtBat = normalizeAtBat({
      ...game.atBats[atBatIndex],
      balls: undefined,
      strikes: undefined,
      pitches,
    });
    const updatedGame = {
      ...game,
      atBats: game.atBats.map((atBat, index) => index === atBatIndex ? updatedAtBat : atBat),
    };
    const existingGameIndex = games.findIndex((savedGame) => savedGame.id === game.id);
    let savedGame;

    try {
      savedGame = await upsertSavedGame(games, updatedGame);
    } catch (saveError) {
      if (existingGameIndex >= 0) {
        games[existingGameIndex] = game;
      }
      throw saveError;
    }

    state.reviewGameId = savedGame.id;
    resetPitchReviewState();
    reviewMessage.textContent = successMessage;
    reviewMessage.classList.remove("is-error");
    reviewMessage.classList.add("is-success");
    renderGamesHome();
    renderGamesTable(games, "review-games-table-body", "review-games-empty");
    renderReviewGame();
  }

  function showPitchEditError(message) {
    if (state.editingPitchDraft) {
      state.editingPitchDraft.error = message;
    }
    reviewMessage.textContent = message;
    reviewMessage.classList.remove("is-success");
    reviewMessage.classList.add("is-error");
    renderReviewGame();
  }

  function renderPitchEditor(atBat, atBatIndex, pitch, pitchIndex) {
    const draft = state.editingPitchDraft;
    const editor = document.createElement("div");
    const title = document.createElement("h4");
    const zone = document.createElement("div");
    const helper = document.createElement("p");
    const resultLabel = document.createElement("label");
    const resultText = document.createElement("span");
    const resultSelect = document.createElement("select");
    const error = document.createElement("p");
    const actions = document.createElement("div");
    const updateButton = document.createElement("button");
    const cancelButton = document.createElement("button");

    editor.className = "review-pitch-editor";
    title.textContent = `Edit Pitch ${pitchIndex + 1}`;
    zone.className = "location-grid review-pitch-location-grid";
    renderStrikeZoneLayout(zone, {
      interactive: true,
      selectedLocationId: draft.locationId,
      onSelectLocation(location) {
        draft.locationId = location.id;
        draft.error = "";
        renderReviewGame();
      },
    });
    helper.className = "pitch-location-helper";
    helper.textContent = "This is the catcher's perspective of the pitch location.";

    resultText.textContent = "Pitch Result";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select Pitch Result";
    resultSelect.appendChild(placeholder);
    editablePitchResultOptions.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      resultSelect.appendChild(optionElement);
    });
    resultSelect.value = draft.result;
    resultSelect.addEventListener("change", () => {
      draft.result = resultSelect.value;
      draft.error = "";
    });
    resultLabel.appendChild(resultText);
    resultLabel.appendChild(resultSelect);

    error.className = "form-message is-error review-pitch-error";
    error.setAttribute("aria-live", "polite");
    error.textContent = draft.error;

    actions.className = "builder-actions review-pitch-editor-actions";
    updateButton.type = "button";
    updateButton.textContent = state.pitchEditSaving ? "Updating..." : "Update Pitch";
    updateButton.disabled = state.pitchEditSaving;
    updateButton.addEventListener("click", async () => {
      if (state.pitchEditSaving) {
        return;
      }

      if (!draft.locationId) {
        showPitchEditError("Select a strike-zone location before updating the pitch.");
        return;
      }

      if (!draft.result) {
        showPitchEditError("Select a pitch result before updating the pitch.");
        return;
      }

      if (draft.result === "batted_ball" && !isInPlayPitch(pitch)) {
        showPitchEditError("Update the at-bat result first before changing this pitch to Batted Ball.");
        return;
      }

      if (pitchResultConflictsWithSavedAtBat(atBat, draft.result)) {
        showPitchEditError("This pitch result conflicts with the saved at-bat result. Update the at-bat result first, then edit this pitch.");
        return;
      }

      const game = getReviewGame();

      if (!game?.atBats?.[atBatIndex]?.pitches?.[pitchIndex]) {
        showPitchEditError("We couldn't find that pitch. Please reopen the game and try again.");
        return;
      }

      const pitches = game.atBats[atBatIndex].pitches.map(cloneSavedPitch);
      pitches[pitchIndex] = applyPitchEdit(pitches[pitchIndex], draft);

      if (!pitchesSupportSavedAtBatResult(game.atBats[atBatIndex], pitches)) {
        showPitchEditError("This change conflicts with the saved at-bat result. Update the at-bat result first, then edit this pitch.");
        return;
      }

      state.pitchEditSaving = true;
      updateButton.disabled = true;
      updateButton.textContent = "Updating...";

      try {
        await saveReviewPitchChange(game, atBatIndex, pitches, "Pitch updated.");
      } catch (saveError) {
        state.pitchEditSaving = false;
        showPitchEditError("We couldn't update this pitch. Please try again.");
      }
    });

    cancelButton.type = "button";
    cancelButton.className = "secondary-button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      resetPitchReviewState();
      reviewMessage.textContent = "";
      reviewMessage.classList.remove("is-error");
      renderReviewGame();
    });

    actions.appendChild(updateButton);
    actions.appendChild(cancelButton);
    editor.appendChild(title);
    editor.appendChild(zone);
    editor.appendChild(helper);
    editor.appendChild(resultLabel);
    editor.appendChild(error);
    editor.appendChild(actions);
    return editor;
  }

  function renderPitchDeleteConfirmation(atBatIndex, pitchIndex) {
    const confirmation = document.createElement("div");
    const copy = document.createElement("p");
    const actions = document.createElement("div");
    const confirmButton = document.createElement("button");
    const cancelButton = document.createElement("button");

    confirmation.className = "review-pitch-delete-confirmation";
    copy.innerHTML = "<strong>Delete this pitch?</strong><br>This cannot be undone.";
    actions.className = "builder-actions review-pitch-delete-actions";
    confirmButton.type = "button";
    confirmButton.className = "danger-button";
    confirmButton.textContent = "Delete Pitch";
    confirmButton.addEventListener("click", async () => {
      if (state.pitchEditSaving) {
        return;
      }

      const game = getReviewGame();
      const atBat = game?.atBats?.[atBatIndex];

      if (!Array.isArray(atBat?.pitches) || !atBat.pitches[pitchIndex]) {
        reviewMessage.textContent = "We couldn't find that pitch. Please reopen the game and try again.";
        reviewMessage.classList.remove("is-success");
        reviewMessage.classList.add("is-error");
        return;
      }

      const pitches = atBat.pitches
        .filter((unusedPitch, index) => index !== pitchIndex)
        .map(cloneSavedPitch);

      if (!pitchesSupportSavedAtBatResult(atBat, pitches)) {
        reviewMessage.textContent = "Deleting this pitch conflicts with the saved at-bat result. Update the at-bat result first, then delete the pitch.";
        reviewMessage.classList.remove("is-success");
        reviewMessage.classList.add("is-error");
        renderReviewGame();
        return;
      }

      state.pitchEditSaving = true;
      confirmButton.disabled = true;
      confirmButton.textContent = "Deleting...";

      try {
        await saveReviewPitchChange(game, atBatIndex, pitches, "Pitch deleted.");
      } catch (deleteError) {
        state.pitchEditSaving = false;
        confirmButton.disabled = false;
        confirmButton.textContent = "Delete Pitch";
        reviewMessage.textContent = "We couldn't delete this pitch. Please try again.";
        reviewMessage.classList.remove("is-success");
        reviewMessage.classList.add("is-error");
      }
    });

    cancelButton.type = "button";
    cancelButton.className = "secondary-button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      state.deletingPitchAtBatIndex = null;
      state.deletingPitchIndex = null;
      reviewMessage.textContent = "";
      reviewMessage.classList.remove("is-error");
      renderReviewGame();
    });

    actions.appendChild(confirmButton);
    actions.appendChild(cancelButton);
    confirmation.appendChild(copy);
    confirmation.appendChild(actions);
    return confirmation;
  }

  function renderEditablePitchSequence(sequenceElement, atBat, atBatIndex) {
    sequenceElement.innerHTML = "";

    if (!Array.isArray(atBat.pitches) || atBat.pitches.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state compact-empty";
      empty.textContent = "No pitches logged yet.";
      sequenceElement.appendChild(empty);
      return;
    }

    atBat.pitches.forEach((pitch, pitchIndex) => {
      const item = document.createElement("article");
      const row = document.createElement("div");
      const editButton = document.createElement("button");
      const pitchLabel = document.createElement("strong");
      const summary = document.createElement("span");
      const deleteButton = document.createElement("button");

      item.className = "review-pitch-item";
      row.className = "review-pitch-row";
      editButton.type = "button";
      editButton.className = "review-pitch-edit-button";
      editButton.setAttribute("aria-label", `Edit Pitch ${pitchIndex + 1}`);
      pitchLabel.textContent = `Pitch ${pitchIndex + 1}`;
      summary.textContent = getSimplePitchResultLabel(pitch);
      editButton.appendChild(pitchLabel);
      editButton.appendChild(summary);
      editButton.addEventListener("click", () => {
        state.editingPitchAtBatIndex = atBatIndex;
        state.editingPitchIndex = pitchIndex;
        state.editingPitchDraft = createPitchEditDraft(pitch);
        state.deletingPitchAtBatIndex = null;
        state.deletingPitchIndex = null;
        reviewMessage.textContent = "";
        reviewMessage.classList.remove("is-success", "is-error");
        renderReviewGame();
      });

      deleteButton.type = "button";
      deleteButton.className = "review-pitch-delete-button";
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute("aria-label", `Delete Pitch ${pitchIndex + 1}`);
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        state.deletingPitchAtBatIndex = atBatIndex;
        state.deletingPitchIndex = pitchIndex;
        state.editingPitchAtBatIndex = null;
        state.editingPitchIndex = null;
        state.editingPitchDraft = null;
        reviewMessage.textContent = "";
        reviewMessage.classList.remove("is-success", "is-error");
        renderReviewGame();
      });

      row.appendChild(editButton);
      row.appendChild(deleteButton);
      item.appendChild(row);

      if (
        state.editingPitchAtBatIndex === atBatIndex &&
        state.editingPitchIndex === pitchIndex &&
        state.editingPitchDraft
      ) {
        item.appendChild(renderPitchEditor(atBat, atBatIndex, pitch, pitchIndex));
      }

      if (
        state.deletingPitchAtBatIndex === atBatIndex &&
        state.deletingPitchIndex === pitchIndex
      ) {
        item.appendChild(renderPitchDeleteConfirmation(atBatIndex, pitchIndex));
      }

      sequenceElement.appendChild(item);
    });
  }

  function renderEditAtBatForm(atBat, index) {
    const draft = state.editingAtBatDraft;
    const form = document.createElement("div");
    const fieldGrid = document.createElement("div");
    const actions = document.createElement("div");
    const saveButton = document.createElement("button");
    const cancelButton = document.createElement("button");
    const normalizedOutcome = normalizeLegacyOutcome(draft.outcome, draft.battedBallType);
    const hardHitEligible = isHardHitEligible({
      ...atBat,
      battedBallType: draft.battedBallType,
      finalOutcome: draft.outcome,
      outcome: normalizedOutcome,
    });

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

        const nextNormalizedOutcome = normalizeLegacyOutcome(draft.outcome, draft.battedBallType);
        if (!isHardHitEligible({
          ...atBat,
          battedBallType: draft.battedBallType,
          finalOutcome: draft.outcome,
          outcome: nextNormalizedOutcome,
        })) {
          draft.hardHitBall = null;
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
    if (hardHitEligible) {
      fieldGrid.appendChild(
        renderEditSelect("Hard Hit Ball", draft.hardHitBall === null ? "" : String(draft.hardHitBall), [
          { label: "Not Set", value: "" },
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ], (value) => {
          draft.hardHitBall = value === "" ? null : value === "true";
        })
      );
    }
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
    saveButton.addEventListener("click", async () => {
      const game = getReviewGame();

      if (!game || !Array.isArray(game.atBats)) {
        return;
      }

      if (hardHitEligible && typeof draft.hardHitBall !== "boolean") {
        reviewMessage.textContent = "Select whether this was a hard-hit ball before saving.";
        reviewMessage.classList.remove("is-success");
        reviewMessage.classList.add("is-error");
        return;
      }

      const updatedGame = {
        ...game,
        atBats: game.atBats.map((savedAtBat, atBatIndex) => (
          atBatIndex === index ? createEditedAtBat(atBat, draft) : savedAtBat
        )),
      };
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";
      try {
        const savedGame = await upsertSavedGame(games, updatedGame);
        state.reviewGameId = savedGame.id;
        state.editingAtBatIndex = null;
        state.editingAtBatDraft = null;
        reviewMessage.textContent = "At-bat updated.";
        reviewMessage.classList.remove("is-error");
        reviewMessage.classList.add("is-success");
        renderGamesHome();
        renderGamesTable(games, "review-games-table-body", "review-games-empty");
        renderReviewGame();
      } catch (error) {
        console.error("Unable to update at-bat:", error);
        reviewMessage.textContent = "We couldn't update this at-bat. Please try again.";
        reviewMessage.classList.add("is-error");
        saveButton.disabled = false;
        saveButton.textContent = "Save At-Bat";
      }
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
    reviewTitle.textContent = "Game Details";
    reviewDate.textContent = formatDisplayDate(gameStats.date);
    reviewOpponent.textContent = gameStats.opponent || "Opponent";
    reviewMeta.textContent = `${getGameAtBatCount(gameStats)} at-bats | ${gameStats.hits} hits`;
    reviewDetails.hidden = state.gameDetailsEditing;
    gameDetailsForm.hidden = !state.gameDetailsEditing;
    editGameDetailsButton.hidden = state.gameDetailsEditing;
    editGameDetailsButton.setAttribute("aria-expanded", String(state.gameDetailsEditing));
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
        resetPitchReviewState();
        state.editingAtBatIndex = index;
        state.editingAtBatDraft = createEditDraft(atBat);
        reviewMessage.textContent = "";
        reviewMessage.classList.remove("is-success", "is-error");
        renderReviewGame();
      });
      heading.appendChild(title);
      heading.appendChild(editButton);

      sequence.className = "pitch-sequence";
      renderEditablePitchSequence(sequence, atBat, index);

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
    state.gameDetailsEditing = false;
    state.gameDetailsSaving = false;
    state.gameDeleting = false;
    state.editingAtBatIndex = null;
    state.editingAtBatDraft = null;
    resetPitchReviewState();
    homeView.hidden = true;
    reviewListView.hidden = true;
    reviewView.hidden = false;
    tournamentDetailsView.hidden = true;
    choiceView.hidden = true;
    tournamentNameView.hidden = true;
    newGameView.hidden = true;
    reviewMessage.textContent = "";
    reviewMessage.classList.remove("is-success", "is-error");
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

    const pitchContext = document.createElement("div");
    const pitchLabel = document.createElement("p");
    pitchContext.className = "pitch-entry-context";
    pitchLabel.className = "pitch-entry-number";
    pitchLabel.textContent = isEditingWorkflowPitch()
      ? `Editing Pitch ${state.editingWorkflowPitchIndex + 1}`
      : `Pitch ${getNextPitchNumber(state.activeAtBat)}`;
    pitchContext.appendChild(pitchLabel);

    if (isEditingWorkflowPitch()) {
      const cancelPitchEditButton = document.createElement("button");
      cancelPitchEditButton.type = "button";
      cancelPitchEditButton.className = "pitch-edit-cancel-button";
      cancelPitchEditButton.textContent = "Cancel pitch edit";
      cancelPitchEditButton.disabled = state.workflowPitchSaving;
      cancelPitchEditButton.addEventListener("click", cancelWorkflowPitchEdit);
      pitchContext.appendChild(cancelPitchEditButton);
    }

    card.appendChild(pitchContext);

    const prompt = document.createElement("p");
    prompt.className = "section-copy";
    prompt.textContent =
      state.step === "at_bat_details"
        ? "Enter pitcher details before logging pitches."
        : state.step === "location"
          ? "Select a pitch location."
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
      card.appendChild(renderOptionGroup("Pitch Result", pitchResultOptions, handlePitchResult, getWorkflowPitchResultSelection(state.activePitch)));
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
    renderPitchSequence(sequenceList, state.activeAtBat, {
      onEditPitch: beginWorkflowPitchEdit,
      editingPitchId: state.editingWorkflowPitchId,
      disabled: state.workflowPitchSaving,
    });
    sequence.appendChild(sequenceTitle);
    sequence.appendChild(sequenceList);
    card.appendChild(sequence);

    return card;
  }

  function renderActionButtons(showNextPitch) {
    const actions = document.createElement("div");
    actions.className = "builder-actions game-entry-actions";

    if (isEditingWorkflowPitch()) {
      const updatePitch = document.createElement("button");
      const cancelPitchEdit = document.createElement("button");
      updatePitch.type = "button";
      updatePitch.textContent = state.workflowPitchSaving ? "Updating..." : "Update Pitch";
      updatePitch.disabled = state.workflowPitchSaving;
      updatePitch.addEventListener("click", updateWorkflowPitch);
      cancelPitchEdit.type = "button";
      cancelPitchEdit.className = "secondary-button";
      cancelPitchEdit.textContent = "Cancel";
      cancelPitchEdit.disabled = state.workflowPitchSaving;
      cancelPitchEdit.addEventListener("click", cancelWorkflowPitchEdit);
      actions.appendChild(updatePitch);
      actions.appendChild(cancelPitchEdit);
      return actions;
    }

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

    if (isEditingWorkflowPitch()) {
      state.activePitchCompleted = true;
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

    const previousResult = getWorkflowPitchResultSelection(state.activePitch);
    const preserveDependentFields = isEditingWorkflowPitch() && previousResult === result;
    state.activePitch.result = result;
    state.activePitch.primaryResult = result;
    state.activePitch.pitch_result = result;
    state.activePitch.swing_result = result;
    state.activePitchCompleted = false;
    if (!preserveDependentFields) {
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
    }
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
    if (isOutOutcome(normalizedOutcome)) {
      goToStep("productive_out");
      return;
    }

    goToStep(isHardHitEligible(state.activeAtBat) ? "hard_hit_ball" : "timing");
  }

  function handleProductiveOut(isProductiveOut) {
    if (!state.activeAtBat) {
      return;
    }

    state.activeAtBat.productiveOut =
      isProductiveOut || isAutomaticallyProductiveOut(state.pendingProductiveOutOutcome);
    state.pendingProductiveOutOutcome = "";
    goToStep(isHardHitEligible(state.activeAtBat) ? "hard_hit_ball" : "timing");
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

  async function endAtBatFlow() {
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

    if (!isHardHitEligible(state.activeAtBat)) {
      state.activeAtBat.hardHitBall = null;
    } else if (typeof state.activeAtBat.hardHitBall !== "boolean") {
      state.step = "hard_hit_ball";
      setMessage("Select whether this was a hard-hit ball before saving this at-bat.");
      renderAtBats();
      return;
    }

    if (hasBallInPlay(state.activeAtBat) && !normalizeTiming(state.activeAtBat.timing)) {
      state.step = "timing";
      setMessage("Select your timing before saving this at-bat.");
      renderAtBats();
      return;
    }

    const wasEditingWorkflow = Number.isInteger(state.workflowEditAtBatIndex) && state.workflowEditAtBatIndex >= 0;
    const previousAtBats = state.draftGame.atBats.slice();

    if (wasEditingWorkflow) {
      state.draftGame.atBats[state.workflowEditAtBatIndex] = normalizeAtBat(state.activeAtBat);
    } else {
      state.draftGame.atBats.push(normalizeAtBat(state.activeAtBat));
    }

    syncDraftFields();
    if (state.draftGame.date && state.draftGame.opponent) {
      try {
        state.draftGame = await upsertSavedGame(games, state.draftGame);
        renderGamesHome();
      } catch (error) {
        state.draftGame.atBats = previousAtBats;
        console.error("Unable to save at-bat:", error);
        setMessage("We couldn't save this at-bat. Please try again.");
        return;
      }
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

  editGameDetailsButton.addEventListener("click", () => {
    reviewMessage.textContent = "";
    reviewMessage.classList.remove("is-success", "is-error");
    setGameDetailsEditing(true);
  });

  cancelGameDetailsButton.addEventListener("click", () => {
    if (state.gameDetailsSaving) {
      return;
    }

    reviewMessage.textContent = "";
    reviewMessage.classList.remove("is-success", "is-error");
    setGameDetailsEditing(false);
    editGameDetailsButton.focus();
  });

  gameDetailsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (state.gameDetailsSaving) {
      return;
    }

    if (!currentUserOwnsLoadedGames()) {
      reviewMessage.textContent = "Your session changed. Please reload the page before editing this game.";
      reviewMessage.classList.remove("is-success");
      reviewMessage.classList.add("is-error");
      return;
    }

    const game = getReviewGame();
    const date = gameDateInput.value;
    const opponent = gameOpponentInput.value.trim();

    if (!date) {
      reviewMessage.textContent = "Enter a game date before saving.";
      reviewMessage.classList.remove("is-success");
      reviewMessage.classList.add("is-error");
      gameDateInput.focus();
      return;
    }

    if (!opponent) {
      reviewMessage.textContent = "Enter an opponent name before saving.";
      reviewMessage.classList.remove("is-success");
      reviewMessage.classList.add("is-error");
      gameOpponentInput.focus();
      return;
    }

    if (!game) {
      reviewMessage.textContent = "We couldn't find that game. Please return to Games and try again.";
      reviewMessage.classList.remove("is-success");
      reviewMessage.classList.add("is-error");
      return;
    }

    const gameIndex = games.findIndex((savedGame) => savedGame.id === game.id);
    const originalGame = gameIndex >= 0 ? games[gameIndex] : null;

    state.gameDetailsSaving = true;
    saveGameDetailsButton.disabled = true;
    saveGameDetailsButton.textContent = "Saving...";
    reviewMessage.textContent = "";
    reviewMessage.classList.remove("is-success", "is-error");

    try {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const savedGame = await upsertSavedGame(games, {
        ...game,
        date,
        opponent,
      });

      state.reviewGameId = savedGame.id;
      state.gameDetailsEditing = false;
      renderGamesHome();
      renderGamesTable(games, "review-games-table-body", "review-games-empty");
      renderReviewGame();
      reviewMessage.textContent = "Game details updated successfully.";
      reviewMessage.classList.remove("is-error");
      reviewMessage.classList.add("is-success");
    } catch (saveError) {
      if (gameIndex >= 0 && originalGame) {
        games[gameIndex] = originalGame;
      }

      console.error("Unable to update game details:", saveError);
      reviewMessage.textContent = "We couldn't update the game details. Please try again.";
      reviewMessage.classList.remove("is-success");
      reviewMessage.classList.add("is-error");
    } finally {
      state.gameDetailsSaving = false;
      saveGameDetailsButton.disabled = false;
      saveGameDetailsButton.textContent = "Save Changes";
    }
  });

  deleteGameButton.addEventListener("click", openDeleteGameModal);
  cancelDeleteGameButton.addEventListener("click", () => {
    if (!state.gameDeleting) {
      closeDeleteGameModal();
    }
  });
  deleteGameModal.addEventListener("click", (event) => {
    if (event.target === deleteGameModal && !state.gameDeleting) {
      closeDeleteGameModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (deleteGameModal.hidden) {
      return;
    }

    if (event.key === "Escape" && !state.gameDeleting) {
      event.preventDefault();
      closeDeleteGameModal();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = Array.from(
      deleteGameModal.querySelectorAll("button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])")
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (!firstFocusable || !lastFocusable) {
      return;
    }

    if (event.shiftKey && document.activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus();
    } else if (!event.shiftKey && document.activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  });

  confirmDeleteGameButton.addEventListener("click", async () => {
    if (state.gameDeleting) {
      return;
    }

    if (!currentUserOwnsLoadedGames()) {
      deleteGameMessage.textContent = "Your session changed. Please reload the page before deleting this game.";
      deleteGameMessage.classList.add("is-error");
      return;
    }

    const game = getReviewGame();
    const gameIndex = game ? games.findIndex((savedGame) => savedGame.id === game.id) : -1;

    if (!game || gameIndex < 0) {
      deleteGameMessage.textContent = "We couldn't find that game. Please close this message and try again.";
      deleteGameMessage.classList.add("is-error");
      return;
    }

    state.gameDeleting = true;
    confirmDeleteGameButton.disabled = true;
    cancelDeleteGameButton.disabled = true;
    confirmDeleteGameButton.textContent = "Deleting...";
    deleteGameMessage.textContent = "";
    deleteGameMessage.classList.remove("is-error");
    const deletedGame = games[gameIndex];

    try {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      games.splice(gameIndex, 1);
      if (typeof window.deleteGameFromCloud !== "function") {
        throw new Error("Supabase game storage is unavailable.");
      }
      await window.deleteGameFromCloud(deletedGame.id);
      await refreshHlpScoresSafely();
      closeDeleteGameModal({ restoreFocus: false });
      window.history.replaceState(null, "", "games.html");
      showHomeView();
      gamesMessage.textContent = "Game deleted successfully.";
      gamesMessage.classList.remove("is-error");
      gamesMessage.classList.add("is-success");
    } catch (deleteError) {
      if (!games.some((savedGame) => savedGame.id === deletedGame.id)) {
        games.splice(gameIndex, 0, deletedGame);
      }

      console.error("Unable to delete game:", deleteError);
      deleteGameMessage.textContent = "We couldn't delete this game. Please try again.";
      deleteGameMessage.classList.add("is-error");
    } finally {
      state.gameDeleting = false;
      confirmDeleteGameButton.disabled = false;
      cancelDeleteGameButton.disabled = false;
      confirmDeleteGameButton.textContent = "Delete Game";
    }
  });

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
  addGameButton.addEventListener("click", () => {
    if (ensureCanCreateGame(gamesMessage)) {
      showChoiceView();
    }
  });
  choiceBackButton.addEventListener("click", showHomeView);
  startTournamentButton.addEventListener("click", showTournamentNameView);
  tournamentBackButton.addEventListener("click", showChoiceView);
  singleGameButton.addEventListener("click", () => {
    if (ensureCanCreateGame(gamesMessage)) {
      showNewGameView(null);
    }
  });
  backButton.addEventListener("click", showHomeView);
  tournamentDetailsBack.addEventListener("click", showHomeView);
  tournamentDetailsAddGame.addEventListener("click", () => {
    const tournament = getTournamentById(state.selectedTournamentId);

    if (tournament) {
      openTournamentGame(tournament);
    }
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

    if (!ensureCanCreateGame(formMessage)) {
      return;
    }

    showNewGameView(state.activeTournament);
  });

  finishTournamentButton.addEventListener("click", async () => {
    if (state.activeAtBat) {
      setMessage("Finish the current at-bat before finishing the tournament.");
      return;
    }

    try {
      await setTournamentCompletion(state.activeTournament.id, true);
      state.activeTournament = null;
      showHomeView();
    } catch (error) {
      console.error("Unable to finish tournament:", error);
      setMessage("We couldn't finish this tournament. Please try again.");
    }
  });

  async function saveDraftGame(message) {
    syncDraftFields();

    if (!state.draftGame.date || !state.draftGame.opponent) {
      setMessage("Enter a date and opponent before saving the game.");
      return false;
    }

    if (state.activeAtBat) {
      setMessage("Finish the current at-bat before saving the game.");
      return false;
    }

    try {
      state.draftGame = await upsertSavedGame(games, state.draftGame);
      renderGamesHome();
      setMessage(message, true);
      return true;
    } catch (error) {
      console.error("Unable to save game:", error);
      if (String(error?.message || "").includes("FREE_GAME_LIMIT_REACHED")) {
        showGameLimitMessage(formMessage);
      } else {
        setMessage("We couldn't save this game. Please try again.");
      }
      return false;
    }
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

  saveGameButton.addEventListener("click", async () => {
    if (await saveDraftGame(state.activeTournament ? "Tournament game saved." : "Game saved.")) {
      updateTournamentContext();
      renderAtBats();
    }
  });

  finishGameButton.addEventListener("click", async () => {
    if (state.activeTournament) {
      return;
    }

    if (await saveDraftGame("Game finished.")) {
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
  const performanceScore = getOverallHlpScore();
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
    lineDrivePercent: calculateRateMetric(metrics.lineDrives, metrics.ballsInPlay) ?? 0,
    groundBallPercent: calculateRateMetric(metrics.groundBalls, metrics.ballsInPlay) ?? 0,
    flyBallPercent: calculateRateMetric(metrics.flyBalls, metrics.ballsInPlay) ?? 0,
    extraBaseHitPercent: calculateRateMetric(extraBaseHits, totals.hits),
    chaseRate: calculateRateMetric(metrics.outOfZoneSwings, metrics.outOfZonePitches),
    contactRate: calculateRateMetric(metrics.contactSwings, metrics.swings),
    qualityAtBatPercent: calculateRateMetric(metrics.qualityAtBats, metrics.plateAppearances),
    productiveOutPercent: calculateRateMetric(metrics.productiveOuts, metrics.totalOuts),
  };
}

function getHardHitMetrics(atBats) {
  const metrics = atBats.reduce(
    (summary, atBat) => {
      const isEligibleBattedBall = isHardHitEligible(atBat);
      const isTwoStrikeAtBat = reachedTwoStrikes(atBat);
      const isHardHit = isEligibleBattedBall && atBat.hardHitBall === true;

      summary.plateAppearances += 1;

      if (isEligibleBattedBall) {
        summary.ballsInPlay += 1;

        if (isHardHit) {
          summary.hardHitBalls += 1;
        }
      }

      if (isTwoStrikeAtBat) {
        summary.twoStrikeAtBats += 1;

        if (isEligibleBattedBall) {
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
    hardHitPercent: calculateRateMetric(metrics.hardHitBalls, metrics.ballsInPlay),
    twoStrikePercent: calculateRateMetric(metrics.twoStrikeAtBats, metrics.plateAppearances),
    hardHitTwoStrikePercent: calculateRateMetric(
      metrics.twoStrikeHardHits,
      metrics.twoStrikeBallsInPlay
    ),
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
    onTimePercent: calculateRateMetric(metrics.onTime, metrics.total),
    earlyPercent: calculateRateMetric(metrics.early, metrics.total),
    latePercent: calculateRateMetric(metrics.late, metrics.total),
  };
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
  if (ballInPlayOutcomeFields.has(atBat.outcome)) {
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
    (isHardHitEligible(atBat) && atBat.hardHitBall === true) ||
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
  const chartsEmpty = document.getElementById("charts-empty");
  const zoneMap = document.getElementById("chart-zone-map") || document.getElementById("zone-map");
  const filterTotal = document.getElementById("chart-filter-total");
  const chartLegend = document.getElementById("chart-legend");
  const chartZoneTitle = document.getElementById("chart-zone-title");

  if (!filterSelect || !startDateInput || !endDateInput || !chartsEmpty || !zoneMap || !filterTotal || !chartLegend || !chartZoneTitle) {
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
  const handednessInput = document.getElementById("profile-handedness-input");
  const saveButton = document.getElementById("profile-save-button");
  const cancelButton = document.getElementById("profile-cancel-button");
  const profileMessage = document.getElementById("profile-message");
  const passwordResetButton = document.getElementById("password-reset-button");
  const securityMessage = document.getElementById("security-message");
  const accountLogoutButton = document.getElementById("account-logout-button");

  if (!sportTypeValue || !editButton || !profileForm || !handednessInput) {
    return;
  }

  const localAccount = getCurrentAccount();
  let profile = {
    email: getCurrentUser()?.email || "",
    athleteName: localAccount?.athleteName || "",
    sportType: getCurrentSportType(),
    handedness: normalizeHitterHandedness(localAccount?.handedness),
    metadata: {},
  };
  let isSaving = false;

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
    handednessInput.value = normalizeHitterHandedness(profile.handedness) || "";
  }

  function setProfileFormOpen(isOpen) {
    profileForm.hidden = !isOpen;
    editButton.setAttribute("aria-expanded", String(isOpen));
    editButton.hidden = isOpen;

    if (isOpen) {
      athleteNameInput.focus();
    }
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
    const handedness = normalizeHitterHandedness(handednessInput.value);

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
        handedness,
        metadata: data?.user?.user_metadata || metadata,
      };
      await updateCurrentAccountProfile({ athleteName, sportType, handedness });
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
      const cloudProfile = getCurrentAccount();
      profile = {
        email: user.email || profile.email,
        athleteName:
          cloudProfile?.athleteName ||
          metadata.athlete_name ||
          metadata.athleteName ||
          metadata.full_name ||
          profile.athleteName,
        sportType: normalizeSportType(cloudProfile?.sportType || metadata.sport_type || profile.sportType),
        handedness: normalizeHitterHandedness(cloudProfile?.handedness),
        metadata,
      };
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
        setAuthFormMessage(message, getPasswordUpdateErrorMessage(error), "error");
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
      setAuthFormMessage(
        message,
        "We couldn't update your password. Please try again or request a new reset link.",
        "error",
      );
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

      setCurrentUser(data.user);
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
  const confirmPasswordInput = document.getElementById("signup-confirm-password");
  const sportTypeInput = document.getElementById("signup-sport-type");
  const signupMessage = document.getElementById("signup-message");
  const passwordError = document.getElementById("signup-password-error");
  const submitButton = signupForm?.querySelector("button[type='submit']");

  if (
    !signupForm ||
    !signupMessage ||
    !emailInput ||
    !passwordInput ||
    !confirmPasswordInput ||
    !sportTypeInput ||
    !passwordError ||
    !submitButton
  ) {
    return;
  }

  let isSubmitting = false;

  function setPasswordMismatchError(hasMismatch) {
    passwordError.textContent = hasMismatch ? "Passwords do not match." : "";
    passwordError.hidden = !hasMismatch;

    if (hasMismatch) {
      passwordInput.setAttribute("aria-invalid", "true");
      confirmPasswordInput.setAttribute("aria-invalid", "true");
    } else {
      passwordInput.removeAttribute("aria-invalid");
      confirmPasswordInput.removeAttribute("aria-invalid");
    }
  }

  function passwordsDoNotMatch() {
    return (
      passwordInput.value.length > 0 &&
      confirmPasswordInput.value.length > 0 &&
      passwordInput.value !== confirmPasswordInput.value
    );
  }

  function updateSubmitButtonState() {
    submitButton.disabled =
      isSubmitting ||
      passwordInput.value.length === 0 ||
      confirmPasswordInput.value.length === 0 ||
      passwordsDoNotMatch();
  }

  function handlePasswordEdit() {
    setPasswordMismatchError(false);
    updateSubmitButtonState();
  }

  function showPasswordMismatchOnBlur() {
    setPasswordMismatchError(passwordsDoNotMatch());
    updateSubmitButtonState();
  }

  passwordInput.addEventListener("input", handlePasswordEdit);
  confirmPasswordInput.addEventListener("input", handlePasswordEdit);
  passwordInput.addEventListener("blur", showPasswordMismatchOnBlur);
  confirmPasswordInput.addEventListener("blur", showPasswordMismatchOnBlur);
  updateSubmitButtonState();

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const email = normalizeEmail(emailInput.value);
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const sportType = normalizeSportType(sportTypeInput.value);

    signupMessage.classList.remove("is-success");
    signupMessage.textContent = "";

    if (!PUBLIC_SIGNUP_ENABLED || !window.hittingLogAuth?.PUBLIC_SIGNUP_ENABLED) {
      signupMessage.textContent = "Account creation is temporarily unavailable.";
      return;
    }

    emailInput.value = email;
    if (!email || !emailInput.checkValidity()) {
      signupMessage.textContent = "Enter a valid email address.";
      return;
    }

    if (!password || !confirmPassword) {
      updateSubmitButtonState();
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMismatchError(true);
      updateSubmitButtonState();
      return;
    }

    setPasswordMismatchError(false);

    if (password.length < 8) {
      signupMessage.textContent = "Password must be at least 8 characters.";
      return;
    }

    isSubmitting = true;
    updateSubmitButtonState();
    submitButton.textContent = "Creating account...";

    let authUserCreated = false;

    try {
      console.info("[Signup][Stage 1: Auth] Started");
      await window.hittingLogSupabaseReady;
      const { data, error } = await window.hittingLogAuth.signUp({
        email,
        password,
        options: {
          data: { sport_type: sportType },
          emailRedirectTo: `${window.location.origin}/login.html`,
        },
      });

      console.info("[Signup][Stage 1: Auth] Response received", {
        userId: data?.user?.id || null,
        hasSession: Boolean(data?.session),
        authError: error
          ? {
              message: error.message,
              status: error.status,
              code: error.code,
              name: error.name,
            }
          : null,
      });

      if (error) {
        throw error;
      }

      if (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) {
        throw new Error("User already registered");
      }

      if (!data?.user) {
        throw new Error("Signup completed without returning a user.");
      }

      authUserCreated = true;
      console.info("[Signup][Stage 1: Auth] Completed", {
        userId: data.user.id,
        hasSession: Boolean(data.session),
      });

      console.info("[Signup][Stage 2: Account setup] Supabase Auth metadata saved; cloud profile will initialize on first authenticated page load");
      signupMessage.classList.add("is-success");

      if (data?.session && data.user?.email) {
        console.info("[Signup][Stage 4: Redirect] Active session found; redirecting to dashboard");
        setCurrentUser(data.user);
        signupMessage.textContent = "Account created. Redirecting...";
        redirectTo("dashboard.html");
        return;
      }

      console.info("[Signup][Stage 4: Redirect] Waiting for email confirmation; no active session returned");
      signupMessage.textContent = "Account created! Check your email to confirm your account, then log in.";
      signupForm.reset();
    } catch (error) {
      console.error("[Signup][Stage 1: Auth] Failed", {
        message: getErrorMessage(error),
        status: error?.status,
        code: error?.code,
        name: error?.name,
        error,
      });
      signupMessage.textContent = getSignupErrorMessage(error);
    } finally {
      isSubmitting = false;

      if (!authUserCreated) {
        submitButton.textContent = "Create Account";
        updateSubmitButtonState();
      } else {
        submitButton.textContent = "Account Created";
      }
    }
  });
}

removeStoredAccountPasswords();

function renderAnalyticsMembershipGate(verificationError = null) {
  const main = document.querySelector("main");

  if (!main) {
    return;
  }

  const section = document.createElement("section");
  const eyebrow = document.createElement("p");
  const title = document.createElement("h1");
  const copy = document.createElement("p");
  const action = document.createElement("a");

  section.className = "panel membership-access-gate";
  eyebrow.className = "eyebrow";
  eyebrow.textContent = verificationError ? "Membership Check" : "Pro Analytics";
  title.textContent = verificationError
    ? "We couldn’t verify your membership."
    : "Unlock full statistics and charts.";
  copy.textContent = verificationError
    ? "Reload this page to try again, or manage your membership from your account."
    : "Full statistics, charts, heat maps, and spray charts are included with Pro and Pro Plus.";
  action.className = "button-link";
  action.href = "/account";
  action.textContent = verificationError ? "View Account" : "View Membership Options";
  section.append(eyebrow, title, copy, action);
  main.replaceChildren(section);
}

async function bootstrapApplication() {
  let session = null;
  let membershipState = null;
  let membershipError = null;

  if (protectedPages.has(page) || authPages.has(page)) {
    if (!window.hittingLogAuth?.getCurrentSession) {
      console.error("[Bootstrap] Supabase authentication helper is unavailable", { page });
      if (protectedPages.has(page)) {
        redirectTo("login.html");
        return;
      }
    } else {
      console.info("[Bootstrap] Supabase session load started", { page });
      const { data, error } = await window.hittingLogAuth.getCurrentSession();
      if (error) {
        console.error("[Bootstrap] Supabase session load failed", { page, error });
        throw error;
      }
      session = data?.session || null;
      console.info("[Bootstrap] Supabase session load succeeded", {
        page,
        userId: session?.user?.id || null,
      });
    }
  }

  if (protectedPages.has(page) && !session?.user) {
    clearCurrentUser();
    redirectTo("login.html");
    return;
  }

  if (authPages.has(page) && session?.user) {
    setCurrentUser(session.user);
    redirectTo("dashboard.html");
    return;
  }

  if (protectedPages.has(page)) {
    setCurrentUser(session.user);
    if (typeof window.initializeHittingLogDataStore !== "function") {
      throw new Error("Supabase data storage is unavailable on this page.");
    }
    await window.initializeHittingLogDataStore();

    if (new Set(["games", "advanced", "charts"]).has(page)) {
      try {
        membershipState = await window.hittingLogMembership?.loadStatus();
      } catch (error) {
        membershipError = error;
        console.error("[Membership] Unable to verify page access", { page, error });
        membershipState = window.hittingLogMembership?.normalizeState({
          plan: "free",
          status: "inactive",
          subscription: null,
        }) || null;
        window.hittingLogMembershipState = membershipState;
      }
    }
  }

  updateAuthUI();
  const games = loadGames();

  if (session?.user && new Set(["dashboard", "games", "all-games", "advanced"]).has(page)) {
    await refreshHlpScoresSafely();
  }

  if (page === "dashboard") {
    initDashboard(games);
  } else if (page === "games") {
    initGamesPage(games, membershipState);
  } else if (page === "all-games") {
    initAllGamesPage(games);
  } else if (page === "advanced") {
    if (membershipState?.entitlements?.fullStatistics) {
      initAdvancedPage(games);
    } else {
      renderAnalyticsMembershipGate(membershipError);
    }
  } else if (page === "charts") {
    window.hittingLogAnalyticsAccess = membershipState?.entitlements?.charts === true;
    if (!window.hittingLogAnalyticsAccess) {
      renderAnalyticsMembershipGate(membershipError);
    }
  } else if (page === "account") {
    initAccountPage();
  } else if (page === "login") {
    initLoginPage();
  } else if (page === "signup") {
    initSignupPage();
  } else if (page === "forgot-password") {
    initForgotPasswordPage();
  } else if (page === "reset-password") {
    initResetPasswordPage();
  }
}

window.hittingLogDataReady = bootstrapApplication().catch((error) => {
  console.error("[Bootstrap] Application initialization failed", error);
  if (protectedPages.has(page)) {
    window.alert("We couldn't load your cloud data. Please check your connection and reload the page.");
  }
  throw error;
});
