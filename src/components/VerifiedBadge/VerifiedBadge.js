import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';

import css from './VerifiedBadge.module.css';

/**
 * A model is "ID verified" when an operator has set the admin-only (metadata-scope)
 * `id_verified` user field to 'verified' in Sharetribe Console. Profile metadata is
 * publicly readable but only operator-writable, so this is a trustworthy signal — unlike
 * a self-selected field.
 *
 * @param {Object} user - a user/currentUser API entity
 * @returns {boolean} true if the user is ID verified
 */
export const isUserVerified = user =>
  user?.attributes?.profile?.metadata?.id_verified === 'verified';

/**
 * Small "Verified" badge shown for ID-verified models.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class
 * @param {string} [props.rootClassName] - Custom class that overrides the default class
 * @param {Object} [props.user] - user entity; verification is derived from its metadata
 * @param {boolean} [props.verified] - explicit override; takes precedence over `user`
 * @returns {JSX.Element|null} the badge, or null if the user is not verified
 */
const VerifiedBadge = props => {
  const { className, rootClassName, user, verified } = props;
  const isVerified = typeof verified === 'boolean' ? verified : isUserVerified(user);

  if (!isVerified) {
    return null;
  }

  const classes = classNames(rootClassName || css.root, className);

  return (
    <span className={classes}>
      <svg
        className={css.icon}
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="8" fill="currentColor" />
        <path
          d="M4.5 8.2l2.2 2.2 4.8-4.8"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <FormattedMessage id="VerifiedBadge.label" />
    </span>
  );
};

export default VerifiedBadge;
