const HIT_OUTCOMES = new Set(["single", "double", "triple", "home_run"]);
const OFFICIAL_AT_BAT_OUTCOMES = new Set([
  ...HIT_OUTCOMES,
  "strikeout",
  "reached_on_error",
  "fielders_choice",
  "ground_out",
  "line_out",
  "fly_out",
]);
const BALL_IN_PLAY_OUTCOMES = new Set([
  ...HIT_OUTCOMES,
  "reached_on_error",
  "fielders_choice",
  "ground_out",
  "line_out",
  "fly_out",
  "sac_fly",
]);
const OUT_OUTCOMES = new Set([
  "strikeout",
  "sac_bunt",
  "sac_fly",
  "fielders_choice",
  "ground_out",
  "line_out",
  "fly_out",
]);
const OUTCOME_ALIASES = {
  "home run": "home_run",
  homerun: "home_run",
  out: "ground_out",
  "fielder's choice": "fielders_choice",
  "fielders choice": "fielders_choice",
  roe: "reached_on_error",
  error: "reached_on_error",
  "sac fly": "sac_fly",
  "sac bunt": "sac_bunt",
  hbp: "hit_by_pitch",
};
const PITCH_TYPE_LABELS = {
  four_seam_fastball: "4-seam fastball",
  two_seam_fastball: "2-seam fastball",
  twelve_six_curve: "12-6 curve",
  sweeper_curve: "sweeper curve",
  drop_curve: "drop curve",
  screwball: "screwball",
};
const QUESTION_INTENTS = Object.freeze({
  DIRECT_STATISTIC: "DIRECT_STATISTIC",
  PERFORMANCE_ANALYSIS: "PERFORMANCE_ANALYSIS",
  TRAINING_RECOMMENDATION: "TRAINING_RECOMMENDATION",
  TREND_ANALYSIS: "TREND_ANALYSIS",
  PERFORMANCE_SCORE: "PERFORMANCE_SCORE",
  FOLLOW_UP: "FOLLOW_UP",
  OUT_OF_SCOPE: "OUT_OF_SCOPE",
});
const RECENT_ANALYSIS_INTENTS = new Set([
  QUESTION_INTENTS.PERFORMANCE_ANALYSIS,
  QUESTION_INTENTS.TRAINING_RECOMMENDATION,
  QUESTION_INTENTS.PERFORMANCE_SCORE,
]);
const HITTING_DATA_PATTERN = /\b(hit|hitting|hitter|bat|batting|average|avg|obp|on[- ]base|slg|slugging|ops|plate appearance|pa\b|at[- ]?bats?|strikeout|walk|contact|hard[- ]?hit|pitch|velocity|mph|count|strike|ball|zone|location|spray|timing|outcome|single|double|triple|home run|outs?|swing|miss|first pitch|two strike|0[- ]?\d|\d[- ]?\d)\b/i;
const DIRECT_STATISTIC_PATTERN = /\b(average|avg|obp|on[- ]base|slg|slugging|ops|how many|how often|percentage|percent|rate|velocity|mph|count|pitch type|location|hard[- ]?hit|contact|strikeout|walk|hits?|outs?|single|double|triple|home run)\b/i;
const PERFORMANCE_SCORE_PATTERN = /\b(performance score|hlp score|score)\b/i;
const TREND_ANALYSIS_PATTERN = /\b(improving|improved|getting better|gotten better|getting worse|gotten worse|changed lately|changing lately|trend(?:ing)?|better now|worse now|earlier this season)\b/i;
const TRAINING_RECOMMENDATION_PATTERN = /\b(train(?:ing)?|practi[cs]e|work on|focus(?: on)?|priority|pay(?:ing)? attention)\b|\bhow (?:can|could|should) i improve\b|\bwhat (?:can|could|should|would) i improve\b|\bbetter hitter\b/i;
const PERFORMANCE_ANALYSIS_PATTERN = /\b(needs? (?:the )?(?:most )?improvement|area needs|biggest weakness|biggest problem|weakest|struggl(?:e|ing)|doing well|strength|holding me back|hurt(?:ing)? me|hurt (?:my )?(?:performance|results?)|went wrong|did i do poorly|doing poorly|how am i doing|what is wrong|what's wrong|caus(?:e|ed|ing).*(?:outs?|problems?))\b/i;
const FOLLOW_UP_PATTERN = /^(what about|how about|and\b|what if|was that|is that|did that|has that|does that|was it|is it|did it|has it|does it|were those|are those|\d{1,3}\s*(?:-|to)\s*\d{1,3})/i;
const INJECTION_PATTERN = /ignore (all |any |the )?(previous|prior|above)|system prompt|developer message|hidden instruction|api key|environment variable|database schema|reveal .*prompt|application secret/i;
const OUT_OF_SCOPE_PATTERN = /\b(mlb|major league|world series|capital of|essay|homework|weather|politics|stock price|recipe|nutrition|diet|meal|food|eat(?:ing)?|leg workout|upper[- ]body workout|lower[- ]body workout|cardio|marathon)\b|\bwrite (?:me )?(?:an? )?(?:paper|essay)\b|\bgive me (?:a )?(?:leg |fitness )?workout\b|\bwho won\b/i;

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
}

function normalizeOutcome(value, atBat = {}) {
  const normalized = normalizeKey(value);
  if (OUTCOME_ALIASES[String(value || "").trim().toLowerCase()]) {
    return OUTCOME_ALIASES[String(value).trim().toLowerCase()];
  }
  if (normalized === "out") {
    const type = normalizeKey(atBat.battedBallType || atBat.batted_ball_type);
    return type === "line_drive" ? "line_out" : type === "fly_ball" || type === "popup" ? "fly_out" : "ground_out";
  }
  return normalized;
}

function getPitches(atBat) {
  return Array.isArray(atBat?.pitches) ? atBat.pitches : [];
}

