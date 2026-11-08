import React, { useState, useEffect } from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import appSettings from '../../../config/settings';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { required, bookingDatesRequired, composeValidators } from '../../../util/validators';
import {
  getStartOf,
  isSameDay,
  isDateSameOrAfter,
  isInRange,
  timeOfDayFromLocalToTimeZone,
  timeOfDayFromTimeZoneToLocal,
  monthIdString,
  parseDateFromISO8601,
  stringifyDateToISO8601,
} from '../../../util/dates';
import { LINE_ITEM_DAY, propTypes } from '../../../util/types';
import { timeSlotsPerDate } from '../../../util/generators';
import { isInsideMinimumNotice } from '../../../util/modelProfile';

import { Form, PrimaryButton, Notice, PriceBreakdown } from '../../../components';

import FetchLineItemsError from '../FetchLineItemsError/FetchLineItemsError.js';
import FieldBookingDates from './FieldBookingDates';
import {
  findFirstUnavailableDay,
  formatBookingDay,
  getPickedStartFormValue,
} from './bookingDates.helpers';

import css from './BookingDatesForm.module.css';

const TODAY = new Date();
// Months shown in the phone sheet's scrolling calendar (B04).
const STACK_MONTHS = 4;

const nextMonthFn = (currentMoment, timeZone, offset = 1) =>
  getStartOf(currentMoment, 'month', timeZone, offset, 'months');
const prevMonthFn = (currentMoment, timeZone, offset = 1) =>
  getStartOf(currentMoment, 'month', timeZone, -1 * offset, 'months');
const endOfRange = (date, dayCountAvailableForBooking, timeZone) =>
  getStartOf(date, 'day', timeZone, dayCountAvailableForBooking, 'days');

const getMonthStartInTimeZone = (monthId, timeZone) => {
  const month = parseDateFromISO8601(`${monthId}-01`, timeZone); // E.g. new Date('2022-12')
  return getStartOf(month, 'month', timeZone, 0, 'months');
};

const getExclusiveEndDate = (date, timeZone) => {
  return getStartOf(date, 'day', timeZone, 1, 'days');
};
const getInclusiveEndDate = (date, timeZone) => {
  return getStartOf(date, 'day', timeZone, -1, 'days');
};
/**
 * Get the range of months that we have already fetched time slots.
 * (This range expands when user clicks Next-button on date picker).
 * monthlyTimeSlots look like this: { '2024-07': { timeSlots: []}, '2024-08': { timeSlots: []} }
 *
 * @param {Object} monthlyTimeSlots { '2024-07': { timeSlots: [] }, }
 * @param {String} timeZone IANA time zone key ('Europe/Helsinki')
 * @returns {Array<Date>} a tuple containing dates: the start and exclusive end month
 */
const getMonthlyFetchRange = (monthlyTimeSlots, timeZone) => {
  const monthStrings = Object.entries(monthlyTimeSlots).reduce((picked, entry) => {
    return Array.isArray(entry[1].timeSlots) ? [...picked, entry[0]] : picked;
  }, []);
  const firstMonth = getMonthStartInTimeZone(monthStrings[0], timeZone);
  const lastMonth = getMonthStartInTimeZone(monthStrings[monthStrings.length - 1], timeZone);
  const exclusiveEndMonth = nextMonthFn(lastMonth, timeZone);
  return [firstMonth, exclusiveEndMonth];
};

/**
 * This merges the time slots, when consecutive time slots are back to back with same "seats" count.
 *
 * @param {Array<TimeSlot>} timeSlots
 * @returns {Array<TimeSlot>} array of time slots where unnecessary boundaries have been removed.
 */
const removeUnnecessaryBoundaries = timeSlots => {
  return timeSlots.reduce((picked, ts) => {
    const hasPicked = picked.length > 0;
    if (hasPicked) {
      const rest = picked.slice(0, -1);
      const lastPicked = picked.slice(-1)[0];

      const isBackToBack = lastPicked.attributes.end.getTime() === ts.attributes.start.getTime();
      const hasSameSeatsCount = lastPicked.attributes.seats === ts.attributes.seats;
      const createJoinedTimeSlot = (ts1, ts2) => ({
        ...ts1,
        attributes: { ...ts1.attributes, end: ts2.attributes.end },
      });
      return isBackToBack && hasSameSeatsCount
        ? [...rest, createJoinedTimeSlot(lastPicked, ts)]
        : [...picked, ts];
    }
    return [ts];
  }, []);
};
/**
 * Join monthly time slots into a single array and remove unnecessary boundaries on month changes.
 *
 * @param {Object} monthlyTimeSlots { '2024-07': { timeSlots: [] }, }
 * @returns {Array<TimeSlot>}
 */
