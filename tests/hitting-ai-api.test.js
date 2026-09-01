(function () {
  const api = hittingLogAIApi._test;

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  const missingVelocity = api.directAnswer({
    type: "missing_data",
    field: "pitch velocity",
    reason: "insufficient_velocity_data",
  });
  assert(missingVelocity.includes("enough recorded pitch-velocity data"), "missing velocity did not return a specific response");

  const directVelocity = api.directAnswer({
    type: "ranking",
    formattedAnswer: "Among meaningful samples: 60–64 mph",
  });
  assert(directVelocity.includes("60–64 mph"), "calculated velocity result still depended on OpenAI");

  const coachingFallback = api.modelFailureAnswer({
    type: "performance_analysis",
    formattedAnswer: "Your biggest area for improvement is contact quality. 6 of 9 balls in play were not hard-hit.",
  });
  assert(coachingFallback.startsWith("Your biggest area for improvement"), "model failure did not return coaching insight first");
  assert(coachingFallback.includes("6 of 9"), "model failure coaching fallback omitted supporting data");

  print("Hitting Log AI API fallback tests passed");
})();
