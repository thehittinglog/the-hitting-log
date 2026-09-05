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
  assert.match(answer, /gather early and slow/i, prompt);
  assert.doesNotMatch(answer, /start (?:the |your )?load later|load faster/i, prompt);
}

const slowTiming = stats.analyzeQuestion({ message: "I'm early on slow pitching. What should I do?", games });
assert.match(stats.formatDeterministicAnswer(slowTiming), /move develop longer.*front foot lands somewhat after/is);
assert.doesNotMatch(stats.formatDeterministicAnswer(slowTiming), /start (?:the |your )?load later|load faster/i);

const fastTiming = stats.analyzeQuestion({ message: "I'm late against faster pitching. What should I do?", games });
assert.match(stats.formatDeterministicAnswer(fastTiming), /front foot down somewhat before.*halfway home/is);
assert.doesNotMatch(stats.formatDeterministicAnswer(fastTiming), /start (?:the |your )?load later|load faster/i);

const unnamedComparison = stats.analyzeQuestion({ message: "Compare my last game versus the previous game.", games: [games[0], { ...games[0], id: "metric-game-2", date: "2026-09-04" }] });
assert.equal(unnamedComparison.type, "missing_data");
assert.equal(unnamedComparison.field, "the specific metric to compare");

Object.entries(stats.METRIC_KNOWLEDGE).forEach(([key, metric]) => {
  assert.ok(metric.definition, `${key} needs a definition`);
  assert.ok(metric.formula, `${key} needs a formula`);
  assert.ok(metric.desirability, `${key} needs desirability guidance`);
  assert.ok(metric.improvement, `${key} needs improvement guidance`);
});

const forbiddenSummary = /AVG:|Hits:|At-bats:|\bOBP:|\bSLG:/i;
const forbiddenMechanics = /keep your hands inside|use your lower half|stay through the ball|rotate harder|change your bat path|change your launch angle|keep your back shoulder up|shorten your swing|squish the bug/i;
const instructionalPrompts = [
  "how do I get better timing?",
  "how can I improve my timing?",
  "I'm late a lot, what do I do?",
  "I'm always early",
  "how do I adjust to slow pitching?",
  "how do I time up a faster pitcher?",
  "what does on time mean?",
  "what is timing quality?",
  "why am I late?",
  "how do I lower my chase rate?",
  "why is my chase rate bad?",
  "what does chase rate mean?",
  "how do I swing at better pitches?",
  "how do I improve my hard hit percentage?",
  "why am I making weak contact?",
  "how do I make better contact?",
  "how do I lower my two strike percentage?",
  "why do I keep getting to two strikes?",
  "how do I get better with two strikes?",
  "how do I improve my performance score?",
  "what is hurting my performance score?",
  "what does my performance score mean?",
];

instructionalPrompts.forEach((prompt) => {
  const result = stats.analyzeQuestion({ message: prompt, games });
  const answer = stats.formatDeterministicAnswer(result);
  assert.ok(answer, `${prompt} produced no answer`);
  assert.doesNotMatch(answer, forbiddenSummary, `${prompt} fell back to traditional stats`);
  assert.doesNotMatch(answer, forbiddenMechanics, `${prompt} produced unsupported mechanical coaching`);
});

const timingInstruction = stats.analyzeQuestion({ message: "how do I get better timing?", games });
assert.equal(stats.classifyQuestionAction("how do I get better timing?"), "metric_improvement");
assert.equal(timingInstruction.type, "instructional_guidance");
assert.equal(timingInstruction.topic, "timing");
const timingInstructionAnswer = stats.formatDeterministicAnswer(timingInstruction);
assert.match(timingInstructionAnswer, /gather early and slow/i);
assert.match(timingInstructionAnswer, /front foot/i);
assert.match(timingInstructionAnswer, /comfortable speed.*halfway home/is);
assert.match(timingInstructionAnswer, /faster pitching.*before halfway/is);
assert.match(timingInstructionAnswer, /slower pitching.*after halfway/is);
assert.match(timingInstructionAnswer, /20\.0% early, 60\.0% on time, and 20\.0% late/i);
assert.doesNotMatch(timingInstructionAnswer, /start (?:the |your )?(?:load|gather) later|load faster/i);
assert.doesNotMatch(timingInstructionAnswer, forbiddenSummary);
assert.doesNotMatch(timingInstructionAnswer, forbiddenMechanics);

const gamesWithoutTiming = [{
  ...games[0],
  atBats: games[0].atBats.map(({ timing, ...atBat }) => atBat),
}];
const noTimingInstruction = stats.analyzeQuestion({ message: "how do I get better timing?", games: gamesWithoutTiming });
const noTimingAnswer = stats.formatDeterministicAnswer(noTimingInstruction);
assert.match(noTimingAnswer, /gather early and slow/i);
assert.match(noTimingAnswer, /front foot/i);
assert.match(noTimingAnswer, /don't have enough recorded timing data/i);
assert.doesNotMatch(noTimingAnswer, forbiddenSummary);

const noDataTiming = stats.analyzeQuestion({ message: "how do I get better timing?", games: [] });
assert.equal(noDataTiming.type, "instructional_guidance");
assert.match(stats.formatDeterministicAnswer(noDataTiming), /gather early and slow/i);

for (const prompt of ["how do I lower my chase rate?", "how do I improve my hard hit percentage?"]) {
  const noDataMetricAnswer = stats.formatDeterministicAnswer(stats.analyzeQuestion({ message: prompt, games: [] }));
  assert.ok(noDataMetricAnswer, `${prompt} with no data produced no guidance`);
  assert.doesNotMatch(noDataMetricAnswer, forbiddenSummary, `${prompt} with no data fell back to traditional stats`);
}

const chaseDefinition = stats.formatDeterministicAnswer(stats.analyzeQuestion({ message: "what is chase rate?", games }));
assert.match(chaseDefinition, /out-of-zone pitches/i);
assert.match(chaseDefinition, /lower is generally better/i);

const twoStrikeInterpretation = stats.analyzeQuestion({ message: "what should my two-strike percentage be telling me?", games });
assert.equal(twoStrikeInterpretation.type, "metric_guidance");
assert.equal(twoStrikeInterpretation.requestMode, "interpretation");
assert.doesNotMatch(stats.formatDeterministicAnswer(twoStrikeInterpretation), forbiddenSummary);

console.log("Hitting Log AI metric knowledge tests passed");
