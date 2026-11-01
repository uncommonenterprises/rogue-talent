import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { parse } from '../../util/urlHelpers';
import { ensureCurrentUser } from '../../util/data';
import { clientNeedsBusinessDetails } from '../../util/clientBusinessDetails';
import { isAccountStatusFlowEnabled, isModelUser } from '../../util/accountStatus';
import { isUserAuthorized } from '../../util/userHelpers';
import { verify } from '../../ducks/emailVerification.duck';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { Page, NamedRedirect, AuthShell } from '../../components';

import { getModelProfileRoute } from '../EditListingPage/modelProfileRoute';

import EmailVerificationForm from './EmailVerificationForm/EmailVerificationForm';

import css from './EmailVerificationPage.module.css';

/**
  Parse verification token from URL

  Returns stringified token, if the token is provided.

  Returns `null` if verification token is not provided.

  Please note that we need to explicitely stringify the token, because
  the unwanted result of the `parse` method is that it automatically
  parses the token to number.
*/
const parseVerificationToken = search => {
  const urlParams = parse(search);
  const verificationToken = urlParams.t;

  if (verificationToken) {
    return `${verificationToken}`;
  }

  return null;
};

/**
 * Where a user lands straight after verifying their email (screen 05 / RT-FB-08). The one-off
 * "Your email is verified." banner is shown on arrival (see emailVerification.duck).
 * - Models go to their profile (run-through 01/11/2026, finding 1): a model with no profile
 *   starts a new one; a model with a draft continues it at the first incomplete step (or Review
 *   & submit); a model who has submitted goes to their account status (or the "Your profile"
 *   dashboard with the account-status flow off). See getModelProfileRoute.
 * - Clients continue to "Your business details" (screen 18, sign-up stage 3) until they've
 *   submitted it, then Browse models (SearchPage), not the marketing homepage.
 *
 * @param {Object} params
 * @param {Object} params.user current user entity
 * @param {Object} [params.profileListing] a model's own profile listing (null if none)
 * @param {Object} [params.config] marketplace config (needed for a model's draft)
 * @param {boolean} [params.flagEnabled] account-status flow flag; defaults to the env flag
 * @returns {{ name: string, params?: Object }} NamedRedirect props
 */
export const getVerifiedDestination = ({
  user,
  profileListing,
  config,
  flagEnabled = isAccountStatusFlowEnabled(),
}) =>
  isModelUser(user)
    ? getModelProfileRoute({ profileListing, config, flagEnabled })
    : clientNeedsBusinessDetails(user)
    ? { name: 'BusinessDetailsPage' }
    : { name: 'SearchPage' };

/**
 * The EmailVerificationPage component.
 *
 * @component
 * @param {Object} props
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {boolean} props.scrollingDisabled - Whether scrolling is disabled
 * @param {Function} props.submitVerification - The submit verification function
 * @param {boolean} props.isVerified - Whether the email is verified
 * @param {boolean} props.emailVerificationInProgress - Whether the email verification is in progress
 * @param {propTypes.error} props.verificationError - The verification error
 * @param {Object} props.location - The location object
 * @param {string} props.location.search - The search object
 * @param {Object} [props.profileListing] - a model's own profile listing (null if none)
 * @param {boolean} [props.profileListingReady] - has a model's profile listing been looked up?
 * @returns {JSX.Element} email verification page component
 */
export const EmailVerificationPageComponent = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const {
    currentUser,
    scrollingDisabled,
    submitVerification,
    isVerified,
    emailVerificationInProgress,
    verificationError,
    location,
    profileListing = null,
    profileListingReady = true,
  } = props;

  const initialValues = {
    verificationToken: parseVerificationToken(location ? location.search : null),
  };
  const user = ensureCurrentUser(currentUser);

  // The first attempt to verify email is done when the page is loaded
  // If the verify API call is successfull and the user has verified email
  // We can redirect user forward from email verification page.
  const isVerifiedNow =
    isVerified && user.attributes.emailVerified && user.attributes.pendingEmail == null;
  // A model's destination depends on their own profile listing, so wait until it has been looked
  // up rather than guessing "no profile". (A user who isn't active can't have one fetched; they
  // keep today's route and the new-profile page handles their access.)
  const waitForProfileListing = isModelUser(user) && isUserAuthorized(user) && !profileListingReady;

  if (isVerifiedNow && !waitForProfileListing) {
    // Drop the user straight into the platform rather than a generic page.
    const destination = getVerifiedDestination({ user, profileListing, config });
    return <NamedRedirect name={destination.name} params={destination.params} />;
  }
  // Run-through M9: while the link's token is being checked (and until the redirect), show a
  // minimal "Verifying your email…" line instead of the old template screen. The full form only
  // appears when there's something to act on: no token, or the check failed.
  const hasToken = !!initialValues.verificationToken;
  const showVerifying =
    (hasToken && !verificationError) || (isVerifiedNow && waitForProfileListing);

  return (
    <Page
      title={intl.formatMessage({
        id: 'EmailVerificationPage.title',
      })}
      scrollingDisabled={scrollingDisabled}
      referrer="origin"
    >
      <AuthShell variant="verify">
        <div className={css.content}>
          {showVerifying ? (
            <p className={css.loading} role="status">
              <FormattedMessage id="EmailVerificationPage.verifying" />
            </p>
          ) : user.id ? (
            <EmailVerificationForm
              initialValues={initialValues}
              onSubmit={submitVerification}
              currentUser={user}
              inProgress={emailVerificationInProgress}
              verificationError={verificationError}
            />
          ) : (
            <p className={css.loading}>
              <FormattedMessage id="EmailVerificationPage.loadingUserInformation" />
            </p>
          )}
        </div>
      </AuthShell>
    </Page>
  );
};

const mapStateToProps = state => {
  const {
    currentUser,
    currentUserProfileListing,
    currentUserProfileListingFetched,
    currentUserProfileListingInProgress,
  } = state.user;
  const { isVerified, verificationError, verificationInProgress } = state.emailVerification;
  return {
    profileListing: currentUserProfileListing,
    // Ready once looked up and no newer lookup is running (verifying re-fetches the user, which
    // refreshes the listing too).
    profileListingReady: currentUserProfileListingFetched && !currentUserProfileListingInProgress,
    isVerified,
    verificationError,
    emailVerificationInProgress: verificationInProgress,
    currentUser,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  submitVerification: ({ verificationToken }) => {
    return dispatch(verify(verificationToken));
  },
});

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const EmailVerificationPage = compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EmailVerificationPageComponent);

export default EmailVerificationPage;
