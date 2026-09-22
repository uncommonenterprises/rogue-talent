import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import {
  ACCOUNT_STATUS_DRAFT,
  ACCOUNT_STATUS_PENDING,
  ACCOUNT_STATUS_APPROVED,
  ACCOUNT_STATUS_VERIFIED,
  ACCOUNT_STATUS_REJECTED,
  ACCOUNT_STATUSES,
} from '../../util/accountStatus';

import css from './AccountStatusBadge.module.css';

// Status → { CSS modifier class, i18n label key }.
const STATUS_CONFIG = {
  [ACCOUNT_STATUS_DRAFT]: { className: css.draft, labelId: 'AccountStatusBadge.draft' },
  [ACCOUNT_STATUS_PENDING]: { className: css.pending, labelId: 'AccountStatusBadge.pending' },
  [ACCOUNT_STATUS_APPROVED]: { className: css.approved, labelId: 'AccountStatusBadge.approved' },
  [ACCOUNT_STATUS_VERIFIED]: { className: css.verified, labelId: 'AccountStatusBadge.verified' },
  [ACCOUNT_STATUS_REJECTED]: { className: css.rejected, labelId: 'AccountStatusBadge.rejected' },
};

/**
 * Account-status lifecycle badge (`rt-status`). Self-facing status chip for the user's own
 * dashboard/profile + operator triage — NOT a public trust signal (do not use on search cards or
 * other users' profiles; that was the retired VerifiedBadge's job). See
 * docs/specs/account-status-badge-design.md.
 *
 * Colour is never the only signal — every status carries a text label (a11y, spec §5).
 *
 * @component
 * @param {Object} props
 * @param {'draft'|'pending-approval'|'approved'|'verified'|'rejected'} props.status - lifecycle
 *   status (compute with util/accountStatus getAccountStatus)
 * @param {boolean} [props.large] - use the --lg size (prominent placement)
 * @param {boolean} [props.minimal] - dot + text, no chip (dense rows)
 * @param {string} [props.className] - extends the root class
 * @param {string} [props.rootClassName] - overrides the root class
 * @returns {JSX.Element|null} the badge, or null for an unknown status
 */
const AccountStatusBadge = props => {
  const { status, large, minimal, className, rootClassName } = props;

  if (!ACCOUNT_STATUSES.includes(status)) {
    return null;
  }

  const { className: statusClass, labelId } = STATUS_CONFIG[status];

  const classes = classNames(rootClassName || css.root, statusClass, className, {
    [css.large]: large,
    [css.minimal]: minimal,
  });

  return (
    <span className={classes}>
      <span className={css.dot} aria-hidden="true" />
      <FormattedMessage id={labelId} />
    </span>
  );
};

export default AccountStatusBadge;