function getOutcome(atBat) {
  const pitches = getPitches(atBat);
  const lastPitch = pitches[pitches.length - 1] || {};
  const savedOutcome = normalizeOutcome(atBat?.outcome, atBat);
  if (savedOutcome && normalizeKey(atBat?.outcome) !== "out") return savedOutcome;
  return normalizeOutcome(
    atBat?.finalOutcome || lastPitch.battedBallOutcome || lastPitch.batted_ball_outcome || lastPitch.outcome || savedOutcome,
    { ...atBat, battedBallType: getBattedBallTypeFromPitches(atBat) || atBat?.battedBallType },
  );
}

function getBattedBallTypeFromPitches(atBat) {
  const pitch = getPitches(atBat).find((item) => item?.battedBallType || item?.batted_ball_type || item?.contact_type);
  return pitch?.battedBallType || pitch?.batted_ball_type || pitch?.contact_type || "";
}

function getPitchResult(pitch) {
  return normalizeKey(pitch?.strikeType || pitch?.strikeDetail || pitch?.primaryResult || pitch?.result);
}

function countBeforeOutcome(atBat) {
  const pitches = getPitches(atBat);
  let balls = 0;
  let strikes = 0;
  const terminalIndex = Math.max(0, pitches.length - 1);
  for (let index = 0; index < terminalIndex; index += 1) {
    const result = getPitchResult(pitches[index]);
    if (result === "ball") balls += 1;
    if (result === "called_strike" || result === "swinging_strike") strikes += 1;
    if (result === "foul_ball" && strikes < 2) strikes += 1;
  }
  if (!pitches.length) {
    balls = Math.min(3, Number(atBat?.balls) || 0);
    strikes = Math.min(2, Number(atBat?.strikes) || 0);
  }
  return `${Math.min(3, balls)}-${Math.min(2, strikes)}`;
}

function reachedCount(atBat, requestedCount) {
  const pitches = getPitches(atBat);
  if (!pitches.length) return countBeforeOutcome(atBat) === requestedCount;
  let balls = 0;
  let strikes = 0;
  for (const pitch of pitches) {
    if (`${balls}-${strikes}` === requestedCount) return true;
    const result = getPitchResult(pitch);
    if (result === "ball") balls += 1;
    if (result === "called_strike" || result === "swinging_strike") strikes += 1;
    if (result === "foul_ball" && strikes < 2) strikes += 1;
  }
  return `${Math.min(3, balls)}-${Math.min(2, strikes)}` === requestedCount;
}

function getTerminalPitch(atBat) {
  const pitches = getPitches(atBat);
  return pitches[pitches.length - 1] || null;
}

function getVelocity(atBat) {
  const terminalPitch = getTerminalPitch(atBat) || {};
  const candidates = [
    terminalPitch.pitchVelocity,
    terminalPitch.pitch_velocity,
    terminalPitch.velocity,
    atBat?.pitcherVelocity,
    atBat?.pitchVelocity,
    atBat?.pitch_velocity,
  ];
  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return null;
}

function getPitchType(atBat) {
  const pitch = getTerminalPitch(atBat) || {};
  const value = normalizeKey(pitch.pitchType || pitch.pitch_type);
  return value && value !== "unknown" ? value : "";
}

function getLocation(atBat) {
  const pitch = getTerminalPitch(atBat) || {};
  const location = pitch.location && typeof pitch.location === "object" ? pitch.location : {};
  return String(location.id || pitch.locationId || pitch.pitch_location || "").trim();
}

function flattenAtBats(games) {
  return (Array.isArray(games) ? games : [])
    .slice()
    .sort((left, right) => String(left?.date || "").localeCompare(String(right?.date || "")))
    .flatMap((game) => (Array.isArray(game?.atBats) ? game.atBats.map((atBat) => ({
      ...atBat,
      gameDate: game.date || "",
      gameId: game.id || `${game.date || ""}-${game.opponent || ""}`,
      opponent: game.opponent || "",
      tournamentId: game.tournamentId || "",
      tournamentName: game.tournamentName || "",
    })) : []));
}

function summarize(atBats) {
  const summary = {
    plateAppearances: atBats.length,
    atBats: 0,
    hits: 0,
    walks: 0,
    hitByPitch: 0,
    strikeouts: 0,
    totalBases: 0,
  };
  atBats.forEach((atBat) => {
    const outcome = getOutcome(atBat);
    if (OFFICIAL_AT_BAT_OUTCOMES.has(outcome)) summary.atBats += 1;
    if (HIT_OUTCOMES.has(outcome)) summary.hits += 1;
    if (outcome === "walk") summary.walks += 1;
    if (outcome === "hit_by_pitch") summary.hitByPitch += 1;
    if (outcome === "strikeout") summary.strikeouts += 1;
    summary.totalBases += outcome === "single" ? 1 : outcome === "double" ? 2 : outcome === "triple" ? 3 : outcome === "home_run" ? 4 : 0;
  });
  summary.battingAverage = summary.atBats ? summary.hits / summary.atBats : null;
  summary.onBasePercentage = summary.plateAppearances
    ? (summary.hits + summary.walks + summary.hitByPitch) / summary.plateAppearances
    : null;
  summary.sluggingPercentage = summary.atBats ? summary.totalBases / summary.atBats : null;
  summary.ops = summary.onBasePercentage !== null && summary.sluggingPercentage !== null
    ? summary.onBasePercentage + summary.sluggingPercentage
    : null;
  summary.strikeoutPercentage = summary.plateAppearances ? summary.strikeouts / summary.plateAppearances : null;
  return summary;
}

function formatRate(value) {
  if (!Number.isFinite(value)) return "N/A";
  const formatted = value.toFixed(3);
  return formatted.startsWith("0") ? formatted.slice(1) : formatted;
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "N/A";
}

function smallSampleNote(atBats) {
  return atBats > 0 && atBats < 10 ? "This is a small sample, so avoid drawing a strong conclusion yet." : "";
}

function statsFact(label, atBats) {
  const stats = summarize(atBats);
  return {
    label,
    battingAverage: formatRate(stats.battingAverage),
    atBats: stats.atBats,
    hits: stats.hits,
    plateAppearances: stats.plateAppearances,
    note: smallSampleNote(stats.atBats),
  };
}

