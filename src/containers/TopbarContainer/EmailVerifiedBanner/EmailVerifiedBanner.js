import React from 'react';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import css from './EmailVerifiedBanner.module.css';

/**
 * Screen 05 "confirmation on arrival" (RT-FB-07/08): a one-off, dismissible green success banner
 * on the page the user lands on straight after verifying their email. Visibility is driven by the
 * emailVerification duck (shown once, cleared on dismiss or when the user moves to another page).
 *
 * @component
 * @param {Object} props
 * @param {Function} props.onDismiss called when the dismiss button is pressed
 * @returns {JSX.Element}
 */
const EmailVerifiedBanner = props => {
  const { onDismiss } = props;
  const intl = useIntl();

  return (
    <div className={css.root} role="status">
      <p className={css.text}>
        <svg
          className={css.icon}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M2.5 8.5l3.5 3.5 7-7.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <FormattedMessage id="EmailVerifiedBanner.message" />
      </p>
      <button
        type="button"
        className={css.dismiss}
        onClick={onDismiss}
        aria-label={intl.formatMessage({ id: 'EmailVerifiedBanner.dismiss' })}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M3 3l8 8M11 3l-8 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
};

export default EmailVerifiedBanner;
