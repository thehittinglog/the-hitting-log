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
const SCOPE_PATTERN = /\b(hit|hitting|hitter|bat|average|avg|obp|on[- ]base|slg|slugging|ops|plate appearance|pa\b|strikeout|walk|contact|hard[- ]?hit|pitch|velocity|mph|count|strike|ball|zone|location|spray|timing|outcome|result|single|double|triple|home run|recent|last|season|game|trend|first pitch|two strike|0[- ]?\d|\d[- ]?\d)\b/i;
const INJECTION_PATTERN = /ignore (all |any |the )?(previous|prior|above)|system prompt|developer message|hidden instruction|api key|environment variable|database schema|reveal .*prompt|application secret/i;
const OUT_OF_SCOPE_PATTERN = /\b(mlb|major league|capital of|history essay|weather|politics|stock price|recipe)\b/i;

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
  return normalizeOutcome(
    atBat?.finalOutcome || atBat?.outcome || lastPitch.battedBallOutcome || lastPitch.batted_ball_outcome || lastPitch.outcome,
    atBat,
  );
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
    .flatMap((game) => (Array.isArray(game?.atBats) ? game.atBats.map((atBat) => ({ ...atBat, gameDate: game.date || "" })) : []));
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
  if (!/^(what about|how about|and |what if|\d{1,3}\s*(?:-|to)\s*\d{1,3})/i.test(trimmed)) return trimmed;
  const priorUser = (Array.isArray(history) ? history : []).slice().reverse().find((item) => item?.role === "user");
  return priorUser ? `${priorUser.content} Follow-up: ${trimmed}` : trimmed;
}

function isAllowedQuestion(message, history = []) {
  if (INJECTION_PATTERN.test(message) || OUT_OF_SCOPE_PATTERN.test(message)) return false;
  return SCOPE_PATTERN.test(getContextQuestion(message, history));
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

function analyzeQuestion({ message, history = [], games = [] }) {
  const question = getContextQuestion(message, history);
  const normalized = question.toLowerCase();
  const atBats = flattenAtBats(games);
  if (!isAllowedQuestion(message, history)) return { type: "refusal" };
  if (!atBats.length) return { type: "no_data" };

  if (/exit velocity|launch angle/.test(normalized)) {
    return { type: "missing_data", field: normalized.includes("exit velocity") ? "exit velocity" : "launch angle" };
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

  if (/better now|earlier this season|trend|improv|getting better/.test(normalized)) {
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
  analyzeQuestion,
  flattenAtBats,
  formatPercent,
  formatRate,
  getOutcome,
  isAllowedQuestion,
  summarize,
};
