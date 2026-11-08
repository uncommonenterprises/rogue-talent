import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import { RtIcon } from '../../../components';

import {
  DAY_FREE,
  DAY_PAST,
  DAY_TODAY,
  MONTH_ERROR,
  MONTH_IDLE,
  MONTH_READY,
  SPARSE_FREE_DAYS,
  addMonths,
  dayKeyToUtcNoon,
  getAvailabilityModel,
  getMonthFetchRange,
  getMonthGrid,
} from './availabilityCalendar.helpers';

import css from './AvailabilityCalendar.module.css';

// Months fetched ahead when the calendar first shows: the page already loads this month and the
// next (ListingPage.duck.js loadData); these two more match the phone sheet's four-month stack,
// which covers the 90-day bookable window.
const PREFETCH_OFFSETS = [2, 3];
// Monday 2 to Sunday 8 November 2026, used only to print the weekday headings (week starts
// Monday) in the visitor's language.
const WEEK_DAY_KEYS = [2, 3, 4, 5, 6, 7, 8].map(d => `2026-11-0${d}`);

const formatDay = (intl, dayKey, options) =>
  intl.formatDate(dayKeyToUtcNoon(dayKey), { timeZone: 'UTC', ...options });

const formatMonthName = (intl, monthId) => formatDay(intl, `${monthId}-01`, { month: 'long' });

const formatMonthTitle = (intl, monthId) =>
  formatDay(intl, `${monthId}-01`, { month: 'long', year: 'numeric' });

const formatShortDay = (intl, dayKey) =>
  formatDay(intl, dayKey, { weekday: 'short', day: 'numeric', month: 'short' });

const Skeleton = ({ modelName }) => (
  <div className={css.skeleton} aria-busy="true">
    <div className={css.skeletonGrid} aria-hidden="true">
      {Array.from({ length: 35 }, (_, i) => (
        <span key={i} className={css.skeletonCell} />
      ))}
    </div>
    <p className={css.srOnly} role="status">
      <FormattedMessage id="AvailabilityCalendar.loading" values={{ name: modelName }} />
    </p>
  </div>
);

/**
 * Read-only month calendar of a model's free days (B03b). Free days are green (tint, bold text);
 * every other day is muted, and days that could otherwise be booked are struck through, so
 * colour is never the only signal. It never selects a range itself: a click on a free day hands
 * the date to the booking form (onPickDate), which opens the existing date picker with it as the
 * start date.
 *
 * Client-only: it is rendered after mount (it needs the logged-in user and the screen width), so
 * fetching more months here on month changes follows the date picker's own pattern.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.monthlyTimeSlots the date picker's time slots, by month
 * @param {string} props.timeZone listing time zone
 * @param {string} [props.noticeKey] min_booking_notice
 * @param {number} props.dayCountAvailableForBooking
 * @param {Object} props.listingId
 * @param {Function} [props.onFetchTimeSlots] (listingId, start, end, timeZone) => Promise
 * @param {string} props.modelName
 * @param {boolean} [props.readOnly] no clicks, no chips (the model's own preview)
 * @param {Function} [props.onPickDate] dayKey => void
 * @param {'always'|'sparse'} [props.nextFreeMode] when to show the "Next free" chips
 * @param {Date} [props.now] current time (tests)
 * @returns {JSX.Element}
 */
