import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import loadable from '@loadable/component';

import { sendVerificationEmail, hasCurrentUserErrors } from '../../ducks/user.duck';
import { logout, authenticationInProgress } from '../../ducks/auth.duck';
import { manageDisableScrolling } from '../../ducks/ui.duck';
import { dismissVerifiedNotice, showVerifiedNoticeOnPath } from '../../ducks/emailVerification.duck';

import EmailVerifiedBanner from './EmailVerifiedBanner/EmailVerifiedBanner';

const Topbar = loadable(() => import(/* webpackChunkName: "Topbar" */ './Topbar/Topbar'));

/**
 * Topbar container component, which is connected to Redux Store.
 * @component
 * @param {Object} props
 * @param {number} props.notificationCount number of notifications
 * @param {Function} props.onLogout logout function
 * @param {Function} props.onManageDisableScrolling manage disable scrolling function
 * @param {Function} props.onResendVerificationEmail resend verification email function
 * @param {Object} props.sendVerificationEmailInProgress send verification email in progress
 * @param {Object} props.sendVerificationEmailError send verification email error
 * @param {boolean} props.hasGenericError has generic error
 * @param {boolean} props.showEmailVerifiedNotice show the one-off "Your email is verified." banner
 * @param {Function} props.onDismissEmailVerifiedNotice dismiss that banner
 * @returns {JSX.Element}
 */
export const TopbarContainerComponent = props => {
  const {
    notificationCount = 0,
    hasGenericError,
    showEmailVerifiedNotice = false,
    onDismissEmailVerifiedNotice,
    ...rest
  } = props;

  return (
    <>
      {showEmailVerifiedNotice ? (
        <EmailVerifiedBanner onDismiss={onDismissEmailVerifiedNotice} />
      ) : null}
      <Topbar notificationCount={notificationCount} showGenericError={hasGenericError} {...rest} />
    </>
  );
};

const mapStateToProps = (state, ownProps) => {
  // Topbar needs isAuthenticated and isLoggedInAs
  const { isAuthenticated, isLoggedInAs, logoutError, authScopes } = state.auth;
  // Topbar needs user info.
  const {
    currentUser,
    currentUserHasListings,
    currentUserHasOrders,
    currentUserSaleNotificationCount = 0,
    currentUserOrderNotificationCount = 0,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
  } = state.user;
  const hasGenericError = !!(logoutError || hasCurrentUserErrors(state));
  return {
    authInProgress: authenticationInProgress(state),
    currentUser,
    currentUserHasListings,
    currentUserHasOrders,
    notificationCount: currentUserSaleNotificationCount + currentUserOrderNotificationCount,
    isAuthenticated,
    isLoggedInAs,
    authScopes,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
    hasGenericError,
    // Screen 05: one-off banner on the page the user lands on right after verifying their email
    showEmailVerifiedNotice: showVerifiedNoticeOnPath(state, ownProps.location?.pathname),
  };
};

const mapDispatchToProps = dispatch => ({
  onLogout: historyPush => dispatch(logout(historyPush)),
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
  onResendVerificationEmail: () => dispatch(sendVerificationEmail()),
  onDismissEmailVerifiedNotice: () => dispatch(dismissVerifiedNotice()),
});

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const TopbarContainer = compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(TopbarContainerComponent);

export default TopbarContainer;
