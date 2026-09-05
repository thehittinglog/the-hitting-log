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

  const directStat = api.directAnswer({
    type: "stat_lookup",
    formattedAnswer: "Your batting average in August 2026 was .342.",
  });
  assert(directStat === "Your batting average in August 2026 was .342.", "simple stat lookup still depended on OpenAI");

  const directFormula = api.directAnswer({
    type: "formula",
    formattedAnswer: "Batting average is calculated as hits divided by official at-bats.",
  });
  assert(directFormula.includes("hits divided by official at-bats"), "formula request still depended on OpenAI");

  const protectedHlp = api.directAnswer({
    type: "hlp_proprietary",
    answer: "The HLP Score is proprietary and its formula is not publicly disclosed.",
  });
  assert(protectedHlp.includes("proprietary"), "HLP non-disclosure did not bypass the model");

  const coachingFallback = api.modelFailureAnswer({
    type: "performance_analysis",
    formattedAnswer: "Your biggest area for improvement is contact quality. 6 of 9 balls in play were not hard-hit.",
  });
  assert(coachingFallback.startsWith("Your biggest area for improvement"), "model failure did not return coaching insight first");
  assert(coachingFallback.includes("6 of 9"), "model failure coaching fallback omitted supporting data");

  print("Hitting Log AI API fallback tests passed");
})();
