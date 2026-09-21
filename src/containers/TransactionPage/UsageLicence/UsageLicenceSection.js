import React from 'react';

// Contexts + util
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { CONTRACT_SUMMARY_POINT_IDS, getContractScheduleRows } from '../../../util/contracts';

// Shared components
import { Heading, NamedLink } from '../../../components';

import css from './UsageLicenceSection.module.css';

/**
 * "Content licence & model release" block shown on the TransactionPage for both
 * parties once a booking exists. Contracts (v1) apply ONE standard, broad +
 * perpetual licence to every booking — there is no per-booking usage selection.
 * This block surfaces the plain-English key terms + the per-booking Schedule
 * (auto-filled from the transaction) and links to the full (print-optimised)
 * contract. When the model is being asked to accept the booking, it also shows
 * the statement that accepting agrees the standard licence — the model's Accept
 * transition is the recorded, timed provider agreement (no separate signature;
 * no EDN change).
 *
 * ⚠️ LEGAL: the linked contract contains DRAFT wording pending legal review.
 * Flagged for human/lawyer review before real users are onboarded.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.transaction - Denormalised transaction (customer, provider, booking)
 * @param {boolean} props.showAcceptStatement - Whether to show the model's accept-agreement statement
 * @returns {JSX.Element|null}
 */
const UsageLicenceSection = props => {
  const { transaction, showAcceptStatement } = props;
  const intl = useIntl();

  // Nothing to show until a transaction (booking) exists.
  if (!transaction) {
    return null;
  }

  const transactionId = transaction.id?.uuid;
  // Omit the Fee row here — the order breakdown on this page already shows the
  // price; the full ContractPage keeps the Fee in its Schedule.
  const scheduleRows = getContractScheduleRows({ transaction, intl, omitFee: true });

  return (
    <section className={css.root}>
      <Heading as="h3" rootClassName={css.heading}>
        <FormattedMessage id="UsageLicenceSection.heading" />
      </Heading>
      <p className={css.draftNotice}>
        <FormattedMessage id="UsageLicenceSection.draftNotice" />
      </p>

      <p className={css.summaryIntro}>
        <FormattedMessage id="UsageLicenceSection.summaryIntro" />
      </p>
      <ul className={css.summaryList}>
        {CONTRACT_SUMMARY_POINT_IDS.map(id => (
          <li key={id} className={css.summaryItem}>
            <FormattedMessage id={id} />
          </li>
        ))}
      </ul>

      {scheduleRows.length > 0 ? (
        <dl className={css.terms}>
          {scheduleRows.map(row => (
            <div key={row.key} className={css.termRow}>
              <dt className={css.termLabel}>{row.label}</dt>
              <dd className={css.termValue}>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {showAcceptStatement ? (
        <p className={css.acceptStatement}>
          <FormattedMessage id="UsageLicenceSection.acceptStatement" />
        </p>
      ) : null}

      {transactionId ? (
        <NamedLink className={css.contractLink} name="ContractPage" params={{ id: transactionId }}>
          <FormattedMessage id="UsageLicenceSection.viewContract" />
        </NamedLink>
      ) : null}
    </section>
  );
};

export default UsageLicenceSection;
