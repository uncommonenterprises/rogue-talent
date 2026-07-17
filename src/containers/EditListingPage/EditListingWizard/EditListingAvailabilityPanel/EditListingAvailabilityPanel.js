import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../../util/reactIntl';
import { getDefaultTimeZoneOnBrowser, timestampToDate } from '../../../../util/dates';
import { LISTING_STATE_DRAFT } from '../../../../util/types';
import { isFullDay } from '../../../../transactions/transaction';

// Import shared components
import { Button, H3, InlineTextButton, ListingLink, Modal } from '../../../../components';

// Import modules from this directory
import EditListingAvailabilityExceptionForm from './EditListingAvailabilityExceptionForm';
import MonthAvailabilityCalendar from './MonthAvailabilityCalendar/MonthAvailabilityCalendar';
import { MIN_BOOKING_NOTICE_KEY } from '../rateFields';

import css from './EditListingAvailabilityPanel.module.css';

// This is the order of days as JavaScript understands them (getDay() -> 0 = Sunday).
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const EDIT_AVAILABILITY_EXCEPTIONS_BUTTON = 'editAvailabilityExceptionsButton';

const defaultTimeZone = () =>
  typeof window !== 'undefined' ? getDefaultTimeZoneOnBrowser() : 'Etc/UTC';

// Availability modes (stored in listing publicData.availabilityMode):
// - 'available'  : available by default; the model blocks dates they're away (seats-0 exceptions)
// - 'unavailable': unavailable by default; the model opens the dates they'll work (seats-1 exceptions)
const MODE_AVAILABLE = 'available';
const MODE_UNAVAILABLE = 'unavailable';