const getAllTimeSlots = monthlyTimeSlots => {
  const timeSlotsRaw = Object.values(monthlyTimeSlots).reduce((picked, mts) => {
    return [...picked, ...(mts.timeSlots || [])];
  }, []);
  return removeUnnecessaryBoundaries(timeSlotsRaw);
};

/**
 * Check if a blocked date can be found between two dates.
 *
 * @param {Array<propTypes.timeSlot>} allTimeSlots an array of propTypes.timeSlot objects
 * @param {String} timeZone time zone id
 * @param {Moment} startDate start date (Moment)
 * @param {Moment} endDate end date (Moment)
 */
const isBlockedBetween = (allTimeSlots, timeZone) => ([startDate, endDate]) => {
  const localizedStartDay = timeOfDayFromLocalToTimeZone(startDate, timeZone);
  const localizedEndDay = timeOfDayFromLocalToTimeZone(endDate, timeZone);
  const foundTS = allTimeSlots.find(ts => {
    const timeSlotRange = [ts.attributes.start, ts.attributes.end];
    return isInRange(localizedStartDay, ...timeSlotRange, undefined, timeZone);
  });

  if (!foundTS) {
    return true;
  }

  const timeSlotRange = [foundTS.attributes.start, foundTS.attributes.end];
  // endDate should be included in the slot mapped with startDate
  const isExcludedEnd = isSameDay(localizedEndDay, timeSlotRange[1], timeZone);
  const isBlockedBetween = !(isInRange(localizedEndDay, ...timeSlotRange) || isExcludedEnd);
  return isBlockedBetween;
};

const isOneBoundaryeSelected = (hasTimeSlots, startDate, endDate) => {
  const oneBoundarySelected = (startDate || endDate) && (!startDate || !endDate);
  return hasTimeSlots && oneBoundarySelected;
};

const endDateToPickerDate = (unitType, endDate, timeZone) => {
  const isValid = endDate instanceof Date;
  const isDaily = unitType === LINE_ITEM_DAY;

  if (!isValid) {
    return null;
  } else if (isDaily) {
    // API end dates are exlusive, so we need to shift them with daily
    // booking.
    return getStartOf(endDate, 'day', timeZone, -1, 'days');
  } else {
    return endDate;
  }
};

/**
 * Get the closest start date: the start of the time slot or the start of the available range.
 *
 * @param {Object} timeSlotData { timeSlots: [<TimeSlot>]}
 * @param {Date} startOfAvailableRange
 * @param {Date} endOfAvailableRange
 * @returns {Date} start of time slot or the start of available range
 */
const getBookableRange = (timeSlotData, startOfAvailableRange, endOfAvailableRange) => {
  if (!timeSlotData) {
    return [];
  }

  const timeSlotStart = timeSlotData?.timeSlots?.[0]?.attributes?.start;
  const timeSlotEnd = timeSlotData?.timeSlots?.[0]?.attributes?.end;
  const start = isDateSameOrAfter(startOfAvailableRange, timeSlotStart)
    ? startOfAvailableRange
    : timeSlotStart;
  const end = isDateSameOrAfter(endOfAvailableRange, timeSlotEnd)
    ? timeSlotEnd
    : endOfAvailableRange;
  return [start, end];
};

/**
 * Returns an isOutsideRange function that can be passed to
 * a DateRangePicker component.
 */
