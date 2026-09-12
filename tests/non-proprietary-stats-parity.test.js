"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const canonical = require("../scripts/non-proprietary-stats");
const aiStats = require("../lib/hitting-ai-stats");

const inZone = { id: "zone-5", label: "Zone 5", isZone: true };
const outOfZone = { id: "right-out", label: "Outside", isZone: false };
const twoStrikePitches = (terminal) => [
  { result: "called_strike", location: inZone },
  { result: "foul_ball", location: inZone },
  terminal,
];

const twoStrikeWalk = {
  outcome: "walk",
  balls: 4,
  strikes: 2,
  pitches: [
    { result: "called_strike", location: inZone },
    { result: "foul_ball", location: inZone },
    { result: "ball", location: outOfZone },
    { result: "ball", location: outOfZone },
    { result: "ball", location: outOfZone },
    { result: "ball", location: outOfZone },
  ],
};

const games = [
  {
    id: "parity-game",
    date: "2026-09-08",
    opponent: "Parity",
    atBats: [
      {
        outcome: "single",
        hardHitBall: true,
        timing: "on_time",
        pitches: twoStrikePitches({ result: "batted_ball", battedBallType: "line_drive", location: outOfZone }),
      },
      twoStrikeWalk,
      { outcome: "hit_by_pitch", pitches: [{ result: "hit_by_pitch", location: outOfZone }] },
      { outcome: "strikeout", pitches: [{ result: "called_strike", location: inZone }, { result: "swinging_strike", location: outOfZone }] },
      { outcome: "sac_fly", hardHitBall: false, timing: "on_time", productiveOut: true, pitches: [{ result: "batted_ball", battedBallType: "fly_ball", location: inZone }] },
      { outcome: "sac_bunt", hardHitBall: null, timing: "early", productiveOut: true, pitches: [{ result: "batted_ball", battedBallType: "ground_ball", location: inZone }] },
      {
        outcome: "double",
        hardHitBall: false,
        timing: "late",
        pitches: twoStrikePitches({ result: "batted_ball", battedBallType: "ground_ball", location: inZone }),
      },
      {
        outcome: "",
        hardHitBall: true,
        timing: "early",
        pitches: Array.from({ length: 6 }, () => ({ result: "foul_ball", location: outOfZone })),
      },
    ],
  },
  { id: "empty-game", date: "2026-09-09", opponent: "Empty", atBats: [] },
];

const atBats = games.flatMap((game) => game.atBats);
const browser = canonical.calculateMetrics(atBats);
const browserGames = canonical.calculateGameMetrics(games);

assert.equal(browser.plateAppearances, 7, "incomplete records must not count as completed PAs");
assert.equal(browser.atBats, 3, "walks, HBP, and sacrifices must not count as official ABs");
assert.equal(browser.hits, 2);
assert.equal(browser.totalBases, 3);
assert.equal(canonical.reachedTwoStrikes(twoStrikeWalk), true, "a 3-2 walk must reach two strikes");
assert.equal(browser.twoStrikeAtBats, 4, "the two-strike walk must enter the two-strike numerator");
assert.equal(browser.twoStrikeBallsInPlay, 2, "the two-strike walk must not enter the hard-hit BIP denominator");
assert.equal(browser.twoStrikeHardHits, 1);
assert.equal(browserGames.games, 2, "the empty saved game must remain in game-level denominators");
assert.equal(browserGames.hitsPerGame, 1);
assert.equal(browserGames.atBatsPerGame, 1.5);
assert.equal(browserGames.zeroHitGames, 1);

const aiPlateAppearances = aiStats.analyzeQuestion({ message: "How many plate appearances do I have?", games });
const aiOfficialAtBats = aiStats.analyzeQuestion({ message: "How many at-bats do I have?", games });
assert.equal(aiPlateAppearances.rawValue, 7, "AI PA population differs from the browser");
assert.equal(aiOfficialAtBats.rawValue, 3, "AI AB population differs from the browser");

