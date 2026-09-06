const assert = require("node:assert/strict");
const { calculateAge, getAiEligibility, normalizeDateOfBirth } = require("../lib/age-eligibility");

const today = new Date("2026-09-06T12:00:00Z");

assert.equal(normalizeDateOfBirth("2010-09-06"), "2010-09-06");
assert.equal(normalizeDateOfBirth("2010-02-30"), null);
assert.equal(calculateAge("2008-09-06", today), 18);
assert.equal(calculateAge("2008-09-07", today), 17);
assert.deepEqual(getAiEligibility({}, today), { eligible: false, code: "date_of_birth_required", age: null });
assert.equal(getAiEligibility({ dateOfBirth: "2015-01-01" }, today).code, "ai_age_restricted");
assert.equal(getAiEligibility({ dateOfBirth: "2010-01-01" }, today).code, "guardian_permission_required");
assert.deepEqual(
  getAiEligibility({ dateOfBirth: "2010-01-01", guardianPermissionConfirmedAt: "2026-09-06T00:00:00Z" }, today),
  { eligible: true, code: "eligible", age: 16 },
);
assert.equal(getAiEligibility({ dateOfBirth: "1990-01-01" }, today).eligible, true);

console.log("Age eligibility tests passed");
