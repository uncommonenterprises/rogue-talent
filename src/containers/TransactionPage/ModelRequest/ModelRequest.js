import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { getHoursLeft } from '../../../util/bookingStatus';
import { useNow } from '../../../util/useNow';

import {
  BookingStatusChip,
  FullLicenceLink,
  LicenceSummary,
  NamedLink,
  PrimaryButton,
  RtIcon,
  SecondaryButton,
} from '../../../components';

import SafetyAdvisoryMaybe from '../TransactionPanel/SafetyAdvisoryMaybe';

import css from './ModelRequest.module.css';

// The model's incoming request (B08). Deadline first, earnings first on phones, everything the
// model needs to decide on one page, then Accept (the one cobalt action) or Decline (secondary,
// with a short confirmation).

/**
 * What the model earns: 100% of their rate. The 15% fee is the client's, never a deduction.
 *
 * @component
 * @param {Object} props
 * @param {string} props.amount "£900"
 * @param {string} props.rateLabel "£450 x 2 days"
 * @param {number} [props.feePercentage] the client's booking fee (named on desktop)
 * @param {'phone'|'desktop'} props.placement phones see it in the header (shorter wording),
 *   desktop in the reply column
 * @returns {JSX.Element}
 */
export const EarnCard = ({ amount, rateLabel, feePercentage, placement }) => {
  const isPhone = placement === 'phone';
  return (
    <div className={classNames(css.earnCard, isPhone ? css.earnPhone : css.earnDesktop)}>
      <span className={css.eyebrow}>
        <FormattedMessage id="ModelRequest.earnEyebrow" />
      </span>
      <b className={css.earnAmount}>{amount}</b>
      <span className={css.earnNote}>
        {isPhone || feePercentage == null ? (
          <FormattedMessage id="ModelRequest.earnNotePhone" values={{ rate: rateLabel }} />
        ) : (
          <FormattedMessage
            id="ModelRequest.earnNote"
            values={{ rate: rateLabel, percentage: feePercentage }}
          />
        )}
      </span>
    </div>
  );
};

/**
 * Back link, status, who is asking, the reply-by deadline and (phones) the earnings.
 *
 * @component
 * @param {Object} props
 * @param {string} props.clientName
 * @param {string} [props.clientCompany]
 * @param {Date} [props.deadline]
 * @param {string} [props.deadlineLabel] "Tue 3 Nov, 16:20"
 * @param {React.ReactNode} [props.earnCard] the phone earnings card
 * @returns {JSX.Element}
 */
export const ModelRequestHeader = props => {
  const { clientName, clientCompany, deadline, deadlineLabel, earnCard } = props;
  // Counted only after the page has loaded, so the server's HTML and the browser agree.
  const now = useNow();
  const hoursLeft = deadline && now ? getHoursLeft(deadline, now) : null;

  return (
    <section className={css.header} aria-labelledby="model-request-title">
      <NamedLink name="InboxPage" params={{ tab: 'sales' }} className={css.backLink}>
        <RtIcon name="arrowLeft" />
        <FormattedMessage id="ModelRequest.backLink" />
      </NamedLink>
      <BookingStatusChip status="requested" large>
        <FormattedMessage id="BookingStatus.requested" />
      </BookingStatusChip>
      <h1 className={css.title} id="model-request-title">
        <FormattedMessage id="ModelRequest.title" values={{ name: clientName }} />
      </h1>
      {clientCompany ? <p className={css.company}>{clientCompany}</p> : null}

      {deadlineLabel ? (
        <div className={css.deadline}>
          <RtIcon name="clock" size="lg" className={css.deadlineIcon} />
          <div className={css.deadlineText}>
            <b>
              <FormattedMessage id="ModelRequest.replyBy" values={{ deadline: deadlineLabel }} />
            </b>
            <span>
              {hoursLeft != null ? (
                <>
                  {hoursLeft < 1 ? (
                    <FormattedMessage id="BookingStatus.lessThanAnHourLeft" />
                  ) : (
                    <FormattedMessage id="BookingStatus.hoursLeft" values={{ hours: hoursLeft }} />
                  )}{' '}
                </>
              ) : null}
              <FormattedMessage id="ModelRequest.deadlineNote" />
            </span>
          </div>
        </div>
      ) : null}

      {earnCard}
    </section>
  );
};

const KvRow = ({ labelId, value, small }) =>
  value ? (
    <div className={css.kvRow}>
      <dt>
        <FormattedMessage id={labelId} />
      </dt>
      <dd>
        {value}
        {small ? <small>{small}</small> : null}
      </dd>
    </div>
  ) : null;

/**
 * The detail the model decides on: the shoot (with the address, Q11), who is booking, and what
 * accepting agrees to (the four-point draft licence summary).
 *
 * @component
 * @param {Object} props
 * @returns {JSX.Element}
 */
