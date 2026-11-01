/**
 * Small, pure helpers for the booking calendar (B04).
 */

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
