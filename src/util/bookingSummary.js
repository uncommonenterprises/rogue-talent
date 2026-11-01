/**
 * Booking summary helpers for checkout (B06) and the booking page (B07): the dates as people read
 * them, and the real reply-by deadline. Pure functions.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// booking-v2 (default-booking v3 on test): a request expires at the EARLIER of 48 hours after the
// payment authorisation (first entering state/preauthorized) and the start of the booking.
// ext/transaction-processes/booking-v2/process.edn, transition/expire.
export const REPLY_WINDOW_HOURS = 48;
const TRANSITION_CONFIRM_PAYMENT = 'transition/confirm-payment';
const TRANSITION_REQUEST_PAYMENT = 'transition/request-payment';

const isDate = d => d instanceof Date && !isNaN(d);

/**
 * Format a day in the listing's time zone: "Wed 25 Nov".
 *
 * @param {Object} intl react-intl
 * @param {Date} date
 * @param {string} [timeZone] IANA time zone (the listing's)
 * @returns {string}
 */
export const formatDay = (intl, date, timeZone) =>
  intl.formatDate(date, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(timeZone ? { timeZone } : {}),
  });

/**
 * Format a day and time in the listing's time zone: "Tue 3 Nov, 16:20".
 *
 * @param {Object} intl react-intl
 * @param {Date} date
 * @param {string} [timeZone] IANA time zone
 * @returns {string}
 */
export const formatDayTime = (intl, date, timeZone) => {
  const day = formatDay(intl, date, timeZone);
  const time = intl.formatDate(date, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(timeZone ? { timeZone } : {}),
  });
  return `${day}, ${time}`;
};

/**
 * Daily booking range as shown to people: the last booked day (the API's end is exclusive) and
 * the number of full days.
 *
 * @param {Date} start booking start
 * @param {Date} endExclusive booking end as stored (exclusive, daily bookings)
 * @returns {{ start: Date, lastDay: Date, dayCount: number }|null}
 */
export const getDailyRange = (start, endExclusive) => {
  if (!isDate(start) || !isDate(endExclusive)) {
    return null;
  }
  const dayCount = Math.max(1, Math.round((endExclusive.getTime() - start.getTime()) / DAY_MS));
  return { start, lastDay: new Date(endExclusive.getTime() - DAY_MS), dayCount };
};

/**
 * When the payment was authorised (the request reached the model).
 *
 * @param {Object} transaction transaction entity
 * @returns {Date|null}
 */
export const getRequestSentAt = transaction => {
  const transitions = transaction?.attributes?.transitions || [];
  const confirm = transitions.find(t => t.transition === TRANSITION_CONFIRM_PAYMENT);
  const request = transitions.find(t => t.transition === TRANSITION_REQUEST_PAYMENT);
  const at = (confirm || request)?.createdAt;
  return isDate(at) ? at : null;
};

/**
 * The real reply-by deadline: the earlier of 48 hours after the request reached the model and
 * the start of the booking.
 *
 * @param {Object} transaction transaction entity (with booking)
 * @returns {{ deadline: Date, kind: 'window'|'shootStart' }|null}
 */
export const getReplyByDeadline = transaction => {
  const sentAt = getRequestSentAt(transaction);
  if (!sentAt) {
    return null;
  }
  const windowEnd = new Date(sentAt.getTime() + REPLY_WINDOW_HOURS * HOUR_MS);
  const bookingStart = transaction?.booking?.attributes?.start;
  if (isDate(bookingStart) && bookingStart.getTime() < windowEnd.getTime()) {
    return { deadline: bookingStart, kind: 'shootStart' };
  }
  return { deadline: windowEnd, kind: 'window' };
};
