(function () {
  const client = hittingLogAIClient;

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  const topLevel = client.extractOutputText({ output_text: "  OK  " });
  assert(topLevel === "OK", "top-level Responses API output_text was not parsed");

  const nested = client.extractOutputText({
    output: [
      { type: "reasoning", content: [] },
      {
        type: "message",
        content: [
          { type: "output_text", text: "First" },
          { type: "output_text", text: "Second" },
        ],
      },
    ],
  });
  assert(nested === "First\nSecond", "nested Responses API output text was not parsed");

  const request = client.buildResponseRequest({
    instructions: "Test instructions",
    input: "Reply with OK.",
    maxOutputTokens: 64,
    reasoning: { effort: "low" },
    userId: "user-123",
    text: { verbosity: "low" },
  });
  assert(request.model === "gpt-5-mini", "default model is incorrect");
  assert(request.input === "Reply with OK.", "Responses API input is incorrect");
  assert(request.max_output_tokens === 64, "Responses API max_output_tokens is incorrect");
  assert(request.reasoning.effort === "low", "Responses API reasoning effort is incorrect");
  assert(request.store === false, "Responses API store setting is incorrect");
  assert(request.instructions === "Test instructions", "Responses API instructions are missing");
  assert(request.safety_identifier === "user-123", "safety_identifier is incorrect");
  assert(request.text.verbosity === "low", "Responses API text verbosity is incorrect");

  const compactCoachingContext = client.buildModelContext({
    type: "performance_analysis",
    responseMode: "coaching",
    intent: "training_recommendation",
    sampleDescription: "last five games",
    plateAppearances: 20,
    gamesIncluded: 5,
    statistics: { battingAverage: ".300" },
    coachingDiagnostic: { priority: "decision", adjustment: "Attack strikes early.", indicator: { key: "chases", count: 4, recommendation: "duplicate advice" } },
    negativeIndicators: Array.from({ length: 20 }, function (_, index) { return { key: `unused-${index}` }; }),
    positiveIndicators: Array.from({ length: 20 }, function (_, index) { return { key: `unused-positive-${index}` }; }),
    outcomeDistribution: Array.from({ length: 20 }, function (_, index) { return { key: `unused-outcome-${index}` }; }),
    sampleSizeWarnings: [],
  });
  assert(compactCoachingContext.coachingDiagnostic.priority === "decision", "compact context omitted the coaching decision");
  assert(!compactCoachingContext.coachingDiagnostic.indicator.recommendation, "compact context retained duplicate recommendation text");
  assert(!compactCoachingContext.negativeIndicators, "compact coaching context retained the full negative-indicator list");
  assert(!compactCoachingContext.positiveIndicators, "compact coaching context retained the full positive-indicator list");
  assert(!compactCoachingContext.outcomeDistribution, "compact coaching context retained unrelated outcome data");

  print("OpenAI Hitting Log AI client tests passed");
})();
