import React, { useState } from 'react';

// Import contexts and util modules
import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { pathByRouteName } from '../../util/routes';
import {
  ACCOUNT_STATUS_PENDING,
  ACCOUNT_STATUS_APPROVED,
  ACCOUNT_STATUS_VERIFIED,
  ACCOUNT_STATUS_REJECTED,
} from '../../util/accountStatus';

// Import shared components
import { NamedLink } from '../../components';

// Import modules from this directory
import {
  ROLE_MODEL,
  getPendingTrackerSteps,
  getProfileLinkProps,
  getEditProfileLinkProps,
  isProfilePublished,
} from './AccountStatusPage.helpers';
import {
  StatusCard,
  ProgressTracker,
  Callout,
  InfoList,
  IconIdCard,
  IconSelfie,
  IconBank,
  IconChevron,
  IconArrowRight,
  IconCalendar,
} from './StatusCard/StatusCard';
import css from './AccountStatusPage.module.css';

// Support contact for the "Not approved" screen. There is no contact page route, so the address
// is shown as text with a mailto link for convenience.
export const SUPPORT_EMAIL = 'support@roguetalent.co';

// Gate B destinations: Stripe Connect onboarding / payout details for models (the existing
// payout flow), Stripe Identity for clients (the existing /verify-identity flow).
const MODEL_VERIFY_ROUTE = 'StripePayoutPage';
const CLIENT_VERIFY_ROUTE = 'ClientVerificationPage';

const companyNameOf = currentUser =>
  currentUser?.attributes?.profile?.publicData?.company_name?.trim() || null;

// The quiet "Manage your calendar" link (screens 14 and 16): a plain text link, not a button,
// since blocking dates is optional.
const ManageCalendar = ({ ownListing }) => (
  <div className={css.calendarRow}>
    <IconCalendar />
    <div>
      <NamedLink {...getEditProfileLinkProps(ownListing, 'availability')} className={css.quietLink}>
        <FormattedMessage id="AccountStatusPage.manageCalendar" />
      </NamedLink>
      <p className={css.calendarHint}>
        <FormattedMessage id="AccountStatusPage.manageCalendarHint" />
      </p>
    </div>
  </div>
);

// ---- 14 / 19: Pending approval ----------------------------------------------------------------

const PendingScreen = props => {
  const { role, verified, ownListing } = props;
  const intl = useIntl();
  const isModel = role === ROLE_MODEL;
  const prefix = `AccountStatusPage.${role}.pending`;

  return (
    <StatusCard
      status={ACCOUNT_STATUS_PENDING}
      title={<FormattedMessage id={`${prefix}.title`} />}
      lede={<FormattedMessage id={`${prefix}.lede`} />}
    >
      <ProgressTracker
        steps={getPendingTrackerSteps({ role, verified })}
        ariaLabel={intl.formatMessage({ id: 'AccountStatusPage.tracker.label' })}
      />
      <p className={css.visibilityNote}>
        <FormattedMessage id={`${prefix}.visibility`} />
      </p>

      {/* Verification already done while waiting (banked): the tracker shows it, so no nudge. */}
      {verified ? null : (
        <Callout
          variant="accent"
          title={<FormattedMessage id={`${prefix}.verifyNowTitle`} />}
          text={<FormattedMessage id={`${prefix}.verifyNowText`} />}
          action={
            <NamedLink
              name={isModel ? MODEL_VERIFY_ROUTE : CLIENT_VERIFY_ROUTE}
              className={css.primaryButton}
            >
              <FormattedMessage id="AccountStatusPage.verifyWithStripe" />
            </NamedLink>
          }
        />
      )}

      {isModel ? (
        <ManageCalendar ownListing={ownListing} />
      ) : (
        <NamedLink name="SearchPage" className={css.secondaryButtonBlock}>
          <FormattedMessage id="AccountStatusPage.browseModels" />
        </NamedLink>
      )}
    </StatusCard>
  );
};