const isOutsideRangeFn = (
  allTimeSlots,
  monthlyTimeSlots,
  startDate,
  endDate,
  lineItemUnitType,
  dayCountAvailableForBooking,
  timeZone
) => {
  const endOfAvailableRange = dayCountAvailableForBooking;
  const endOfAvailableRangeDate = getStartOf(TODAY, 'day', timeZone, endOfAvailableRange, 'days');
  const startOfAvailableRangeDate = getStartOf(TODAY, 'day', timeZone);

  // Currently available monthly data
  const [startMonth, endMonth] = getMonthlyFetchRange(monthlyTimeSlots, timeZone);
  const timeSlotsData = timeSlotsPerDate(startMonth, endMonth, allTimeSlots, timeZone);

  // One boundary is selected
  const oneBoundarySelected = isOneBoundaryeSelected(!!monthlyTimeSlots, startDate, endDate);
  const inclusiveEndDateMaybe = endDate ? getInclusiveEndDate(endDate, timeZone) : endDate;
  const boundary = startDate || inclusiveEndDateMaybe;
  const timeSlotData = oneBoundarySelected
    ? timeSlotsData[stringifyDateToISO8601(boundary, timeZone)]
    : null;
  const bookableRange = getBookableRange(
    timeSlotData,
    startOfAvailableRangeDate,
    endOfAvailableRangeDate
  );

  const [rangeStart, rangeEnd] =
    bookableRange.length === 2
      ? bookableRange
      : [startOfAvailableRangeDate, endOfAvailableRangeDate];

  // standard isOutsideRange function
  return day => {
    const timeOfDay = timeOfDayFromLocalToTimeZone(day, timeZone);
    const dayInListingTZ = getStartOf(timeOfDay, 'day', timeZone);

    // end the range so that the booking can end at latest on
    // - nightly booking: the day the next booking starts
    // - daily booking: the day before the next booking starts
    const lastDayToEndBooking = endDateToPickerDate(lineItemUnitType, rangeEnd, timeZone);

    return (
      !isDateSameOrAfter(dayInListingTZ, rangeStart) ||
      !isDateSameOrAfter(lastDayToEndBooking, dayInListingTZ)
    );
  };
};

/**
 * Returns an isDayBlocked function that can be passed to
 * a DateRangePicker component.
 */
const isDayBlockedFn = params => {
  const { allTimeSlots, monthlyTimeSlots, isDaily, startDate, endDate, timeZone } = params || {};

  const [startMonth, endMonth] = getMonthlyFetchRange(monthlyTimeSlots, timeZone);
  const timeSlotsData = timeSlotsPerDate(startMonth, endMonth, allTimeSlots, timeZone);

  return day => {
    const localizedDay = timeOfDayFromLocalToTimeZone(day, timeZone);
    const dayInListingTZ = getStartOf(localizedDay, 'day', timeZone);

    const dayIdString = stringifyDateToISO8601(dayInListingTZ, timeZone);
    const hasAvailabilityOnDay = timeSlotsData[dayIdString]?.hasAvailability === true;

    if (!isDaily && startDate) {
      // Nightly
      // For the unit type night, we check that the time slot of the selected startDate
      // ends on a given _day_
      const startDateIdString = stringifyDateToISO8601(startDate, timeZone);
      const startDateTimeSlotsData = timeSlotsData[startDateIdString];
      const startDateTimeSlot =
        startDateTimeSlotsData == null ? true : startDateTimeSlotsData?.timeSlots?.[0];
      const { start, end } = startDateTimeSlot?.attributes || {};
      // If both startDate and endDate have been selected, we allow selecting other ranges
      const hasAvailability =
        startDate && endDate
          ? hasAvailabilityOnDay
          : isInRange(dayInListingTZ, start, end, 'day', timeZone);
      const timeSlotEndsOnThisDay = end && isSameDay(dayInListingTZ, end, timeZone);

      return !(hasAvailability || timeSlotEndsOnThisDay);
    }

    // Daily
    return !hasAvailabilityOnDay;
  };
};

const fetchMonthData = (
  date,
  listingId,
  dayCountAvailableForBooking,
  timeZone,
  onFetchTimeSlots
) => {
  const endOfRangeDate = endOfRange(TODAY, dayCountAvailableForBooking, timeZone);

  // Don't fetch timeSlots for past months or too far in the future
  if (isInRange(date, TODAY, endOfRangeDate)) {
    // Use "today", if the first day of given month is in the past
    const start = isDateSameOrAfter(TODAY, date) ? TODAY : date;

    // Use endOfRangeDate, if the first day of the next month is too far in the future
    const nextMonthDate = nextMonthFn(date, timeZone);
    const end = isDateSameOrAfter(nextMonthDate, endOfRangeDate)
      ? getStartOf(endOfRangeDate, 'day', timeZone)
      : nextMonthDate;

    // Fetch time slots for given time range
    onFetchTimeSlots(listingId, start, end, timeZone);
  }
};