const parityCases = [
  ["battingAverage", "What is my batting average?", browserGames.battingAverage],
  ["onBasePercentage", "What is my OBP?", browserGames.onBasePercentage],
  ["sluggingPercentage", "What is my slugging percentage?", browserGames.sluggingPercentage],
  ["ops", "What is my OPS?", browserGames.ops],
  ["hardHitPercentage", "What is my hard-hit percentage?", browser.hardHitPercent],
  ["twoStrikePercentage", "What is my two-strike percentage?", browser.twoStrikePercent],
  ["hardHitTwoStrikePercentage", "What is my hard-hit percentage with two strikes?", browser.hardHitTwoStrikePercent],
  ["productiveOutPercentage", "What is my productive-out percentage?", browser.productiveOutPercent],
  ["lineDrivePercentage", "What is my line-drive percentage?", browser.lineDrivePercent],
  ["groundBallPercentage", "What is my ground-ball percentage?", browser.groundBallPercent],
  ["flyBallPercentage", "What is my fly-ball percentage?", browser.flyBallPercent],
  ["extraBaseHitPercentage", "What is my extra-base-hit percentage?", browser.extraBaseHitPercent],
  ["chaseRate", "What is my chase rate?", browser.chaseRate],
  ["contactRate", "What is my contact rate?", browser.contactRate],
  ["qualityAtBatPercentage", "What is my quality at-bat percentage?", browser.qualityAtBatPercent],
  ["onTimePercentage", "What is my on-time percentage?", browser.onTimePercent],
  ["earlyPercentage", "What is my early percentage?", browser.earlyPercent],
  ["latePercentage", "What is my late percentage?", browser.latePercent],
  ["hitsPerGame", "What are my hits per game?", browserGames.hitsPerGame],
  ["atBatsPerGame", "What are my at-bats per game?", browserGames.atBatsPerGame],
];

parityCases.forEach(([metricKey, message, expected]) => {
  const result = aiStats.analyzeQuestion({ message, games });
  assert.equal(result.type, "stat_lookup", `${metricKey} did not use the canonical stat lookup`);
  assert.equal(result.metricKey, metricKey);
  assert.equal(result.rawValue, expected, `${metricKey} differs between browser and AI`);
});

const sampleQueryExpectations = [
  ["What is my batting average?", browserGames.battingAverage],
  ["What are my hits per game?", 1],
  ["How many multi-hit games do I have?", 1],
  ["What is my hard-hit percentage?", browser.hardHitPercent],
  ["What is my hard-hit percentage with two strikes?", browser.hardHitTwoStrikePercent],
];
sampleQueryExpectations.forEach(([message, expected]) => {
  const result = aiStats.analyzeQuestion({ message, games });
  assert.equal(result.type, "stat_lookup", message);
  assert.equal(result.rawValue, expected, message);
});

const aiTwoStrike = aiStats.analyzeQuestion({ message: "What is my two-strike percentage?", games });
const aiHardHitTwoStrike = aiStats.analyzeQuestion({ message: "What is my hard-hit percentage with two strikes?", games });
assert.equal(aiTwoStrike.numerator, 4);
assert.equal(aiTwoStrike.denominator, 7);
assert.equal(aiHardHitTwoStrike.numerator, 1);
assert.equal(aiHardHitTwoStrike.denominator, 2);

assert.equal(aiStats.analyzeQuestion({ message: "How many zero-hit games do I have?", games }).rawValue, 1);
assert.equal(aiStats.analyzeQuestion({ message: "What is my best single game?", games }).rawValue, 2);
assert.equal(aiStats.analyzeQuestion({ message: "How many games with a hit do I have?", games }).rawValue, 1);

const missingHardHitGames = [{
  id: "missing-hard-hit",
  date: "2026-09-09",
  atBats: [{ outcome: "single", hardHitBall: null, pitches: [{ result: "batted_ball", battedBallType: "line_drive" }] }],
}];
const missingHardHitBrowser = canonical.calculateMetrics(missingHardHitGames[0].atBats);
const missingHardHitAi = aiStats.analyzeQuestion({ message: "What is my hard-hit percentage?", games: missingHardHitGames });
assert.equal(missingHardHitBrowser.hardHitPercent, 0, "the existing missing-hard-hit behavior changed");
assert.equal(missingHardHitAi.rawValue, missingHardHitBrowser.hardHitPercent, "missing hard-hit handling is not at parity");

const pitchlessTwoStrike = { outcome: "walk", strikes: 2, balls: 4, pitches: [] };
assert.equal(canonical.reachedTwoStrikes(pitchlessTwoStrike), true, "the shared legacy count fallback is missing");

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
assert.match(appSource, /nonProprietaryStats\.calculateMetrics\(allAtBats\)/, "browser advanced stats do not use the shared calculator");
assert.match(appSource, /nonProprietaryStats\.reachedTwoStrikes\(atBat\)/, "browser two-strike logic is not shared");

console.log("Non-proprietary browser/AI statistics parity tests passed");