function groupOfficialAtBats(atBats, keyForAtBat) {
  const groups = new Map();
  atBats.forEach((atBat) => {
    const key = keyForAtBat(atBat);
    if (!key || !OFFICIAL_AT_BAT_OUTCOMES.has(getOutcome(atBat))) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(atBat);
  });
  return [...groups.entries()].map(([label, values]) => statsFact(label, values));
}

function selectRanked(groups, wantsWorst) {
  return groups
    .filter((group) => group.atBats > 0)
    .sort((left, right) => {
      const averageDifference = Number(left.battingAverage) - Number(right.battingAverage);
      return (wantsWorst ? averageDifference : -averageDifference) || right.atBats - left.atBats;
    });
}

function getContextQuestion(message, history) {
  const trimmed = String(message || "").trim();
  if (!FOLLOW_UP_PATTERN.test(trimmed)) return trimmed;
  const priorUser = (Array.isArray(history) ? history : []).slice().reverse().find((item) => item?.role === "user");
  return priorUser ? `${priorUser.content} Follow-up: ${trimmed}` : trimmed;
}

function classifyQuestionIntent(message, history = []) {
  const current = String(message || "").trim();
  if (!current || INJECTION_PATTERN.test(current) || OUT_OF_SCOPE_PATTERN.test(current)) {
    return QUESTION_INTENTS.OUT_OF_SCOPE;
  }

  if (FOLLOW_UP_PATTERN.test(current)) {
    const priorUser = (Array.isArray(history) ? history : []).slice().reverse().find((item) => item?.role === "user");
    if (priorUser) {
      return classifyQuestionIntent(priorUser.content, []) === QUESTION_INTENTS.OUT_OF_SCOPE
        ? QUESTION_INTENTS.OUT_OF_SCOPE
        : QUESTION_INTENTS.FOLLOW_UP;
    }
  }

  if (PERFORMANCE_SCORE_PATTERN.test(current)) return QUESTION_INTENTS.PERFORMANCE_SCORE;
  if (TREND_ANALYSIS_PATTERN.test(current)) return QUESTION_INTENTS.TREND_ANALYSIS;
  if (PERFORMANCE_ANALYSIS_PATTERN.test(current)) return QUESTION_INTENTS.PERFORMANCE_ANALYSIS;
  if (TRAINING_RECOMMENDATION_PATTERN.test(current)) return QUESTION_INTENTS.TRAINING_RECOMMENDATION;
  if (DIRECT_STATISTIC_PATTERN.test(current) || HITTING_DATA_PATTERN.test(current)) return QUESTION_INTENTS.DIRECT_STATISTIC;
  return QUESTION_INTENTS.OUT_OF_SCOPE;
}

function isAllowedQuestion(message, history = []) {
  return classifyQuestionIntent(message, history) !== QUESTION_INTENTS.OUT_OF_SCOPE;
}

function overallResult(atBats) {
  const stats = summarize(atBats);
  return {
    type: "overall",
    facts: {
      battingAverage: formatRate(stats.battingAverage),
      onBasePercentage: formatRate(stats.onBasePercentage),
      sluggingPercentage: formatRate(stats.sluggingPercentage),
      ops: formatRate(stats.ops),
      hits: stats.hits,
      atBats: stats.atBats,
      plateAppearances: stats.plateAppearances,
      strikeouts: stats.strikeouts,
    },
  };
}

function getBattedBallType(atBat) {
  const direct = normalizeKey(atBat?.battedBallType || atBat?.batted_ball_type);
  if (direct) return direct;
  const pitch = getPitches(atBat).find((item) => item?.battedBallType || item?.batted_ball_type || item?.contact_type);
  return normalizeKey(pitch?.battedBallType || pitch?.batted_ball_type || pitch?.contact_type);
}

function isBallInPlay(atBat) {
  return BALL_IN_PLAY_OUTCOMES.has(getOutcome(atBat)) || getPitches(atBat).some((pitch) => {
    return getPitchResult(pitch) === "batted_ball" || Boolean(pitch?.battedBallType || pitch?.battedBallOutcome);
  });
}

function isSwing(pitch) {
  const result = getPitchResult(pitch);
  return ["swinging_strike", "foul_ball", "batted_ball"].includes(result) || Boolean(pitch?.battedBallType || pitch?.battedBallOutcome);
}

function isContact(pitch) {
  const result = getPitchResult(pitch);
  return result === "foul_ball" || result === "batted_ball" || Boolean(pitch?.battedBallType || pitch?.battedBallOutcome);
}

function getPitchZoneStatus(pitch) {
  const location = pitch?.location && typeof pitch.location === "object" ? pitch.location : null;
  const locationId = location?.id || pitch?.locationId || (typeof pitch?.location === "string" ? pitch.location : "");
  const locationLabel = location?.label || pitch?.locationLabel || "";
  if (location && typeof location.isZone === "boolean") return location.isZone;
  if (/^zone-[1-9]$/.test(locationId) || /^Zone [1-9]$/.test(locationLabel)) return true;
  return locationId || locationLabel ? false : null;
}

function isQualityAtBat(atBat) {
  const qualityOutcomes = new Set([
    "single", "double", "triple", "home_run", "walk", "hit_by_pitch", "sac_fly", "sac_bunt", "drag_bunt",
  ]);
  return qualityOutcomes.has(getOutcome(atBat)) ||
    (isBallInPlay(atBat) && atBat?.hardHitBall === true) ||
    getPitches(atBat).length >= 6;
}

function reachedTwoStrikes(atBat) {
  return ["0-2", "1-2", "2-2", "3-2"].some((count) => reachedCount(atBat, count));
}

