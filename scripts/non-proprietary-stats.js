(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.hittingLogStats = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const OUTCOME_FIELDS = Object.freeze([
    "single", "double", "triple", "home_run", "walk", "hit_by_pitch",
    "strikeout", "sac_bunt", "drag_bunt", "sac_fly", "reached_on_error",
    "fielders_choice", "ground_out", "line_out", "fly_out", "productive_out",
  ]);
  const HIT_OUTCOMES = new Set(["single", "double", "triple", "home_run"]);
  const OFFICIAL_AT_BAT_OUTCOMES = new Set([
    ...HIT_OUTCOMES,
    "strikeout", "reached_on_error", "fielders_choice", "ground_out", "line_out", "fly_out",
  ]);
  const COMPLETED_PLATE_APPEARANCE_OUTCOMES = new Set([
    ...OFFICIAL_AT_BAT_OUTCOMES,
    "walk", "hit_by_pitch", "sac_bunt", "drag_bunt", "sac_fly",
  ]);
  const OUT_OUTCOMES = new Set([
    "strikeout", "sac_bunt", "sac_fly", "fielders_choice", "ground_out", "line_out", "fly_out",
  ]);
  const BALL_IN_PLAY_OUTCOMES = new Set([
    ...HIT_OUTCOMES,
    "reached_on_error", "fielders_choice", "ground_out", "line_out", "fly_out", "sac_fly", "sac_bunt", "drag_bunt",
  ]);
  const HARD_HIT_INELIGIBLE_OUTCOMES = new Set(["sac_bunt", "drag_bunt"]);
  const AUTOMATIC_PRODUCTIVE_OUTCOMES = new Set(["sac_bunt", "sac_fly"]);
  const OUTCOME_ALIASES = Object.freeze({
    "home run": "home_run",
    homerun: "home_run",
    "fielder's choice": "fielders_choice",
    "fielders choice": "fielders_choice",
    roe: "reached_on_error",
    error: "reached_on_error",
    sacrifice_fly: "sac_fly",
    "sac fly": "sac_fly",
    "sac bunt": "sac_bunt",
    "drag bunt": "drag_bunt",
    hbp: "hit_by_pitch",
  });

  function normalizeKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/['’]/g, "'")
      .replace(/[-\s]+/g, "_");
  }

  function getPitches(atBat) {
    return Array.isArray(atBat?.pitches) ? atBat.pitches : [];
  }

  function getBattedBallType(atBat) {
    const direct = normalizeKey(atBat?.battedBallType || atBat?.batted_ball_type);
    if (direct) return direct;
    const pitch = getPitches(atBat).find((item) => item?.battedBallType || item?.batted_ball_type || item?.contact_type);
    return normalizeKey(pitch?.battedBallType || pitch?.batted_ball_type || pitch?.contact_type);
  }

  function normalizeOutcome(value, atBat = {}) {
    const original = String(value || "").trim().toLowerCase().replace(/’/g, "'");
    const aliased = OUTCOME_ALIASES[original];
    const normalized = aliased || normalizeKey(value);
    if (normalized !== "out") return normalized;
    const type = getBattedBallType(atBat);
    return type === "line_drive" ? "line_out" : type === "fly_ball" || type === "popup" ? "fly_out" : "ground_out";
  }

  function getOutcome(atBat) {
    const pitches = getPitches(atBat);
    const battedBallPitch = pitches.slice().reverse().find((pitch) => (
      pitch?.result === "batted_ball" || pitch?.primaryResult === "batted_ball" ||
      pitch?.battedBallOutcome || pitch?.batted_ball_outcome || pitch?.outcome
    ));
    const value = atBat?.finalOutcome || atBat?.outcome || battedBallPitch?.battedBallOutcome ||
      battedBallPitch?.batted_ball_outcome || battedBallPitch?.outcome || "";
    return normalizeOutcome(value, atBat);
  }

  function isCompletedPlateAppearance(atBat) {
    return COMPLETED_PLATE_APPEARANCE_OUTCOMES.has(getOutcome(atBat));
  }

  function createStatsBucket() {
    return OUTCOME_FIELDS.reduce((stats, field) => {
      stats[field] = 0;
      return stats;
    }, {});
  }

  function createCalculatedStats(source = {}) {
    const stats = createStatsBucket();
    OUTCOME_FIELDS.forEach((field) => {
      stats[field] = Math.max(0, Number(source[field]) || 0);
    });
    const hits = stats.single + stats.double + stats.triple + stats.home_run;
    const atBats = [...OFFICIAL_AT_BAT_OUTCOMES].reduce((total, outcome) => total + stats[outcome], 0);
    const totalBases = stats.single + (stats.double * 2) + (stats.triple * 3) + (stats.home_run * 4);
    const totalOuts = [...OUT_OUTCOMES].reduce((total, outcome) => total + stats[outcome], 0);
    const productiveOuts = stats.productive_out + stats.sac_bunt + stats.sac_fly;
    const plateAppearances = [...COMPLETED_PLATE_APPEARANCE_OUTCOMES]
      .reduce((total, outcome) => total + stats[outcome], 0);
    const battingAverage = atBats ? hits / atBats : 0;
    const onBasePercentage = plateAppearances ? (hits + stats.walk + stats.hit_by_pitch) / plateAppearances : 0;
    const sluggingPercentage = atBats ? totalBases / atBats : 0;

    return {
      ...stats,
      hits,
      atBats,
      totalBases,
      totalOuts,
      productiveOuts,
      productiveOutPercent: totalOuts ? productiveOuts / totalOuts : null,
      plateAppearances,
      battingAverage,
      onBasePercentage,
      sluggingPercentage,
      ops: onBasePercentage + sluggingPercentage,
      walks: stats.walk,
      hitByPitch: stats.hit_by_pitch,
      strikeouts: stats.strikeout,
      strikeoutPercentage: plateAppearances ? stats.strikeout / plateAppearances : null,
    };
  }

  function calculateStatsFromAtBats(atBats) {
    const stats = createStatsBucket();
    (Array.isArray(atBats) ? atBats : []).forEach((atBat) => {
      if (!isCompletedPlateAppearance(atBat)) return;
      const outcome = getOutcome(atBat);
      stats[outcome] += 1;
      if (atBat?.productiveOut === true && !AUTOMATIC_PRODUCTIVE_OUTCOMES.has(outcome)) {
        stats.productive_out += 1;
      }
    });
    return createCalculatedStats(stats);
  }

  function calculateGameStats(game) {
    if (Array.isArray(game?.atBats)) return calculateStatsFromAtBats(game.atBats);
    const hasOutcomeFields = OUTCOME_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(game || {}, field));
    const hasLegacyOutcomeFields = ["sacrifice_fly", "out", "error"].some((field) => (
      Object.prototype.hasOwnProperty.call(game || {}, field)
    ));
    if (hasOutcomeFields || hasLegacyOutcomeFields) {
      const stats = createStatsBucket();
      OUTCOME_FIELDS.forEach((field) => {
        stats[field] = Math.max(0, Number(game?.[field]) || 0);
      });
      stats.sac_fly += Math.max(0, Number(game?.sacrifice_fly) || 0);
      stats.reached_on_error += Math.max(0, Number(game?.error) || 0);
      stats.ground_out += Math.max(0, Number(game?.out) || 0);
      return createCalculatedStats(stats);
    }
    const legacyAtBats = Math.max(0, Number(game?.atBats) || 0);
    const legacyHits = Math.max(0, Math.min(legacyAtBats, Number(game?.hits) || 0));
    const stats = createStatsBucket();
    stats.single = legacyHits;
    stats.ground_out = Math.max(0, legacyAtBats - legacyHits);
    return createCalculatedStats(stats);
  }

  function normalizeTiming(value) {
    const timing = normalizeKey(value);
    if (timing === "on_time" || timing === "ontime") return "on_time";
    return timing === "early" || timing === "late" ? timing : "";
  }

  function getPitchResult(pitch) {
    return normalizeKey(pitch?.strikeType || pitch?.strikeDetail || pitch?.primaryResult || pitch?.result);
  }

  function calculatePitchCount(pitches) {
    return getPitches({ pitches }).reduce((count, pitch) => {
      const result = getPitchResult(pitch);

      if (result === "ball") count.balls += 1;
      if (["strike", "called_strike", "swinging_strike"].includes(result)) count.strikes += 1;
      if (result === "foul_ball" && count.strikes < 2) count.strikes += 1;

      return count;
    }, { balls: 0, strikes: 0 });
  }

  function getAutomaticPitchOutcome(pitches) {
    const savedPitches = getPitches({ pitches });
    const finalPitchResult = getPitchResult(savedPitches[savedPitches.length - 1]);
    const count = calculatePitchCount(savedPitches);

    if (finalPitchResult === "ball" && count.balls >= 4) return "walk";
    if (
      ["called_strike", "swinging_strike"].includes(finalPitchResult) &&
      count.strikes >= 3
    ) {
      return "strikeout";
    }

    return "";
  }

  function hasBallInPlay(atBat) {
    if (BALL_IN_PLAY_OUTCOMES.has(getOutcome(atBat))) return true;
    return getPitches(atBat).some((pitch) => (
      getPitchResult(pitch) === "batted_ball" || Boolean(
        pitch?.battedBallType || pitch?.batted_ball_type || pitch?.contact_type ||
        pitch?.battedBallOutcome || pitch?.batted_ball_outcome
      )
    ));
  }

  function isHardHitEligible(atBat) {
    if (!isCompletedPlateAppearance(atBat)) return false;
    const outcome = getOutcome(atBat);
    return hasBallInPlay(atBat) && !HARD_HIT_INELIGIBLE_OUTCOMES.has(outcome);
  }

  function isSwing(pitch) {
    const result = getPitchResult(pitch);
    return ["swinging_strike", "foul_ball", "batted_ball"].includes(result) || Boolean(
      pitch?.battedBallType || pitch?.batted_ball_type || pitch?.contact_type ||
      pitch?.battedBallOutcome || pitch?.batted_ball_outcome
    );
  }

  function isContact(pitch) {
    const result = getPitchResult(pitch);
    return result === "foul_ball" || result === "batted_ball" || Boolean(
      pitch?.battedBallType || pitch?.batted_ball_type || pitch?.contact_type ||
      pitch?.battedBallOutcome || pitch?.batted_ball_outcome
    );
  }

  function getPitchZoneStatus(pitch) {
    const location = pitch?.location && typeof pitch.location === "object" ? pitch.location : null;
    const locationId = location?.id || pitch?.locationId || pitch?.location_id || pitch?.pitch_location ||
      (typeof pitch?.location === "string" ? pitch.location : "");
    const locationLabel = location?.label || pitch?.locationLabel || "";
    if (location && typeof location.isZone === "boolean") return location.isZone;
    if (/^zone-[1-9]$/.test(locationId) || /^Zone [1-9]$/.test(locationLabel)) return true;
    return locationId || locationLabel ? false : null;
  }

  function reachedTwoStrikes(atBat) {
    const pitches = getPitches(atBat);
    if (!pitches.length) return Number(atBat?.strikes) >= 2;
    let strikes = 0;
    return pitches.some((pitch) => {
      const result = getPitchResult(pitch);
      if (["strike", "called_strike", "swinging_strike"].includes(result)) strikes += 1;
      if (result === "foul_ball" && strikes < 2) strikes += 1;
      return strikes >= 2;
    });
  }

  function isQualityAtBat(atBat) {
    if (!isCompletedPlateAppearance(atBat)) return false;
    const outcome = getOutcome(atBat);
    return HIT_OUTCOMES.has(outcome) || ["walk", "hit_by_pitch", "sac_fly", "sac_bunt", "drag_bunt"].includes(outcome) ||
      (isHardHitEligible(atBat) && atBat?.hardHitBall === true) || getPitches(atBat).length >= 6;
  }

  function calculateRate(numerator, denominator) {
    return denominator > 0 ? numerator / denominator : null;
  }

  function calculateMetrics(atBats) {
    const completed = (Array.isArray(atBats) ? atBats : []).filter(isCompletedPlateAppearance);
    const traditional = calculateStatsFromAtBats(completed);
    const pitches = completed.flatMap(getPitches);
    const ballsInPlay = completed.filter(hasBallInPlay);
    const hardHitEligible = completed.filter(isHardHitEligible);
    const twoStrike = completed.filter(reachedTwoStrikes);
    const twoStrikeEligible = twoStrike.filter(isHardHitEligible);
    const outs = completed.filter((atBat) => OUT_OUTCOMES.has(getOutcome(atBat)));
    const timingEntries = completed.map((atBat) => normalizeTiming(atBat?.timing)).filter(Boolean);
    const outOfZonePitches = pitches.filter((pitch) => getPitchZoneStatus(pitch) === false);
    const swings = pitches.filter(isSwing);
    const lineDrives = ballsInPlay.filter((atBat) => getBattedBallType(atBat) === "line_drive").length;
    const groundBalls = ballsInPlay.filter((atBat) => getBattedBallType(atBat) === "ground_ball").length;
    const flyBalls = ballsInPlay.filter((atBat) => getBattedBallType(atBat) === "fly_ball").length;
    const extraBaseHits = traditional.double + traditional.triple + traditional.home_run;
    const productiveOuts = outs.filter((atBat) => (
      atBat?.productiveOut === true || AUTOMATIC_PRODUCTIVE_OUTCOMES.has(getOutcome(atBat))
    )).length;

    return {
      ...traditional,
      completedPlateAppearances: completed.length,
      ballsInPlay: ballsInPlay.length,
      hardHitBalls: hardHitEligible.filter((atBat) => atBat?.hardHitBall === true).length,
      hardHitEligibleBalls: hardHitEligible.length,
      hardHitPercent: calculateRate(hardHitEligible.filter((atBat) => atBat?.hardHitBall === true).length, hardHitEligible.length),
      twoStrikeAtBats: twoStrike.length,
      twoStrikePercent: calculateRate(twoStrike.length, completed.length),
      twoStrikeBallsInPlay: twoStrikeEligible.length,
      twoStrikeHardHits: twoStrikeEligible.filter((atBat) => atBat?.hardHitBall === true).length,
      hardHitTwoStrikePercent: calculateRate(twoStrikeEligible.filter((atBat) => atBat?.hardHitBall === true).length, twoStrikeEligible.length),
      productiveOuts,
      productiveOutPercent: calculateRate(productiveOuts, outs.length),
      lineDrives,
      groundBalls,
      flyBalls,
      lineDrivePercent: calculateRate(lineDrives, ballsInPlay.length) ?? 0,
      groundBallPercent: calculateRate(groundBalls, ballsInPlay.length) ?? 0,
      flyBallPercent: calculateRate(flyBalls, ballsInPlay.length) ?? 0,
      extraBaseHits,
      extraBaseHitPercent: calculateRate(extraBaseHits, traditional.hits),
      outOfZonePitches: outOfZonePitches.length,
      outOfZoneSwings: outOfZonePitches.filter(isSwing).length,
      chaseRate: calculateRate(outOfZonePitches.filter(isSwing).length, outOfZonePitches.length),
      swings: swings.length,
      contactSwings: swings.filter(isContact).length,
      contactRate: calculateRate(swings.filter(isContact).length, swings.length),
      qualityAtBats: completed.filter(isQualityAtBat).length,
      qualityAtBatPercent: calculateRate(completed.filter(isQualityAtBat).length, completed.length),
      timingTotal: timingEntries.length,
      onTime: timingEntries.filter((timing) => timing === "on_time").length,
      early: timingEntries.filter((timing) => timing === "early").length,
      late: timingEntries.filter((timing) => timing === "late").length,
      onTimePercent: calculateRate(timingEntries.filter((timing) => timing === "on_time").length, timingEntries.length),
      earlyPercent: calculateRate(timingEntries.filter((timing) => timing === "early").length, timingEntries.length),
      latePercent: calculateRate(timingEntries.filter((timing) => timing === "late").length, timingEntries.length),
      strikePercentage: calculateRate(
        pitches.filter((pitch) => ["strike", "called_strike", "swinging_strike", "foul_ball"].includes(getPitchResult(pitch))).length,
        pitches.length
      ),
    };
  }

  function aggregateGameStats(games, getGameStats = calculateGameStats) {
    const bucket = createStatsBucket();
    (Array.isArray(games) ? games : []).forEach((game) => {
      const stats = getGameStats(game);
      OUTCOME_FIELDS.forEach((field) => {
        bucket[field] += Math.max(0, Number(stats?.[field]) || 0);
      });
    });
    return createCalculatedStats(bucket);
  }

  function calculateGameMetrics(games, getGameStats = calculateGameStats) {
    const safeGames = Array.isArray(games) ? games : [];
    const gameStats = safeGames.map((game) => getGameStats(game));
    const totals = aggregateGameStats(safeGames, getGameStats);
    const gameHits = gameStats.map((stats) => Math.max(0, Number(stats?.hits) || 0));
    return {
      ...totals,
      games: safeGames.length,
      hitsPerGame: safeGames.length ? totals.hits / safeGames.length : null,
      atBatsPerGame: safeGames.length ? totals.atBats / safeGames.length : null,
      multiHitGames: gameHits.filter((hits) => hits >= 2).length,
      zeroHitGames: gameHits.filter((hits) => hits === 0).length,
      bestSingleGame: gameHits.length ? Math.max(...gameHits) : null,
      gamesWithHit: gameHits.filter((hits) => hits > 0).length,
    };
  }

  return Object.freeze({
    AUTOMATIC_PRODUCTIVE_OUTCOMES,
    BALL_IN_PLAY_OUTCOMES,
    COMPLETED_PLATE_APPEARANCE_OUTCOMES,
    HIT_OUTCOMES,
    OFFICIAL_AT_BAT_OUTCOMES,
    OUTCOME_FIELDS,
    OUT_OUTCOMES,
    aggregateGameStats,
    calculatePitchCount,
    calculateGameMetrics,
    calculateGameStats,
    calculateMetrics,
    calculateRate,
    calculateStatsFromAtBats,
    createCalculatedStats,
    createStatsBucket,
    getBattedBallType,
    getAutomaticPitchOutcome,
    getOutcome,
    getPitchResult,
    getPitchZoneStatus,
    getPitches,
    hasBallInPlay,
    isCompletedPlateAppearance,
    isContact,
    isHardHitEligible,
    isQualityAtBat,
    isSwing,
    normalizeKey,
    normalizeOutcome,
    normalizeTiming,
    reachedTwoStrikes,
  });
});