const handleMonthClick = (
  currentMonth,
  monthlyTimeSlots,
  dayCountAvailableForBooking,
  timeZone,
  listingId,
  onFetchTimeSlots
) => monthFn => {
  // Callback function after month has been updated.
  // DatePicker component has next and previous months ready (but inivisible).
  // we try to populate those invisible months before user advances there.
  fetchMonthData(
    monthFn(currentMonth, timeZone, 2),
    listingId,
    dayCountAvailableForBooking,
    timeZone,
    onFetchTimeSlots
  );

  // If previous fetch for month data failed, try again.
  const monthId = monthIdString(currentMonth, timeZone);
  const currentMonthData = monthlyTimeSlots[monthId];
  if (currentMonthData && currentMonthData.fetchTimeSlotsError) {
    fetchMonthData(
      currentMonth,
      listingId,
      dayCountAvailableForBooking,
      timeZone,
      onFetchTimeSlots
    );
  }
};

// When the values of the form are updated we need to fetch
// lineItems from this Template's backend for the EstimatedTransactionMaybe
// In case you add more fields to the form, make sure you add
// the values here to the orderData object.

const calculateLineItems = (
  listingId,
  isOwnListing,
  fetchLineItemsInProgress,
  onFetchTransactionLineItems,
  seatsEnabled
) => formValues => {
  const { startDate, endDate, priceVariantName, seats } = formValues?.values || {};

  const priceVariantMaybe = priceVariantName ? { priceVariantName } : {};
  const seatCount = seats ? parseInt(seats, 10) : 1;

  const orderData = {
    bookingStart: startDate,
    bookingEnd: endDate,
    ...priceVariantMaybe,
    ...(seatsEnabled && { seats: seatCount }),
  };

  if (startDate && endDate && !fetchLineItemsInProgress) {
    onFetchTransactionLineItems({
      orderData,
      listingId,
      isOwnListing,
    });
  }
};

const showNextMonthStepper = (currentMonth, dayCountAvailableForBooking, timeZone) => {
  const nextMonthDate = nextMonthFn(currentMonth, timeZone);

  return !isDateSameOrAfter(
    nextMonthDate,
    endOfRange(TODAY, dayCountAvailableForBooking, timeZone)
  );
};

const showPreviousMonthStepper = (currentMonth, timeZone) => {
  const prevMonthDate = prevMonthFn(currentMonth, timeZone);
  const currentMonthDate = getStartOf(TODAY, 'month', timeZone);
  return isDateSameOrAfter(prevMonthDate, currentMonthDate);
};

const getStartAndEndOnTimeZone = (startDate, endDate, isDaily, timeZone) => {
  // Parse the startDate and endDate into the target time zone
  const parsedStart = startDate
    ? getStartOf(timeOfDayFromLocalToTimeZone(startDate, timeZone), 'day', timeZone)
    : startDate;

  const parsedEnd = endDate
    ? getStartOf(timeOfDayFromLocalToTimeZone(endDate, timeZone), 'day', timeZone)
    : endDate;

  // Adjust endDate for API if isDaily is true
  const endDateForAPI = parsedEnd && isDaily ? getExclusiveEndDate(parsedEnd, timeZone) : parsedEnd;

  // Return the processed dates
  return { startDate: parsedStart, endDate: endDateForAPI };
};

/**
 * Applies a date handed over from outside the form (the phone profile's availability section,
 * B03b) once per hand-off. Renders nothing.
 */
const PickedStartListener = props => {
  const { pickedStart, onPick } = props;
  const seq = pickedStart?.seq;
  useEffect(() => {
    if (pickedStart?.dayKey) {
      onPick(pickedStart.dayKey);
    }
  }, [seq]);
  return null;
};