function calculatePerformanceScore(atBats) {
  if (!atBats.length) return { score: null, components: [], metrics: {} };
  const outs = atBats.filter((atBat) => OUT_OUTCOMES.has(getOutcome(atBat)));
  const ballsInPlay = atBats.filter(isBallInPlay);
  const hardHits = ballsInPlay.filter((atBat) => atBat?.hardHitBall === true);
  const qualityAtBats = atBats.filter(isQualityAtBat);
  const productiveOuts = outs.filter((atBat) => atBat?.productiveOut === true || ["sac_bunt", "sac_fly"].includes(getOutcome(atBat)));
  const twoStrikeAtBats = atBats.filter(reachedTwoStrikes);
  const twoStrikeBallsInPlay = twoStrikeAtBats.filter(isBallInPlay);
  const twoStrikeHardHits = twoStrikeBallsInPlay.filter((atBat) => atBat?.hardHitBall === true);
  const hardHitPercent = ballsInPlay.length ? hardHits.length / ballsInPlay.length : null;
  const qualityAtBatPercent = atBats.length ? qualityAtBats.length / atBats.length : null;
  const productiveOutPercent = outs.length ? productiveOuts.length / outs.length : null;
  const twoStrikePercent = atBats.length ? twoStrikeAtBats.length / atBats.length : null;
  const hardHitTwoStrikePercent = twoStrikeBallsInPlay.length
    ? twoStrikeHardHits.length / twoStrikeBallsInPlay.length
    : null;
  const twoStrikeAdjustment = twoStrikePercent === null
    ? null
    : hardHitTwoStrikePercent !== null
      ? 100 - ((twoStrikePercent * 100) * ((100 - (hardHitTwoStrikePercent * 100)) / 100))
      : 100 - (twoStrikePercent * 100);
  const components = [
    { key: "hard_hit_rate", label: "Hard-hit percentage", value: hardHitPercent === null ? null : hardHitPercent * 100, weight: 0.45 },
    { key: "quality_at_bat_rate", label: "Quality at-bat percentage", value: qualityAtBatPercent === null ? null : qualityAtBatPercent * 100, weight: 0.25 },
    { key: "two_strike_adjustment", label: "Two-strike adjustment", value: twoStrikeAdjustment, weight: 0.10 },
  ];
  if (outs.length) {
    components.splice(2, 0, {
      key: "productive_out_rate",
      label: "Productive-out percentage",
      value: productiveOutPercent * 100,
      weight: 0.20,
    });
  }
  const available = components.filter((component) => Number.isFinite(component.value));
  if (!available.length) return { score: null, components: [], metrics: {} };
  const totalWeight = available.reduce((sum, component) => sum + component.weight, 0);
  const scoredComponents = available.map((component) => ({
    ...component,
    normalizedWeight: component.weight / totalWeight,
    weightedContribution: component.value * (component.weight / totalWeight),
    pointsBelowPerfect: (100 - component.value) * (component.weight / totalWeight),
  }));
  const rawScore = scoredComponents.reduce((sum, component) => sum + component.weightedContribution, 0);
  return {
    score: Math.min(100, Math.max(0, Math.round(rawScore))),
    components: scoredComponents,
    metrics: {
      ballsInPlay: ballsInPlay.length,
      hardHits: hardHits.length,
      qualityAtBats: qualityAtBats.length,
      productiveOuts: productiveOuts.length,
      outs: outs.length,
      twoStrikeAtBats: twoStrikeAtBats.length,
      twoStrikeBallsInPlay: twoStrikeBallsInPlay.length,
      twoStrikeHardHits: twoStrikeHardHits.length,
    },
  };
}

function getDateRange(atBats) {
  const dates = atBats.map((atBat) => atBat.gameDate).filter(Boolean).sort();
  if (!dates.length) return null;
  return { start: dates[0], end: dates[dates.length - 1] };
}

function uniqueGameCount(atBats) {
  return new Set(atBats.map((atBat) => atBat.gameId).filter(Boolean)).size;
}

function getTournamentGroups(games) {
  const groups = new Map();
  (Array.isArray(games) ? games : []).forEach((game) => {
    const key = game?.tournamentId || game?.tournamentName;
    if (!key || !Array.isArray(game.atBats)) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(game);
  });
  return [...groups.entries()]
    .map(([key, tournamentGames]) => ({
      key,
      name: tournamentGames[0]?.tournamentName || "most recent tournament",
      games: tournamentGames,
      latestDate: tournamentGames.reduce((latest, game) => String(game?.date || "") > latest ? String(game.date) : latest, ""),
      atBats: flattenAtBats(tournamentGames),
    }))
    .sort((left, right) => right.latestDate.localeCompare(left.latestDate));
}

function selectRecentSample(question, games) {
  const normalized = question.toLowerCase();
  const sortedGames = (Array.isArray(games) ? games : [])
    .filter((game) => Array.isArray(game?.atBats) && game.atBats.length)
    .slice()
    .sort((left, right) => String(left.date || "").localeCompare(String(right.date || "")));
  const allAtBats = flattenAtBats(sortedGames);
  if (!allAtBats.length) return { atBats: [], previousAtBats: [], sampleDescription: "recent hitting data" };

  if (/last game|most recent game/.test(normalized)) {
    const game = sortedGames[sortedGames.length - 1];
    const index = sortedGames.length - 1;
    return {
      atBats: flattenAtBats([game]),
      previousAtBats: index > 0 ? flattenAtBats([sortedGames[index - 1]]) : [],
      sampleDescription: `your last game${game.opponent ? ` against ${game.opponent}` : ""}`,
    };
  }

  const tournaments = getTournamentGroups(sortedGames);
  const explicitTournament = /last tournament|most recent tournament|weekend|tournament/.test(normalized);
  const prefersTournament = explicitTournament || RECENT_ANALYSIS_INTENTS.has(classifyQuestionIntent(question)) || /current|lately|recent trend/.test(normalized);
  const latestTournament = tournaments[0] || null;
  const tournament = latestTournament && (explicitTournament ? latestTournament.atBats.length > 0 : latestTournament.atBats.length >= 5)
    ? latestTournament
    : null;
  if (prefersTournament && tournament) {
    const previousTournament = tournaments.find((item) => item.key !== tournament.key && item.atBats.length > 0);
    const firstIndex = allAtBats.findIndex((atBat) => atBat.tournamentId === tournament.key || atBat.tournamentName === tournament.key);
    return {
      atBats: tournament.atBats,
      previousAtBats: previousTournament?.atBats || allAtBats.slice(Math.max(0, firstIndex - tournament.atBats.length), firstIndex),
      sampleDescription: `${tournament.name} (${tournament.games.length} game${tournament.games.length === 1 ? "" : "s"})`,
    };
  }

  const atBats = allAtBats.slice(-20);
  return {
    atBats,
    previousAtBats: allAtBats.slice(Math.max(0, allAtBats.length - 40), Math.max(0, allAtBats.length - 20)),
    sampleDescription: `your most recent ${atBats.length} plate appearance${atBats.length === 1 ? "" : "s"}`,
  };
}

