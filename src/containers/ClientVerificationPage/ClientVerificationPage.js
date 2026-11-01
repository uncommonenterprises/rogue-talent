import React, { useState } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { ensureCurrentUser } from '../../util/data';
import { isClientIdentityVerified } from '../../util/userHelpers';
import {
  ACCOUNT_STATUS_REJECTED,
  REVIEW_DECISION_APPROVED,
  getAccountStatus,
  getReviewDecision,
  isAccountStatusFlowEnabled,
} from '../../util/accountStatus';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { fetchCurrentUser } from '../../ducks/user.duck';

import { Page, LayoutSingleColumn, PrimaryButton, NamedLink } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import {
  InfoList,
  IconCheck,
  IconClock,
  IconIdCard,
  IconShield,
} from '../AccountStatusPage/StatusCard/StatusCard';

import { createSession } from './ClientVerificationPage.duck';
import css from './ClientVerificationPage.module.css';

const NOT_CONFIGURED_CODE = 'identity-verification-not-configured';

// 16px line icon for the privacy point (matches the info-list icons).
const IconLock = () => (
  <svg className={css.infoIcon} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

/**
 * The status-card look used on /account-status (journey.css .status-card): a round line icon,
 * the Bricolage headline and a lede, then the step's content.
 *
 * @component
 * @param {Object} props
 * @param {ReactNode} props.icon
 * @param {string} props.iconClassName colour variant for the icon circle
 * @param {ReactNode} props.title
 * @param {ReactNode} props.lede
 * @param {ReactNode} props.children
 * @returns {JSX.Element}
 */
const VerificationCard = props => {
  const { icon, iconClassName, title, lede, children } = props;
  return (
    <section className={css.card}>
      <div className={css.head}>
        <div className={classNames(css.icon, iconClassName)}>{icon}</div>
        <h1 className={css.title}>{title}</h1>
        <p className={css.lede}>{lede}</p>
      </div>
      {children}
    </section>
  );
};

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

  // Run-through 01/11/2026, finding 5: "You can now book models" is only true once the account
  // is also review-approved (account status Verified). Read-only use of the lifecycle helpers;
  // the booking gates themselves are unchanged. With the account-status flow off there is no
  // review step, so verified means ready to book, as before.
  const flagEnabled = isAccountStatusFlowEnabled();
  const reviewApproved = getReviewDecision(user) === REVIEW_DECISION_APPROVED;
  const reviewDeclined = getAccountStatus({ currentUser: user }) === ACCOUNT_STATUS_REJECTED;
  const canBook = !flagEnabled || reviewApproved;

  const renderCard = () => {
    if (isVerified && canBook) {
      return (
        <VerificationCard
          icon={<IconCheck />}
          iconClassName={css.iconVerified}
          title={<FormattedMessage id="ClientVerificationPage.verifiedTitle" />}
          lede={<FormattedMessage id="ClientVerificationPage.verifiedBody" />}
        >
          <NamedLink name="SearchPage" className={css.primaryButtonBlock}>
            <FormattedMessage id="ClientVerificationPage.browseModels" />
          </NamedLink>
        </VerificationCard>
      );
    }

    if (isVerified) {
      return (
        <VerificationCard
          icon={<IconCheck />}
          iconClassName={css.iconVerified}
          title={<FormattedMessage id="ClientVerificationPage.verifiedNotApprovedTitle" />}
          lede={
            <FormattedMessage
              id={
                reviewDeclined
                  ? 'ClientVerificationPage.verifiedDeclinedBody'
                  : 'ClientVerificationPage.verifiedNotApprovedBody'
              }
            />
          }
        >
          <NamedLink name="AccountStatusPage" className={css.primaryButtonBlock}>
            <FormattedMessage id="ClientVerificationPage.accountStatusLink" />
          </NamedLink>
        </VerificationCard>
      );
    }

    if (stage === 'processing') {
      return (
        <VerificationCard
          icon={<IconClock />}
          iconClassName={css.iconPending}
          title={<FormattedMessage id="ClientVerificationPage.processingTitle" />}
          lede={<FormattedMessage id="ClientVerificationPage.processingBody" />}
        >
          <PrimaryButton type="button" className={css.buttonBlock} onClick={() => onRefreshUser()}>
            <FormattedMessage id="ClientVerificationPage.refreshStatus" />
          </PrimaryButton>
        </VerificationCard>
      );
    }

    return (
      <VerificationCard
        icon={<IconShield />}
        iconClassName={css.iconStart}
        title={<FormattedMessage id="ClientVerificationPage.heading" />}
        lede={<FormattedMessage id="ClientVerificationPage.intro" />}
      >
        <InfoList
          items={[
            {
              key: 'stripe',
              icon: <IconIdCard />,
              text: <FormattedMessage id="ClientVerificationPage.pointStripe" />,
            },
            {
              key: 'privacy',
              icon: <IconLock />,
              text: <FormattedMessage id="ClientVerificationPage.pointPrivacy" />,
            },
          ]}
        />

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
          className={css.buttonBlock}
          inProgress={createSessionInProgress}
          onClick={handleVerify}
        >
          <FormattedMessage id="ClientVerificationPage.verifyButton" />
        </PrimaryButton>
      </VerificationCard>
    );
  };

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.shell}>{renderCard()}</div>
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
