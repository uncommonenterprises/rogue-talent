/**
 * Pure helpers for the read-only availability calendar on a model's profile (B03b, tester F8).
 *
 * Days are handled as "day keys" ('2026-11-24') in the LISTING's time zone, so a client in
 * another time zone sees the model's calendar days, exactly as the date picker does. The data is
 * the same time slots the date picker uses (ListingPage.duck.js monthlyTimeSlots); nothing new is
 * stored or fetched beyond the months the picker would load anyway.
 *
 * A day is FREE only when all of these hold:
 *   - it is after today (today is never free, decision 08/11/2026),
 *   - it is inside the bookable window (today + dayCountAvailableForBooking, as the picker),
 *   - it is outside the model's minimum notice (min_booking_notice; decision 1, 07/11/2026),
 *   - the time slots say the model has a free seat that day. A date held by a waiting request is
 *     already missing from the time slots (Sharetribe pending bookings reserve the seat), so it
 *     shows as plain "not available", like a booked date (decision 3, 08/11/2026).
 */
import { getStartOf, parseDateFromISO8601, stringifyDateToISO8601 } from '../../../util/dates';
import { timeSlotsPerDate } from '../../../util/generators';
import { isDayInsideNoticeWindow } from '../../../util/modelProfile';

import { getAllTimeSlots } from '../booking.shared';

// Day statuses. Only DAY_FREE is clickable; the rest render as not available.
export const DAY_PAST = 'past';
export const DAY_TODAY = 'today';
export const DAY_NOTICE = 'notice';
export const DAY_UNAVAILABLE = 'unavailable';
export const DAY_FREE = 'free';

// Month statuses.
export const MONTH_READY = 'ready';
export const MONTH_LOADING = 'loading';
export const MONTH_IDLE = 'idle';
export const MONTH_ERROR = 'error';

// Desktop shows the "Next free" chips only when the visible month has fewer free days than this.
export const SPARSE_FREE_DAYS = 5;
export const NEXT_FREE_COUNT = 3;

const pad = n => (n < 10 ? `0${n}` : `${n}`);

/**
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day 1-31
 * @returns {string} e.g. '2026-11-24'
 */
export const toDayKey = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;

const parseKey = key => key.split('-').map(n => parseInt(n, 10));

/**
 * Shift a month id ('2026-11') by a number of months.
 *
 * @param {string} monthId
 * @param {number} offset
 * @returns {string}
 */
export const addMonths = (monthId, offset) => {
  const [y, m] = parseKey(monthId);
  const index = y * 12 + (m - 1) + offset;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
};

/**
 * @param {string} monthId e.g. '2026-11'
 * @returns {number} number of days in that month
 */
