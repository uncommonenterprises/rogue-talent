import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { isPasswordRecoveryEmailNotFoundError } from '../../util/errors';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Page, InlineTextButton, AuthShell, AuthFormHeader } from '../../components';

import PasswordRecoveryForm from './PasswordRecoveryForm/PasswordRecoveryForm';

import {
  recoverPassword,
  retypePasswordRecoveryEmail,
  clearPasswordRecoveryError,
} from './PasswordRecoveryPage.duck';
import css from './PasswordRecoveryPage.module.css';

const IconEnvelope = () => (
  <svg
    className={css.lineIcon}
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
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

// Screen 07, state 1: request a reset link.
const PasswordRecovery = props => {
  const { initialEmail, onChange, onSubmitEmail, recoveryInProgress, recoveryError } = props;
  return (
    <div className={css.submitEmailContent}>
      <AuthFormHeader
        small
        title={<FormattedMessage id="PasswordRecoveryPage.forgotPasswordTitle" />}
        lede={<FormattedMessage id="PasswordRecoveryPage.forgotPasswordMessage" />}
      />
      <PasswordRecoveryForm
        inProgress={recoveryInProgress}
        onChange={onChange}
        onSubmit={values => onSubmitEmail(values.email)}
        initialValues={{ email: initialEmail }}
        recoveryError={recoveryError}
      />
    </div>
  );
};

const GenericError = () => {
  return (
    <div className={css.genericErrorContent}>
      <AuthFormHeader
        small
        title={<FormattedMessage id="PasswordRecoveryPage.actionFailedTitle" />}
        lede={<FormattedMessage id="PasswordRecoveryPage.actionFailedMessage" />}
      />
    </div>
  );
};

const EmailSubmittedContent = props => {
  const {
    passwordRequested,
    initialEmail,
    submittedEmail,
    onRetypeEmail,
    onSubmitEmail,
    recoveryInProgress,
  } = props;

  const submittedEmailText = (
    <span className={css.email}>{passwordRequested ? initialEmail : submittedEmail}</span>
  );

  const resendEmailLink = (
    <InlineTextButton rootClassName={css.helperLink} onClick={() => onSubmitEmail(submittedEmail)}>
      <FormattedMessage id="PasswordRecoveryPage.resendEmailLinkText" />
    </InlineTextButton>
  );

  const fixEmailLink = (
    <InlineTextButton rootClassName={css.helperLink} onClick={onRetypeEmail}>
      <FormattedMessage id="PasswordRecoveryPage.fixEmailLinkText" />
    </InlineTextButton>
  );

  // Re-uses the screen 04 check-your-inbox pattern: headline, the address, a quiet resend note.
  return (
    <div className={css.emailSubmittedContent}>
      <span className={css.icon}>
        <IconEnvelope />
      </span>
      <AuthFormHeader
        centered
        small
        title={<FormattedMessage id="PasswordRecoveryPage.emailSubmittedTitle" />}
        lede={
          <FormattedMessage
            id="PasswordRecoveryPage.emailSubmittedMessage"
            values={{ submittedEmailText }}
          />
        }
      />
      <div className={css.bottomWrapper}>
        <p className={css.helperText}>
          {recoveryInProgress ? (
            <FormattedMessage id="PasswordRecoveryPage.resendingEmailInfo" />
          ) : (
            <FormattedMessage
              id="PasswordRecoveryPage.resendEmailInfo"
              values={{ resendEmailLink }}
            />
          )}
        </p>
        <p className={css.helperText}>
          <FormattedMessage id="PasswordRecoveryPage.fixEmailInfo" values={{ fixEmailLink }} />
        </p>
      </div>
    </div>
  );
};

/**
 * The password recovery page.
 *
 * @param {Object} props
 * @param {boolean} props.scrollingDisabled - Whether the scrolling is disabled
 * @param {string} props.initialEmail - The initial email
 * @param {string} props.submittedEmail - The submitted email
 * @param {propTypes.error} props.recoveryError - The recovery error
 * @param {boolean} props.recoveryInProgress - Whether the recovery is in progress
 * @param {boolean} props.passwordRequested - Whether the password is requested
 * @param {function} props.onChange - The function to change the email
 * @param {function} props.onSubmitEmail - The function to submit the email
 * @param {function} props.onRetypeEmail - The function to retype the email
 * @returns {JSX.Element} Password recovery page component
 */
export const PasswordRecoveryPageComponent = props => {
  const intl = useIntl();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const emailParam = searchParams.get('email');

  const {
    scrollingDisabled,
    initialEmail,
    submittedEmail,
    recoveryError,
    recoveryInProgress,
    passwordRequested,
    onChange,
    onSubmitEmail,
    onRetypeEmail,
  } = props;
  const alreadyrequested = submittedEmail || passwordRequested;
  const emailToUse = emailParam || initialEmail;
  const showPasswordRecoveryForm = (
    <PasswordRecovery
      initialEmail={emailToUse}
      onChange={onChange}
      onSubmitEmail={onSubmitEmail}
      recoveryInProgress={recoveryInProgress}
      recoveryError={recoveryError}
    />
  );

  return (
    <Page
      title={intl.formatMessage({
        id: 'PasswordRecoveryPage.title',
      })}
      scrollingDisabled={scrollingDisabled}
    >
      <AuthShell variant="recovery">
        {isPasswordRecoveryEmailNotFoundError(recoveryError) ? (
          showPasswordRecoveryForm
        ) : recoveryError ? (
          <GenericError />
        ) : alreadyrequested ? (
          <EmailSubmittedContent
            passwordRequested={passwordRequested}
            initialEmail={initialEmail}
            submittedEmail={submittedEmail}
            onRetypeEmail={onRetypeEmail}
            onSubmitEmail={onSubmitEmail}
            recoveryInProgress={recoveryInProgress}
          />
        ) : (
          showPasswordRecoveryForm
        )}
      </AuthShell>
    </Page>
  );
};

const mapStateToProps = state => {
  const {
    initialEmail,
    submittedEmail,
    recoveryError,
    recoveryInProgress,
    passwordRequested,
  } = state.PasswordRecoveryPage;
  return {
    scrollingDisabled: isScrollingDisabled(state),
    initialEmail,
    submittedEmail,
    recoveryError,
    recoveryInProgress,
    passwordRequested,
  };
};

const mapDispatchToProps = dispatch => ({
  onChange: () => dispatch(clearPasswordRecoveryError()),
  onSubmitEmail: email => dispatch(recoverPassword({ email })),
  onRetypeEmail: () => dispatch(retypePasswordRecoveryEmail()),
});

const PasswordRecoveryPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(PasswordRecoveryPageComponent);

export default PasswordRecoveryPage;
