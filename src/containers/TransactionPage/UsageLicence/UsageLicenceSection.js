import React from 'react';

// Contexts + util
import { FormattedMessage } from '../../../util/reactIntl';
import { getUsageLicenceRows } from '../../../util/contracts';

// Shared components
import { Heading, NamedLink } from '../../../components';

import css from './UsageLicenceSection.module.css';

/**
 * "Image usage licence" block shown on the TransactionPage for both parties once
 * a booking exists. Surfaces the frozen usage terms (duration / channels /
 * territory) and links to the full (print-optimised) contract. When the model is
 * being asked to accept the booking, it also shows the statement that accepting
 * agrees the usage terms — the model's Accept transition is the recorded, timed
 * provider agreement (no separate signature; no EDN change).
 *
 * ⚠️ LEGAL: the linked contract contains placeholder DRAFT wording pending legal
 * review. Flagged for human/lawyer review before real users are onboarded.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.protectedData - Transaction protectedData
 * @param {Array} props.transactionFieldConfigs - Listing type transactionFields (for labels/options)
 * @param {string} props.transactionId - Transaction UUID string
 * @param {boolean} props.showAcceptStatement - Whether to show the model's accept-agreement statement
 * @returns {JSX.Element|null}
 */
const UsageLicenceSection = props => {
  const { protectedData, transactionFieldConfigs = [], transactionId, showAcceptStatement } = props;

  const rows = getUsageLicenceRows(protectedData, transactionFieldConfigs);

  // Nothing to show until usage terms have been frozen onto the transaction.
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className={css.root}>
      <Heading as="h3" rootClassName={css.heading}>
        <FormattedMessage id="UsageLicenceSection.heading" />
      </Heading>
      <p className={css.draftNotice}>
        <FormattedMessage id="UsageLicenceSection.draftNotice" />
      </p>

      <dl className={css.terms}>
        {rows.map(row => (
          <div key={row.key} className={css.termRow}>
            <dt className={css.termLabel}>{row.label}</dt>
            <dd className={css.termValue}>{row.value}</dd>
          </div>
        ))}
      </dl>

      {showAcceptStatement ? (
        <p className={css.acceptStatement}>
          <FormattedMessage id="UsageLicenceSection.acceptStatement" />
        </p>
      ) : null}

      {transactionId ? (
        <NamedLink
          className={css.contractLink}
          name="ContractPage"
          params={{ id: transactionId }}
        >
          <FormattedMessage id="UsageLicenceSection.viewContract" />
        </NamedLink>
      ) : null}
    </section>
  );
};

export default UsageLicenceSection;
