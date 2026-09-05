const assert = require("node:assert/strict");
const pitchGrid = require("../lib/pitch-location-grid");
const hittingAIStats = require("../lib/hitting-ai-stats");
const hittingAIClient = require("../lib/openai-hitting-client");
const hittingAIApi = require("../api/hitting-ai")._test;

assert.equal(hittingAIApi.isMissingHandednessColumnError({
  code: "42703",
  message: "column hitting_log_profiles.handedness does not exist",
}), true);
assert.equal(hittingAIApi.isMissingHandednessColumnError({
  code: "PGRST204",
  message: "Could not find the 'handedness' column in the schema cache",
}), true);
assert.equal(hittingAIApi.isMissingHandednessColumnError({ code: "42501", message: "permission denied" }), false);

const leftByHeight = ["extreme-top-left-out", "extreme-mid-left-out", "extreme-bottom-left-out"];
const rightByHeight = ["extreme-top-right-out", "extreme-mid-right-out", "extreme-bottom-right-out"];

leftByHeight.forEach((locationId) => {
  assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(locationId, "right"), "inside");
  assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(locationId, "left"), "outside");
});

rightByHeight.forEach((locationId) => {
  assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(locationId, "right"), "outside");
  assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(locationId, "left"), "inside");
});

["zone-1", "zone-4", "zone-7"].forEach((locationId) => {
  assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(locationId, "right"), "inside");
  assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(locationId, "left"), "outside");
});

["zone-2", "zone-5", "zone-8"].forEach((locationId) => {
  assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(locationId, "right"), "middle");
  assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(locationId, "left"), "middle");
});

["zone-3", "zone-6", "zone-9"].forEach((locationId) => {
  assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(locationId, "right"), "outside");
  assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(locationId, "left"), "inside");
});

assert.equal(pitchGrid.locations.length, 49);
pitchGrid.locations.forEach((location) => {
  const position = pitchGrid.getPitchLocationGridPosition(location);
  const center = (pitchGrid.columnCount - 1) / 2;
  const physical = position.column < center ? "left" : position.column > center ? "right" : "middle";
  const rightExpected = physical === "middle" ? "middle" : physical === "left" ? "inside" : "outside";
  const leftExpected = physical === "middle" ? "middle" : physical === "left" ? "outside" : "inside";
  assert.equal(pitchGrid.getPhysicalHorizontalLocation(location), physical, `${location.id} physical column`);
  assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(location, "right"), rightExpected, `${location.id} right-handed`);
  assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(location, "left"), leftExpected, `${location.id} left-handed`);
  assert.equal(pitchGrid.getVerticalLocation(location), pitchGrid.getVerticalLocation({ locationId: location.id }));
});

const unchangedLocation = { id: "extreme-top-left-out", label: "Extreme Top Left", isZone: false };
const snapshot = JSON.stringify(unchangedLocation);
assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(unchangedLocation, "right"), "inside");
assert.equal(JSON.stringify(unchangedLocation), snapshot, "interpretation must not mutate raw pitch locations");
assert.equal(pitchGrid.getHitterRelativeHorizontalLocation(unchangedLocation, null), null);
assert.equal(pitchGrid.describePitchLocation(unchangedLocation, null), "above the zone and left");
assert.doesNotMatch(pitchGrid.describePitchLocation(unchangedLocation, null), /inside|outside/);

const locationGames = [{
  id: "location-game",
  date: "2026-09-04",
  atBats: [
    {
      outcome: "single",
      pitches: [{ result: "batted_ball", location: { id: "far-left-high-out", label: "Far Inside High", isZone: false } }],
    },
  ],
}];

const rightResult = hittingAIStats.analyzeQuestion({ message: "Where are my hits?", games: locationGames, handedness: "right" });
const leftResult = hittingAIStats.analyzeQuestion({ message: "Where are my hits?", games: locationGames, handedness: "left" });
const unknownResult = hittingAIStats.analyzeQuestion({ message: "Where are my hits?", games: locationGames });
assert.equal(rightResult.facts[0].label, "high and inside");
assert.equal(leftResult.facts[0].label, "high and outside");
assert.equal(unknownResult.facts[0].label, "high and left");

const performanceResult = hittingAIStats.analyzeQuestion({
  message: "What should I work on?",
  games: locationGames,
  handedness: "left",
});
assert.equal(performanceResult.locationPatterns.allPitches.interpretation, "hitter-relative");
assert.equal(performanceResult.locationPatterns.interpretation, "hitter-relative");
assert.deepEqual(performanceResult.locationPatterns.allPitches.horizontal, [{ label: "outside", count: 1 }]);
const modelContext = hittingAIClient.buildModelContext(performanceResult);
assert.equal(modelContext.hitterHandedness, "left");
assert.deepEqual(modelContext.locationPatterns, performanceResult.locationPatterns);

console.log("Hitter-relative full-grid location tests passed");
