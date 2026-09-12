"use strict";

const assert = require("node:assert/strict");
const stats = require("../scripts/non-proprietary-stats");

const ball = () => ({ result: "ball" });
const calledStrike = () => ({ result: "called_strike", strikeType: "called_strike" });
const swingingStrike = () => ({ result: "swinging_strike", strikeType: "swinging_strike" });
const foul = () => ({ result: "foul_ball" });

const threeBalls = [ball(), ball(), ball()];
assert.equal(stats.getAutomaticPitchOutcome([...threeBalls, ball()]), "walk", "ball four must end in a walk");
assert.equal(stats.getAutomaticPitchOutcome([...threeBalls, calledStrike()]), "", "a non-ball at 3 balls must not walk");

assert.equal(
  stats.getAutomaticPitchOutcome([calledStrike(), foul(), calledStrike()]),
  "strikeout",
  "a called third strike must end in a strikeout",
);
assert.equal(
  stats.getAutomaticPitchOutcome([calledStrike(), foul(), swingingStrike()]),
  "strikeout",
  "a swinging third strike must end in a strikeout",
);
assert.equal(
  stats.getAutomaticPitchOutcome([calledStrike(), calledStrike()]),
  "",
  "strike two must leave the plate appearance active",
);

assert.deepEqual(stats.calculatePitchCount([foul()]), { balls: 0, strikes: 1 });
assert.deepEqual(stats.calculatePitchCount([foul(), foul()]), { balls: 0, strikes: 2 });
assert.deepEqual(stats.calculatePitchCount([foul(), foul(), foul()]), { balls: 0, strikes: 2 });
assert.deepEqual(
  stats.calculatePitchCount([foul(), foul(), foul(), foul(), foul()]),
  { balls: 0, strikes: 2 },
  "consecutive two-strike fouls must keep the count at two strikes",
);
assert.equal(
  stats.getAutomaticPitchOutcome([foul(), foul(), foul(), foul()]),
  "",
  "an ordinary foul ball must never create a strikeout",
);

const walkPitches = [...threeBalls, ball()];
const strikeoutPitches = [calledStrike(), foul(), swingingStrike()];
const completedWalk = { finalOutcome: "walk", pitches: walkPitches };
const completedStrikeout = { finalOutcome: "strikeout", pitches: strikeoutPitches };

assert.equal(walkPitches.at(-1).result, "ball", "ball four must remain in pitch history");
assert.equal(strikeoutPitches.at(-1).strikeType, "swinging_strike", "strike three detail must remain in pitch history");
assert.equal(stats.isCompletedPlateAppearance(completedWalk), true);
assert.equal(stats.isCompletedPlateAppearance(completedStrikeout), true);

const totals = stats.calculateStatsFromAtBats([completedWalk, completedStrikeout]);
assert.equal(totals.plateAppearances, 2);
assert.equal(totals.walks, 1, "the automatic walk must be counted exactly once");
assert.equal(totals.strikeouts, 1, "the automatic strikeout must be counted exactly once");
assert.equal(totals.atBats, 1, "a walk must be excluded from official at-bats");
assert.equal(totals.battingAverage, 0);
assert.equal(totals.onBasePercentage, 0.5);
assert.equal(totals.ops, 0.5);

const performance = stats.calculateMetrics([completedWalk, completedStrikeout]);
assert.equal(performance.ballsInPlay, 0, "walks and strikeouts must not enter batted-ball statistics");
assert.equal(performance.twoStrikeAtBats, 1, "the completed strikeout must enter two-strike statistics");
assert.equal(performance.contactRate, 0.5, "the foul must count as contact and the swinging strikeout as a miss");

assert.deepEqual(stats.calculatePitchCount([]), { balls: 0, strikes: 0 }, "the next at-bat must begin at 0-0");

console.log("Automatic at-bat completion tests passed");
