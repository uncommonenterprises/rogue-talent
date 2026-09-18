import React from 'react';
import classNames from 'classnames';
import { Form as FinalForm } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { required } from '../../../util/validators';

import { Form, Modal, PrimaryButton, SecondaryButton, FieldRadioButton } from '../../../components';

import css from './CancelBookingModal.module.css';

/**
 * Provider-cancel reason taxonomy (design doc §5).
 *
 * Two categories, two off-process routes:
 *  - `reliability` → increments the model's reliability counter.
 *  - `safety`      → routes to the ops safety queue, NEVER the reliability counter,
 *                    and may flag the client for review.
 *
 * The client is fully refunded either way; only the internal routing differs.
 * The routing itself is handled off-process (events listener) — this picker only
 * captures + tags the reason so nothing is miscategorised or lost.
 */
export const CANCEL_REASON_RELIABILITY = 'reliability';
export const CANCEL_REASON_SAFETY = 'safety';

export const PROVIDER_CANCEL_REASONS = [
  { key: 'no-longer-available', category: CANCEL_REASON_RELIABILITY },
  { key: 'double-booked', category: CANCEL_REASON_RELIABILITY },
  { key: 'cannot-make-it', category: CANCEL_REASON_RELIABILITY },
  { key: 'changed-mind', category: CANCEL_REASON_RELIABILITY },
  { key: 'felt-unsafe', category: CANCEL_REASON_SAFETY },
  { key: 'inappropriate-messages', category: CANCEL_REASON_SAFETY },
  { key: 'boundary-crossed', category: CANCEL_REASON_SAFETY },
];

const categoryForReason = reasonKey =>
  PROVIDER_CANCEL_REASONS.find(r => r.key === reasonKey)?.category || null;