export const daysInMonth = monthId => {
  const [y, m] = parseKey(monthId);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/**
 * A month laid out for a calendar whose week starts on MONDAY.
 *
 * @param {string} monthId e.g. '2026-11'
 * @returns {{ leadingBlanks: number, days: Array<string> }} blanks before the 1st, and day keys
 */
export const getMonthGrid = monthId => {
  const [y, m] = parseKey(monthId);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = Sunday
  const leadingBlanks = (firstWeekday + 6) % 7;
  const count = daysInMonth(monthId);
  const days = [];
  for (let d = 1; d <= count; d++) {
    days.push(toDayKey(y, m, d));
  }
  return { leadingBlanks, days };
};

/**
 * A Date at midday UTC on the given calendar day, for formatting the day with
 * `intl.formatDate(date, { timeZone: 'UTC', ... })` without any time zone drift.
 *
 * @param {string} dayKey
 * @returns {Date}
 */
export const dayKeyToUtcNoon = dayKey => {
  const [y, m, d] = parseKey(dayKey);
  return new Date(Date.UTC(y, m - 1, d, 12));
};

/**
 * The first moment of a day in the listing's time zone.
 *
 * @param {string} dayKey
 * @param {string} timeZone IANA time zone
 * @returns {Date}
 */
export const dayStartInTimeZone = (dayKey, timeZone) => parseDateFromISO8601(dayKey, timeZone);

/**
 * The time range to fetch for one month, using the same rules as the date picker
 * (BookingDatesForm fetchMonthData): never the past, never beyond the bookable window.
 *
 * @param {Object} params
 * @param {string} params.monthId
 * @param {string} params.timeZone
 * @param {number} params.dayCountAvailableForBooking
 * @param {Date} [params.now]
 * @returns {{ start: Date, end: Date }|null} null when there is nothing to fetch
 */
export const getMonthFetchRange = ({
  monthId,
  timeZone,
  dayCountAvailableForBooking,
  now = new Date(),
}) => {
  const monthStart = parseDateFromISO8601(`${monthId}-01`, timeZone);
  const nextMonthStart = getStartOf(monthStart, 'month', timeZone, 1, 'months');
  const windowEnd = getStartOf(now, 'day', timeZone, dayCountAvailableForBooking, 'days');
  if (nextMonthStart <= now || monthStart >= windowEnd) {
    return null;
  }
  const start = monthStart < now ? now : monthStart;
  const end = nextMonthStart > windowEnd ? windowEnd : nextMonthStart;
  return { start, end };
};

const getPerDayAvailability = (monthlyTimeSlots, timeZone) => {
  const loadedMonthIds = Object.keys(monthlyTimeSlots || {})
    .filter(id => Array.isArray(monthlyTimeSlots[id]?.timeSlots))
    .sort();
  if (loadedMonthIds.length === 0) {
    return {};
  }
  const loaded = loadedMonthIds.reduce((acc, id) => ({ ...acc, [id]: monthlyTimeSlots[id] }), {});
  const allTimeSlots = getAllTimeSlots(loaded, false);
  const start = parseDateFromISO8601(`${loadedMonthIds[0]}-01`, timeZone);
  const lastMonthStart = parseDateFromISO8601(
    `${loadedMonthIds[loadedMonthIds.length - 1]}-01`,
    timeZone
  );
  const end = getStartOf(lastMonthStart, 'month', timeZone, 1, 'months');
  return timeSlotsPerDate(start, end, allTimeSlots, timeZone);
};

/**
 * Build the read-only view of a model's calendar from the date picker's data.
 *
 * @param {Object} params
 * @param {Object} params.monthlyTimeSlots { '2026-11': { timeSlots, fetchTimeSlotsInProgress, fetchTimeSlotsError } }
 * @param {string} params.timeZone listing time zone
 * @param {string} [params.noticeKey] the model's min_booking_notice value
 * @param {number} params.dayCountAvailableForBooking bookable window in days (config)
 * @param {Date} [params.now]
 * @returns {Object} todayKey, todayMonthId, lastMonthId and lookup functions
 */
export const getAvailabilityModel = ({
  monthlyTimeSlots = {},
  timeZone,
  noticeKey,
  dayCountAvailableForBooking,
  now = new Date(),
}) => {
  const todayKey = stringifyDateToISO8601(now, timeZone);
  const todayMonthId = todayKey.slice(0, 7);
  // Same window as the picker: the last day a booking can start is today + (count - 1) days.
  const lastBookableKey = stringifyDateToISO8601(
    getStartOf(now, 'day', timeZone, dayCountAvailableForBooking - 1, 'days'),
    timeZone
  );
  const lastMonthId = lastBookableKey.slice(0, 7);
  const perDay = getPerDayAvailability(monthlyTimeSlots, timeZone);

  const getDayStatus = dayKey => {
    if (dayKey < todayKey) {
      return DAY_PAST;
    }
    if (dayKey === todayKey) {
      return DAY_TODAY;
    }
    if (dayKey > lastBookableKey) {
      return DAY_UNAVAILABLE;
    }
    // The same rule the date picker applies (util/modelProfile.js).
    const dayStart = dayStartInTimeZone(dayKey, timeZone);
    if (isDayInsideNoticeWindow({ dayStart, noticeKey, timeZone, now })) {
      return DAY_NOTICE;
    }
    return perDay[dayKey]?.hasAvailability === true ? DAY_FREE : DAY_UNAVAILABLE;
  };

  const getMonthStatus = monthId => {
    // Nothing bookable before this month or after the window: nothing to wait for.
    if (monthId < todayMonthId || monthId > lastMonthId) {
      return MONTH_READY;
    }
    // On the last day of a month only today is left (never free); the page fetches from tomorrow.
    if (toDayKey(...parseKey(monthId), daysInMonth(monthId)) <= todayKey) {
      return MONTH_READY;
    }
    const entry = monthlyTimeSlots?.[monthId];
    if (!entry) {
      return MONTH_IDLE;
    }
    if (entry.fetchTimeSlotsInProgress) {
      return MONTH_LOADING;
    }
    // The time slot thunk swallows request errors and stores no array, so treat that as an error.
    if (entry.fetchTimeSlotsError || !Array.isArray(entry.timeSlots)) {
      return MONTH_ERROR;
    }
    return MONTH_READY;
  };

  const getMonthFreeDays = monthId =>
    getMonthGrid(monthId).days.filter(dayKey => getDayStatus(dayKey) === DAY_FREE);

  // The next free days from today, across months, stopping at the first month not yet known
  // (so a chip never skips an earlier date that simply hasn't loaded).
  const getNextFreeDays = (count = NEXT_FREE_COUNT) => {
    const found = [];
    for (let id = todayMonthId; id <= lastMonthId; id = addMonths(id, 1)) {
      if (getMonthStatus(id) !== MONTH_READY) {
        break;
      }
      const free = getMonthFreeDays(id);
      for (let i = 0; i < free.length && found.length < count; i++) {
        found.push(free[i]);
      }
      if (found.length >= count) {
        break;
      }
    }
    return found;
  };

  // The next month after monthId that has a free date, or null if none is known yet.
  const findNextMonthWithFree = monthId => {
    for (let id = addMonths(monthId, 1); id <= lastMonthId; id = addMonths(id, 1)) {
      if (getMonthStatus(id) !== MONTH_READY) {
        return null;
      }
      if (getMonthFreeDays(id).length > 0) {
        return id;
      }
    }
    return null;
  };

  return {
    todayKey,
    todayMonthId,
    lastMonthId,
    getDayStatus,
    getMonthStatus,
    getMonthFreeDays,
    getNextFreeDays,
    findNextMonthWithFree,
  };
};