// "Available by default" baseline: every weekday open, full day, one seat.
const createAllOpenPlan = timezone => ({
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

// "Unavailable by default" baseline: an empty plan (no open days); the model opens
// specific dates via seats-1 exceptions. See docs/availability-calendar-spec.md.
const createAllClosedPlan = timezone => ({
  availabilityPlan: {
    type: 'availability-plan/time',
    timezone,
    entries: [],
  },
});

const planForMode = (mode, timezone) =>
  mode === MODE_UNAVAILABLE ? createAllClosedPlan(timezone) : createAllOpenPlan(timezone);

//////////////////////////////////
// EditListingAvailabilityPanel //
//////////////////////////////////

/**
 * A panel where a provider (model) manages availability. Baseline is "available by
 * default" (a fully-open plan is created on first visit); the month calendar lets them
 * block/unblock individual days, and the exception form blocks multi-day ranges.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className
 * @param {string?} props.rootClassName
 * @param {Object?} props.listing listing entity from API (draft/published/etc.)
 * @param {boolean} props.disabled
 * @param {boolean} props.ready
 * @param {Object} props.monthlyExceptionQueries E.g. '2022-12': { fetchExceptionsError, fetchExceptionsInProgress }
 * @param {Array<Object>} props.allExceptions
 * @param {Function} props.onAddAvailabilityException
 * @param {Function} props.onDeleteAvailabilityException
 * @param {Function} props.onFetchExceptions
 * @param {Function} props.onSubmit
 * @param {Function} props.onManageDisableScrolling
 * @param {Function} props.onNextTab
 * @param {string} props.submitButtonText
 * @param {boolean} props.updateInProgress
 * @param {Object} props.errors
 * @param {Object} props.config app config
 * @param {Object} props.intl
 * @returns {JSX.Element}
 */
const EditListingAvailabilityPanel = props => {
  const {
    className,
    rootClassName,
    listing,
    monthlyExceptionQueries,
    allExceptions = [],
    onAddAvailabilityException,
    onDeleteAvailabilityException,
    disabled,
    ready,
    onFetchExceptions,
    onSubmit,
    onManageDisableScrolling,
    onNextTab,
    submitButtonText,
    updateInProgress,
    errors,
    config,
    updatePageTitle: UpdatePageTitle,
    intl,
  } = props;

  const [isEditExceptionsModalOpen, setIsEditExceptionsModalOpen] = useState(false);

  const firstDayOfWeek = config.localization.firstDayOfWeek;
  const classes = classNames(rootClassName || css.root, className);
  const listingAttributes = listing?.attributes;
  const { unitType } = listingAttributes?.publicData || {};

  const useFullDays = isFullDay(unitType);

  const hasAvailabilityPlan = !!listingAttributes?.availabilityPlan;
  const isPublished = listing?.id && listingAttributes?.state !== LISTING_STATE_DRAFT;
  const availabilityPlan =
    listingAttributes?.availabilityPlan || createAllOpenPlan(defaultTimeZone()).availabilityPlan;
  const timeZone = availabilityPlan.timezone;

  // Minimum booking notice: a required listing field that lives on this step (moved off
  // "Your profile"). Rendered from the Console field config (so its title/options follow
  // Console) and saved to publicData; the model must choose before continuing.
  const minNoticeField = config.listing.listingFields?.find(f => f.key === MIN_BOOKING_NOTICE_KEY);
  const minNoticeOptions = minNoticeField?.enumOptions || [];
  const currentMinNotice = listingAttributes?.publicData?.[MIN_BOOKING_NOTICE_KEY] || '';
  const saveMinNotice = value => onSubmit({ publicData: { [MIN_BOOKING_NOTICE_KEY]: value } });

  // Availability mode (available-by-default vs unavailable-by-default). Switching modes
  // reinterprets the whole calendar, so it is confirmed and clears existing exceptions.
  const mode = listingAttributes?.publicData?.availabilityMode || MODE_AVAILABLE;
  const [pendingMode, setPendingMode] = useState(null);
  const requestModeSwitch = nextMode => {
    if (nextMode !== mode) {
      setPendingMode(nextMode);
    }
  };
  const confirmModeSwitch = () => {
    const nextMode = pendingMode;
    setPendingMode(null);
    // Clear every existing exception, then set the new baseline plan + mode flag.
    const clears = allExceptions.map(e => onDeleteAvailabilityException({ id: e.id }));
    Promise.all(clears)
      .then(() =>
        onSubmit({ ...planForMode(nextMode, timeZone), publicData: { availabilityMode: nextMode } })
      )
      .catch(() => {
        // Leave the mode unchanged on failure.
      });
  };

  // As soon as the model reaches this step, ensure a baseline plan exists for the current
  // mode so they're not stuck. Guarded so it runs at most once and never overwrites a plan.
  const baselinePlanAttempted = useRef(false);
  useEffect(() => {
    if (!hasAvailabilityPlan && listing?.id && !baselinePlanAttempted.current) {
      baselinePlanAttempted.current = true;
      onSubmit(planForMode(mode, defaultTimeZone())).catch(() => {
        // Allow a retry on a later render if the baseline save failed.
        baselinePlanAttempted.current = false;
      });
    }
  }, [hasAvailabilityPlan, listing, onSubmit, mode]);

  // Save handler for the multi-day range exception form.
  const saveException = values => {
    const { availability, exceptionStartTime, exceptionEndTime, exceptionRange, seats } = values;
    const seatCount = seats != null ? seats : availability === 'available' ? 1 : 0;

    const range = useFullDays
      ? { start: exceptionRange?.startDate, end: exceptionRange?.endDate }
      : { start: timestampToDate(exceptionStartTime), end: timestampToDate(exceptionEndTime) };

    return onAddAvailabilityException({ listingId: listing.id, seats: seatCount, ...range })
      .then(() => {
        setIsEditExceptionsModalOpen(false);
      })
      .catch(e => {
        // Don't close modal if there was an error
      });
  };

  const panelHeadingProps = isPublished
    ? {
        id: 'EditListingAvailabilityPanel.title',
        values: { listingTitle: <ListingLink listing={listing} />, lineBreak: <br /> },
        messageProps: { listingTitle: listing.attributes.title },
      }
    : {
        id: 'EditListingAvailabilityPanel.createListingTitle',
        values: { lineBreak: <br /> },
        messageProps: {},
      };

  return (
    <main className={classes}>
      <UpdatePageTitle
        panelHeading={intl.formatMessage(
          { id: panelHeadingProps.id },
          { ...panelHeadingProps.messageProps }
        )}
      />
      <H3 as="h1">
        <FormattedMessage id={panelHeadingProps.id} values={{ ...panelHeadingProps.values }} />
      </H3>
      <p className={css.guidance}>
        <FormattedMessage
          id={
            mode === MODE_UNAVAILABLE
              ? 'EditListingAvailabilityPanel.guidanceUnavailable'
              : 'EditListingAvailabilityPanel.guidance'
          }
        />
      </p>

      <section className={css.settings}>
        <label className={css.settingLabel} htmlFor="availabilityMode">
          <FormattedMessage id="EditListingAvailabilityPanel.modeLabel" />
        </label>
        <select
          id="availabilityMode"
          className={css.settingSelect}
          value={mode}
          onChange={e => requestModeSwitch(e.target.value)}
          disabled={updateInProgress || !listing?.id}
        >
          <option value={MODE_AVAILABLE}>
            {intl.formatMessage({ id: 'EditListingAvailabilityPanel.modeAvailable' })}
          </option>
          <option value={MODE_UNAVAILABLE}>
            {intl.formatMessage({ id: 'EditListingAvailabilityPanel.modeUnavailable' })}
          </option>
        </select>
        <p className={css.settingHint}>
          <FormattedMessage id="EditListingAvailabilityPanel.modeHint" />
        </p>
      </section>

      {minNoticeField ? (
        <section className={css.settings}>
          <label className={css.settingLabel} htmlFor="minBookingNotice">
            {minNoticeField.label || (
              <FormattedMessage id="EditListingAvailabilityPanel.minNoticeFallbackLabel" />
            )}
          </label>
          <select
            id="minBookingNotice"
            className={css.settingSelect}
            value={currentMinNotice}
            onChange={e => saveMinNotice(e.target.value)}
            disabled={updateInProgress || !listing?.id}
          >
            <option value="" disabled>
              {intl.formatMessage({ id: 'EditListingAvailabilityPanel.minNoticePlaceholder' })}
            </option>
            {minNoticeOptions.map(o => (
              <option key={o.option} value={o.option}>
                {o.label}
              </option>
            ))}
          </select>
          <p className={css.settingHint}>
            <FormattedMessage id="EditListingAvailabilityPanel.minNoticeHint" />
          </p>
        </section>
      ) : null}

      <MonthAvailabilityCalendar
        className={css.section}
        listingId={listing?.id}
        timeZone={timeZone}
        mode={mode}
        exceptions={allExceptions}
        monthlyExceptionQueries={monthlyExceptionQueries}
        onFetchExceptions={onFetchExceptions}
        onAddException={onAddAvailabilityException}
        onDeleteException={onDeleteAvailabilityException}
        firstDayOfWeek={firstDayOfWeek}
        updateInProgress={updateInProgress}
      />

      <section className={css.section}>
        <InlineTextButton
          id={EDIT_AVAILABILITY_EXCEPTIONS_BUTTON}
          className={css.addExceptionButton}
          onClick={() => setIsEditExceptionsModalOpen(true)}
          disabled={disabled || !listing?.id}
          ready={ready}
        >
          <FormattedMessage id="EditListingAvailabilityPanel.addException" />
        </InlineTextButton>
      </section>

      {errors.showListingsError ? (
        <p className={css.error}>
          <FormattedMessage id="EditListingAvailabilityPanel.showListingFailed" />
        </p>
      ) : null}

      {!isPublished ? (
        <Button
          className={css.goToNextTabButton}
          onClick={onNextTab}
          disabled={!hasAvailabilityPlan || (!!minNoticeField && !currentMinNotice)}
        >
          {submitButtonText}
        </Button>
      ) : null}

      {onManageDisableScrolling && isEditExceptionsModalOpen ? (
        <Modal
          id="EditAvailabilityExceptions"
          isOpen={isEditExceptionsModalOpen}
          onClose={() => setIsEditExceptionsModalOpen(false)}
          onManageDisableScrolling={onManageDisableScrolling}
          focusElementId={EDIT_AVAILABILITY_EXCEPTIONS_BUTTON}
          containerClassName={css.modalContainer}
          usePortal
        >
          <EditListingAvailabilityExceptionForm
            formId="EditListingAvailabilityExceptionForm"
            listingId={listing.id}
            allExceptions={allExceptions}
            monthlyExceptionQueries={monthlyExceptionQueries}
            fetchErrors={errors}
            onFetchExceptions={onFetchExceptions}
            onSubmit={saveException}
            timeZone={timeZone}
            unitType={unitType}
            updateInProgress={updateInProgress}
            useFullDays={useFullDays}
          />
        </Modal>
      ) : null}

      {onManageDisableScrolling && pendingMode ? (
        <Modal
          id="ConfirmAvailabilityModeSwitch"
          isOpen={!!pendingMode}
          onClose={() => setPendingMode(null)}
          onManageDisableScrolling={onManageDisableScrolling}
          containerClassName={css.modalContainer}
          usePortal
        >
          <div className={css.confirmModal}>
            <H3 as="h2">
              <FormattedMessage id="EditListingAvailabilityPanel.modeSwitchTitle" />
            </H3>
            <p>
              <FormattedMessage id="EditListingAvailabilityPanel.modeSwitchBody" />
            </p>
            <div className={css.confirmActions}>
              <Button onClick={confirmModeSwitch} inProgress={updateInProgress}>
                <FormattedMessage id="EditListingAvailabilityPanel.modeSwitchConfirm" />
              </Button>
              <InlineTextButton onClick={() => setPendingMode(null)}>
                <FormattedMessage id="EditListingAvailabilityPanel.modeSwitchCancel" />
              </InlineTextButton>
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  );
};

export default EditListingAvailabilityPanel;