export const ModelRequestDetails = props => {
  const {
    showResidenceAdvisory,
    datesLabel,
    dayCountLabel,
    shootTypeLabel,
    locationTypeLabel,
    shootAddress,
    description,
    clientNote,
    clientName,
    clientCompany,
    transactionId,
  } = props;

  return (
    <div className={css.details}>
      {/* SAF-11: calm, advisory only; never shown to the client, never blocks the request. */}
      <SafetyAdvisoryMaybe show={showResidenceAdvisory} rootClassName={css.advisory} />

      <section className={css.card} aria-labelledby="model-request-shoot">
        <h2 className={css.cardTitle} id="model-request-shoot">
          <FormattedMessage id="ModelRequest.shootTitle" />
        </h2>
        <dl className={css.kvRows}>
          <KvRow labelId="BookingCheckout.datesLabel" value={datesLabel} small={dayCountLabel} />
          <KvRow labelId="ModelRequest.shootTypeLabel" value={shootTypeLabel} />
          <KvRow labelId="RequestSent.whereLabel" value={locationTypeLabel} />
          <KvRow labelId="ModelRequest.addressLabel" value={shootAddress} />
        </dl>
        {description ? (
          <div className={css.textBlock}>
            <span className={css.eyebrow}>
              <FormattedMessage id="ModelRequest.descriptionLabel" />
            </span>
            <p>{description}</p>
          </div>
        ) : null}
        {clientNote ? (
          <div className={css.textBlock}>
            <span className={css.eyebrow}>
              <FormattedMessage id="ModelRequest.clientNoteLabel" />
            </span>
            <p>{clientNote}</p>
          </div>
        ) : null}
      </section>

      <section className={css.card} aria-labelledby="model-request-who">
        <h2 className={css.cardTitle} id="model-request-who">
          <FormattedMessage id="ModelRequest.whoTitle" />
        </h2>
        <dl className={css.kvRows}>
          <KvRow labelId="ModelRequest.nameLabel" value={clientName} />
          <KvRow labelId="ModelRequest.companyLabel" value={clientCompany} />
        </dl>
        <p className={css.trustLine}>
          <RtIcon name="check" className={css.trustIcon} />
          <span>
            <FormattedMessage id="ModelRequest.trustLine" />
          </span>
        </p>
      </section>

      <section className={css.card} aria-labelledby="model-request-licence">
        <h2 className={css.cardTitle} id="model-request-licence">
          <FormattedMessage id="ModelRequest.licenceTitle" />
        </h2>
        <p className={css.muted}>
          <FormattedMessage id="ModelRequest.licenceLede" />
        </p>
        {/* LEGAL: plain-English summary, DRAFT pending legal review (kept marked as draft). */}
        <LicenceSummary
          audience="model"
          draftNotice={<FormattedMessage id="StripePaymentForm.licenceDraftNotice" />}
          fullLicence={transactionId ? <FullLicenceLink transactionId={transactionId} /> : null}
        />
      </section>
    </div>
  );
};

/**
 * The reply column: earnings (desktop), when they're paid, the licence sentence right above
 * Accept, Accept / Decline, what each does, and the quiet safety link.
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} [props.earnCard] desktop earnings card
 * @param {Object} props.acceptProps { onAction, inProgress, error, errorText }
 * @param {Function} props.onDecline opens the decline confirmation
 * @param {boolean} [props.declineInProgress]
 * @param {boolean} [props.disabled] e.g. while the other button's transition runs
 * @param {string} [props.datesLabel]
 * @param {string} props.safetyReportSearch query string for the SafetyReportPage link
 * @param {'mobile'|'desktop'} props.placement phones: after the detail; desktop: the aside
 * @returns {JSX.Element}
 */
export const ModelReplyCard = props => {
  const {
    earnCard,
    acceptProps = {},
    onDecline,
    declineInProgress = false,
    datesLabel,
    safetyReportSearch,
    placement,
  } = props;
  const { onAction, inProgress: acceptInProgress, error, errorText } = acceptProps;
  const busy = !!acceptInProgress || declineInProgress;

  return (
    <div
      className={classNames(
        css.replyCard,
        placement === 'mobile' ? css.replyMobile : css.replyDesktop
      )}
    >
      {earnCard}
      <p className={css.muted}>
        <FormattedMessage id="ModelRequest.paidWhen" />
      </p>
      <hr className={css.rule} />
      <p className={css.agreeLine}>
        <FormattedMessage id="ModelRequest.acceptAgreesLicence" />
      </p>
      {error && errorText ? (
        <p className={css.error} role="alert">
          {errorText}
        </p>
      ) : null}
      <div className={css.replyActions}>
        <PrimaryButton
          type="button"
          className={css.acceptButton}
          onClick={onAction}
          inProgress={!!acceptInProgress}
          disabled={busy}
        >
          <FormattedMessage id="ModelRequest.accept" />
        </PrimaryButton>
        <SecondaryButton
          type="button"
          className={css.declineButton}
          onClick={onDecline}
          disabled={busy}
        >
          <FormattedMessage id="ModelRequest.decline" />
        </SecondaryButton>
      </div>
      {datesLabel ? (
        <p className={css.fine}>
          <FormattedMessage id="ModelRequest.replyFinePrint" values={{ dates: datesLabel }} />
        </p>
      ) : null}
      {/* SAF-29: one quiet link, visible without being alarming. */}
      <NamedLink
        name="SafetyReportPage"
        to={{ search: safetyReportSearch }}
        className={css.ghostLink}
      >
        <FormattedMessage id="TransactionPanel.reportSafetyConcern" />
      </NamedLink>
    </div>
  );
};