const onPriceVariantChange = props => value => {
  const { form: formApi, seatsEnabled } = props;

  formApi.batch(() => {
    formApi.change('bookingDates', null);
    if (seatsEnabled) {
      formApi.change('seats', 1);
    }
  });
};

/**
 * A form for selecting booking dates.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class name for the root element
 * @param {string} [props.className] - Custom class name
 * @param {Object} props.price - The unit price of the
 * @param {string} props.listingId - The listing ID
 * @param {boolean} props.isOwnListing - Whether the listing belongs to the current user
 * @param {propTypes.lineItemUnitType} props.lineItemUnitType - The unit type of the line item
 * @param {Object} props.monthlyTimeSlots - The monthly time slots
 * @param {Function} props.onFetchTimeSlots - Handler for fetching time slots
 * @param {Array<Object>} props.lineItems - The line items
 * @param {boolean} props.fetchLineItemsInProgress - Whether line items are being fetched
 * @param {propTypes.error} props.fetchLineItemsError - The error for fetching line items
 * @param {Function} props.onFetchTransactionLineItems - Handler for fetching transaction line items
 * @param {string} props.timeZone - The time zone
 * @param {string} props.marketplaceName - Name of the marketplace
 * @param {string} [props.startDatePlaceholder] - Placeholder for the start date
 * @param {string} [props.endDatePlaceholder] - Placeholder for the end date
 * @param {number} props.dayCountAvailableForBooking - Number of days available for booking
 * @param {Array<Object>} [props.priceVariants] - The price variants
 * @param {ReactNode} [props.priceVariantFieldComponent] - The component to use for the price variant field
 * @param {boolean} props.isPublishedListing - Whether the listing is published
 * @param {Function} [props.renderAvailabilityPreview] - desktop (B03b): onPickDate => the
 *   profile's availability calendar, shown above the date fields. A click on a free day sets it
 *   as the start date and opens the picker in its place.
 * @param {Object} [props.pickedStart] - phone (B03b): { dayKey, seq } handed over from the
 *   profile's availability section; each new seq sets that day as the start date.
 * @returns {JSX.Element}
 */
