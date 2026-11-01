import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';

import { BookingStatusChip, NamedLink } from '../../../components';

import css from './BookingStatusBanner.module.css';

/**
 * The booking page banner (B09): the status chip, a one-line title, a plain sentence that states
 * the money outcome, and the next step where there is one. Same words as the list row.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.bookingStatus from util/bookingStatus getBookingStatus
 * @param {{ titleId: string, bodyId: string }} props.messageIds
 * @param {Object} props.values message values (name, client, dates, total)
 * @param {{ findAnother: boolean, requestAgain: boolean }} [props.nextSteps]
 * @param {Object} [props.listingLinkParams] { id, slug } for "Request {name} again"
 * @param {string} [props.modelName]
 * @returns {JSX.Element}
 */
const BookingStatusBanner = props => {
  const { bookingStatus, messageIds, values, nextSteps = {}, listingLinkParams, modelName } = props;
  const showRequestAgain = nextSteps.requestAgain && !!listingLinkParams;

  return (
    <section className={css.root} aria-labelledby="booking-status-title">
      <BookingStatusChip status={bookingStatus.chip} large>
        <FormattedMessage id={bookingStatus.labelId} />
      </BookingStatusChip>
      <h1 className={css.title} id="booking-status-title">
        <FormattedMessage id={messageIds.titleId} values={values} />
      </h1>
      <p className={css.body}>
        <FormattedMessage id={messageIds.bodyId} values={values} />
      </p>
      {nextSteps.findAnother ? (
        <div className={css.actions}>
          <NamedLink name="SearchPage" className={css.primaryLink}>
            <FormattedMessage id="BookingStatus.findAnotherModel" />
          </NamedLink>
          {showRequestAgain ? (
            <NamedLink name="ListingPage" params={listingLinkParams} className={css.secondaryLink}>
              <FormattedMessage id="BookingStatus.requestAgain" values={{ name: modelName }} />
            </NamedLink>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default BookingStatusBanner;
