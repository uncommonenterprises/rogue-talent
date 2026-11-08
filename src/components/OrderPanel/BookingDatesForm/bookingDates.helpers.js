/**
 * Small, pure helpers for the booking calendar (B04).
 */
import { parseDateFromISO8601 } from '../../../util/dates';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfLocalDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * "Wed 25 Nov" (UK order: weekday, day, month).
 *
 * @param {Object} intl react-intl
 * @param {Date} date
 * @returns {string}
 */
export const formatBookingDay = (intl, date) =>
  intl.formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * Number of full days in an inclusive range of calendar days. The end date counts as a full
 * day, so Wed 25 to Thu 26 Nov is 2 days and a single day is 1. Uses calendar days, so a
 * clock change in between does not change the count.
 *
 * @param {Date} startDate first day (local time)
 * @param {Date} endDate last day (local time, inclusive)
 * @returns {number}
 */
export const getInclusiveDayCount = (startDate, endDate) => {
  const start = startOfLocalDay(startDate);
  const end = startOfLocalDay(endDate);
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
};

/**
 * The first day in an inclusive range that cannot be booked, for the message "Ava isn't
 * available on Tue 17 Nov, so that range can't be booked." Returns null if every day is free.
 *
 * @param {Array<Date>} range [startDate, endDate] in local time (either order)
 * @param {Function} isUnavailable day => boolean
 * @returns {Date|null}
 */
export const findFirstUnavailableDay = (range, isUnavailable) => {
  if (!Array.isArray(range) || !range[0] || !range[1]) {
    return null;
  }
  const [a, b] = [startOfLocalDay(range[0]), startOfLocalDay(range[1])].sort((x, y) => x - y);
  for (let d = a; d <= b; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    if (isUnavailable(d)) {
      return d;
    }
  }
  return null;
};

/**
 * The booking form value for a date handed over from the profile's availability calendar
 * (B03b): that day as the START date, no end date yet, so the picker opens mid-range and the
 * client taps an end day (or the same day again for a single day). The value is in the form's
 * own format: the start of the day in the listing's time zone, the same as a picker click.
 *
 * @param {string} dayKey calendar day in the listing's time zone, e.g. '2026-11-24'
 * @param {string} timeZone listing time zone
 * @returns {{ startDate: Date, endDate: null }|null} null for an invalid day key
 */
export const getPickedStartFormValue = (dayKey, timeZone) => {
  if (typeof dayKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || !timeZone) {
    return null;
  }
  const startDate = parseDateFromISO8601(dayKey, timeZone);
  return isNaN(startDate) ? null : { startDate, endDate: null };
};
