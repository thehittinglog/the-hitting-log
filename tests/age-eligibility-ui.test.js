const assert = require("node:assert/strict");
const fs = require("node:fs");

const appSource = fs.readFileSync(require.resolve("../app.js"), "utf8");
const accountHtml = fs.readFileSync(require.resolve("../account.html"), "utf8");
const signupHtml = fs.readFileSync(require.resolve("../signup.html"), "utf8");
const styles = fs.readFileSync(require.resolve("../style.css"), "utf8");

const permissionCopy = "I have permission from my parent or legal guardian to use The Hitting Log.";

assert.match(accountHtml, new RegExp(permissionCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(signupHtml, new RegExp(permissionCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.equal((appSource.match(/age >= 13 && age < 18/g) || []).length, 3);
assert.equal((appSource.match(/Account owners must be 13 years of age or older\./g) || []).length, 4);
assert.equal((appSource.match(/if \(!requiresConfirmation\) guardianPermissionInput\.checked = false;/g) || []).length, 2);
assert.match(appSource, /accountEligibility\?\.code === "account_age_restricted" && page !== "account"/);
assert.match(appSource, /redirectTo\("account\.html#profile-date-of-birth-input"\)/);
assert.match(styles, /\.checkbox-label\.age-guardian-confirmation\[hidden\]\s*\{\s*display:\s*none;/);
assert.doesNotMatch(styles, /(^|,\s*\n)\.age-guardian-confirmation\[hidden\]\s*\{/m);

console.log("Age eligibility UI regression tests passed");