export const BookingDatesForm = props => {
  const {
    rootClassName,
    className,
    price: unitPrice,
    listingId,
    isOwnListing,
    fetchLineItemsInProgress,
    onFetchTransactionLineItems,
    timeZone,
    dayCountAvailableForBooking,
    marketplaceName,
    payoutDetailsWarning,
    monthlyTimeSlots,
    onMonthChanged,
    seatsEnabled,
    isPriceVariationsInUse,
    priceVariants = [],
    priceVariantFieldComponent: PriceVariantFieldComponent,
    preselectedPriceVariant,
    isPublishedListing,
    layout = 'popover',
    modelName = '',
    minNoticeKey,
    travelFeePolicy,
    onDatesChange,
    renderAvailabilityPreview,
    pickedStart,
    ...rest
  } = props;
  const intl = useIntl();
  const isStack = layout === 'stack';
  const [currentMonth, setCurrentMonth] = useState(getStartOf(TODAY, 'month', timeZone));
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [conflictDate, setConflictDate] = useState(null);
  const initialValuesMaybe =
    priceVariants.length > 1 && preselectedPriceVariant
      ? { initialValues: { priceVariantName: preselectedPriceVariant?.name } }
      : priceVariants.length === 1
      ? { initialValues: { priceVariantName: priceVariants?.[0]?.name } }
      : {};

  const allTimeSlots = getAllTimeSlots(monthlyTimeSlots);
  const monthId = monthIdString(currentMonth);
  const currentMonthInProgress = monthlyTimeSlots[monthId]?.fetchTimeSlotsInProgress;
  const nextMonthId = monthIdString(nextMonthFn(currentMonth, timeZone));
  const nextMonthInProgress = monthlyTimeSlots[nextMonthId]?.fetchTimeSlotsInProgress;

  useEffect(() => {
    // Phone sheet (B04) shows a stack of STACK_MONTHS months. The page loads the first two;
    // fetch the rest when the stack is shown (client-only interaction, like a month click).
    if (isStack && props.onFetchTimeSlots) {
      for (let offset = 2; offset < STACK_MONTHS; offset++) {
        fetchMonthData(
          nextMonthFn(currentMonth, timeZone, offset),
          listingId,
          dayCountAvailableForBooking,
          timeZone,
          props.onFetchTimeSlots
        );
      }
    }
  }, [isStack]);

  useEffect(() => {
    // Call onMonthChanged function if it has been passed in among props.
    if (onMonthChanged) {
      onMonthChanged(monthId);
    }
  }, [currentMonth, onMonthChanged]);

  useEffect(() => {
    // Log time slots marked for each day for debugging
    if (
      appSettings.dev &&
      appSettings.verbose &&
      !currentMonthInProgress &&
      !nextMonthInProgress &&
      monthlyTimeSlots &&
      timeZone
    ) {
      // This side effect just prints debug data into the console.log feed.
      // Note: endMonth is exclusive end time of the range.
      const tz = timeZone;
      const nextMonth = nextMonthFn(currentMonth, tz);
      const timeSlotsData = timeSlotsPerDate(currentMonth, nextMonth, allTimeSlots, tz);
      const [startMonth, endMonth] = getMonthlyFetchRange(monthlyTimeSlots, tz);
      const lastFetchedMonth = new Date(endMonth.getTime() - 1);
      /* eslint-disable no-console */
      console.log(monthIdString(lastFetchedMonth, tz));

      console.log(
        `Fetched months: ${monthIdString(startMonth, tz)} ... ${monthIdString(
          lastFetchedMonth,
          tz
        )}`,
        '\nTime slots for the current month:',
        timeSlotsData
      );
      /* eslint-enable no-console */
    }
  }, [currentMonth, currentMonthInProgress, nextMonthInProgress, timeZone, monthlyTimeSlots]);

  const classes = classNames(rootClassName || css.root, className, {
    [css.stackLayout]: isStack,
  });

  const onHandleFetchLineItems = calculateLineItems(
    listingId,
    isOwnListing,
    fetchLineItemsInProgress,
    onFetchTransactionLineItems,
    seatsEnabled
  );

  // B04: the bookable window is today ... today + dayCountAvailableForBooking. Unlike the template,
  // choosing a start date does not grey out everything after the next unavailable day: the client
  // may tap past it, and the calendar then restarts the range and says which day is the problem.
  const isOutsideBookableWindow = isOutsideRangeFn(
    allTimeSlots,
    monthlyTimeSlots,
    null,
    null,
    props.lineItemUnitType,
    dayCountAvailableForBooking,
    timeZone
  );
  const isDayBlockedForBooking = isDayBlockedFn({
    allTimeSlots,
    monthlyTimeSlots,
    isDaily: props.lineItemUnitType === LINE_ITEM_DAY,
    startDate: null,
    endDate: null,
    timeZone,
  });
  const handleRangeConflict = range => {
    const firstUnavailable = range
      ? findFirstUnavailableDay(
          range,
          day => isOutsideBookableWindow(day) || isDayBlockedForBooking(day)
        )
      : null;
    setConflictDate(firstUnavailable);
  };

  const availabilityLoadError = !!monthlyTimeSlots[monthId]?.fetchTimeSlotsError;

  return (
    <FinalForm
      {...initialValuesMaybe}
      {...rest}
      unitPrice={unitPrice}
      render={formRenderProps => {
        const {
          formId,
          handleSubmit,
          lineItemUnitType,
          values,
          lineItems,
          fetchLineItemsError,
          onFetchTimeSlots,
        } = formRenderProps;
        const { startDate, endDate } = values?.bookingDates ? values.bookingDates : {};

        const breakdownData =
          startDate && endDate
            ? {
                startDate,
                endDate,
              }
            : null;
        const showEstimatedBreakdown =
          breakdownData && lineItems && !fetchLineItemsInProgress && !fetchLineItemsError;

        const isDaily = lineItemUnitType === LINE_ITEM_DAY;
        const hasDates = !!(startDate && endDate);
        const submitDisabled = isPriceVariationsInUse && !isPublishedListing;
        const datesDisabled = availabilityLoadError || !!currentMonthInProgress;

        const onMonthClick = handleMonthClick(
          currentMonth,
          monthlyTimeSlots,
          dayCountAvailableForBooking,
          timeZone,
          listingId,
          onFetchTimeSlots
        );

        // Minimum notice is a guide, never a block (open question 3).
        const showNoticeGuide =
          hasDates && isInsideMinimumNotice({ startDate, noticeKey: minNoticeKey });
        const noticePhrase = showNoticeGuide
          ? intl.formatMessage({ id: `BookingDatesForm.noticePhrase.${minNoticeKey}` })
          : null;

        // B03b hand-off: a free day chosen on the profile's availability calendar becomes the
        // start date (no end date yet) and the picker opens on it. Nothing is booked or held.
        const applyPickedStart = dayKey => {
          const value = getPickedStartFormValue(dayKey, timeZone);
          if (!value) {
            return;
          }
          formRenderProps.form.change('bookingDates', value);
          setConflictDate(null);
          if (onDatesChange) {
            onDatesChange(false);
          }
          const pickedMonth = getStartOf(value.startDate, 'month', timeZone);
          setCurrentMonth(pickedMonth);
          [pickedMonth, nextMonthFn(pickedMonth, timeZone)].forEach(month => {
            if (onFetchTimeSlots && !monthlyTimeSlots[monthIdString(month, timeZone)]) {
              fetchMonthData(
                month,
                listingId,
                dayCountAvailableForBooking,
                timeZone,
                onFetchTimeSlots
              );
            }
          });
          if (!isStack) {
            setCalendarOpen(true);
          }
        };
        const availabilityPreview =
          !isStack && renderAvailabilityPreview
            ? renderAvailabilityPreview(applyPickedStart)
            : null;
        const pickedStartListener = pickedStart ? (
          <PickedStartListener pickedStart={pickedStart} onPick={applyPickedStart} />
        ) : null;

        const conflictNotice = conflictDate ? (
          <Notice variant="error" role="alert">
            <FormattedMessage
              id="BookingDatesForm.unavailableInRange"
              values={{
                name: modelName,
                date: <strong>{formatBookingDay(intl, conflictDate)}</strong>,
              }}
            />
          </Notice>
        ) : null;

        const noticeGuide = showNoticeGuide ? (
          <Notice>
            <FormattedMessage
              id="BookingDatesForm.minimumNotice"
              values={{ name: modelName, notice: noticePhrase }}
            />
          </Notice>
        ) : null;

        // B05: the shared price breakdown, estimated from the server's line items.
        const breakdown = showEstimatedBreakdown ? (
          <PriceBreakdown
            className={css.priceBreakdownContainer}
            lineItems={lineItems}
            modelName={modelName}
            travelFeePolicy={travelFeePolicy}
          />
        ) : null;

        const loadError = availabilityLoadError ? (
          <Notice variant="error" role="alert">
            <FormattedMessage
              id="BookingDatesForm.availabilityLoadError"
              values={{ name: modelName }}
            />
          </Notice>
        ) : null;

        const dateField = (
          <FieldBookingDates
            name="bookingDates"
            layout={isStack ? 'stack' : 'popover'}
            numberOfMonths={STACK_MONTHS}
            isOpen={isCalendarOpen}
            onOpenChange={setCalendarOpen}
            startDateId={`${formId}.bookingStartDate`}
            endDateId={`${formId}.bookingEndDate`}
            format={v => {
              const { startDate, endDate } = v || {};
              // Format the Final Form field's value for the DatePicker
              // DatePicker operates on local time zone, but the form uses listing's time zone
              const formattedStart = startDate
                ? timeOfDayFromTimeZoneToLocal(startDate, timeZone)
                : startDate;
              const endDateForPicker =
                isDaily && endDate ? getInclusiveEndDate(endDate, timeZone) : endDate;
              const formattedEnd = endDateForPicker
                ? timeOfDayFromTimeZoneToLocal(endDateForPicker, timeZone)
                : endDateForPicker;
              return v ? { startDate: formattedStart, endDate: formattedEnd } : v;
            }}
            parse={v => {
              const { startDate, endDate } = v || {};
              return v ? getStartAndEndOnTimeZone(startDate, endDate, isDaily, timeZone) : v;
            }}
            validate={composeValidators(
              required(intl.formatMessage({ id: 'BookingDatesForm.requiredDate' })),
              bookingDatesRequired(
                intl.formatMessage({ id: 'FieldDateRangeInput.invalidStartDate' }),
                intl.formatMessage({ id: 'FieldDateRangeInput.invalidEndDate' })
              )
            )}
            isDayBlocked={isDayBlockedForBooking}
            isOutsideRange={isOutsideBookableWindow}
            isBlockedBetween={isBlockedBetween(allTimeSlots, timeZone)}
            onRangeConflict={handleRangeConflict}
            conflictNotice={conflictNotice}
            preview={availabilityPreview}
            disabled={datesDisabled}
            showPreviousMonthStepper={showPreviousMonthStepper(currentMonth, timeZone)}
            showNextMonthStepper={showNextMonthStepper(
              currentMonth,
              dayCountAvailableForBooking,
              timeZone
            )}
            onMonthChange={date => {
              const localizedDate = timeOfDayFromLocalToTimeZone(date, timeZone);
              onMonthClick(localizedDate < currentMonth ? prevMonthFn : nextMonthFn);
              setCurrentMonth(localizedDate);
            }}
            onChange={values => {
              const { startDate: startDateFromValues, endDate: endDateFromValues } = values || {};
              const hasRange = !!(startDateFromValues && endDateFromValues);
              if (onDatesChange) {
                onDatesChange(hasRange);
              }
              if (!hasRange) {
                return;
              }
              const { startDate, endDate } = getStartAndEndOnTimeZone(
                startDateFromValues,
                endDateFromValues,
                isDaily,
                timeZone
              );
              onHandleFetchLineItems({
                values: {
                  priceVariantName: values?.priceVariantName || null,
                  startDate,
                  endDate,
                },
              });
            }}
          />
        );

        const finePrint = (
          <p className={css.finePrint}>
            {payoutDetailsWarning ? (
              payoutDetailsWarning
            ) : (
              <FormattedMessage
                id={isStack ? 'BookingDatesForm.finePrintShort' : 'BookingDatesForm.finePrint'}
                values={{ name: modelName }}
              />
            )}
          </p>
        );

        if (isStack) {
          // Phone sheet (B03/B04): calendar, notices and price scroll; the single cobalt action
          // sits in a sticky footer.
          return (
            <Form id={formId} onSubmit={handleSubmit} className={classes}>
              {pickedStartListener}
              <div className={css.sheetBody}>
                {loadError}
                {dateField}
                {noticeGuide}
                {breakdown}
                <FetchLineItemsError error={fetchLineItemsError} />
              </div>
              <div className={css.sheetFooter}>
                <PrimaryButton
                  type="submit"
                  className={css.ctaButton}
                  inProgress={fetchLineItemsInProgress}
                  disabled={!hasDates || submitDisabled}
                >
                  <FormattedMessage
                    id={
                      hasDates
                        ? 'BookingDatesForm.requestToBook'
                        : 'BookingDatesForm.selectYourDates'
                    }
                  />
                </PrimaryButton>
                {finePrint}
              </div>
            </Form>
          );
        }

        return (
          <Form
            id={formId}
            onSubmit={handleSubmit}
            className={classes}
            enforcePagePreloadFor="CheckoutPage"
          >
            {pickedStartListener}
            {PriceVariantFieldComponent ? (
              <PriceVariantFieldComponent
                priceVariants={priceVariants}
                priceVariantName={values?.priceVariantName || null}
                onPriceVariantChange={onPriceVariantChange(formRenderProps)}
                disabled={!isPublishedListing}
              />
            ) : null}
            {loadError}
            {dateField}
            {noticeGuide}
            {breakdown}
            <FetchLineItemsError error={fetchLineItemsError} />
            {hasDates ? (
              <PrimaryButton
                type="submit"
                className={css.ctaButton}
                inProgress={fetchLineItemsInProgress}
                disabled={submitDisabled}
              >
                <FormattedMessage id="BookingDatesForm.requestToBook" />
              </PrimaryButton>
            ) : (
              <PrimaryButton
                type="button"
                className={css.ctaButton}
                disabled={datesDisabled}
                onClick={() => setCalendarOpen(true)}
              >
                <FormattedMessage id="BookingDatesForm.selectDates" />
              </PrimaryButton>
            )}
            {finePrint}
          </Form>
        );
      }}
    />
  );
};

export default BookingDatesForm;