// ---- 15 / 20: Approved, verify -----------------------------------------------------------------

const ApprovedScreen = props => {
  const { role, currentUser } = props;
  const isModel = role === ROLE_MODEL;
  const prefix = `AccountStatusPage.${role}.approved`;
  const companyName = companyNameOf(currentUser);

  const items = [
    {
      key: 'id',
      icon: <IconIdCard />,
      text: <FormattedMessage id="AccountStatusPage.needPhotoId" />,
    },
    // Selfie is a Stripe Identity step (clients). Stripe Connect onboarding for models isn't
    // confirmed to ask for one, so the line is client-only (PM, 30/09/2026).
    ...(isModel
      ? []
      : [
          {
            key: 'selfie',
            icon: <IconSelfie />,
            text: <FormattedMessage id="AccountStatusPage.needSelfie" />,
          },
        ]),
    ...(isModel
      ? [
          {
            key: 'bank',
            icon: <IconBank />,
            text: <FormattedMessage id="AccountStatusPage.needBankDetails" />,
          },
        ]
      : []),
  ];

  const lede = isModel ? (
    <FormattedMessage id={`${prefix}.lede`} />
  ) : companyName ? (
    <FormattedMessage id={`${prefix}.lede`} values={{ companyName }} />
  ) : (
    <FormattedMessage id={`${prefix}.ledeNoName`} />
  );

  return (
    <StatusCard
      status={ACCOUNT_STATUS_APPROVED}
      title={<FormattedMessage id={`${prefix}.title`} />}
      lede={lede}
    >
      <Callout
        title={<FormattedMessage id="AccountStatusPage.whyWeAsk" />}
        text={<FormattedMessage id={`${prefix}.whyWeAskText`} />}
      />

      <InfoList items={items} />

      <div className={css.actionGroup}>
        <NamedLink
          name={isModel ? MODEL_VERIFY_ROUTE : CLIENT_VERIFY_ROUTE}
          className={css.primaryButtonBlock}
        >
          <FormattedMessage id="AccountStatusPage.verifyWithStripe" />
          <IconArrowRight />
        </NamedLink>
        <p className={css.smallPrint}>
          <FormattedMessage id={`${prefix}.handoffNote`} />
        </p>
      </div>

      {isModel ? null : (
        <NamedLink name="SearchPage" className={css.secondaryButtonBlock}>
          <FormattedMessage id="AccountStatusPage.browseModels" />
        </NamedLink>
      )}
    </StatusCard>
  );
};

// ---- 16: Model verified / you're live ----------------------------------------------------------

