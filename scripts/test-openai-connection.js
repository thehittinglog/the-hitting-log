const { getSafeOpenAIErrorLog, runMinimalConnectionTest } = require("../lib/openai-hitting-client");

runMinimalConnectionTest()
  .then((result) => {
    console.log("OpenAI minimal connection test passed:", {
      connected: true,
      httpStatus: result.httpStatus,
      model: result.model,
      outputTextPresent: Boolean(result.answer),
    });
  })
  .catch((error) => {
    console.error("OpenAI minimal connection test failed:", getSafeOpenAIErrorLog(error));
    process.exitCode = 1;
  });
