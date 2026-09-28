/**
 * server/api-util/ageCheck.js
 * ---------------------------------------------------------------------------
 * RT-FB-03 / SAF-38 - "must be 18 or over", checked against a date of birth taken from a
 * Stripe-VERIFIED government ID (clients: Stripe Identity; models: Stripe Connect KYC).
 *
 * Pure and dependency-free, so it is trivially testable and shared by both sides.
 *
 * FAILS CLOSED: anything that is not a complete, valid, non-future date of birth showing
 * the person is 18 or over on today's UK calendar date is NOT adult. A missing or malformed
 * DOB is reported as `dob-unavailable` (never silently treated as adult).
 *
 * DATA MINIMISATION: callers hand a DOB in and get a status string back. The DOB must stay
 * in memory only - never persisted, never logged (log.error forwards its data to Sentry).
 * Only derived booleans (e.g. `age_verified_18plus`) are ever stored.
 *
 * UK DATE + LEAP-DAY RULE: "today" is the calendar date in Europe/London (so a birthday
 * starts at UK midnight, BST or GMT). Someone born on 29 February reaches a new age on
 * 1 March in a non-leap year (matches the Age of Legal Capacity (Scotland) Act 1991 s.6(2)
 * and the prevailing reading in England & Wales; it is also the conservative choice).
 * Because 18 is not a multiple of 4, a 29 February birthday's 18th anniversary is never
 * itself a leap year, so this rule always applies to them.
 */

const MINIMUM_AGE_YEARS = 18;
const UK_TIME_ZONE = 'Europe/London';
const EARLIEST_PLAUSIBLE_BIRTH_YEAR = 1900;

const AGE_STATUS_ADULT = 'adult';
const AGE_STATUS_UNDER_18 = 'under-18';
const AGE_STATUS_DOB_UNAVAILABLE = 'dob-unavailable';

/**
 * Today's calendar date in the UK (Europe/London), independent of the server's timezone.
 * @param {Date} [now] - the instant to evaluate (defaults to the current time)
 * @returns {{year: number, month: number, day: number}} month is 1-12
 */
const getUkDateParts = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const pick = type => Number(parts.find(p => p.type === type)?.value);
  return { year: pick('year'), month: pick('month'), day: pick('day') };
};

const compareDates = (a, b) => {
  if (a.year !== b.year) {
    return a.year - b.year;
  }
  if (a.month !== b.month) {
    return a.month - b.month;
  }
  return a.day - b.day;
};

/**
 * Validate a Stripe-shaped date of birth ({ day, month, year } integers, all nullable).
 * Returns a clean copy, or null when anything is missing, non-integer or not a real
 * calendar date (e.g. 31/02, or 29/02 in a non-leap year).
 *
 * @param {Object} dob
 * @returns {{year: number, month: number, day: number}|null}
 */
const normaliseDob = dob => {
  if (!dob || typeof dob !== 'object') {
    return null;
  }
  const { day, month, year } = dob;
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return null;
  }
  if (year < EARLIEST_PLAUSIBLE_BIRTH_YEAR || month < 1 || month > 12 || day < 1) {
    return null;
  }
  const asDate = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    asDate.getUTCFullYear() === year &&
    asDate.getUTCMonth() === month - 1 &&
    asDate.getUTCDate() === day;
  return isRealDate ? { year, month, day } : null;
};

/**
 * Whole years of age on a given calendar date. The birthday counts from its start, so the
 * person is 18 on their 18th birthday. A 29/02 birthday is reached on 01/03 in non-leap
 * years (see module header).
 *
 * @param {{year: number, month: number, day: number}} dob - a normalised DOB
 * @param {{year: number, month: number, day: number}} onDate - the date to evaluate on
 * @returns {number}
 */
const computeAgeOnDate = (dob, onDate) => {
  const hadBirthdayThisYear =
    onDate.month > dob.month || (onDate.month === dob.month && onDate.day >= dob.day);
  return onDate.year - dob.year - (hadBirthdayThisYear ? 0 : 1);
};

/**
 * The 18+ decision. FAILS CLOSED.
 *
 * @param {Object} dob - Stripe-shaped { day, month, year } (the verified DOB)
 * @param {Object} [options]
 * @param {Date} [options.now] - evaluation instant (defaults to now; injectable for tests)
 * @returns {'adult'|'under-18'|'dob-unavailable'}
 */
const evaluateDobAge = (dob, { now } = {}) => {
  const clean = normaliseDob(dob);
  if (!clean) {
    return AGE_STATUS_DOB_UNAVAILABLE;
  }
  const today = getUkDateParts(now || new Date());
  if (compareDates(clean, today) > 0) {
    // A DOB in the future is bad data, not a minor. Still not adult (fail closed).
    return AGE_STATUS_DOB_UNAVAILABLE;
  }
  return computeAgeOnDate(clean, today) >= MINIMUM_AGE_YEARS
    ? AGE_STATUS_ADULT
    : AGE_STATUS_UNDER_18;
};

/**
 * Convenience boolean: true ONLY for a valid DOB showing 18+ today (UK).
 * @param {Object} dob
 * @param {Object} [options] - { now }
 * @returns {boolean}
 */
const isAdultDob = (dob, options) => evaluateDobAge(dob, options) === AGE_STATUS_ADULT;

module.exports = {
  evaluateDobAge,
  isAdultDob,
  computeAgeOnDate,
  normaliseDob,
  getUkDateParts,
  MINIMUM_AGE_YEARS,
  AGE_STATUS_ADULT,
  AGE_STATUS_UNDER_18,
  AGE_STATUS_DOB_UNAVAILABLE,
};
