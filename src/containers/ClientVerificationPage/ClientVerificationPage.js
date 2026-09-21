import React, { useState } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { ensureCurrentUser } from '../../util/data';
import { isClientIdentityVerified } from '../../util/userHelpers';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { fetchCurrentUser } from '../../ducks/user.duck';

import {
  Heading,
  Page,
  LayoutSingleColumn,
  PrimaryButton,
  NamedLink,
  IconSpinner,
} from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import { createSession } from './ClientVerificationPage.duck';
import css from './ClientVerificationPage.module.css';

const NOT_CONFIGURED_CODE = 'identity-verification-not-configured';

/**
 * SAF-03 — Client identity verification page (`/verify-identity`).
 *
 * After signup, before their first booking, a client is prompted to verify their
 * identity via Stripe Identity. This page explains why, launches Stripe's hosted
 * flow (document + selfie), and shows progress/result states. The authoritative
 * booking gate is server-side (server/api/initiate-privileged.js); this is the
 * client-facing entry point the checkout/listing pages route unverified clients to.
 *
 * Stripe holds the ID document images — we only ever store a boolean result.
 *
 * @param {Object} props
 * @param {boolean} props.scrollingDisabled - Whether scrolling is disabled
 * @param {propTypes.currentUser} [props.currentUser] - The current user
 * @param {boolean} props.createSessionInProgress - Whether a session is being created
 * @param {propTypes.error} [props.createSessionError] - Session-creation error, if any
 * @param {Object} [props.session] - The created Stripe session ({ clientSecret, ... })
 * @param {boolean} props.alreadyVerified - Whether the server reported already-verified
 * @param {Function} props.onCreateSession - Create-session dispatcher (returns a thunk promise)
 * @param {Function} props.onRefreshUser - Re-fetch the current user
 * @returns {JSX.Element} Client verification page
 */
export const ClientVerificationPageComponent = props => {
  const intl = useIntl();
  const config = useConfiguration();

  const {
    scrollingDisabled,
    currentUser,
    createSessionInProgress,
    createSessionError,
    alreadyVerified,
    onCreateSession,
    onRefreshUser,
  } = props;

  // Local UI state for the Stripe modal interaction (client-only, not data loading).
  // stage: 'idle' | 'processing' — 'processing' = the client finished Stripe's flow
  // and we are awaiting the webhook to write the result.
  const [stage, setStage] = useState('idle');
  const [launchError, setLaunchError] = useState(null);

  const user = ensureCurrentUser(currentUser);
  const isVerified = isClientIdentityVerified(user) || alreadyVerified;
  const publishableKey = config.stripe?.publishableKey;

  const notConfigured = createSessionError?.code === NOT_CONFIGURED_CODE;

  const launchStripe = clientSecret => {
    if (typeof window === 'undefined' || !window.Stripe || !publishableKey) {
      setLaunchError('unavailable');
      return;
    }
    const stripe = window.Stripe(publishableKey);
    stripe
      .verifyIdentity(clientSecret)
      .then(result => {
        if (result?.error) {
          // User closed the modal or Stripe reported an error; let them retry.
          setLaunchError('stripe');
          setStage('idle');
        } else {
          // Modal submitted. The result arrives asynchronously via webhook.
          setStage('processing');
        }
      })
      .catch(() => {
        setLaunchError('stripe');
        setStage('idle');
      });
  };

  const handleVerify = () => {
    setLaunchError(null);
    const maybePromise = onCreateSession();
    // dispatch(createSession()) returns a thunk promise exposing .unwrap()
    if (maybePromise && typeof maybePromise.unwrap === 'function') {
      maybePromise
        .unwrap()
        .then(payload => {
          if (payload?.alreadyVerified) {
            return;
          }
          if (payload?.clientSecret) {
            launchStripe(payload.clientSecret);
          }
        })
        .catch(() => {
          // Error surfaced via createSessionError in the store.
        });
    }
  };

  const title = intl.formatMessage({ id: 'ClientVerificationPage.title' });

  const renderBody = () => {
    if (isVerified) {
      return (
        <div className={css.panel}>
          <Heading as="h2" rootClassName={css.panelTitle}>
            <FormattedMessage id="ClientVerificationPage.verifiedTitle" />
          </Heading>
          <p className={css.paragraph}>
            <FormattedMessage id="ClientVerificationPage.verifiedBody" />
          </p>
          <NamedLink name="SearchPage" className={css.primaryLink}>
            <FormattedMessage id="ClientVerificationPage.browseModels" />
          </NamedLink>
        </div>
      );
    }

    if (stage === 'processing') {
      return (
        <div className={css.panel}>
          <Heading as="h2" rootClassName={css.panelTitle}>
            <FormattedMessage id="ClientVerificationPage.processingTitle" />
          </Heading>
          <p className={css.paragraph}>
            <FormattedMessage id="ClientVerificationPage.processingBody" />
          </p>
          <PrimaryButton type="button" onClick={() => onRefreshUser()}>
            <FormattedMessage id="ClientVerificationPage.refreshStatus" />
          </PrimaryButton>
        </div>
      );
    }

    return (
      <div className={css.panel}>
        <p className={css.intro}>
          <FormattedMessage id="ClientVerificationPage.intro" />
        </p>
        <ul className={css.points}>
          <li className={css.point}>
            <FormattedMessage id="ClientVerificationPage.pointTime" />
          </li>
          <li className={css.point}>
            <FormattedMessage id="ClientVerificationPage.pointStripe" />
          </li>
          <li className={css.point}>
            <FormattedMessage id="ClientVerificationPage.pointPrivacy" />
          </li>
        </ul>

        {notConfigured ? (
          <p className={css.error}>
            <FormattedMessage id="ClientVerificationPage.notConfigured" />
          </p>
        ) : null}
        {createSessionError && !notConfigured ? (
          <p className={css.error}>
            <FormattedMessage id="ClientVerificationPage.createSessionError" />
          </p>
        ) : null}
        {launchError ? (
          <p className={css.error}>
            <FormattedMessage id="ClientVerificationPage.launchError" />
          </p>
        ) : null}

        <PrimaryButton
          type="button"
          inProgress={createSessionInProgress}
          onClick={handleVerify}
        >
          <FormattedMessage id="ClientVerificationPage.verifyButton" />
        </PrimaryButton>
        {createSessionInProgress ? (
          <span className={css.spinner}>
            <IconSpinner />
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        mainColumnClassName={css.layoutWrapperMain}
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          <Heading as="h1" rootClassName={css.title}>
            <FormattedMessage id="ClientVerificationPage.heading" />
          </Heading>
          {renderBody()}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    createSessionInProgress,
    createSessionError,
    session,
    alreadyVerified,
  } = state.ClientVerificationPage;
  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    createSessionInProgress,
    createSessionError,
    session,
    alreadyVerified,
  };
};

const mapDispatchToProps = dispatch => ({
  onCreateSession: () => dispatch(createSession()),
  onRefreshUser: () => dispatch(fetchCurrentUser()),
});

const ClientVerificationPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ClientVerificationPageComponent);

export default ClientVerificationPage;
