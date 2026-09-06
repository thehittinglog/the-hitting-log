(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.hittingLogAgeEligibility = api;
})(typeof window !== "undefined" ? window : null, function () {
  const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

  function normalizeDateOfBirth(value) {
    const candidate = String(value || "").trim();
    const match = candidate.match(DATE_PATTERN);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year
      || date.getUTCMonth() !== month - 1
      || date.getUTCDate() !== day
    ) return null;
    return candidate;
  }

  function calculateAge(dateOfBirth, referenceDate = new Date()) {
    const normalized = normalizeDateOfBirth(dateOfBirth);
    const today = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    if (!normalized || Number.isNaN(today.getTime())) return null;
    const [year, month, day] = normalized.split("-").map(Number);
    let age = today.getUTCFullYear() - year;
    const beforeBirthday = today.getUTCMonth() + 1 < month
      || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day);
    if (beforeBirthday) age -= 1;
    return age >= 0 ? age : null;
  }

  function getAccountEligibility({ dateOfBirth, guardianPermissionConfirmedAt } = {}, referenceDate = new Date()) {
    const age = calculateAge(dateOfBirth, referenceDate);
    if (age === null) return { eligible: false, code: "date_of_birth_required", age: null };
    if (age < 13) return { eligible: false, code: "account_age_restricted", age };
    if (age < 18 && !guardianPermissionConfirmedAt) {
      return { eligible: false, code: "guardian_permission_required", age };
    }
    return { eligible: true, code: "eligible", age };
  }

  function getAiEligibility(profile = {}, referenceDate = new Date()) {
    const eligibility = getAccountEligibility(profile, referenceDate);
    if (eligibility.code === "account_age_restricted") {
      return { ...eligibility, code: "ai_age_restricted" };
    }
    return eligibility;
  }

  return { calculateAge, getAccountEligibility, getAiEligibility, normalizeDateOfBirth };
});
