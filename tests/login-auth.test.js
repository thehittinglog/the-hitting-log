"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const authSource = fs.readFileSync(require.resolve("../scripts/auth.js"), "utf8");
const appSource = fs.readFileSync(require.resolve("../app.js"), "utf8");
const loginHtml = fs.readFileSync(require.resolve("../login.html"), "utf8");

function loadAuthHelpers() {
  const context = {
    Date,
    console: { info() {}, error() {}, log() {} },
    window: { hittingLogSupabaseReady: Promise.resolve(null) },
  };
  vm.runInNewContext(authSource, context, { filename: "scripts/auth.js" });
  return context.window.hittingLogAuth;
}

function extractLoginInitializer() {
  const start = appSource.indexOf("function initLoginPage()");
  const end = appSource.indexOf("\nfunction initSignupPage()", start);
  assert.notEqual(start, -1, "login initializer was not found");
  assert.notEqual(end, -1, "login initializer boundary was not found");
  return appSource.slice(start, end);
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function createLoginHarness(logIn) {
  const listeners = new Map();
  const submitButton = { disabled: false, textContent: "Sign In" };
  const loginForm = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    querySelector(selector) { return selector === "button[type='submit']" ? submitButton : null; },
  };
  const emailInput = { value: "  PLAYER@EXAMPLE.COM " };
  const passwordInput = { value: " exact password " };
  const classes = new Set();
  const loginMessage = {
    textContent: "",
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
  };
  const users = [];
  const redirects = [];
  const failures = [];
  const context = {
    Date,
    document: {
      getElementById(id) {
        return {
          "login-form": loginForm,
          "login-email": emailInput,
          "login-password": passwordInput,
          "login-message": loginMessage,
        }[id] || null;
      },
    },
    window: { hittingLogAuth: { logIn } },
    normalizeEmail(email) { return email.trim().toLowerCase(); },
    reportLoginFailure(error, startedAt) {
      failures.push({ error, startedAt });
      return "classified failure";
    },
    setCurrentUser(user) { users.push(user); },
    redirectTo(path) { redirects.push(path); },
  };
  vm.runInNewContext(`${extractLoginInitializer()}\nthis.initLoginPage = initLoginPage;`, context, {
    filename: "app-login-handler.js",
  });
  context.initLoginPage();

  return {
    async submit() {
      return listeners.get("submit")({ preventDefault() {} });
    },
    emailInput,
    passwordInput,
    loginMessage,
    submitButton,
    users,
    redirects,
    failures,
  };
}

(async () => {
  const auth = loadAuthHelpers();
  const cases = [
    [{ code: "invalid_credentials", status: 400 }, "invalid_credentials", "Incorrect email or password."],
    [{ code: "email_not_confirmed", status: 400 }, "unverified_email", "Please verify your email address before signing in. Check your inbox for the verification link."],
    [{ code: "over_request_rate_limit", status: 429 }, "rate_limited", "Too many sign-in attempts. Please wait a few minutes and try again."],
    [{ name: "AuthRetryableFetchError", message: "Failed to fetch" }, "connection", "We couldn't connect to the authentication service. Check your connection and try again."],
    [{ code: "unexpected_failure", status: 503 }, "service", "Sign-in is temporarily unavailable. Please try again in a few minutes."],
  ];

  for (const [error, category, message] of cases) {
    assert.deepEqual(
      { ...auth.classifyLoginError(error) },
      { category, message },
    );
  }

  const diagnostic = { ...auth.createLoginFailureDiagnostic(
    { code: "OVER_REQUEST_RATE_LIMIT", status: 429, email: "must-not-log@example.com" },
    Date.parse("2026-10-08T20:00:00.000Z"),
    Date.parse("2026-10-08T20:00:01.250Z"),
  ) };
  assert.deepEqual(diagnostic, {
    category: "rate_limited",
    code: "over_request_rate_limit",
    httpStatus: 429,
    timestamp: "2026-10-08T20:00:01.250Z",
    requestDurationMs: 1250,
  });
  assert.equal(JSON.stringify(diagnostic).includes("must-not-log@example.com"), false);
  assert.deepEqual(Object.keys(diagnostic), [
    "category",
    "code",
    "httpStatus",
    "timestamp",
    "requestDurationMs",
  ]);

  const pendingLogin = deferred();
  const loginCalls = [];
  const duplicateHarness = createLoginHarness((credentials) => {
    loginCalls.push(credentials);
    return pendingLogin.promise;
  });
  const firstSubmission = duplicateHarness.submit();
  const secondSubmission = duplicateHarness.submit();
  assert.equal(loginCalls.length, 1, "concurrent submissions must produce one login request");
  assert.equal(loginCalls[0].email, "player@example.com");
  assert.equal(loginCalls[0].password, " exact password ", "passwords must be passed through unchanged");
  assert.equal(duplicateHarness.submitButton.disabled, true);
  pendingLogin.resolve({ data: { user: { id: "user-1", email: "player@example.com" } }, error: null });
  await Promise.all([firstSubmission, secondSubmission]);

  assert.equal(duplicateHarness.users.length, 1);
  assert.deepEqual(duplicateHarness.redirects, ["dashboard.html"]);
  assert.equal(duplicateHarness.loginMessage.textContent, "Login successful. Redirecting...");
  assert.equal(duplicateHarness.loginMessage.classList.contains("is-success"), true);
  assert.equal(duplicateHarness.failures.length, 0);
  assert.equal(duplicateHarness.submitButton.disabled, false);
  assert.equal(duplicateHarness.submitButton.textContent, "Sign In");

  assert.match(loginHtml, /id="login-email"[^>]*name="email"[^>]*autocomplete="email"/);
  assert.match(loginHtml, /id="login-password"[^>]*name="password"[^>]*autocomplete="current-password"/);

  console.log("Login authentication reliability tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