function countBy(items, keyForItem) {
  const counts = new Map();
  items.forEach((item) => {
    const key = keyForItem(item);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function indicator(key, label, count, denominator, recommendation) {
  return {
    key,
    label,
    count,
    denominator,
    percentage: denominator ? Number(((count / denominator) * 100).toFixed(1)) : null,
    recommendation,
  };
}

function countIndicator(atBats, key) {
  if (key.startsWith("outcome:")) return atBats.filter((atBat) => getOutcome(atBat) === key.slice(8)).length;
  if (key === "swinging_misses") return atBats.flatMap(getPitches).filter((pitch) => getPitchResult(pitch) === "swinging_strike").length;
  if (key === "chases") return atBats.flatMap(getPitches).filter((pitch) => getPitchZoneStatus(pitch) === false && isSwing(pitch)).length;
  if (key === "called_strikes") return atBats.flatMap(getPitches).filter((pitch) => getPitchResult(pitch) === "called_strike").length;
  if (key === "early_timing") return atBats.filter((atBat) => normalizeKey(atBat?.timing) === "early").length;
  if (key === "late_timing") return atBats.filter((atBat) => normalizeKey(atBat?.timing) === "late").length;
  if (key === "non_hard_contact" || key === "hard_hit_rate") return atBats.filter((atBat) => isBallInPlay(atBat) && atBat?.hardHitBall !== true).length;
  if (key === "quality_at_bat_rate") return atBats.filter((atBat) => !isQualityAtBat(atBat)).length;
  if (key === "non_productive_outs" || key === "productive_out_rate") return atBats.filter((atBat) => OUT_OUTCOMES.has(getOutcome(atBat)) && atBat?.productiveOut !== true && !["sac_bunt", "sac_fly"].includes(getOutcome(atBat))).length;
  if (key === "two_strike_adjustment") return atBats.filter((atBat) => reachedTwoStrikes(atBat) && (!isBallInPlay(atBat) || atBat?.hardHitBall !== true)).length;
  return 0;
}

function getTrendAssessment(sampleAtBats, previousAtBats, biggestNegative) {
  if (!biggestNegative) return null;
  const games = [...new Set(sampleAtBats.map((atBat) => atBat.gameId).filter(Boolean))];
  const gamesWithIndicator = games.filter((gameId) => countIndicator(sampleAtBats.filter((atBat) => atBat.gameId === gameId), biggestNegative.key) > 0).length;
  const previousCount = countIndicator(previousAtBats, biggestNegative.key);
  let classification = "limited_sample";
  if (games.length >= 3 && gamesWithIndicator >= 3) classification = "repeating_trend";
  else if (games.length >= 2 && gamesWithIndicator === 1 && previousCount === 0) classification = "one_game_event";
  return {
    indicator: biggestNegative.label,
    classification,
    gamesWithIndicator,
    gamesReviewed: games.length,
    previousSampleCount: previousCount,
    previousSamplePlateAppearances: previousAtBats.length,
  };
}

function analyzeRecentPerformance(question, games) {
  const questionIntent = classifyQuestionIntent(question);
  const scope = selectRecentSample(question, games);
  const atBats = scope.atBats;
  if (!atBats.length) return { type: "no_data" };
  const stats = summarize(atBats);
  const outs = atBats.filter((atBat) => OUT_OUTCOMES.has(getOutcome(atBat)));
  const pitches = atBats.flatMap(getPitches);
  const swings = pitches.filter(isSwing);
  const swingingMisses = swings.filter((pitch) => getPitchResult(pitch) === "swinging_strike");
  const calledStrikes = pitches.filter((pitch) => getPitchResult(pitch) === "called_strike");
  const outOfZonePitches = pitches.filter((pitch) => getPitchZoneStatus(pitch) === false);
  const chases = outOfZonePitches.filter(isSwing);
  const ballsInPlay = atBats.filter(isBallInPlay);
  const hardHits = ballsInPlay.filter((atBat) => atBat?.hardHitBall === true);
  const lineDrives = ballsInPlay.filter((atBat) => getBattedBallType(atBat) === "line_drive");
  const productiveOuts = outs.filter((atBat) => atBat?.productiveOut === true || ["sac_bunt", "sac_fly"].includes(getOutcome(atBat)));
  const qualityAtBats = atBats.filter(isQualityAtBat);
  const onTimeAtBats = atBats.filter((atBat) => normalizeKey(atBat?.timing) === "on_time");
  const earlyAtBats = atBats.filter((atBat) => normalizeKey(atBat?.timing) === "early");
  const lateAtBats = atBats.filter((atBat) => normalizeKey(atBat?.timing) === "late");
  const trackedTiming = onTimeAtBats.length + earlyAtBats.length + lateAtBats.length;
  const performance = calculatePerformanceScore(atBats);
  const previousPerformance = calculatePerformanceScore(scope.previousAtBats);
  const outcomeLabels = {
    strikeout: "Strikeouts",
    ground_out: "Ground outs",
    fly_out: "Fly outs",
    line_out: "Line outs",
    fielders_choice: "Fielder's choices",
    sac_fly: "Sacrifice flies",
    sac_bunt: "Sacrifice bunts",
  };
  const outcomeCounts = countBy(outs, getOutcome);
  const outcomeDistribution = [...outcomeCounts.entries()]
    .map(([key, count]) => indicator(`outcome:${key}`, outcomeLabels[key] || key.replace(/_/g, " "), count, outs.length, {
      strikeout: "Emphasize two-strike contact and swing decisions.",
      ground_out: "Work toward producing more line-drive contact and fewer unproductive ground balls.",
      fly_out: "Work toward more solid line-drive contact and fewer unproductive fly balls.",
      line_out: "The outs were line drives, so preserve the contact quality rather than making a mechanical diagnosis from results alone.",
    }[key] || "Focus on turning more of these plate appearances into quality at-bats."))
    .sort((left, right) => right.count - left.count || right.percentage - left.percentage);
  const negativeIndicators = [...outcomeDistribution];
  if (swingingMisses.length) negativeIndicators.push(indicator("swinging_misses", "Swinging-strike events", swingingMisses.length, swings.length, "Emphasize bat-to-ball contact and swing decisions."));
  if (chases.length) negativeIndicators.push(indicator("chases", "Swings at pitches outside the recorded zone", chases.length, outOfZonePitches.length, "Emphasize swing decisions on pitches outside the strike zone."));
  if (calledStrikes.length) negativeIndicators.push(indicator("called_strikes", "Called-strike events", calledStrikes.length, pitches.length, "Emphasize readiness for hittable pitches while preserving strike-zone discipline."));
  if (ballsInPlay.length > hardHits.length) negativeIndicators.push(indicator("non_hard_contact", "Non-hard-hit balls in play", ballsInPlay.length - hardHits.length, ballsInPlay.length, "Work toward a higher share of hard-hit and line-drive contact."));
  if (earlyAtBats.length) negativeIndicators.push(indicator("early_timing", "Early timing entries", earlyAtBats.length, trackedTiming, "Work toward a higher share of on-time contact."));
  if (lateAtBats.length) negativeIndicators.push(indicator("late_timing", "Late timing entries", lateAtBats.length, trackedTiming, "Work toward a higher share of on-time contact."));
  negativeIndicators.sort((left, right) => right.count - left.count || right.percentage - left.percentage);
  const positiveIndicators = [
    indicator("hits", "Hits", stats.hits, stats.plateAppearances, "Keep building on the contact producing hits."),
    indicator("hard_hits", "Hard-hit balls", hardHits.length, ballsInPlay.length, "Continue prioritizing hard contact."),
    indicator("line_drives", "Line drives", lineDrives.length, ballsInPlay.length, "Continue creating line-drive contact."),
    indicator("quality_at_bats", "Quality at-bats", qualityAtBats.length, atBats.length, "Continue stacking quality plate appearances."),
    indicator("walks", "Walks", stats.walks, stats.plateAppearances, "Continue making disciplined swing decisions."),
    indicator("productive_outs", "Productive outs", productiveOuts.length, outs.length, "Continue producing useful situational outcomes."),
    indicator("contact", "Contact on swings", swings.length - swingingMisses.length, swings.length, "Continue building on successful bat-to-ball contact."),
    indicator("on_time", "On-time timing entries", onTimeAtBats.length, trackedTiming, "Continue building on on-time contact."),
  ].filter((item) => item.count > 0).sort((left, right) => right.count - left.count || right.percentage - left.percentage);
  const asksAboutScore = /performance score|hurt.*score|improve.*score|lower.*score/.test(question.toLowerCase());
  const asksAboutOutCauses = /caus.*outs|caused.*outs/.test(question.toLowerCase());
  const scoreImpactFactors = performance.components
    .map((component) => ({
      key: component.key,
      label: component.label,
      value: Number(component.value.toFixed(1)),
      formulaWeight: component.weight,
      normalizedWeight: Number((component.normalizedWeight * 100).toFixed(1)),
      pointsBelowPerfect: Number(component.pointsBelowPerfect.toFixed(1)),
    }))
    .sort((left, right) => right.pointsBelowPerfect - left.pointsBelowPerfect);
  const biggestNegativeIndicator = asksAboutScore && scoreImpactFactors.length
    ? {
        key: scoreImpactFactors[0].key,
        label: scoreImpactFactors[0].label,
        scoreImpact: scoreImpactFactors[0],
        recommendation: {
          hard_hit_rate: "Work toward a higher share of hard-hit and line-drive contact.",
          quality_at_bat_rate: "Prioritize more quality at-bats through hits, walks, hard contact, productive outcomes, or extended plate appearances.",
          productive_out_rate: "Emphasize productive situational outcomes when an out is recorded.",
          two_strike_adjustment: "Emphasize productive two-strike contact and reduce unproductive two-strike outcomes.",
        }[scoreImpactFactors[0].key],
      }
    : asksAboutOutCauses
      ? outcomeDistribution[0] || null
      : negativeIndicators[0] || null;
  return {
    type: "performance_analysis",
    intent: asksAboutScore
      ? "performance_score_analysis"
      : asksAboutOutCauses
        ? "out_cause_analysis"
        : /doing well|strength/.test(question.toLowerCase())
          ? "strength_analysis"
          : questionIntent === QUESTION_INTENTS.TRAINING_RECOMMENDATION
            ? "training_recommendation"
            : "coaching_analysis",
    sampleDescription: scope.sampleDescription,
    plateAppearances: atBats.length,
    gamesIncluded: uniqueGameCount(atBats),
    dateRange: getDateRange(atBats),
    performanceScore: performance.score,
    previousPerformanceScore: previousPerformance.score,
    statistics: {
      battingAverage: formatRate(stats.battingAverage),
      hits: stats.hits,
      atBats: stats.atBats,
      outs: outs.length,
      strikeouts: stats.strikeouts,
      swings: swings.length,
      swingingMisses: swingingMisses.length,
      calledStrikes: calledStrikes.length,
      outOfZonePitches: outOfZonePitches.length,
      chases: chases.length,
    },
    positiveIndicators,
    negativeIndicators,
    biggestNegativeIndicator,
    biggestPositiveIndicator: positiveIndicators[0] || null,
    outcomeDistribution,
    scoreImpactFactors,
    trendAssessment: getTrendAssessment(atBats, scope.previousAtBats, biggestNegativeIndicator),
    sampleSizeWarnings: atBats.length < 10
      ? [`Only ${atBats.length} plate appearance${atBats.length === 1 ? " is" : "s are"} available in this sample, so treat the pattern as preliminary.`]
      : [],
  };
}

function analyzeQuestion({ message, history = [], games = [] }) {
  const question = getContextQuestion(message, history);
  const normalized = question.toLowerCase();
  const atBats = flattenAtBats(games);
  const intent = classifyQuestionIntent(message, history);
  if (intent === QUESTION_INTENTS.OUT_OF_SCOPE) return { type: "refusal" };
  const effectiveIntent = intent === QUESTION_INTENTS.FOLLOW_UP
    ? classifyQuestionIntent(question)
    : intent;
  if (!atBats.length) return { type: "no_data" };

  if (/exit velocity|launch angle/.test(normalized)) {
    return { type: "missing_data", field: normalized.includes("exit velocity") ? "exit velocity" : "launch angle" };
  }

  const recentGamesMatch = normalized.match(/last\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+games?/);
  if (recentGamesMatch) {
    const wordNumbers = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
    const requested = Math.min(Number(recentGamesMatch[1]) || wordNumbers[recentGamesMatch[1]] || 5, 20);
    const recentGames = (Array.isArray(games) ? games : [])
      .filter((game) => Array.isArray(game?.atBats) && game.atBats.length)
      .slice()
      .sort((left, right) => String(left.date || "").localeCompare(String(right.date || "")))
      .slice(-requested);
    const values = flattenAtBats(recentGames);
    return values.length ? {
      type: "recent_games",
      requested,
      gamesIncluded: recentGames.length,
      sampleDescription: `your last ${recentGames.length} game${recentGames.length === 1 ? "" : "s"}`,
      dateRange: getDateRange(values),
      facts: overallResult(values).facts,
      note: smallSampleNote(summarize(values).atBats),
    } : { type: "no_data" };
  }

  if (/percentage of .*outs?.*ground|how many .*outs?.*ground|ground balls?.*outs?/.test(normalized)) {
    const outs = atBats.filter((atBat) => OUT_OUTCOMES.has(getOutcome(atBat)));
    const groundOuts = outs.filter((atBat) => getOutcome(atBat) === "ground_out");
    return outs.length ? {
      type: "metric",
      metric: "ground-out percentage of outs",
      facts: { percentage: formatPercent(groundOuts.length / outs.length), groundOuts: groundOuts.length, totalOuts: outs.length },
    } : { type: "missing_data", field: "recorded outs" };
  }

  if (/swing(?:ing)? and miss|swing(?:ing)? miss|whiff/.test(normalized)) {
    const swings = atBats.flatMap(getPitches).filter(isSwing);
    const misses = swings.filter((pitch) => getPitchResult(pitch) === "swinging_strike");
    return swings.length ? {
      type: "metric",
      metric: "swing-and-miss percentage",
      facts: { percentage: formatPercent(misses.length / swings.length), swingingMisses: misses.length, swings: swings.length },
    } : { type: "missing_data", field: "recorded swings" };
  }

  if (/type of contact.*(?:most|hits)|contact.*produces?.*hits/.test(normalized)) {
    const hits = atBats.filter((atBat) => HIT_OUTCOMES.has(getOutcome(atBat)));
    const groups = [...countBy(hits, getBattedBallType).entries()]
      .map(([label, count]) => ({ label: label.replace(/_/g, " "), hits: count }))
      .sort((left, right) => right.hits - left.hits);
    return groups.length ? {
      type: "contact_outcome_ranking",
      dimension: "batted-ball type on hits",
      facts: groups,
      coverage: { tracked: groups.reduce((sum, item) => sum + item.hits, 0), total: hits.length },
    } : { type: "missing_data", field: "batted-ball type on hits" };
  }

  if (RECENT_ANALYSIS_INTENTS.has(effectiveIntent)) {
    return analyzeRecentPerformance(question, games);
  }

  const wantsWorst = /lowest|worst|struggle|weakest|least|strike out the most/i.test(question);
  const explicitCount = normalized.match(/\b([0-3])\s*[- ]\s*([0-2])\b/);
  if (/first pitch/.test(normalized)) {
    const values = atBats.filter((atBat) => getPitches(atBat).length === 1);
    return values.length ? { type: "split", dimension: "first pitch", facts: statsFact("first-pitch at-bats", values) } : { type: "missing_data", field: "first-pitch outcomes" };
  }
  if (/two[- ]strike|with 2 strikes/.test(normalized)) {
    const values = atBats.filter((atBat) => reachedCount(atBat, `0-2`) || reachedCount(atBat, `1-2`) || reachedCount(atBat, `2-2`) || reachedCount(atBat, `3-2`));
    return values.length ? { type: "split", dimension: "two strikes", facts: statsFact("at-bats that reached two strikes", values) } : { type: "missing_data", field: "two-strike at-bats" };
  }
  if (explicitCount) {
    const count = `${explicitCount[1]}-${explicitCount[2]}`;
    const values = atBats.filter((atBat) => reachedCount(atBat, count));
    return values.length ? { type: "split", dimension: "count", facts: statsFact(`${count} counts`, values) } : { type: "missing_data", field: `${count} count results` };
  }
  if (/count/.test(normalized)) {
    const groups = selectRanked(groupOfficialAtBats(atBats, countBeforeOutcome), wantsWorst);
    return groups.length ? { type: "ranking", dimension: "count before the outcome pitch", direction: wantsWorst ? "lowest" : "highest", facts: groups.slice(0, 3) } : { type: "missing_data", field: "pitch counts" };
  }

  if (/velocity|mph|speed|over\s+\d|under\s+\d|\d+\s*(?:-|to)\s*\d+/.test(normalized)) {
    const range = normalized.match(/\b(\d{2,3})\s*(?:-|to)\s*(\d{2,3})\b/);
    const over = normalized.match(/(?:over|above|faster than)\s*(\d{2,3})/);
    const under = normalized.match(/(?:under|below|slower than)\s*(\d{2,3})/);
    if (range || over || under) {
      const min = range ? Number(range[1]) : over ? Number(over[1]) + Number.EPSILON : 0;
      const max = range ? Number(range[2]) : under ? Number(under[1]) - Number.EPSILON : Infinity;
      const values = atBats.filter((atBat) => {
        const velocity = getVelocity(atBat);
        return velocity !== null && velocity >= min && velocity <= max;
      });
      const label = range ? `${range[1]}–${range[2]} mph` : over ? `over ${over[1]} mph` : `under ${under[1]} mph`;
      return values.length ? { type: "split", dimension: "pitch velocity", facts: statsFact(label, values), coverage: { tracked: atBats.filter((item) => getVelocity(item) !== null).length, total: atBats.length } } : { type: "missing_data", field: `recorded outcomes against ${label}` };
    }
    const groups = selectRanked(groupOfficialAtBats(atBats, (atBat) => {
      const velocity = getVelocity(atBat);
      if (velocity === null) return "";
      const low = Math.floor(velocity / 5) * 5;
      return `${low}–${low + 4} mph`;
    }), wantsWorst);
    return groups.length ? { type: "ranking", dimension: "5-mph velocity range", direction: wantsWorst ? "lowest" : "highest", facts: groups.slice(0, 3), coverage: { tracked: atBats.filter((item) => getVelocity(item) !== null).length, total: atBats.length } } : { type: "missing_data", field: "pitch velocity" };
  }

  if (/pitch type|fastball|changeup|curve|slider|cutter|sinker|screw|drop|rise|sweeper/.test(normalized)) {
    const groups = selectRanked(groupOfficialAtBats(atBats, (atBat) => getPitchType(atBat)), wantsWorst)
      .map((group) => ({ ...group, label: PITCH_TYPE_LABELS[group.label] || group.label.replace(/_/g, " ") }));
    return groups.length ? { type: "ranking", dimension: "outcome pitch type", direction: wantsWorst ? "lowest" : "highest", facts: groups.slice(0, 3), coverage: { tracked: atBats.filter((item) => getPitchType(item)).length, total: atBats.length } } : { type: "missing_data", field: "pitch type on outcome pitches" };
  }

  if (/zone|pitch location|where .*hits|where .*strike out/.test(normalized)) {
    const strikeoutOnly = /strike out|strikeout/.test(normalized);
    const relevant = strikeoutOnly ? atBats.filter((atBat) => getOutcome(atBat) === "strikeout") : atBats.filter((atBat) => HIT_OUTCOMES.has(getOutcome(atBat)));
    const counts = new Map();
    relevant.forEach((atBat) => {
      const location = getLocation(atBat);
      if (location) counts.set(location, (counts.get(location) || 0) + 1);
    });
    const facts = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, count]) => ({ label: label.replace(/-/g, " "), count }));
    return facts.length ? { type: "location", dimension: strikeoutOnly ? "strikeout outcome-pitch location" : "hit outcome-pitch location", facts, coverage: { tracked: relevant.filter((item) => getLocation(item)).length, total: relevant.length } } : { type: "missing_data", field: "outcome-pitch location" };
  }

  if (/hard[- ]?hit/.test(normalized)) {
    const eligible = atBats.filter((atBat) => BALL_IN_PLAY_OUTCOMES.has(getOutcome(atBat)) && typeof atBat.hardHitBall === "boolean");
    const hardHit = eligible.filter((atBat) => atBat.hardHitBall).length;
    return eligible.length ? { type: "metric", metric: "hard-hit percentage", facts: { percentage: formatPercent(hardHit / eligible.length), hardHitBalls: hardHit, trackedBattedBalls: eligible.length } } : { type: "missing_data", field: "hard-hit results" };
  }

  if (/contact/.test(normalized)) {
    const pitches = atBats.flatMap(getPitches);
    const swings = pitches.filter((pitch) => ["swinging_strike", "foul_ball", "batted_ball"].includes(getPitchResult(pitch)));
    const contacts = swings.filter((pitch) => getPitchResult(pitch) !== "swinging_strike");
    return swings.length ? { type: "metric", metric: "contact percentage", facts: { percentage: formatPercent(contacts.length / swings.length), contacts: contacts.length, swings: swings.length } } : { type: "missing_data", field: "swing and contact results" };
  }

  if (/strikeout (percentage|percent|rate)|strikeout%|how often.*strike/.test(normalized)) {
    const stats = summarize(atBats);
    return { type: "metric", metric: "strikeout percentage", facts: { percentage: formatPercent(stats.strikeoutPercentage), strikeouts: stats.strikeouts, plateAppearances: stats.plateAppearances } };
  }

  const recentMatch = normalized.match(/last\s+(\d{1,3})\s+(?:at[- ]?bats?|abs?)/);
  if (recentMatch || /recent (?:at[- ]?bats?|performance)|lately/.test(normalized)) {
    const requested = Math.min(Number(recentMatch?.[1] || 20), 100);
    const official = atBats.filter((atBat) => OFFICIAL_AT_BAT_OUTCOMES.has(getOutcome(atBat)));
    const values = official.slice(-requested);
    return { type: "recent", requested, available: values.length, facts: overallResult(values).facts };
  }

  if (effectiveIntent === QUESTION_INTENTS.TREND_ANALYSIS || /better now|earlier this season|trend|improv|getting better|getting worse|gotten worse|changed lately/.test(normalized)) {
    const official = atBats.filter((atBat) => OFFICIAL_AT_BAT_OUTCOMES.has(getOutcome(atBat)));
    const windowSize = Math.min(20, Math.floor(official.length / 2));
    if (windowSize < 5) return { type: "insufficient_sample", field: "season trend", minimum: 10, available: official.length };
    return {
      type: "trend",
      windowSize,
      facts: {
        recent: statsFact(`most recent ${windowSize} at-bats`, official.slice(-windowSize)),
        earlier: statsFact(`previous ${windowSize} at-bats`, official.slice(-(windowSize * 2), -windowSize)),
      },
    };
  }

  return overallResult(atBats);
}

module.exports = {
  QUESTION_INTENTS,
  analyzeRecentPerformance,
  analyzeQuestion,
  calculatePerformanceScore,
  classifyQuestionIntent,
  flattenAtBats,
  formatPercent,
  formatRate,
  getOutcome,
  isAllowedQuestion,
  summarize,
};
