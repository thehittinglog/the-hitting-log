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
  assert(payload.max_output_tokens === 1600, "production max_output_tokens is incorrect");
  assert(payload.reasoning.effort === "low", "production reasoning effort is incorrect");
  assert(payload.store === false, "production store setting is incorrect");
  assert(payload.text.verbosity === "low", "production text verbosity is incorrect");
  assert(Array.isArray(payload.input) && payload.input[0].role === "user", "production input format is incorrect");
  assert(typeof payload.instructions === "string" && payload.instructions.length > 0, "production instructions are missing");
  assert(payload.instructions.indexOf("2–5 short paragraphs") !== -1, "concise response guidance is missing");
  assert(payload.instructions.indexOf("Lead with the conclusion") !== -1, "conclusion-first guidance is missing");
  assert(payload.instructions.indexOf("do not manufacture a weakness") !== -1, "no-forced-weakness guidance is missing");

  const incompleteWarnings = [];
  const originalWarn = console.warn;
  console.warn = function (label, details) {
    incompleteWarnings.push(`${label} ${details}`);
  };
  const retryPayloads = [];
  fetch = async function (url, options) {
    retryPayloads.push(JSON.parse(options.body));
    const isRetry = retryPayloads.length === 2;
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async function () {
        if (isRetry) {
          return JSON.stringify({
            status: "completed",
            output: [{ type: "message", content: [{ type: "output_text", text: "Complete coaching response." }] }],
          });
        }
        return JSON.stringify({
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "Use the available partial coaching response." }],
            },
          ],
        });
      },
    };
  };

  const partialAnswer = await client.explainCalculatedResult({
    message: "Test partial",
    result: { type: "test" },
    userId: "user-1",
  });
  assert(partialAnswer === "Complete coaching response.", "incomplete partial output was shown instead of the completed retry");
  assert(retryPayloads.length === 2, "incomplete response did not retry exactly once");
  assert(retryPayloads[0].max_output_tokens === 1600, "initial retry test used the wrong token limit");
  assert(retryPayloads[1].max_output_tokens === 2400, "retry did not use additional token headroom");
  assert(
    incompleteWarnings.some(function (entry) {
      return entry.indexOf("OPENAI_MAX_OUTPUT_TOKENS_REACHED") !== -1;
    }),
    "incomplete response retry was not clearly logged"
  );

  let exhaustedAttempts = 0;
  fetch = async function () {
    exhaustedAttempts += 1;
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async function () {
        return JSON.stringify({
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
          output: [{ type: "reasoning", content: [] }],
        });
      },
    };
  };

  let incompleteError = null;
  try {
    await client.explainCalculatedResult({ message: "Test empty partial", result: { type: "test" }, userId: "user-1" });
  } catch (error) {
    incompleteError = error;
  }
  console.warn = originalWarn;
  assert(incompleteError?.code === "OPENAI_MAX_OUTPUT_TOKENS_REACHED", "empty incomplete response used the wrong error code");
  assert(exhaustedAttempts === 2, "incomplete response exceeded the one-retry limit");
  const incompleteLog = client.getSafeOpenAIErrorLog(incompleteError);
  assert(incompleteLog.httpStatus === 200, "incomplete response HTTP status was not preserved");
  assert(incompleteLog.responseStatus === "incomplete", "incomplete response status was not preserved");
  assert(incompleteLog.incompleteReason === "max_output_tokens", "incomplete reason was not preserved");

  fetch = async function () {
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async function () {
        return JSON.stringify({ status: "completed", output: [] });
      },
    };
  };

  let emptyResponseError = null;
  try {
    await client.explainCalculatedResult({ message: "Test empty response", result: { type: "test" }, userId: "user-1" });
  } catch (error) {
    emptyResponseError = error;
  }
  assert(emptyResponseError?.code === "OPENAI_EMPTY_RESPONSE", "truly empty completed response used the wrong error code");

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
