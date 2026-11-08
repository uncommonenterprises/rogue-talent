import React from 'react';
import { Field } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import { OutsideClickHandler, ValidationError } from '../../../components';
import DatePicker from '../../DatePicker/DatePickers/DatePicker';
import { getISODateString } from '../../DatePicker/DatePickers/DatePicker.helpers';

import { formatBookingDay, getInclusiveDayCount } from './bookingDates.helpers';

import css from './FieldBookingDates.module.css';

const isDate = d => d instanceof Date && !isNaN(d);

/**
 * Legend under the calendar (B04): selected, in your range, not available.
 */
export const CalendarLegend = props => {
  const { showUnavailable = true, className } = props;
  return (
    <div className={classNames(css.legend, className)} aria-hidden="true">
      <span className={css.legendItem}>
        <i className={css.legendSelected} />
        <FormattedMessage id="BookingDatesForm.legendSelected" />
      </span>
      <span className={css.legendItem}>
        <i className={css.legendRange} />
        <FormattedMessage id="BookingDatesForm.legendRange" />
      </span>
      {showUnavailable ? (
        <span className={css.legendItem}>
          <i className={css.legendUnavailable} />
          <FormattedMessage id="BookingDatesForm.legendUnavailable" />
        </span>
      ) : null}
    </div>
  );
};

/**
 * Summary box (B04): "Wed 25 Nov to Thu 26 Nov" + "2 full days. Your end date counts as a full
 * day." With no complete range it explains how to pick.
 */
export const CalendarSummary = props => {
  const { startDate, endDate, className } = props;
  const intl = useIntl();
  const hasRange = isDate(startDate) && isDate(endDate);
  const dayCount = hasRange ? getInclusiveDayCount(startDate, endDate) : 0;
  const main = hasRange
    ? dayCount === 1
      ? formatBookingDay(intl, startDate)
      : intl.formatMessage(
          { id: 'BookingDatesForm.summaryRange' },
          { start: formatBookingDay(intl, startDate), end: formatBookingDay(intl, endDate) }
        )
    : isDate(startDate)
    ? formatBookingDay(intl, startDate)
    : intl.formatMessage({ id: 'BookingDatesForm.summaryEmpty' });
  const sub = hasRange
    ? intl.formatMessage({ id: 'BookingDatesForm.summaryDays' }, { dayCount })
    : intl.formatMessage({ id: 'BookingDatesForm.summaryHowTo' });

  return (
    <div className={classNames(css.summary, className)} aria-live="polite">
      <span className={css.summaryMain}>{main}</span>
      <span className={css.summarySub}>{sub}</span>
    </div>
  );
};