const ProfileLinkField = props => {
  const { url } = props;
  const intl = useIntl();
  const [copied, setCopied] = useState(false);
  const inputId = 'AccountStatusPage.profileLink';

  const handleCopy = () => {
    const done = () => setCopied(true);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done, () => {});
    } else if (typeof document !== 'undefined') {
      // Older browsers: select the text so it can be copied by hand.
      const input = document.getElementById(inputId);
      if (input) {
        input.select();
      }
    }
  };

  return (
    <div className={css.copyFieldRoot}>
      <label htmlFor={inputId} className={css.fieldLabel}>
        <FormattedMessage id="AccountStatusPage.model.verified.profileLinkLabel" />
      </label>
      <div className={css.copyField}>
        <input
          id={inputId}
          className={css.copyInput}
          type="text"
          // Shown without the protocol (as in the mockup) so the useful part fits on a phone;
          // Copy puts the full address on the clipboard.
          value={url.replace(/^https?:\/\//, '')}
          readOnly
          onFocus={e => e.target.select()}
        />
        <button type="button" className={css.copyButton} onClick={handleCopy}>
          {copied
            ? intl.formatMessage({ id: 'AccountStatusPage.model.verified.copied' })
            : intl.formatMessage({ id: 'AccountStatusPage.model.verified.copy' })}
        </button>
      </div>
      <span className={css.srOnly} aria-live="polite">
        {copied ? intl.formatMessage({ id: 'AccountStatusPage.model.verified.copiedLive' }) : ''}
      </span>
    </div>
  );
};

const ModelVerifiedScreen = props => {
  const { ownListing } = props;
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const prefix = 'AccountStatusPage.model.verified';

  const profileLinkProps = getProfileLinkProps(ownListing);
  const isLive = isProfilePublished(ownListing);
  const rootURL = (config.marketplaceRootURL || '').replace(/\/+$/, '');
  const profileUrl = profileLinkProps
    ? `${rootURL}${pathByRouteName(
        profileLinkProps.name,
        routeConfiguration,
        profileLinkProps.params
      )}`
    : null;

  return (
    <StatusCard
      status={ACCOUNT_STATUS_VERIFIED}
      title={<FormattedMessage id={isLive ? `${prefix}.title` : `${prefix}.titlePublishing`} />}
      lede={<FormattedMessage id={isLive ? `${prefix}.lede` : `${prefix}.ledePublishing`} />}
    >
      {isLive && profileUrl ? <ProfileLinkField url={profileUrl} /> : null}

      <Callout
        variant="muted"
        title={<FormattedMessage id={`${prefix}.nextStepsTitle`} />}
        text={<FormattedMessage id={`${prefix}.nextStepsText`} />}
      />

      {isLive && profileLinkProps ? (
        <NamedLink {...profileLinkProps} className={css.primaryButtonBlock}>
          <FormattedMessage id={`${prefix}.viewProfile`} />
        </NamedLink>
      ) : null}

      <ManageCalendar ownListing={ownListing} />
    </StatusCard>
  );
};

// ---- 21: Client verified / ready to book -------------------------------------------------------

const ClientVerifiedScreen = props => {
  const { currentUser } = props;
  const prefix = 'AccountStatusPage.client.verified';
  const companyName = companyNameOf(currentUser);

  return (
    <StatusCard
      status={ACCOUNT_STATUS_VERIFIED}
      title={<FormattedMessage id={`${prefix}.title`} />}
      lede={
        companyName ? (
          <FormattedMessage id={`${prefix}.lede`} values={{ companyName }} />
        ) : (
          <FormattedMessage id={`${prefix}.ledeNoName`} />
        )
      }
    >
      <Callout
        variant="muted"
        title={<FormattedMessage id={`${prefix}.thingsToKnowTitle`} />}
        text={<FormattedMessage id={`${prefix}.thingsToKnowText`} />}
      />

      <div className={css.actionGroup}>
        <NamedLink name="SearchPage" className={css.primaryButtonBlock}>
          <FormattedMessage id="AccountStatusPage.browseModels" />
        </NamedLink>
        <NamedLink name="ProfileSettingsPage" className={css.secondaryButtonBlock}>
          <FormattedMessage id={`${prefix}.completeProfile`} />
        </NamedLink>
      </div>
    </StatusCard>
  );
};

// ---- 17: Not approved (model and client variants) ----------------------------------------------

// Screen 17 (model only): after editing the profile, send it back for review. The server can only
// clear the 'declined' decision (back to Pending approval), never approve. Clients resubmit by
// submitting their business details again (BusinessDetailsPage), so they don't get this button.
// A secondary keyline button: "Edit your profile" stays the one cobalt action on the screen.
const ResubmitForApproval = props => {
  const { onResubmit, inProgress, error } = props;
  return (
    <>
      <button
        type="button"
        className={css.secondaryButtonBlock}
        onClick={() => onResubmit().catch(() => null)}
        disabled={inProgress}
      >
        <FormattedMessage
          id={
            inProgress
              ? 'AccountStatusPage.model.rejected.resubmitting'
              : 'AccountStatusPage.model.rejected.resubmitCta'
          }
        />
      </button>
      {error ? (
        <p className={css.resubmitError} role="alert">
          <FormattedMessage id="AccountStatusPage.model.rejected.resubmitFailed" />
        </p>
      ) : (
        <p className={css.smallPrint}>
          <FormattedMessage id="AccountStatusPage.model.rejected.resubmitHint" />
        </p>
      )}
    </>
  );
};

const RejectedScreen = props => {
  const {
    role,
    ownListing,
    rejectionReason,
    onResubmit,
    resubmitInProgress = false,
    resubmitError = null,
  } = props;
  const isModel = role === ROLE_MODEL;
  const prefix = `AccountStatusPage.${role}.rejected`;

  const items = [
    {
      key: 'fix',
      icon: <IconChevron />,
      text: <FormattedMessage id={`${prefix}.fixItem`} />,
    },
    {
      key: 'resubmit',
      icon: <IconChevron />,
      text: <FormattedMessage id="AccountStatusPage.rejected.resubmitItem" />,
    },
    {
      key: 'contact',
      icon: <IconChevron />,
      text: <FormattedMessage id="AccountStatusPage.rejected.contactItem" />,
    },
  ];

  const editLinkProps = isModel
    ? getEditProfileLinkProps(ownListing, 'profile')
    : { name: 'BusinessDetailsPage' };

  return (
    <StatusCard
      status={ACCOUNT_STATUS_REJECTED}
      title={<FormattedMessage id={`${prefix}.title`} />}
      lede={<FormattedMessage id="AccountStatusPage.rejected.lede" />}
    >
      <Callout
        title={<FormattedMessage id="AccountStatusPage.rejected.reviewerNoteTitle" />}
        textClassName={rejectionReason ? css.reviewerNote : null}
        text={
          rejectionReason ? (
            <FormattedMessage
              id="AccountStatusPage.rejected.reviewerNote"
              values={{ note: rejectionReason }}
            />
          ) : (
            <FormattedMessage id="AccountStatusPage.rejected.noNote" />
          )
        }
      />

      <InfoList items={items} />

      <div className={css.actionGroup}>
        <NamedLink {...editLinkProps} className={css.primaryButtonBlock}>
          <FormattedMessage id={`${prefix}.editCta`} />
        </NamedLink>
        {isModel && onResubmit ? (
          <ResubmitForApproval
            onResubmit={onResubmit}
            inProgress={resubmitInProgress}
            error={resubmitError}
          />
        ) : null}
        <a href={`mailto:${SUPPORT_EMAIL}`} className={css.ghostButtonBlock}>
          <FormattedMessage id="AccountStatusPage.rejected.contactUs" />
        </a>
        <p className={css.smallPrint}>
          <FormattedMessage
            id="AccountStatusPage.rejected.contactEmail"
            values={{ email: SUPPORT_EMAIL }}
          />
        </p>
      </div>
    </StatusCard>
  );
};

/**
 * The status card for one account-status screen.
 *
 * @component
 * @param {Object} props
 * @param {string} props.role - 'model' | 'client'
 * @param {string} props.status - lifecycle status (never 'draft' here)
 * @param {boolean} props.verified - Gate B complete
 * @param {Object} props.currentUser
 * @param {Object} [props.ownListing] - models only
 * @param {string|null} [props.rejectionReason]
 * @param {Function} [props.onResubmit] - screen 17 (model): resubmit for approval
 * @param {boolean} [props.resubmitInProgress]
 * @param {Object} [props.resubmitError]
 * @returns {JSX.Element|null}
 */
const AccountStatusScreen = props => {
  const { status, role } = props;
  switch (status) {
    case ACCOUNT_STATUS_PENDING:
      return <PendingScreen {...props} />;
    case ACCOUNT_STATUS_APPROVED:
      return <ApprovedScreen {...props} />;
    case ACCOUNT_STATUS_VERIFIED:
      return role === ROLE_MODEL ? (
        <ModelVerifiedScreen {...props} />
      ) : (
        <ClientVerifiedScreen {...props} />
      );
    case ACCOUNT_STATUS_REJECTED:
      return <RejectedScreen {...props} />;
    default:
      return null;
  }
};

export default AccountStatusScreen;
