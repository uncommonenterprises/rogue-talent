import React, { useState } from 'react';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import {
  getStartOfDay,
  getISODateString,
} from '../../../components/DatePicker/DatePickers/DatePicker.helpers';
import { parseDateFromISO8601, stringifyDateToISO8601 } from '../../../util/dates';

import { Modal, OutsideClickHandler, RtIcon } from '../../../components';
import DatePicker from '../../../components/DatePicker/DatePickers/DatePicker';
import {
  CalendarLegend,
  CalendarSummary,
} from '../../../components/OrderPanel/BookingDatesForm/FieldBookingDates';
import { formatBookingDay } from '../../../components/OrderPanel/BookingDatesForm/bookingDates.helpers';

import css from './SearchJourney.module.css';

const isDate = d => d instanceof Date && !isNaN(d);

/**
 * Parse the search's "dates" param ("2026-11-25,2026-11-26", end day inclusive in day mode).
 *
 * @param {string} param
 * @returns {Array<Date>} [] or [start, end] (local dates)
 */
export const parseDatesParam = param => {
  const [start, end] = typeof param === 'string' ? param.split(',') : [];
  const startDate = start ? parseDateFromISO8601(start) : null;
  const endDate = end ? parseDateFromISO8601(end) : null;
  return isDate(startDate) && isDate(endDate) ? [startDate, endDate] : [];
};

const formatDatesParam = ([start, end]) =>
  `${stringifyDateToISO8601(start)},${stringifyDateToISO8601(end)}`;

/**
 * Dates in the search header (B01): always visible, the same range calendar as the booking panel
 * (B04). Desktop: a popover with one month. Phone: a full-height sheet with four months and an
 * "Apply dates" action. Only past days are blocked here; models are available by default.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.datesParam] current "dates" query param
 * @param {Function} props.onChange (datesParam|null) => void
 * @param {boolean} props.isPhone phone layout (sheet) or desktop (popover)
 * @param {Function} props.onManageDisableScrolling
 * @returns {JSX.Element}
 */
const SearchDates = props => {
  const { datesParam, onChange, isPhone, onManageDisableScrolling } = props;
  const intl = useIntl();
  const current = parseDatesParam(datesParam);
  const [isOpen, setOpen] = useState(false);
  const [draft, setDraft] = useState(current);
  // Month shown in the desktop popover: it cannot page back before this month (B04).
  const [viewMonth, setViewMonth] = useState(null);
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const shownMonth =
    viewMonth ||
    (current[0] ? new Date(current[0].getFullYear(), current[0].getMonth(), 1) : thisMonth);

  const open = () => {
    setDraft(current);
    setViewMonth(null);
    setOpen(true);
  };
  const close = () => setOpen(false);

  const isPast = day => day < getStartOfDay(new Date());

  const handlePick = picked => {
    if (!Array.isArray(picked)) {
      return;
    }
    setDraft(picked);
    // Desktop applies a complete range straight away; the phone sheet waits for "Apply dates".
    if (!isPhone && picked.length === 2) {
      onChange(formatDatesParam(picked));
    }
  };

  const handleClear = () => {
    setDraft([]);
    if (!isPhone) {
      onChange(null);
    }
  };

  const triggerLabel =
    current.length === 2
      ? intl.formatMessage(
          { id: 'BookingDatesForm.summaryRange' },
          { start: formatBookingDay(intl, current[0]), end: formatBookingDay(intl, current[1]) }
        )
      : null;

  const picker = (
    <DatePicker
      range
      theme="booking"
      layout={isPhone ? 'stack' : undefined}
      numberOfMonths={4}
      value={draft}
      {...(draft[0] ? { startDate: getISODateString(draft[0]) } : {})}
      onChange={handlePick}
      isDayBlocked={isPast}
      onMonthChange={month => setViewMonth(month)}
      showPreviousMonthStepper={shownMonth > thisMonth}
      showNextMonthStepper
      hasFocusOnMount={!isPhone}
    />
  );

  const trigger = (
    <button
      type="button"
      className={css.dateTrigger}
      onClick={() => (isOpen ? close() : open())}
      aria-expanded={isOpen}
      aria-label={intl.formatMessage({ id: 'SearchPage.chooseDates' })}
    >
      <RtIcon name="calendar" className={css.dateTriggerIcon} />
      {triggerLabel ? (
        <span className={css.dateTriggerValue}>{triggerLabel}</span>
      ) : (
        <span className={css.dateTriggerEmpty}>
          <FormattedMessage id="SearchPage.addDates" />
        </span>
      )}
    </button>
  );

  if (isPhone) {
    return (
      <div className={css.dates}>
        {trigger}
        <Modal
          id="SearchPage.datesSheet"
          isOpen={isOpen}
          onClose={close}
          usePortal
          onManageDisableScrolling={onManageDisableScrolling}
          containerClassName={css.sheet}
        >
          <div className={css.sheetHead}>
            <h2 className={css.sheetTitle}>
              <FormattedMessage id="BookingDatesForm.chooseDates" />
            </h2>
            <button
              type="button"
              className={css.iconButton}
              onClick={close}
              aria-label={intl.formatMessage({ id: 'OrderPanel.closeSheet' })}
            >
              <RtIcon name="close" />
            </button>
          </div>
          <div className={css.sheetBody}>
            {isOpen ? picker : null}
            <CalendarSummary startDate={draft[0]} endDate={draft[1]} />
          </div>
          <div className={css.sheetFoot}>
            <button
              type="button"
              className={css.primaryButton}
              onClick={() => {
                onChange(draft.length === 2 ? formatDatesParam(draft) : null);
                close();
              }}
            >
              <FormattedMessage id="SearchPage.applyDates" />
            </button>
            <button type="button" className={css.ghostButton} onClick={handleClear}>
              <FormattedMessage id="BookingDatesForm.clearDates" />
            </button>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <OutsideClickHandler className={css.dates} onOutsideClick={() => isOpen && close()}>
      <div
        className={css.datesInner}
        onKeyDown={e => {
          if (e.key === 'Escape' && isOpen) {
            close();
          }
        }}
      >
        {trigger}
        {isOpen ? (
          <div
            className={css.popover}
            role="dialog"
            aria-label={intl.formatMessage({ id: 'SearchPage.chooseDates' })}
          >
            {picker}
            <CalendarLegend showUnavailable={false} />
            <CalendarSummary startDate={draft[0]} endDate={draft[1]} />
            <div className={css.popoverActions}>
              <button type="button" className={css.ghostButton} onClick={handleClear}>
                <FormattedMessage id="BookingDatesForm.clearDates" />
              </button>
              <button type="button" className={css.secondaryButton} onClick={close}>
                <FormattedMessage id="BookingDatesForm.done" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </OutsideClickHandler>
  );
};

export default SearchDates;