const FieldBookingDatesComponent = props => {
  const intl = useIntl();
  const {
    className,
    input,
    meta,
    layout = 'popover',
    isOpen = false,
    onOpenChange = () => {},
    isDayBlocked,
    isOutsideRange,
    isBlockedBetween,
    onChange: parentOnChange,
    onMonthChange,
    onRangeConflict,
    showPreviousMonthStepper,
    showNextMonthStepper,
    firstDayOfWeek,
    numberOfMonths,
    disabled,
    startDateId,
    endDateId,
    conflictNotice,
    preview,
  } = props;

  const { startDate, endDate } = input.value || {};
  const value = [startDate, endDate].filter(isDate);
  const isStack = layout === 'stack';

  const handlePickerChange = picked => {
    if (!Array.isArray(picked)) {
      return;
    }
    const [start, end] = picked;
    const next = start ? { startDate: start, endDate: end } : null;
    if (parentOnChange) {
      parentOnChange(next || {});
    }
    input.onChange(next);
  };

  const handleClear = () => {
    if (onRangeConflict) {
      onRangeConflict(null);
    }
    if (parentOnChange) {
      parentOnChange({});
    }
    input.onChange(null);
  };

  const picker = (
    <DatePicker
      range
      theme="booking"
      layout={isStack ? 'stack' : undefined}
      numberOfMonths={numberOfMonths}
      value={value}
      {...(value[0] ? { startDate: getISODateString(value[0]) } : {})}
      onChange={handlePickerChange}
      onMonthChange={onMonthChange}
      onRangeConflict={onRangeConflict}
      isDayBlocked={day => isOutsideRange(day) || isDayBlocked(day)}
      isBlockedBetween={isBlockedBetween}
      rangeStartHasValue={isDate(startDate)}
      rangeEndHasValue={isDate(endDate)}
      showPreviousMonthStepper={showPreviousMonthStepper}
      showNextMonthStepper={showNextMonthStepper}
      firstDayOfWeek={firstDayOfWeek}
      hasFocusOnMount={!isStack}
      disabled={disabled}
    />
  );

  const calendarContent = (
    <>
      {picker}
      <CalendarLegend />
      {conflictNotice}
      <CalendarSummary startDate={startDate} endDate={endDate} />
    </>
  );

  if (isStack) {
    return (
      <div className={classNames(css.stackRoot, className)}>
        {calendarContent}
        <ValidationError fieldMeta={meta} />
      </div>
    );
  }

  const emptyLabel = intl.formatMessage({ id: 'BookingDatesForm.addDate' });
  const popoverActions = (
    <div className={css.popoverActions}>
      <button type="button" className={css.ghostButton} onClick={handleClear}>
        <FormattedMessage id="BookingDatesForm.clearDates" />
      </button>
      <button type="button" className={css.doneButton} onClick={() => onOpenChange(false)}>
        <FormattedMessage id="BookingDatesForm.done" />
      </button>
    </div>
  );
  // B03b: with an availability preview, the picker opens IN PLACE of the preview (inside the
  // sticky panel's flow, so the panel's own scroll can reach it) instead of as a popover.
  const hasPreview = !!preview;
  return (
    <OutsideClickHandler
      className={classNames(css.root, className)}
      onOutsideClick={() => isOpen && onOpenChange(false)}
    >
      <div
        className={css.picker}
        onKeyDown={e => {
          if (e.key === 'Escape' && isOpen) {
            e.stopPropagation();
            onOpenChange(false);
          }
        }}
      >
        {hasPreview ? (
          isOpen ? (
            <div
              className={css.inlinePicker}
              role="group"
              aria-label={intl.formatMessage({ id: 'BookingDatesForm.chooseDates' })}
            >
              {calendarContent}
              {popoverActions}
            </div>
          ) : (
            <div className={css.previewSlot}>{preview}</div>
          )
        ) : null}
        <div className={css.dateField}>
          <button
            id={startDateId}
            type="button"
            className={css.dateFieldButton}
            onClick={() => onOpenChange(!isOpen)}
            aria-expanded={isOpen}
            disabled={disabled}
          >
            <span className={css.dateFieldLabel}>
              <FormattedMessage id="BookingDatesForm.startLabel" />
            </span>
            <span className={isDate(startDate) ? css.dateFieldValue : css.dateFieldEmpty}>
              {isDate(startDate) ? formatBookingDay(intl, startDate) : emptyLabel}
            </span>
          </button>
          <button
            id={endDateId}
            type="button"
            className={css.dateFieldButton}
            onClick={() => onOpenChange(!isOpen)}
            aria-expanded={isOpen}
            disabled={disabled}
          >
            <span className={css.dateFieldLabel}>
              <FormattedMessage id="BookingDatesForm.endLabel" />
            </span>
            <span className={isDate(endDate) ? css.dateFieldValue : css.dateFieldEmpty}>
              {isDate(endDate) ? formatBookingDay(intl, endDate) : emptyLabel}
            </span>
          </button>
        </div>
        {isOpen && !hasPreview ? (
          <div
            className={css.popover}
            role="dialog"
            aria-label={intl.formatMessage({ id: 'BookingDatesForm.chooseDates' })}
          >
            {calendarContent}
            {popoverActions}
          </div>
        ) : null}
      </div>
      <ValidationError fieldMeta={meta} />
    </OutsideClickHandler>
  );
};

/**
 * Booking dates for the model profile (B04): Start and End fields that open a one-month
 * calendar popover on desktop, or a scrolling stack of months inside the phone sheet.
 * The value is { startDate, endDate } (both inclusive days, in the browser's local time; the
 * form's format/parse convert to and from the listing's time zone).
 *
 * @component
 * @param {Object} props
 * @param {string} props.name Final Form field name
 * @param {'popover'|'stack'} [props.layout] desktop popover or phone stack
 * @param {ReactNode} [props.preview] desktop only: the profile's availability calendar (B03b).
 *   Shown above the Start / End fields; opening the picker replaces it in place.
 * @returns {JSX.Element}
 */
const FieldBookingDates = props => <Field component={FieldBookingDatesComponent} {...props} />;

export default FieldBookingDates;
