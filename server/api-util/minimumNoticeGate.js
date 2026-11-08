/**
 * server/api-util/minimumNoticeGate.js
 * ---------------------------------------------------------------------------
 * Server-side minimum-notice check for booking requests (F8 follow-up, approved by the PM
 * 08/11/2026 under Neil's open question 12 decision: notice is "enforced in the picker, still
 * decided by the model"). The browser already blocks these dates (profile calendar + date
 * picker); this stops a request that skips the browser.
 *
 * THE RULE mirrors src/util/modelProfile.js isDayInsideNoticeWindow exactly, and both are
 * pinned to the same cases (src/util/minimumNotice.cases.json, used by both test suites):
 *   - take the START OF THE BOOKING'S FIRST DAY in the listing's time zone;
 *   - it is refused if that day is today or earlier (in the listing's time zone);
 *   - it is refused if it starts less than the model's min_booking_notice from now.
 * The client code is an ES module bundled by webpack and this is plain Node CommonJS, so the
 * rule is mirrored rather than imported; MIN_NOTICE_HOURS must match the client's table.
 *
 * Applies to daily (and nightly) bookings, the units that use the date picker. Runs for both
 * speculative and real calls, so the checkout can explain the problem before payment.
 * FAIL-SAFE: a missing listing, or a missing time zone on a listing that needs the check,
 * refuses the request (generic "not available") rather than letting it through.
 * No transaction-process change: it runs inside the existing booking gate sequence
 * (api-util/bookingGates.js), before any trusted SDK call.
 */

const moment = require('moment-timezone');
const log = require('../log');

// Must match src/util/modelProfile.js MIN_NOTICE_HOURS.
const MIN_NOTICE_HOURS = {
  'same-day': 0,
  '24-hours': 24,
  '48-hours': 48,
  '1-week': 168,
  '2-weeks': 336,
};

const HOUR_MS = 60 * 60 * 1000;
const NOTICE_UNIT_TYPES = ['day', 'night'];

// Client-detectable error codes (src/util/errors.js + CheckoutPage/ErrorMessages.js).
const BOOKING_INSIDE_NOTICE_CODE = 'booking-inside-notice';
const BOOKING_UNAVAILABLE_CODE = 'booking-not-available';

const getMinNoticeHours = noticeKey =>
  Object.prototype.hasOwnProperty.call(MIN_NOTICE_HOURS, noticeKey)
    ? MIN_NOTICE_HOURS[noticeKey]
    : null;

const isValidDate = d => d instanceof Date && !isNaN(d);

/**
 * Is a booking that starts at `bookingStart` inside the model's notice window?
 *
 * @param {Object} params
 * @param {Date} params.bookingStart requested booking start
 * @param {string} [params.noticeKey] the listing's publicData.min_booking_notice
 * @param {string} params.timeZone the listing's availability plan time zone
 * @param {Date} [params.now]
 * @returns {boolean}
 */
const isBookingStartInsideNotice = ({ bookingStart, noticeKey, timeZone, now = new Date() }) => {
  if (!isValidDate(bookingStart)) {
    return false;
  }
  const dayStart = moment.tz(bookingStart, timeZone).startOf('day');
  const startOfToday = moment.tz(now, timeZone).startOf('day');
  if (dayStart.valueOf() <= startOfToday.valueOf()) {
    return true;
  }
  const hours = getMinNoticeHours(noticeKey);
  if (!hours) {
    return false;
  }
  return dayStart.valueOf() - now.getTime() < hours * HOUR_MS;
};

const insideNoticeError = () => {
  const error = new Error("That date is inside the model's notice period.");
  error.status = 409;
  error.statusText = 'Booking inside notice period';
  // Shaped so the client's storableError() exposes it as apiErrors with our code.
  error.data = { errors: [{ code: BOOKING_INSIDE_NOTICE_CODE }] };
  return error;
};

const unavailableError = () => {
  const error = new Error('Booking is not available for the selected options.');
  error.status = 409;
  error.statusText = 'Booking not available';
  error.data = { errors: [{ code: BOOKING_UNAVAILABLE_CODE }] };
  return error;
};

// The booking start can arrive in the Marketplace API params (what Sharetribe books) and in
// orderData (what our line items are priced from). Check every one that is present.
const getRequestedStarts = (orderData, bodyParams) =>
  [bodyParams?.params?.bookingStart, orderData?.bookingStart].filter(isValidDate);

/**
 * Refuse a booking request whose start date is inside the model's minimum notice.
 * Resolves when the booking may proceed.
 *
 * @param {Object} params
 * @param {Object} params.listing the listing being booked, resolved server-side
 * @param {Object} [params.orderData] order data from the request body
 * @param {Object} [params.bodyParams] body params from the request body
 * @param {Date} [params.now]
 * @returns {Promise<void>}
 */
const enforceMinimumNotice = ({ listing, orderData, bodyParams, now = new Date() }) => {
  if (!listing?.attributes) {
    log.error(new Error('Minimum notice: listing not available'), 'min-notice-listing-missing');
    return Promise.reject(unavailableError());
  }
  const { publicData = {}, availabilityPlan } = listing.attributes;
  if (!NOTICE_UNIT_TYPES.includes(publicData.unitType)) {
    return Promise.resolve();
  }
  const starts = getRequestedStarts(orderData, bodyParams);
  if (starts.length === 0) {
    // Nothing to check (Sharetribe itself refuses a booking request without dates).
    return Promise.resolve();
  }
  const timeZone = availabilityPlan?.timezone;
  if (!timeZone || !moment.tz.zone(timeZone)) {
    log.error(new Error('Minimum notice: listing has no valid time zone'), 'min-notice-no-tz', {
      listingId: listing.id?.uuid,
    });
    return Promise.reject(unavailableError());
  }
  const noticeKey = publicData.min_booking_notice;
  const inside = starts.some(bookingStart =>
    isBookingStartInsideNotice({ bookingStart, noticeKey, timeZone, now })
  );
  return inside ? Promise.reject(insideNoticeError()) : Promise.resolve();
};

module.exports = {
  enforceMinimumNotice,
  isBookingStartInsideNotice,
  MIN_NOTICE_HOURS,
  BOOKING_INSIDE_NOTICE_CODE,
};
