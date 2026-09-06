const assert = require("node:assert/strict");
const {
  calculateAge,
  getAccountEligibility,
  getAiEligibility,
  normalizeDateOfBirth,
} = require("../scripts/age-eligibility");

const today = new Date("2026-09-06T12:00:00Z");

assert.equal(normalizeDateOfBirth("1990-06-09"), "1990-06-09");
assert.equal(normalizeDateOfBirth("2010-09-06"), "2010-09-06");
assert.equal(normalizeDateOfBirth("06/09/1990"), null);
assert.equal(normalizeDateOfBirth("2010-02-30"), null);
assert.equal(normalizeDateOfBirth("1900-02-29"), null);
assert.equal(normalizeDateOfBirth("2000-02-29"), "2000-02-29");
assert.equal(calculateAge("1990-06-09", today), 36);
assert.equal(calculateAge("1990-12-09", today), 35);
assert.equal(calculateAge("2008-09-06", today), 18);
assert.equal(calculateAge("2008-09-07", today), 17);
assert.equal(calculateAge("2013-09-06", today), 13);
assert.equal(calculateAge("2013-09-07", today), 12);
assert.equal(calculateAge("1997-09-06", today), 29);
assert.equal(calculateAge("2026-09-07", today), null);
assert.equal(calculateAge("2000-02-29", new Date("2026-02-28T12:00:00Z")), 25);
assert.equal(calculateAge("2000-02-29", new Date("2026-03-01T12:00:00Z")), 26);
assert.equal(getAccountEligibility({ dateOfBirth: "2014-09-06" }, today).code, "account_age_restricted");
assert.equal(getAccountEligibility({ dateOfBirth: "2013-09-06" }, today).code, "guardian_permission_required");
assert.equal(getAccountEligibility({ dateOfBirth: "2009-09-06" }, today).code, "guardian_permission_required");
assert.equal(getAccountEligibility({ dateOfBirth: "2008-09-06" }, today).eligible, true);
assert.equal(getAccountEligibility({ dateOfBirth: "1990-06-09" }, today).eligible, true);
assert.equal(getAccountEligibility({ dateOfBirth: "1997-09-06" }, today).eligible, true);
assert.deepEqual(
  getAccountEligibility({
    dateOfBirth: "1997-09-06",
    guardianPermissionConfirmedAt: "2020-01-01T00:00:00Z",
  }, today),
  { eligible: true, code: "eligible", age: 29 },
);
assert.deepEqual(getAiEligibility({}, today), { eligible: false, code: "date_of_birth_required", age: null });
assert.equal(getAiEligibility({ dateOfBirth: "2015-01-01" }, today).code, "ai_age_restricted");
assert.equal(getAiEligibility({ dateOfBirth: "2010-01-01" }, today).code, "guardian_permission_required");
assert.deepEqual(
  getAiEligibility({ dateOfBirth: "2010-01-01", guardianPermissionConfirmedAt: "2026-09-06T00:00:00Z" }, today),
  { eligible: true, code: "eligible", age: 16 },
);
assert.equal(getAiEligibility({ dateOfBirth: "1990-01-01" }, today).eligible, true);

console.log("Age eligibility tests passed");
