/**
 * server/api-util/workingDays.js
 * ---------------------------------------------------------------------------
 * Review queue age marker (Neil, 07/11/2026: "amber after 1 working day"; PM call: weekends only
 * for v1, bank holidays later). A queue row turns amber once it has waited MORE than one working
 * day, counting only time that falls on Monday to Friday in UK time (Europe/London). So something
 * submitted on Friday evening is not amber on Saturday or Sunday, and turns amber on Monday at
 * the same time of day it was submitted on Friday (plus the hours already counted on Friday).
 *
 * One working day = 24 hours of weekday time (not office hours). Submitted Monday 10:00 = amber
 * from Tuesday 10:00. Submitted Saturday = the clock starts at 00:00 on Monday.
 *
 * HOW: walk the interval in segments that end on whole UTC hours. UK offsets are whole hours
 * (GMT / BST), so a UK day boundary is always a whole UTC hour and each segment lies inside one
 * UK calendar day; its weekday is read once with Intl. The walk stops as soon as the cap is
 * passed, so the amber check costs at most a few dozen steps per row.
 */

const UK_TIME_ZONE = 'Europe/London';
const HOUR_MS = 60 * 60 * 1000;
const WORKING_DAY_MS = 24 * HOUR_MS;
// Safety bound for an uncapped walk (about a year of hours).
const MAX_STEPS = 24 * 400;

const weekdayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: UK_TIME_ZONE,
  weekday: 'short',
});

/**
 * Is this instant on a Saturday or Sunday in UK time?
 * @param {Date} date
 * @returns {boolean}
 */
const isUkWeekend = date => {
  const day = weekdayFormatter.format(date);
  return day === 'Sat' || day === 'Sun';
};

const toDate = value => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

/**
 * Milliseconds between two instants that fall on UK weekdays.
 *
 * @param {Date|string|number} start
 * @param {Date|string|number} end
 * @param {Object} [options]
 * @param {number} [options.capMs] - stop counting once this much working time is found (the
 *   result is then just above the cap)
 * @returns {number} working milliseconds (0 when end is not after start or a date is invalid)
 */
const workingMsBetween = (start, end, { capMs = Infinity } = {}) => {
  const from = toDate(start);
  const to = toDate(end);
  if (!from || !to || to <= from) {
    return 0;
  }
  let total = 0;
  let cursor = from.getTime();
  const stop = to.getTime();
  let steps = 0;
  while (cursor < stop && total <= capMs && steps < MAX_STEPS) {
    const nextHour = (Math.floor(cursor / HOUR_MS) + 1) * HOUR_MS;
    const segmentEnd = Math.min(nextHour, stop);
    if (!isUkWeekend(new Date(cursor))) {
      total += segmentEnd - cursor;
    }
    cursor = segmentEnd;
    steps += 1;
  }
  return total;
};

/**
 * Has this item waited more than `workingDays` working days? Drives the amber "ago" text.
 *
 * @param {Date|string|number} submittedAt
 * @param {Date|string|number} [now]
 * @param {number} [workingDays] - default 1 (Neil, 07/11/2026)
 * @returns {boolean} false when the date is missing or invalid
 */
const isOverdue = (submittedAt, now = new Date(), workingDays = 1) => {
  const thresholdMs = workingDays * WORKING_DAY_MS;
  return workingMsBetween(submittedAt, now, { capMs: thresholdMs }) > thresholdMs;
};

module.exports = {
  UK_TIME_ZONE,
  WORKING_DAY_MS,
  isUkWeekend,
  workingMsBetween,
  isOverdue,
};
