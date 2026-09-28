import {
  isInRange,
  getStartOf,
  isDateSameOrAfter,
  monthIdString,
  parseDateFromISO8601,
  stringifyDateToISO8601,
  getStartOfWeek,
} from '../../../../util/dates';

// Marketplace API allows fetching exceptions to 366 days into the future.
export const MAX_AVAILABILITY_EXCEPTIONS_RANGE = 366;
const TODAY = new Date();

// This is the order of days as JavaScript understands them (getDay() -> 0 = Sunday).
export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Time zone given to the default plan when a model's profile draft is created. Rogue Talent
// is a UK marketplace, so this is fixed rather than read from the model's browser.
export const DEFAULT_AVAILABILITY_TIMEZONE = 'Europe/London';

/**
 * "Available by default" plan: every day of the week open, full day, one seat. This is the
 * single source of the plan shape - the calendar panel ("Your calendar") uses it as its
 * baseline and the "About you" step includes it when it creates the profile draft, so a
 * freshly onboarded model is bookable on any future date without touching a calendar.
 * The model then blocks dates they can't work via seats-0 availability exceptions.
 *
 * @param {string} timezone IANA time zone name, e.g. 'Europe/London'
 * @returns {Object} { availabilityPlan } ready to spread into a listing create/update payload
 */
export const createAllOpenPlan = timezone => ({
  availabilityPlan: {
    type: 'availability-plan/time',
    timezone,
    entries: WEEKDAYS.map(dayOfWeek => ({
      dayOfWeek,
      startTime: '00:00',
      endTime: '00:00', // 00:00 -> 00:00 represents a full day in Sharetribe's plan
      seats: 1,
    })),
  },
});

/**
 * The default plan to include when saving a listing, but ONLY if the listing doesn't have
 * a plan yet. A listing that already has a plan (e.g. the model set "unavailable by
 * default", or already has one from the calendar) is never overwritten.
 *
 * @param {Object?} listing the listing entity being saved (may be null in the new flow)
 * @returns {Object} { availabilityPlan } or {}
 */
export const defaultAvailabilityPlanMaybe = listing =>
  listing?.attributes?.availabilityPlan ? {} : createAllOpenPlan(DEFAULT_AVAILABILITY_TIMEZONE);

// Helper for the pickers of DatePicker (weekly and monthly calendars)
export const getStartOfWeekFn = (currentMoment, timeZone, firstDayOfWeek, offset = 0) => {
  const startOfWeek = getStartOfWeek(currentMoment, timeZone, firstDayOfWeek);
  return getStartOf(startOfWeek, 'day', timeZone, offset, 'days');
};

export const getStartOfNextWeek = (currentMoment, timeZone, firstDayOfWeek, offset = 7) =>
  getStartOfWeekFn(currentMoment, timeZone, firstDayOfWeek, offset);
export const getStartOfPrevWeek = (currentMoment, timeZone, firstDayOfWeek, offset = 7) =>
  getStartOfWeekFn(currentMoment, timeZone, firstDayOfWeek, -1 * offset, 'days');

export const getStartOfMonth = (currentMoment, timeZone, offset = 0) =>
  getStartOf(currentMoment, 'month', timeZone, offset, 'months');
export const getStartOfNextMonth = (currentMoment, timeZone, offset = 1) =>
  getStartOfMonth(currentMoment, timeZone, offset);
export const getStartOfPrevMonth = (currentMoment, timeZone, offset = 1) =>
  getStartOfMonth(currentMoment, timeZone, -1 * offset);

export const getExclusiveEndDate = (date, timeZone) => {
  return getStartOf(date, 'day', timeZone, 1, 'days');
};
export const getInclusiveEndDate = (date, timeZone) => {
  return getStartOf(date, 'day', timeZone, -1, 'days');
};

// DatePicker returns wrapped date objects
export const extractDateFromFieldDateInput = dateValue => dateValue?.date || null;

// DatePicker returns wrapped date objects
export const extractDateFromFieldDateRangeInput = dates => {
  return dates?.startDate || dates?.endDate ? dates : { startDate: null, endDate: null };
};

export const endOfAvailabilityExceptionRange = (timeZone, date) => {
  return getStartOf(date, 'day', timeZone, MAX_AVAILABILITY_EXCEPTIONS_RANGE - 1, 'days');
};

const endOfRange = (date, dayCountAvailableForBooking, timeZone) =>
  getStartOf(date, 'day', timeZone, dayCountAvailableForBooking - 1, 'days');

