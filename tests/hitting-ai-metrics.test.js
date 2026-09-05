const assert = require("node:assert/strict");
const stats = require("../lib/hitting-ai-stats");

function plateAppearance(index) {
  const reachesTwoStrikes = index < 4;
  return {
    outcome: "single",
    hardHitBall: index < 5,
    timing: index < 2 ? "late" : index < 4 ? "early" : "on_time",
    pitches: [
      ...(reachesTwoStrikes ? [
        { result: "called_strike", location: { id: "zone-5", isZone: true } },
        { result: "foul_ball", location: { id: "zone-5", isZone: true } },
      ] : []),
      { result: "batted_ball", battedBallType: "line_drive", location: { id: "zone-5", isZone: true } },
    ],
  };
}

const games = [{
  id: "metric-game",
  date: "2026-09-05",
  opponent: "Metric Test",
  atBats: Array.from({ length: 10 }, (_, index) => plateAppearance(index)),
}];

const twoStrike = stats.analyzeQuestion({ message: "What is my two-strike percentage?", games });
assert.equal(twoStrike.type, "stat_lookup");
assert.equal(twoStrike.metricKey, "twoStrikePercentage");
assert.equal(twoStrike.value, "40.0%");
const twoStrikeAnswer = stats.formatDeterministicAnswer(twoStrike);
assert.match(twoStrikeAnswer, /^Your two-strike percentage is 40\.0%\./);
assert.doesNotMatch(twoStrikeAnswer, /batting average|AVG:|OPS/i);

const twoStrikeFormula = stats.analyzeQuestion({ message: "How is my two-strike percentage calculated?", games: [] });
assert.equal(twoStrikeFormula.type, "formula");
assert.equal(twoStrikeFormula.metricKey, "twoStrikePercentage");
assert.match(stats.formatDeterministicAnswer(twoStrikeFormula), /plate appearances that reached two strikes divided by recorded plate appearances × 100/i);

for (const prompt of ["How can I lower my two-strike percentage?", "Why is my two-strike percentage so high?"]) {
  const result = stats.analyzeQuestion({ message: prompt, games });
  assert.equal(result.type, "metric_guidance", prompt);
  assert.equal(result.metricKey, "twoStrikePercentage", prompt);
  const answer = stats.formatDeterministicAnswer(result);
  assert.match(answer, /two-strike percentage is 40\.0%/i, prompt);
  assert.doesNotMatch(answer, /batting average|AVG:|OPS/i, prompt);
}

const performanceScore = stats.analyzeQuestion({ message: "What is my Hitting Log Performance Score?", games });
assert.equal(performanceScore.type, "stat_lookup");
assert.equal(performanceScore.metricKey, "performanceScore");
assert.equal(performanceScore.value, "72/100");
assert.match(stats.formatDeterministicAnswer(performanceScore), /72\/100/);

const performanceFormula = stats.analyzeQuestion({ message: "How is my Hitting Log Performance Score calculated?", games: [] });
assert.equal(performanceFormula.type, "formula");
assert.match(performanceFormula.formula, /45% Hard Hit Ball %/);
assert.match(performanceFormula.formula, /remaining weights are proportionally rebalanced/);

const improveScore = stats.analyzeQuestion({ message: "How do I improve my Performance Score?", games });
assert.equal(improveScore.type, "metric_guidance");
assert.equal(improveScore.metricKey, "performanceScore");
assert.ok(improveScore.performanceComponents.length >= 3);
assert.match(stats.formatDeterministicAnswer(improveScore), /biggest calculated opportunity/i);

const contactQuality = stats.analyzeQuestion({ message: "Why is my contact quality bad?", games });
assert.equal(contactQuality.type, "metric_guidance");
assert.equal(contactQuality.metricKey, "hardHitPercentage");
assert.doesNotMatch(stats.formatDeterministicAnswer(contactQuality), /change your (?:hands|stance|swing path|hips|posture)/i);

const generalCoaching = stats.analyzeQuestion({ message: "What should I work on?", games });
assert.equal(generalCoaching.type, "performance_analysis");
assert.deepEqual(generalCoaching.coachingDiagnostic.framework, [
  "Did I swing at a strike?",
  "Was I on time?",
  "Did I hit the right part of the ball?",
]);

for (const prompt of ["How can I improve my timing?", "I'm always late. What should I do?"]) {
  const result = stats.analyzeQuestion({ message: prompt, games });
  const answer = stats.formatDeterministicAnswer(result);
  assert.match(answer, /load slow and early/i, prompt);
  assert.doesNotMatch(answer, /start (?:the |your )?load later|load faster/i, prompt);
}

const slowTiming = stats.analyzeQuestion({ message: "I'm early on slow pitching. What should I do?", games });
assert.match(stats.formatDeterministicAnswer(slowTiming), /stride develop longer.*lands later/is);
assert.doesNotMatch(stats.formatDeterministicAnswer(slowTiming), /start (?:the |your )?load later|load faster/i);

const fastTiming = stats.analyzeQuestion({ message: "I'm late against faster pitching. What should I do?", games });
assert.match(stats.formatDeterministicAnswer(fastTiming), /stride foot down slightly sooner.*before.*halfway-home/is);
assert.doesNotMatch(stats.formatDeterministicAnswer(fastTiming), /start (?:the |your )?load later|load faster/i);

const unnamedComparison = stats.analyzeQuestion({ message: "Compare my last game versus the previous game.", games: [games[0], { ...games[0], id: "metric-game-2", date: "2026-09-04" }] });
assert.equal(unnamedComparison.type, "missing_data");
assert.equal(unnamedComparison.field, "the specific metric to compare");

Object.entries(stats.METRIC_KNOWLEDGE).forEach(([key, metric]) => {
  assert.ok(metric.definition, `${key} needs a definition`);
  assert.ok(metric.formula, `${key} needs a formula`);
  assert.ok(metric.desirability, `${key} needs desirability guidance`);
});

console.log("Hitting Log AI metric knowledge tests passed");
