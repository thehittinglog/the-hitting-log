(async function () {
  const client = hittingLogAIClient;

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  process.env.OPENAI_API_KEY = "test-api-key-that-must-never-be-logged";
  let capturedUrl = "";
  let capturedOptions = null;
  fetch = async function (url, options) {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async function () {
        return JSON.stringify({
          status: "completed",
          output: [{ type: "message", content: [{ type: "output_text", text: "OK" }] }],
        });
      },
    };
  };

  const answer = await client.explainCalculatedResult({ message: "Test", result: { type: "test" }, userId: "user-1" });
  const payload = JSON.parse(capturedOptions.body);
  assert(answer === "OK", "successful Responses API output was not returned");
  assert(capturedUrl === "https://api.openai.com/v1/responses", "Responses API endpoint is incorrect");
  assert(capturedOptions.headers.Authorization === `Bearer ${process.env.OPENAI_API_KEY}`, "authorization header is incorrect");
  assert(capturedOptions.headers["Content-Type"] === "application/json", "content type is incorrect");
  assert(payload.model === "gpt-5-mini", "production request model is incorrect");
  assert(payload.max_output_tokens === 300, "production max_output_tokens is incorrect");
  assert(payload.store === false, "production store setting is incorrect");
  assert(payload.text.verbosity === "low", "production text verbosity is incorrect");
  assert(Array.isArray(payload.input) && payload.input[0].role === "user", "production input format is incorrect");
  assert(typeof payload.instructions === "string" && payload.instructions.length > 0, "production instructions are missing");

  fetch = async function () {
    return {
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: async function () {
        return JSON.stringify({
          error: {
            type: "insufficient_quota",
            code: "insufficient_quota",
            message: `Quota unavailable; key ${process.env.OPENAI_API_KEY}`,
            param: null,
          },
        });
      },
    };
  };

  let failureLog = null;
  try {
    await client.runMinimalConnectionTest();
  } catch (error) {
    failureLog = client.getSafeOpenAIErrorLog(error);
  }
  assert(failureLog.httpStatus === 429, "OpenAI HTTP status was not preserved");
  assert(failureLog.openAIErrorType === "insufficient_quota", "OpenAI error type was not preserved");
  assert(failureLog.openAIErrorCode === "insufficient_quota", "OpenAI error code was not preserved");
  assert(failureLog.requestReachedOpenAI === true, "HTTP response was not marked as reaching OpenAI");
  assert(failureLog.model === "gpt-5-mini", "requested model was not logged");
  assert(JSON.stringify(failureLog).indexOf(process.env.OPENAI_API_KEY) === -1, "API key leaked into diagnostics");

  print("OpenAI Hitting Log AI async request tests passed");
})().catch(function (error) {
  print(`OpenAI Hitting Log AI async request tests failed: ${error.message}`);
  throw error;
});