// Reconciliation block: what happens to the money on this cancellation.
const RefundPreview = props => {
  const { intl, transactionRole, refundsClient, payinTotal, payoutTotal } = props;
  const isProvider = transactionRole === 'provider';

  const payinFormatted = payinTotal ? formatMoney(intl, payinTotal) : null;
  const payoutFormatted = payoutTotal ? formatMoney(intl, payoutTotal) : null;

  // Row = { labelId, value }. Value is a preformatted money string or a message.
  const rows = [];
  if (isProvider) {
    // Provider cancel is ALWAYS a full refund to the client; the model is paid nothing.
    rows.push({
      labelId: 'CancelBookingModal.preview.clientRefund',
      value: payinFormatted,
    });
    rows.push({
      labelId: 'CancelBookingModal.preview.yourPayoutProvider',
      valueId: 'CancelBookingModal.preview.noPayout',
    });
  } else if (refundsClient) {
    // Customer cancel ≥48h before the shoot → full refund.
    rows.push({
      labelId: 'CancelBookingModal.preview.yourRefund',
      value: payinFormatted,
    });
  } else {
    // Customer cancel <48h before the shoot → no refund; the model is still paid.
    rows.push({
      labelId: 'CancelBookingModal.preview.yourRefund',
      valueId: 'CancelBookingModal.preview.noRefund',
    });
    rows.push({
      labelId: 'CancelBookingModal.preview.modelPayout',
      value: payoutFormatted,
    });
  }

  return (
    <div className={css.preview}>
      {rows.map(row => (
        <div className={css.previewRow} key={row.labelId}>
          <span className={css.previewLabel}>
            <FormattedMessage id={row.labelId} />
          </span>
          <span className={css.previewValue}>
            {row.valueId ? <FormattedMessage id={row.valueId} /> : row.value || '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

const CancelBookingForm = props => (
  <FinalForm
    {...props}
    render={fieldRenderProps => {
      const {
        rootClassName,
        className,
        handleSubmit,
        intl,
        formId,
        invalid,
        requiresReason,
        transactionRole,
        refundsClient,
        payinTotal,
        payoutTotal,
        cancelInProgress,
        cancelError,
        onCloseModal,
      } = fieldRenderProps;

      const classes = classNames(rootClassName || css.formRoot, className);
      const submitDisabled = invalid || cancelInProgress;

      const errorMessage = cancelError ? (
        <p className={css.error}>
          <FormattedMessage id="CancelBookingModal.cancelFailed" />
        </p>
      ) : null;

      const reliabilityReasons = PROVIDER_CANCEL_REASONS.filter(
        r => r.category === CANCEL_REASON_RELIABILITY
      );
      const safetyReasons = PROVIDER_CANCEL_REASONS.filter(r => r.category === CANCEL_REASON_SAFETY);

      const reasonId = key => (formId ? `${formId}.${key}` : `cancelReason_${key}`);

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          <RefundPreview
            intl={intl}
            transactionRole={transactionRole}
            refundsClient={refundsClient}
            payinTotal={payinTotal}
            payoutTotal={payoutTotal}
          />

          {requiresReason ? (
            <fieldset className={css.reasonFieldset}>
              <legend className={css.reasonLegend}>
                <FormattedMessage id="CancelBookingModal.reasonLabel" />
              </legend>

              <p className={css.reasonGroupHeading}>
                <FormattedMessage id="CancelBookingModal.reasonGroup.reliability" />
              </p>
              {reliabilityReasons.map(r => (
                <FieldRadioButton
                  key={r.key}
                  id={reasonId(r.key)}
                  name="cancelReason"
                  value={r.key}
                  label={intl.formatMessage({ id: `CancelBookingModal.reason.${r.key}` })}
                  validate={required(
                    intl.formatMessage({ id: 'CancelBookingModal.reasonRequired' })
                  )}
                />
              ))}

              <p className={css.reasonGroupHeading}>
                <FormattedMessage id="CancelBookingModal.reasonGroup.safety" />
              </p>
              <p className={css.reasonGroupNote}>
                <FormattedMessage id="CancelBookingModal.reasonGroup.safetyNote" />
              </p>
              {safetyReasons.map(r => (
                <FieldRadioButton
                  key={r.key}
                  id={reasonId(r.key)}
                  name="cancelReason"
                  value={r.key}
                  label={intl.formatMessage({ id: `CancelBookingModal.reason.${r.key}` })}
                  validate={required(
                    intl.formatMessage({ id: 'CancelBookingModal.reasonRequired' })
                  )}
                />
              ))}
            </fieldset>
          ) : null}

          {errorMessage}

          <div className={css.actions}>
            <SecondaryButton
              type="button"
              className={css.keepButton}
              onClick={onCloseModal}
              disabled={cancelInProgress}
            >
              <FormattedMessage id="CancelBookingModal.keepBooking" />
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              className={css.confirmButton}
              inProgress={cancelInProgress}
              disabled={submitDisabled}
            >
              <FormattedMessage id="CancelBookingModal.confirmCancel" />
            </PrimaryButton>
          </div>
        </Form>
      );
    }}
  />
);

/**
 * Cancellation modal for the booking-v2 process.
 *
 * Shows a refund preview (full refund vs no refund, driven by the process state /
 * two-tier policy) before the user confirms, and — for provider cancellations —
 * requires a reason picker that distinguishes reliability from safety reasons.
 *
 * @component
 * @param {Object} props
 * @param {string} props.id
 * @param {boolean} props.isOpen
 * @param {Function} props.onCloseModal
 * @param {Function} props.onManageDisableScrolling
 * @param {Function} props.onSubmitCancel called with { cancelReason, cancelReasonCategory }
 * @param {('customer'|'provider')} props.transactionRole
 * @param {boolean} props.requiresReason true for provider cancellations
 * @param {boolean} props.refundsClient whether the client is refunded (two-tier policy)
 * @param {boolean} props.isLate whether the booking is within 48h of the shoot
 * @param {propTypes.money} [props.payinTotal] what the client paid (rate + 15%)
 * @param {propTypes.money} [props.payoutTotal] what the model receives (100% of rate)
 * @param {boolean} props.cancelInProgress
 * @param {propTypes.error} [props.cancelError]
 * @returns {JSX.Element}
 */
const CancelBookingModal = props => {
  const intl = useIntl();
  const {
    className,
    rootClassName,
    id,
    isOpen = false,
    onCloseModal,
    onManageDisableScrolling,
    onSubmitCancel,
    focusElementId,
    transactionRole,
    requiresReason = false,
    refundsClient = true,
    isLate = false,
    payinTotal,
    payoutTotal,
    cancelInProgress = false,
    cancelError,
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  const titleId = requiresReason
    ? 'CancelBookingModal.title.provider'
    : 'CancelBookingModal.title.customer';
  const descriptionId = requiresReason
    ? 'CancelBookingModal.description.provider'
    : isLate
    ? 'CancelBookingModal.description.customerLate'
    : 'CancelBookingModal.description.customer';

  const handleSubmit = values => {
    const cancelReason = values?.cancelReason || null;
    onSubmitCancel({
      cancelReason: requiresReason ? cancelReason : null,
      cancelReasonCategory: requiresReason ? categoryForReason(cancelReason) : null,
    });
  };

  return (
    <Modal
      id={id}
      containerClassName={classes}
      contentClassName={css.modalContent}
      isOpen={isOpen}
      onClose={onCloseModal}
      onManageDisableScrolling={onManageDisableScrolling}
      focusElementId={focusElementId}
      usePortal
      closeButtonMessage={intl.formatMessage({ id: 'CancelBookingModal.close' })}
    >
      <p className={css.modalTitle}>
        <FormattedMessage id={titleId} />
      </p>
      <p className={css.modalMessage}>
        <FormattedMessage id={descriptionId} />
      </p>
      <CancelBookingForm
        onSubmit={handleSubmit}
        intl={intl}
        formId={id}
        requiresReason={requiresReason}
        transactionRole={transactionRole}
        refundsClient={refundsClient}
        payinTotal={payinTotal}
        payoutTotal={payoutTotal}
        cancelInProgress={cancelInProgress}
        cancelError={cancelError}
        onCloseModal={onCloseModal}
      />
    </Modal>
  );
};

export default CancelBookingModal;
