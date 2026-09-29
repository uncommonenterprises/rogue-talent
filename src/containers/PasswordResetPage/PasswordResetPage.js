import React, { useState } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { parse } from '../../util/urlHelpers';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Page, NamedLink, AuthShell, AuthFormHeader } from '../../components';

import PasswordResetForm from './PasswordResetForm/PasswordResetForm';

import { resetPassword } from './PasswordResetPage.duck';
import css from './PasswordResetPage.module.css';

const parseUrlParams = location => {
  const params = parse(location.search);
  const { t: token, e: email } = params;
  return { token, email };
};

const ParamsMissingContent = () => {
  const recoveryLink = (
    <NamedLink name="PasswordRecoveryPage">
      <FormattedMessage id="PasswordResetPage.recoveryLinkText" />
    </NamedLink>
  );
  return (
    <div className={css.content}>
      <p className={css.message}>
        <FormattedMessage id="PasswordResetPage.invalidUrlParams" values={{ recoveryLink }} />
      </p>
    </div>
  );
};

// Screen 07, state 2: set a new password (arrived via the emailed link).
const ResetFormContent = props => {
  const { email, handleSubmit, resetPasswordInProgress, resetPasswordError } = props;
  return (
    <div className={css.content}>
      <AuthFormHeader
        small
        title={<FormattedMessage id="PasswordResetPage.mainHeading" />}
        lede={
          <FormattedMessage
            id="PasswordResetPage.helpTextForEmail"
            values={{ email: <strong className={css.email}>{email}</strong> }}
          />
        }
      />
      {resetPasswordError ? (
        <p className={css.error}>
          <FormattedMessage id="PasswordResetPage.resetFailed" />
        </p>
      ) : null}
      <PasswordResetForm
        className={css.form}
        onSubmit={handleSubmit}
        inProgress={resetPasswordInProgress}
      />
    </div>
  );
};

const ResetDoneContent = () => {
  return (
    <div className={css.content}>
      <AuthFormHeader
        small
        title={<FormattedMessage id="PasswordResetPage.passwordChangedHeading" />}
        lede={<FormattedMessage id="PasswordResetPage.passwordChangedHelpText" />}
      />
      <NamedLink name="LoginPage" className={css.submitButton}>
        <FormattedMessage id="PasswordResetPage.loginButtonText" />
      </NamedLink>
    </div>
  );
};

/**
 * The reset-password page.
 *
 * @param {Object} props
 * @param {boolean} props.scrollingDisabled - Whether the page is scrolling disabled
 * @param {boolean} props.resetPasswordInProgress - Whether the reset password is in progress
 * @param {propTypes.error} props.resetPasswordError - The reset password error
 * @param {function} props.onSubmitPassword - The function to submit the password
 * @param {Object} props.location - The location object
 * @param {string} props.location.search - The search string
 * @returns {JSX.Element} Password reset page component
 */
export const PasswordResetPageComponent = props => {
  const [state, setState] = useState({ newPasswordSubmitted: false });
  const intl = useIntl();
  const {
    scrollingDisabled,
    location,
    resetPasswordInProgress,
    resetPasswordError,
    onSubmitPassword,
  } = props;

  const { token, email } = parseUrlParams(location);
  const hasParams = !!(token && email);
  const isPasswordSubmitted = state.newPasswordSubmitted && !resetPasswordError;

  const handleSubmit = values => {
    const { password } = values;
    setState({ newPasswordSubmitted: false });
    onSubmitPassword(email, token, password).then(() => {
      setState({ newPasswordSubmitted: true });
    });
  };

  return (
    <Page
      title={intl.formatMessage({
        id: 'PasswordResetPage.title',
      })}
      scrollingDisabled={scrollingDisabled}
      referrer="origin"
    >
      <AuthShell variant="recovery">
        {!hasParams ? (
          <ParamsMissingContent />
        ) : isPasswordSubmitted ? (
          <ResetDoneContent />
        ) : (
          <ResetFormContent
            email={email}
            handleSubmit={handleSubmit}
            resetPasswordInProgress={resetPasswordInProgress}
            resetPasswordError={resetPasswordError}
          />
        )}
      </AuthShell>
    </Page>
  );
};

const mapStateToProps = state => {
  const { resetPasswordInProgress, resetPasswordError } = state.PasswordResetPage;
  return {
    scrollingDisabled: isScrollingDisabled(state),
    resetPasswordInProgress,
    resetPasswordError,
  };
};

const mapDispatchToProps = dispatch => ({
  onSubmitPassword: (email, token, password) => dispatch(resetPassword(email, token, password)),
});

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const PasswordResetPage = compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(PasswordResetPageComponent);

export default PasswordResetPage;