const AvailabilityCalendar = props => {
  const intl = useIntl();
  const {
    className,
    monthlyTimeSlots = {},
    timeZone,
    noticeKey,
    dayCountAvailableForBooking,
    listingId,
    onFetchTimeSlots,
    modelName,
    readOnly = false,
    onPickDate,
    nextFreeMode = 'sparse',
    now,
  } = props;

  const model = useMemo(
    () =>
      getAvailabilityModel({
        monthlyTimeSlots,
        timeZone,
        noticeKey,
        dayCountAvailableForBooking,
        ...(now ? { now } : {}),
      }),
    [monthlyTimeSlots, timeZone, noticeKey, dayCountAvailableForBooking, now]
  );
  const [monthId, setMonthId] = useState(model.todayMonthId);

  const fetchMonth = (id, { retry = false } = {}) => {
    const status = model.getMonthStatus(id);
    const shouldFetch = status === MONTH_IDLE || (retry && status === MONTH_ERROR);
    if (!onFetchTimeSlots || !listingId || !shouldFetch) {
      return;
    }
    const range = getMonthFetchRange({
      monthId: id,
      timeZone,
      dayCountAvailableForBooking,
      ...(now ? { now } : {}),
    });
    if (range) {
      onFetchTimeSlots(listingId, range.start, range.end, timeZone);
    }
  };

  useEffect(() => {
    PREFETCH_OFFSETS.forEach(offset => fetchMonth(addMonths(model.todayMonthId, offset)));
  }, []);

  const goToMonth = id => {
    setMonthId(id);
    // Like the date picker: load the month shown and the one after it.
    fetchMonth(id, { retry: true });
    fetchMonth(addMonths(id, 1));
  };

  const status = model.getMonthStatus(monthId);
  const isReady = status === MONTH_READY;
  const freeDays = isReady ? model.getMonthFreeDays(monthId) : [];
  const canGoBack = monthId > model.todayMonthId;
  const canGoForward = monthId < model.lastMonthId;

  const nextFree = readOnly ? [] : model.getNextFreeDays();
  const showNextFree =
    nextFree.length > 0 &&
    (nextFreeMode === 'always' || (isReady && freeDays.length < SPARSE_FREE_DAYS));

  const nextMonthWithFree =
    isReady && freeDays.length === 0 ? model.findNextMonthWithFree(monthId) : null;

  const pick = dayKey => {
    if (!readOnly && onPickDate) {
      onPickDate(dayKey);
    }
  };

  const { leadingBlanks, days } = getMonthGrid(monthId);
  const weekdays = WEEK_DAY_KEYS.map(dayKey => formatDay(intl, dayKey, { weekday: 'short' }));

  const dayCell = dayKey => {
    const dayStatus = model.getDayStatus(dayKey);
    const isFree = dayStatus === DAY_FREE;
    const isToday = dayStatus === DAY_TODAY;
    const number = parseInt(dayKey.slice(8), 10);
    const date = formatDay(intl, dayKey, { weekday: 'short', day: 'numeric', month: 'long' });
    const labelId = isFree
      ? 'AvailabilityCalendar.dayFree'
      : isToday
      ? 'AvailabilityCalendar.dayToday'
      : dayStatus === DAY_PAST
      ? 'AvailabilityCalendar.dayPast'
      : 'AvailabilityCalendar.dayUnavailable';
    const label = intl.formatMessage({ id: labelId }, { date });
    const classes = classNames(css.day, {
      [css.free]: isFree,
      [css.past]: dayStatus === DAY_PAST,
      [css.unavailable]: !isFree && dayStatus !== DAY_PAST,
      [css.today]: isToday,
      [css.readOnly]: readOnly,
    });

    if (isFree && !readOnly) {
      return (
        <button
          key={dayKey}
          type="button"
          className={classes}
          aria-label={label}
          data-date={dayKey}
          onClick={() => pick(dayKey)}
        >
          {number}
        </button>
      );
    }
    return (
      <span key={dayKey} className={classes} data-date={dayKey} data-status={dayStatus}>
        <span aria-hidden="true">{number}</span>
        <span className={css.srOnly}>{label}</span>
      </span>
    );
  };

  return (
    <div className={classNames(css.root, className)}>
      {showNextFree ? (
        <div className={css.nextFree}>
          <span className={css.nextFreeLabel}>
            <FormattedMessage id="AvailabilityCalendar.nextFree" />
          </span>
          {nextFree.map(dayKey => (
            <button
              key={dayKey}
              type="button"
              className={css.chip}
              data-date={dayKey}
              onClick={() => {
                setMonthId(dayKey.slice(0, 7));
                pick(dayKey);
              }}
            >
              {formatShortDay(intl, dayKey)}
            </button>
          ))}
        </div>
      ) : null}

      <div className={css.month}>
        <div className={css.head}>
          <h4 className={css.title} aria-live="polite">
            {formatMonthTitle(intl, monthId)}
          </h4>
          <span className={css.nav}>
            <button
              type="button"
              className={css.navButton}
              onClick={() => goToMonth(addMonths(monthId, -1))}
              disabled={!canGoBack}
              aria-label={intl.formatMessage({ id: 'AvailabilityCalendar.previousMonth' })}
            >
              <RtIcon name="chevronLeft" />
            </button>
            <button
              type="button"
              className={css.navButton}
              onClick={() => goToMonth(addMonths(monthId, 1))}
              disabled={!canGoForward}
              aria-label={intl.formatMessage({ id: 'AvailabilityCalendar.nextMonth' })}
            >
              <RtIcon name="chevronRight" />
            </button>
          </span>
        </div>

        {isReady ? (
          <>
            <div className={css.weekdays} aria-hidden="true">
              {weekdays.map(w => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className={css.grid} role="group" aria-label={formatMonthTitle(intl, monthId)}>
              {Array.from({ length: leadingBlanks }, (_, i) => (
                <span key={`blank-${i}`} className={css.blank} aria-hidden="true" />
              ))}
              {days.map(dayCell)}
            </div>
          </>
        ) : status === MONTH_ERROR ? (
          <div className={css.error} role="alert">
            <RtIcon name="alert" className={css.errorIcon} />
            <p>
              <FormattedMessage id="AvailabilityCalendar.loadError" values={{ name: modelName }} />{' '}
              <button
                type="button"
                className={css.textButton}
                onClick={() => fetchMonth(monthId, { retry: true })}
              >
                <FormattedMessage id="AvailabilityCalendar.retry" />
              </button>
            </p>
          </div>
        ) : (
          <Skeleton modelName={modelName} />
        )}
      </div>

      {isReady && freeDays.length === 0 ? (
        <div className={css.empty}>
          <p>
            <strong>
              <FormattedMessage
                id="AvailabilityCalendar.emptyMonth"
                values={{ month: formatMonthName(intl, monthId) }}
              />
            </strong>
            {nextMonthWithFree ? (
              <>
                {' '}
                <button
                  type="button"
                  className={css.textButton}
                  onClick={() => goToMonth(nextMonthWithFree)}
                >
                  <FormattedMessage
                    id="AvailabilityCalendar.seeMonth"
                    values={{ month: formatMonthName(intl, nextMonthWithFree) }}
                  />
                </button>
              </>
            ) : null}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default AvailabilityCalendar;
