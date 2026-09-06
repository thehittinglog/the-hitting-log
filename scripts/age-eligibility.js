(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.hittingLogAgeEligibility = api;
})(typeof window !== "undefined" ? window : null, function () {
  const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  function daysInMonth(year, month) {
    if (month === 2) return isLeapYear(year) ? 29 : 28;
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
  }

  function parseCalendarDate(value) {
    const candidate = String(value || "").trim();
    const match = candidate.match(DATE_PATTERN);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
    return { day, month, value: candidate, year };
  }

  function normalizeDateOfBirth(value) {
    return parseCalendarDate(value)?.value || null;
  }

  function referenceDateParts(referenceDate) {
    const calendarDate = parseCalendarDate(referenceDate);
    if (calendarDate) return calendarDate;
    const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    if (Number.isNaN(date.getTime())) return null;
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }

  function calculateAge(dateOfBirth, referenceDate = new Date()) {
    const birthDate = parseCalendarDate(dateOfBirth);
    const today = referenceDateParts(referenceDate);
    if (!birthDate || !today) return null;
    let age = today.year - birthDate.year;
    const beforeBirthday = today.month < birthDate.month
      || (today.month === birthDate.month && today.day < birthDate.day);
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