const fetchExceptionData = (
  date,
  listingId,
  timeZone,
  onFetchExceptions,
  firstDayOfWeek,
  isWeekly = true
) => {
  const endOfRangeDate = endOfRange(TODAY, MAX_AVAILABILITY_EXCEPTIONS_RANGE, timeZone);

  // Don't fetch timeSlots for past months or too far in the future
  if (isInRange(date, TODAY, endOfRangeDate)) {
    // Use "today", if the first day of given month is in the past
    // TODO
    const start = isDateSameOrAfter(TODAY, date) ? TODAY : date;

    // Use endOfRangeDate, if the first day of the next date range is too far in the future
    const nextRangeDate = isWeekly
      ? getStartOfNextWeek(date, timeZone, firstDayOfWeek)
      : getStartOfNextMonth(date, timeZone);
    const end = isDateSameOrAfter(nextRangeDate, endOfRangeDate)
      ? getStartOf(endOfRangeDate, 'day', timeZone)
      : nextRangeDate;

    // Fetch time slots for given time range
    onFetchExceptions({ listingId, isWeekly, start, end, timeZone });
  }
};

// Update current week
// When clicking next or prev buttons on weekly calendar,
// we fetch data for the week that comes after next week.
export const handleWeekClick = params => weekFn => {
  const {
    currentWeek,
    setCurrentWeek,
    weeklyExceptionQueries,
    listingId,
    timeZone,
    onFetchExceptions,
    firstDayOfWeek,
  } = params;
  const updatedWeek = weekFn(currentWeek, timeZone, firstDayOfWeek);
  setCurrentWeek(updatedWeek);

  // Callback function after the week has been updated.
  // DatePicker component has next and previous months ready (but inivisible).
  // we try to populate those invisible months before user advances there.
  fetchExceptionData(
    weekFn(currentWeek, timeZone, firstDayOfWeek, 14),
    listingId,
    timeZone,
    onFetchExceptions,
    firstDayOfWeek
  );

  // If previous fetch for the week data failed, try again.
  const weekId = stringifyDateToISO8601(currentWeek, timeZone);
  const currentWeekData = weeklyExceptionQueries[weekId];
  if (currentWeekData?.fetchTimeSlotsError) {
    fetchExceptionData(currentWeek, listingId, timeZone, onFetchExceptions, firstDayOfWeek);
  }
};

// Update current month and call callback function.
// When clicking next or prev buttons on monthly calendar,
// we fetch data for the month that comes after next month.
export const handleMonthClick = params => monthFn => {
  const {
    currentMonth,
    setCurrentMonth,
    monthlyExceptionQueries,
    listingId,
    timeZone,
    onFetchExceptions,
    onMonthChanged,
  } = params;
  const updatedMonth = monthFn(currentMonth, timeZone);
  setCurrentMonth(updatedMonth);

  // Callback function after month has been updated.
  // DatePicker component has next and previous months ready (but inivisible).
  // we try to populate those invisible months before user advances there.
  fetchExceptionData(
    monthFn(currentMonth, timeZone, 2),
    listingId,
    timeZone,
    onFetchExceptions,
    undefined,
    false
  );

  // If previous fetch for the month data failed, try again.
  const monthId = monthIdString(currentMonth, timeZone);
  const currentMonthData = monthlyExceptionQueries[monthId];
  if (currentMonthData?.fetchTimeSlotsError) {
    fetchExceptionData(currentMonth, listingId, timeZone, onFetchExceptions, undefined, false);
  }

  if (onMonthChanged) {
    const monthId = monthIdString(updatedMonth, timeZone);
    onMonthChanged(monthId);
  }
};

const getMonthStartInTimeZone = (monthId, timeZone) => {
  const month = parseDateFromISO8601(`${monthId}-01`, timeZone); // E.g. new Date('2022-12')
  return getStartOfMonth(month, timeZone);
};
// Get the range of months that we have already fetched content
// (as a reaction to user's Next-button clicks on date picker).
export const getMonthlyFetchRange = (monthlyExceptionQueries, timeZone) => {
  const monthStrings = Object.keys(monthlyExceptionQueries).sort();
  const firstMonth = getMonthStartInTimeZone(monthStrings[0], timeZone);
  const lastMonth = getMonthStartInTimeZone(monthStrings[monthStrings.length - 1], timeZone);
  const exclusiveEndMonth = getStartOfNextMonth(lastMonth, timeZone);
  return [firstMonth, exclusiveEndMonth];
};
