"use strict";

// SECURITY BOUNDARY: this module is server-only. Never import it from browser code,
// expose its intermediate values, or include them in AI/model context or logs.
const HIT_OUTCOMES = new Set(["single", "double", "triple", "home_run"]);
const BALL_IN_PLAY_OUTCOMES = new Set([
  ...HIT_OUTCOMES,
  "reached_on_error",
  "fielders_choice",
  "ground_out",
  "line_out",
  "fly_out",
  "sac_fly",
  "sac_bunt",
  "drag_bunt",
]);
const HARD_HIT_INELIGIBLE_OUTCOMES = new Set(["sac_bunt", "drag_bunt"]);
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
  "fielder's choice": "fielders_choice",
  "fielders choice": "fielders_choice",
  roe: "reached_on_error",
  error: "reached_on_error",
  "sac fly": "sac_fly",
  "sac bunt": "sac_bunt",
  hbp: "hit_by_pitch",
};

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function getPitches(atBat) {
  return Array.isArray(atBat?.pitches) ? atBat.pitches : [];
}

function getBattedBallTypeFromPitches(atBat) {
  const pitch = getPitches(atBat).find((item) => (
    item?.battedBallType || item?.batted_ball_type || item?.contact_type
  ));
  return pitch?.battedBallType || pitch?.batted_ball_type || pitch?.contact_type || "";
}

function normalizeOutcome(value, atBat = {}) {
  const original = String(value || "").trim().toLowerCase();
  if (OUTCOME_ALIASES[original]) return OUTCOME_ALIASES[original];
  const normalized = normalizeKey(value);
  if (normalized === "out") {
    const type = normalizeKey(atBat.battedBallType || atBat.batted_ball_type);
    return type === "line_drive"
      ? "line_out"
      : type === "fly_ball" || type === "popup" ? "fly_out" : "ground_out";
  }
  return normalized;
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

function getPitchResult(pitch) {
  return normalizeKey(pitch?.strikeType || pitch?.strikeDetail || pitch?.primaryResult || pitch?.result);
}

function reachedTwoStrikes(atBat) {
  const pitches = getPitches(atBat);
  let strikes = 0;
  return pitches.some((pitch) => {
    const result = getPitchResult(pitch);
    if (["strike", "called_strike", "swinging_strike"].includes(result)) strikes += 1;
    if (result === "foul_ball" && strikes < 2) strikes += 1;
    return strikes >= 2;
  });
}

function isBallInPlay(atBat) {
  return BALL_IN_PLAY_OUTCOMES.has(getOutcome(atBat)) || getPitches(atBat).some((pitch) => (
    getPitchResult(pitch) === "batted_ball" || Boolean(pitch?.battedBallType || pitch?.battedBallOutcome)
  ));
}

function isHardHitEligible(atBat) {
  if (!atBat || typeof atBat !== "object") return false;
  const pitches = getPitches(atBat);
  const battedBallPitch = pitches.slice().reverse().find((pitch) => (
    pitch?.result === "batted_ball"
    || pitch?.primaryResult === "batted_ball"
    || pitch?.battedBallOutcome
    || pitch?.batted_ball_outcome
  ));
  const rawOutcome = atBat.finalOutcome
    || atBat.outcome
    || battedBallPitch?.battedBallOutcome
    || battedBallPitch?.batted_ball_outcome
    || battedBallPitch?.outcome
    || "";
  const battedBallType = atBat.battedBallType
    || atBat.batted_ball_type
    || battedBallPitch?.battedBallType
    || battedBallPitch?.batted_ball_type
    || "";
  const outcome = normalizeOutcome(rawOutcome, { battedBallType });
  if (outcome) return BALL_IN_PLAY_OUTCOMES.has(outcome) && !HARD_HIT_INELIGIBLE_OUTCOMES.has(outcome);
  return isBallInPlay(atBat);
}

function isQualityAtBat(atBat) {
  const qualityOutcomes = new Set([
    "single", "double", "triple", "home_run", "walk", "hit_by_pitch", "sac_fly", "sac_bunt", "drag_bunt",
  ]);
  return qualityOutcomes.has(getOutcome(atBat))
    || (isHardHitEligible(atBat) && atBat?.hardHitBall === true)
    || getPitches(atBat).length >= 6;
}

function calculateHlpScore(atBats) {
  const plateAppearances = Array.isArray(atBats) ? atBats : [];
  if (!plateAppearances.length) return { score: null, influences: [] };

  const outs = plateAppearances.filter((atBat) => OUT_OUTCOMES.has(getOutcome(atBat)));
  const ballsInPlay = plateAppearances.filter(isHardHitEligible);
  const hardHits = ballsInPlay.filter((atBat) => atBat?.hardHitBall === true);
  const qualityAtBats = plateAppearances.filter(isQualityAtBat);
  const productiveOuts = outs.filter((atBat) => (
    atBat?.productiveOut === true || ["sac_bunt", "sac_fly"].includes(getOutcome(atBat))
  ));
  const twoStrikeAtBats = plateAppearances.filter(reachedTwoStrikes);
  const twoStrikeBallsInPlay = twoStrikeAtBats.filter(isHardHitEligible);
  const twoStrikeHardHits = twoStrikeBallsInPlay.filter((atBat) => atBat?.hardHitBall === true);
  const hardHitPercent = ballsInPlay.length ? hardHits.length / ballsInPlay.length : null;
  const qualityAtBatPercent = qualityAtBats.length / plateAppearances.length;
  const productiveOutPercent = outs.length ? productiveOuts.length / outs.length : null;
  const twoStrikePercent = twoStrikeAtBats.length / plateAppearances.length;
  const hardHitTwoStrikePercent = twoStrikeBallsInPlay.length
    ? twoStrikeHardHits.length / twoStrikeBallsInPlay.length
    : null;
  const twoStrikeAdjustment = hardHitTwoStrikePercent !== null
    ? 100 - ((twoStrikePercent * 100) * ((100 - (hardHitTwoStrikePercent * 100)) / 100))
    : 100 - (twoStrikePercent * 100);
  const components = [
    { label: "quality contact", value: hardHitPercent === null ? null : hardHitPercent * 100, weight: 0.45 },
    { label: "quality at-bats", value: qualityAtBatPercent * 100, weight: 0.25 },
    { label: "two-strike performance", value: twoStrikeAdjustment, weight: 0.10 },
  ];
  if (outs.length) {
    components.splice(2, 0, { label: "productive outs", value: productiveOutPercent * 100, weight: 0.20 });
  }
  const available = components.filter((component) => Number.isFinite(component.value));
  if (!available.length) return { score: null, influences: [] };
  const totalWeight = available.reduce((sum, component) => sum + component.weight, 0);
  const rawScore = available.reduce((sum, component) => (
    sum + (component.value * (component.weight / totalWeight))
  ), 0);

  return {
    score: Math.min(100, Math.max(0, Math.round(rawScore))),
    // Labels only are safe for high-level coaching. Never return component values or weights.
    influences: available.map((component) => component.label),
  };
}

module.exports = { calculateHlpScore };
