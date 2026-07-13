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

import css from './EditListingAvailabilityPanel.module.css';

// This is the order of days as JavaScript understands them (getDay() -> 0 = Sunday).
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const EDIT_AVAILABILITY_EXCEPTIONS_BUTTON = 'editAvailabilityExceptionsButton';

const defaultTimeZone = () =>
  typeof window !== 'undefined' ? getDefaultTimeZoneOnBrowser() : 'Etc/UTC';

// The "available by default" baseline: every weekday open, full day, one seat.
// Models are bookable on every future date and only need to block dates they're
// away/booked (via not-available exceptions). See docs/availability-calendar-spec.md.
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

  // "Available by default": as soon as the model reaches this step, ensure a
  // fully-open baseline plan exists so they are bookable on every date without
  // configuring anything. Guarded so it runs at most once and never overwrites
  // an existing plan.
  const baselinePlanAttempted = useRef(false);
  useEffect(() => {
    if (!hasAvailabilityPlan && listing?.id && !baselinePlanAttempted.current) {
      baselinePlanAttempted.current = true;
      onSubmit(createAllOpenPlan(defaultTimeZone())).catch(() => {
        // Allow a retry on a later render if the baseline save failed.
        baselinePlanAttempted.current = false;
      });
    }
  }, [hasAvailabilityPlan, listing, onSubmit]);

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
        <FormattedMessage id="EditListingAvailabilityPanel.guidance" />
      </p>

      <MonthAvailabilityCalendar
        className={css.section}
        listingId={listing?.id}
        timeZone={timeZone}
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
          disabled={!hasAvailabilityPlan}
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
    </main>
  );
};

export default EditListingAvailabilityPanel;
