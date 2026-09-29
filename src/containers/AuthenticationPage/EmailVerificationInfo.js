import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';

import { NamedLink, InlineTextButton, AuthFormHeader } from '../../components';

import css from './EmailVerificationInfo.module.css';

const IconEnvelope = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M4 7l8 6 8-6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Screen 04 "Check your inbox", shown in place of the sign-up form once the account exists.
 *
 * RT-FB-06: follow the pattern leading products use for "check your email" screens: short
 * headline, one line showing the address, ONE clear next step (so the screen is never a dead end -
 * verification is a soft gate), and recovery options kept as a single quiet line directly beneath.
 *
 * @component
 * @param {Object} props
 * @param {string} props.name the user's first name
 * @param {ReactNode} props.email the address the link was sent to
 * @param {boolean} props.isModel models continue to the profile wizard, clients to Browse models
 * @param {string?} props.closeLinkName route name for the primary next step
 * @param {Function} props.onResendVerificationEmail
 * @param {ReactNode?} props.resendErrorMessage
 * @param {boolean} props.sendVerificationEmailInProgress
 * @returns {JSX.Element}
 */
const EmailVerificationInfo = props => {
  const {
    name,
    email,
    onResendVerificationEmail,
    resendErrorMessage,
    sendVerificationEmailInProgress,
    isModel,
    closeLinkName,
  } = props;

  const resendEmailLink = (
    <InlineTextButton rootClassName={css.helperLink} onClick={onResendVerificationEmail}>
      <FormattedMessage id="AuthenticationPage.resendEmailLinkText" />
    </InlineTextButton>
  );

  const fixEmailLink = (
    <NamedLink className={css.helperLink} name="ContactDetailsPage">
      <FormattedMessage id="AuthenticationPage.fixEmailLinkText" />
    </NamedLink>
  );

  const ctaId = isModel
    ? 'AuthenticationPage.verifyLaterModelLink'
    : 'AuthenticationPage.verifyEmailClientCta';
  const noteId = isModel
    ? 'AuthenticationPage.verifyLaterModelNote'
    : 'AuthenticationPage.verifyEmailClientNote';

  return (
    <div className={css.root}>
      <span className={css.icon}>
        <IconEnvelope />
      </span>

      <AuthFormHeader
        centered
        title={<FormattedMessage id="AuthenticationPage.verifyEmailTitle" values={{ name }} />}
        lede={<FormattedMessage id="AuthenticationPage.verifyEmailText" values={{ email }} />}
      />

      {closeLinkName ? (
        <div className={css.nextStep}>
          <NamedLink className={css.primaryAction} name={closeLinkName}>
            <FormattedMessage id={ctaId} />
          </NamedLink>
          <p className={css.note}>
            <FormattedMessage id={noteId} />
          </p>
        </div>
      ) : null}

      {resendErrorMessage}

      <p className={css.helpLine}>
        {sendVerificationEmailInProgress ? (
          <FormattedMessage id="AuthenticationPage.sendingEmail" />
        ) : (
          <FormattedMessage
            id="AuthenticationPage.resendEmail"
            values={{ resendEmailLink, fixEmailLink }}
          />
        )}
      </p>
    </div>
  );
};

export default EmailVerificationInfo;
