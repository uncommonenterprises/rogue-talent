import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { formatMoneyCompact } from '../../util/currency';
import { userDisplayNameAsString } from '../../util/data';
import { getModelFirstName } from '../../util/modelProfile';
import {
  formatDay,
  formatDayTime,
  getDailyRange,
  getReplyByDeadline,
} from '../../util/bookingSummary';
import { getBookingStatus, getHoursLeft, getRowNoteId } from '../../util/bookingStatus';
import { useNow } from '../../util/useNow';
import {
  TX_TRANSITION_ACTOR_CUSTOMER,
  getProcess,
  resolveLatestProcessName,
} from '../../transactions/transaction';

import { Avatar, BookingStatusChip, NamedLink } from '../../components';

import css from './InboxPage.module.css';

const strong = text => <strong>{text}</strong>;

// "Wed 25 Nov to Thu 26 Nov" or "Fri 13 Nov".
const datesLabel = (intl, booking, timeZone) => {
  const range = getDailyRange(booking?.attributes?.start, booking?.attributes?.end);
  if (!range) {
    return null;
  }
  return range.dayCount === 1
    ? formatDay(intl, range.start, timeZone)
    : intl.formatMessage(
        { id: 'BookingDatesForm.summaryRange' },
        {
          start: formatDay(intl, range.start, timeZone),
          end: formatDay(intl, range.lastDay, timeZone),
        }
      );
};

// The money on the row: what the client pays, or what the model earns (B09).
const moneyLabel = (intl, tx, isCustomer, status) => {
  const money = isCustomer ? tx.attributes?.payinTotal : tx.attributes?.payoutTotal;
  if (!money) {
    return null;
  }
  const amount = formatMoneyCompact(intl, money);
  if (isCustomer) {
    return amount;
  }
  if (['requested', 'accepted'].includes(status.status)) {
    return intl.formatMessage({ id: 'BookingStatus.row.willEarn' }, { amount });
  }
  if (status.status === 'completed') {
    return intl.formatMessage({ id: 'BookingStatus.row.earned' }, { amount });
  }
  return amount;
};

/**
 * One booking in "Your bookings" (client) or "Booking requests" (model), B09: who, the status
 * chip, the dates and money, and one sentence (with the reply-by time while Requested). The
 * whole row is the link, at least 72px tall.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.tx transaction (with customer, provider, listing, booking)
 * @param {'customer'|'provider'} props.transactionRole
 * @param {Object} props.intl
 * @param {boolean} [props.showNotificationDot]
 * @returns {JSX.Element|null} null if this side has nothing to show (the model never sees the
 *   client's unfinished payments)
 */
const BookingInboxRow = props => {
  const { tx, transactionRole, intl, showNotificationDot = false } = props;
  const now = useNow();
  const isCustomer = transactionRole === TX_TRANSITION_ACTOR_CUSTOMER;

  const processName = resolveLatestProcessName(tx?.attributes?.processName);
  let state = null;
  try {
    state = getProcess(processName).getState(tx);
  } catch (e) {
    state = null;
  }
  const status = getBookingStatus({
    state,
    role: transactionRole,
    lastTransition: tx?.attributes?.lastTransition,
  });
  if (!status) {
    return null;
  }

  const { customer, provider, listing, booking } = tx;
  const otherUser = isCustomer ? provider : customer;
  const timeZone = listing?.attributes?.availabilityPlan?.timezone;
  const modelName = getModelFirstName(provider, listing?.attributes?.title);
  const clientName = userDisplayNameAsString(customer, '');
  const clientCompany = customer?.attributes?.profile?.publicData?.company_name;
  const name = isCustomer
    ? userDisplayNameAsString(provider, '')
    : clientCompany
    ? intl.formatMessage(
        { id: 'BookingStatus.row.clientWithCompany' },
        { name: clientName, company: clientCompany }
      )
    : clientName;

  const replyBy = status.status === 'requested' ? getReplyByDeadline(tx) : null;
  const deadline = replyBy ? formatDayTime(intl, replyBy.deadline, timeZone) : null;
  const noteId = getRowNoteId(status, transactionRole, !!deadline);
  const hoursLeft = !isCustomer && replyBy && now ? getHoursLeft(replyBy.deadline, now) : null;

  const meta = [datesLabel(intl, booking, timeZone), moneyLabel(intl, tx, isCustomer, status)]
    .filter(Boolean)
    .join(' · ');

  return (
    <NamedLink
      className={css.bookingRow}
      name={isCustomer ? 'OrderDetailsPage' : 'SaleDetailsPage'}
      params={{ id: tx.id.uuid }}
    >
      <div className={css.bookingRowAvatar}>
        <Avatar user={otherUser} disableProfileLink />
        {showNotificationDot ? <span className={css.bookingRowDot} /> : null}
      </div>
      <div className={css.bookingRowBody}>
        <div className={css.bookingRowTop}>
          <span className={css.bookingRowName}>{name}</span>
          <BookingStatusChip status={status.chip}>
            <FormattedMessage id={status.labelId} />
          </BookingStatusChip>
        </div>
        {meta ? <span className={css.bookingRowMeta}>{meta}</span> : null}
        {noteId ? (
          <span
            className={classNames(css.bookingRowNote, {
              [css.bookingRowNoteUrgent]: status.status === 'requested',
            })}
          >
            <FormattedMessage id={noteId} values={{ name: modelName, deadline, strong }} />
            {hoursLeft != null ? (
              <>
                {' '}
                {hoursLeft < 1 ? (
                  <FormattedMessage id="BookingStatus.lessThanAnHourLeft" />
                ) : (
                  <FormattedMessage id="BookingStatus.hoursLeft" values={{ hours: hoursLeft }} />
                )}
              </>
            ) : null}
          </span>
        ) : null}
      </div>
    </NamedLink>
  );
};

export default BookingInboxRow;
