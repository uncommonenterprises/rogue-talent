import React, { useEffect, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../../../util/reactIntl';
import {
  getStartOf,
  isInRange,
  isDateSameOrAfter,
  isSameDate,
  monthIdString,
} from '../../../../../util/dates';
import {
  getStartOfMonth,
  getStartOfNextMonth,
  getStartOfPrevMonth,
  endOfAvailabilityExceptionRange,
} from '../availability.helpers';

import css from './MonthAvailabilityCalendar.module.css';

// Full weekday order used to rotate labels/grid to the locale's first day of week.
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAY_SHORT = {
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
};

const Chevron = ({ direction }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d={direction === 'left' ? 'M10 3 L5 8 L10 13' : 'M6 3 L11 8 L6 13'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Start-of-day "today" in the plan time zone.
const todayInZone = timeZone => getStartOf(new Date(), 'day', timeZone);

// A date is blocked when a not-available (seats === 0) exception covers it.
const findBlockingExceptions = (date, exceptions, timeZone) =>
  exceptions.filter(
    e =>
      e?.attributes?.seats === 0 &&
      isInRange(date, e.attributes.start, e.attributes.end, 'day', timeZone)
  );

// Build a 6-week (42 day) grid whose first cell is the locale's first-day-of-week
// on or before the 1st of the month.
const buildGrid = (monthStart, timeZone, firstDayOfWeek) => {
  // How many days to step back so the grid starts on the locale's first day of week.
  const monthStartDayIndex = new Date(
    monthStart.toLocaleString('en-US', { timeZone })
  ).getDay();
  const offsetBack = (monthStartDayIndex - firstDayOfWeek + 7) % 7;
  const gridStart = getStartOf(monthStart, 'day', timeZone, -offsetBack, 'days');
  return Array.from({ length: 42 }, (_, i) => getStartOf(gridStart, 'day', timeZone, i, 'days'));
};

/**
 * Month-grid availability calendar. Models are available by default; each cell can be
 * toggled to block/unblock a single day (a not-available exception). Multi-day blocks are
 * handled by the range form in the panel. See docs/availability-calendar-spec.md.
 *
 * @param {Object} props
 * @param {Object} props.listingId
 * @param {string} props.timeZone plan time zone
 * @param {Array<Object>} props.exceptions availability exceptions (allExceptions)
 * @param {Object} props.monthlyExceptionQueries fetch state keyed by 'YYYY-MM'
 * @param {Function} props.onFetchExceptions ({listingId, isWeekly, start, end, timeZone})
 * @param {Function} props.onAddException ({listingId, seats, start, end})
 * @param {Function} props.onDeleteException ({id})
 * @param {number} props.firstDayOfWeek 0 (Sun) - 6 (Sat)
 * @param {boolean} props.updateInProgress
 */
const MonthAvailabilityCalendar = props => {
  const {
    className,
    listingId,
    timeZone,
    exceptions = [],
    monthlyExceptionQueries = {},
    onFetchExceptions,
    onAddException,
    onDeleteException,
    firstDayOfWeek = 1,
    updateInProgress,
  } = props;
  const intl = useIntl();

  const today = todayInZone(timeZone);
  const rangeEnd = endOfAvailabilityExceptionRange(timeZone, today);
  const [visibleMonth, setVisibleMonth] = useState(getStartOfMonth(today, timeZone));
  // The specific day currently being saved, so we can show a spinner on just that cell.
  const [pendingKey, setPendingKey] = useState(null);

  const monthId = monthIdString(visibleMonth, timeZone);
  const monthQuery = monthlyExceptionQueries[monthId];
  const isLoading = monthQuery?.fetchExceptionsInProgress;

  // Fetch exceptions for the visible month once (guarded by monthlyExceptionQueries).
  useEffect(() => {
    if (!listingId || !onFetchExceptions) {
      return;
    }
    const alreadyQueried = !!monthlyExceptionQueries[monthId];
    const monthInRange = isInRange(visibleMonth, getStartOfMonth(today, timeZone), rangeEnd);
    if (!alreadyQueried && monthInRange) {
      const start = isDateSameOrAfter(today, visibleMonth) ? today : visibleMonth;
      const nextMonth = getStartOfNextMonth(visibleMonth, timeZone);
      const end = isDateSameOrAfter(nextMonth, rangeEnd) ? rangeEnd : nextMonth;
      onFetchExceptions({ listingId, isWeekly: false, start, end, timeZone });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthId, listingId]);

  const canGoPrev = isDateSameOrAfter(
    getStartOfPrevMonth(visibleMonth, timeZone),
    getStartOfMonth(today, timeZone)
  );
  const canGoNext = isDateSameOrAfter(rangeEnd, getStartOfNextMonth(visibleMonth, timeZone));

  const grid = buildGrid(visibleMonth, timeZone, firstDayOfWeek);
  const rotatedWeekdays = [
    ...WEEKDAY_KEYS.slice(firstDayOfWeek),
    ...WEEKDAY_KEYS.slice(0, firstDayOfWeek),
  ];

  const visibleMonthIndex = new Date(
    visibleMonth.toLocaleString('en-US', { timeZone })
  ).getMonth();

  const toggleDay = date => {
    const isPast = !isDateSameOrAfter(date, today);
    const isBeyondRange = isDateSameOrAfter(date, rangeEnd);
    if (isPast || isBeyondRange || updateInProgress) {
      return;
    }
    const key = monthIdString(date, timeZone) + '-' + date.getDate();
    const blocking = findBlockingExceptions(date, exceptions, timeZone);
    setPendingKey(key);
    const done = () => setPendingKey(null);

    if (blocking.length > 0) {
      // Unblock: remove any exception(s) covering this day.
      Promise.all(blocking.map(e => onDeleteException({ id: e.id }))).then(done, done);
    } else {
      // Block a single day: [startOfDay, startOfNextDay).
      const start = getStartOf(date, 'day', timeZone);
      const end = getStartOf(date, 'day', timeZone, 1, 'days');
      onAddException({ listingId, seats: 0, start, end }).then(done, done);
    }
  };

  return (
    <div className={classNames(css.root, className)}>
      <div className={css.header}>
        <button
          type="button"
          className={css.navButton}
          onClick={() => canGoPrev && setVisibleMonth(getStartOfPrevMonth(visibleMonth, timeZone))}
          disabled={!canGoPrev}
          aria-label={intl.formatMessage({ id: 'MonthAvailabilityCalendar.previousMonth' })}
        >
          <Chevron direction="left" />
        </button>
        <span className={css.monthLabel}>
          {intl.formatDate(visibleMonth, { month: 'long', year: 'numeric', timeZone })}
        </span>
        <button
          type="button"
          className={css.navButton}
          onClick={() => canGoNext && setVisibleMonth(getStartOfNextMonth(visibleMonth, timeZone))}
          disabled={!canGoNext}
          aria-label={intl.formatMessage({ id: 'MonthAvailabilityCalendar.nextMonth' })}
        >
          <Chevron direction="right" />
        </button>
      </div>

      <div className={css.weekdays}>
        {rotatedWeekdays.map(d => (
          <span key={d} className={css.weekday}>
            {WEEKDAY_SHORT[d]}
          </span>
        ))}
      </div>

      <div className={css.grid} aria-busy={isLoading}>
        {grid.map(date => {
          const inMonth =
            new Date(date.toLocaleString('en-US', { timeZone })).getMonth() === visibleMonthIndex;
          const isPast = !isDateSameOrAfter(date, today);
          const isBeyondRange = isDateSameOrAfter(date, rangeEnd);
          const isToday = isSameDate(date, today);
          const blocked = findBlockingExceptions(date, exceptions, timeZone).length > 0;
          const key = monthIdString(date, timeZone) + '-' + date.getDate();
          const isPending = pendingKey === key;
          const disabled = isPast || isBeyondRange;

          const cellClasses = classNames(css.day, {
            [css.dayOutside]: !inMonth,
            [css.dayPast]: disabled,
            [css.dayBlocked]: blocked && !disabled,
            [css.dayAvailable]: !blocked && !disabled,
            [css.dayToday]: isToday,
            [css.dayPending]: isPending,
          });

          const dayNumber = new Date(date.toLocaleString('en-US', { timeZone })).getDate();

          return (
            <button
              type="button"
              key={key}
              className={cellClasses}
              onClick={() => toggleDay(date)}
              disabled={disabled || updateInProgress}
              aria-pressed={blocked}
              title={
                disabled
                  ? undefined
                  : blocked
                  ? intl.formatMessage({ id: 'MonthAvailabilityCalendar.blockedHint' })
                  : intl.formatMessage({ id: 'MonthAvailabilityCalendar.availableHint' })
              }
            >
              <span className={css.dayNumber}>{dayNumber}</span>
              {blocked && !disabled ? <span className={css.blockedMark} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>

      <div className={css.legend}>
        <span className={css.legendItem}>
          <span className={classNames(css.swatch, css.swatchAvailable)} /> <FormattedMessage id="MonthAvailabilityCalendar.legendAvailable" />
        </span>
        <span className={css.legendItem}>
          <span className={classNames(css.swatch, css.swatchBlocked)} /> <FormattedMessage id="MonthAvailabilityCalendar.legendBlocked" />
        </span>
      </div>
    </div>
  );
};

export default MonthAvailabilityCalendar;
