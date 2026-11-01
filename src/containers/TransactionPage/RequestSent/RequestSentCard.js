import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';

import { BookingStatusChip, NamedLink, RtIcon } from '../../../components';

import css from './RequestSent.module.css';

/**
 * The client's "request sent" card (B07): did it go through, the real reply-by deadline, and
 * what happens next. Shown while the booking is Requested (state/preauthorized). No withdraw
 * link in stage 2 (open question 9 is stage 3).
 *
 * @component
 * @param {Object} props
 * @param {string} props.modelName first name
 * @param {string} [props.deadlineLabel] "Tue 3 Nov, 16:20"
 * @param {'window'|'shootStart'} [props.deadlineKind]
 * @param {string} [props.sentAtLabel] "Sun 1 Nov, 16:20"
 * @returns {JSX.Element}
 */
const RequestSentCard = props => {
  const { modelName, deadlineLabel, deadlineKind = 'window', sentAtLabel } = props;
  const strong = text => <strong>{text}</strong>;

  return (
    <section className={css.card} aria-labelledby="request-sent-title">
      <div className={css.statusRow}>
        <span className={css.statusIcon} aria-hidden="true">
          <RtIcon name="clock" size="lg" />
        </span>
        <BookingStatusChip status="requested" large>
          <FormattedMessage id="BookingStatus.requested" />
        </BookingStatusChip>
      </div>
      <h1 className={css.title} id="request-sent-title">
        <FormattedMessage id="RequestSent.title" values={{ name: modelName }} />
      </h1>
      {deadlineLabel ? (
        <p className={css.lede}>
          <FormattedMessage
            id="RequestSent.lede"
            values={{ name: modelName, deadline: <strong>{deadlineLabel}</strong> }}
          />
        </p>
      ) : null}

      <ol className={css.tracker}>
        <li className={classNames(css.step, css.stepDone)}>
          <span className={css.marker} aria-hidden="true">
            <RtIcon name="check" size="sm" />
          </span>
          <div className={css.stepBody}>
            <span className={css.stepTitle}>
              <FormattedMessage id="RequestSent.stepSentTitle" />
            </span>
            <span className={css.stepSub}>
              <FormattedMessage
                id="RequestSent.stepSentSub"
                values={{ sentAt: sentAtLabel || '' }}
              />
            </span>
          </div>
        </li>
        <li className={classNames(css.step, css.stepCurrent)}>
          <span className={css.marker} aria-hidden="true">
            2
          </span>
          <div className={css.stepBody}>
            <span className={css.stepTitle}>
              <FormattedMessage id="RequestSent.stepWaitingTitle" values={{ name: modelName }} />
            </span>
            <span className={css.stepStatus}>
              <FormattedMessage id="RequestSent.inProgress" />
            </span>
            <span className={css.stepSub}>
              <FormattedMessage
                id={
                  deadlineKind === 'shootStart'
                    ? 'RequestSent.stepWaitingSubShootStart'
                    : 'RequestSent.stepWaitingSub'
                }
                values={{ name: modelName }}
              />
            </span>
          </div>
        </li>
      </ol>

      <div className={css.callout}>
        <h3>
          <FormattedMessage id="RequestSent.thenTitle" />
        </h3>
        <p>
          <FormattedMessage id="RequestSent.ifAccepts" values={{ name: modelName, strong }} />
        </p>
        <p>
          <FormattedMessage id="RequestSent.ifDeclines" values={{ name: modelName, strong }} />
        </p>
      </div>

      <div className={css.actions}>
        <NamedLink name="InboxPage" params={{ tab: 'orders' }} className={css.primaryLink}>
          <FormattedMessage id="RequestSent.goToBookings" />
        </NamedLink>
        <NamedLink name="SearchPage" className={css.secondaryLink}>
          <FormattedMessage id="RequestSent.browseMore" />
        </NamedLink>
      </div>
    </section>
  );
};

export default RequestSentCard;
