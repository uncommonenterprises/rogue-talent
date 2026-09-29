import React, { useState } from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { isTooManyEmailVerificationRequestsError } from '../../../../util/errors';

// Import shared components
import {
  AspectRatioWrapper,
  Button,
  FieldCheckbox,
  Form,
  InlineTextButton,
  NamedLink,
  ResponsiveImage,
} from '../../../../components';

// Import modules from parent directory
import {
  WizardActions,
  WizardPanelHeader,
  wizardPrimaryButtonClassName,
} from '../WizardShell/WizardShell';

// Import modules from this directory
import { getAboutYouRows, getProfileRows, getRatesRows } from './reviewSummary';
import css from './EditListingReviewPanel.module.css';

const CONFIRMATION_FIELD = 'accuracyConfirmed';

/**
 * The listing privateData saved when the model submits: the time they ticked "I confirm this
 * information is accurate and the portfolio images are of me". privateData is only visible to
 * the model and the operator.
 *
 * @param {Date} [now] the confirmation time (defaults to the current time)
 * @returns {Object} listing update values
 */
export const getAccuracyConfirmationValues = (now = new Date()) => ({
  privateData: { accuracyConfirmedAt: now.toISOString() },
});

const ReviewSection = props => {
  const { titleId, editLinkProps, children } = props;
  const intl = useIntl();
  const title = intl.formatMessage({ id: titleId });
  return (
    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{title}</h2>
        <NamedLink
          {...editLinkProps}
          className={css.editLink}
          ariaLabel={intl.formatMessage({ id: 'EditListingReviewPanel.editSection' }, { title })}
        >
          <FormattedMessage id="EditListingReviewPanel.edit" />
        </NamedLink>
      </div>
      {children}
    </section>
  );
};

const SummaryList = ({ rows }) => (
  <dl className={css.summary}>
    {rows.map(row => (
      <div key={row.key} className={css.summaryRow}>
        <dt className={css.summaryLabel}>{row.label}</dt>
        <dd className={css.summaryValue}>{row.value}</dd>
      </div>
    ))}
  </dl>
);

const PortfolioThumbnails = props => {
  const { images = [], variantPrefix = 'listing-card' } = props;
  const intl = useIntl();
  return (
    <ul className={css.thumbs}>
      {images.map((image, i) => {
        const variants = Object.keys(image?.attributes?.variants || {}).filter(k =>
          k.startsWith(variantPrefix)
        );
        return (
          <li key={image.id?.uuid || i} className={css.thumb}>
            <AspectRatioWrapper width={4} height={5}>
              <ResponsiveImage
                rootClassName={css.thumbImage}
                image={image}
                variants={variants}
                sizes="64px"
                alt={intl.formatMessage(
                  { id: 'EditListingReviewPanel.photoAlt' },
                  { number: i + 1, total: images.length }
                )}
              />
            </AspectRatioWrapper>
          </li>
        );
      })}
    </ul>
  );
};

// Screen 13 alternate state: the model can't submit until their email address is verified.
const EmailVerificationNotice = props => {
  const { onResend, inProgress, resent, error } = props;
  const resendLink = (
    <InlineTextButton className={css.resendLink} onClick={onResend} disabled={inProgress}>
      <FormattedMessage id="EditListingReviewPanel.resendEmailLink" />
    </InlineTextButton>
  );
  return (
    <div className={css.emailNotice} role="status">
      <p className={css.emailNoticeText}>
        <FormattedMessage
          id="EditListingReviewPanel.verifyEmailToSubmit"
          values={{ resendEmailLink: resendLink }}
        />
      </p>
      {resent && !error ? (
        <p className={css.emailNoticeText}>
          <FormattedMessage id="EditListingReviewPanel.resendEmailSent" />
        </p>
      ) : null}
      {error ? (
        <p className={css.error}>
          <FormattedMessage
            id={
              isTooManyEmailVerificationRequestsError(error)
                ? 'EditListingReviewPanel.resendFailedTooManyRequests'
                : 'EditListingReviewPanel.resendFailed'
            }
          />
        </p>
      ) : null}
    </div>
  );
};

const ErrorMessages = props => {
  const { errors } = props;
  const { publishListingError, showListingsError, updateListingError } = errors || {};
  return (
    <>
      {updateListingError ? (
        <p className={css.error}>
          <FormattedMessage id="EditListingReviewPanel.updateFailed" />
        </p>
      ) : null}
      {publishListingError ? (
        <p className={css.error}>
          <FormattedMessage id="EditListingReviewPanel.publishFailed" />
        </p>
      ) : null}
      {showListingsError ? (
        <p className={css.error}>
          <FormattedMessage id="EditListingReviewPanel.showListingFailed" />
        </p>
      ) : null}
    </>
  );
};

/**
 * "Review & submit" (sign-up journey screen 13): the last step of the new model profile flow.
 * A read-only summary of each step with an "Edit" link back to it, the "What happens next"
 * callout, and a required accuracy / image-ownership tick box. "Submit for approval" saves the
 * confirmation time to the listing's privateData (accuracyConfirmedAt) and then publishes the
 * draft through the wizard's existing publish handler (handlePublishListing).
 *
 * The model can only submit once their email address is verified; until then the button is
 * disabled and a notice offers to resend the verification email.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.ownListing} props.listing - The draft listing
 * @param {Object} props.config - The marketplace config
 * @param {propTypes.currentUser} props.currentUser - The current user (for the email check)
 * @param {Object} props.sectionLinks - NamedLink props for each section's "Edit" link:
 *   { aboutYou, profile, rates, portfolio }
 * @param {Object} [props.backLinkProps] - NamedLink props for "Back"
 * @param {Function} props.onSubmit - Called with the listing update values
 * @param {Function} props.onResendVerificationEmail - Resends the verification email
 * @param {boolean} [props.sendVerificationEmailInProgress] - Whether a resend is in progress
 * @param {Object} [props.sendVerificationEmailError] - The resend error
 * @param {string} props.submitButtonText - The submit button label
 * @param {boolean} [props.updateInProgress] - Whether a save is in progress
 * @param {boolean} [props.disabled] - Whether the form is disabled
 * @param {boolean} [props.ready] - Whether the listing has been published
 * @param {Object} props.errors - The wizard errors
 * @returns {JSX.Element}
 */
const EditListingReviewPanel = props => {
  const {
    className,
    rootClassName,
    listing,
    config,
    currentUser,
    sectionLinks = {},
    backLinkProps,
    onSubmit,
    onResendVerificationEmail,
    sendVerificationEmailInProgress = false,
    sendVerificationEmailError = null,
    submitButtonText,
    updateInProgress = false,
    disabled = false,
    ready = false,
    errors,
    updatePageTitle: UpdatePageTitle,
  } = props;
  const intl = useIntl();
  const [resent, setResent] = useState(false);

  const classes = classNames(rootClassName || css.root, className);
  const isEmailVerified = !!currentUser?.attributes?.emailVerified;
  const variantPrefix = config?.layout?.listingImage?.variantPrefix || 'listing-card';
  const images = listing?.images || [];
  const title = intl.formatMessage({ id: 'EditListingReviewPanel.title' });

  const handleResend = () => {
    setResent(false);
    if (!onResendVerificationEmail) {
      return;
    }
    Promise.resolve(onResendVerificationEmail())
      .then(() => setResent(true))
      .catch(() => {
        // The error is kept in the user duck (sendVerificationEmailError) and shown below.
      });
  };

  return (
    <main className={classes}>
      {UpdatePageTitle ? <UpdatePageTitle panelHeading={title} /> : null}
      <WizardPanelHeader
        title={title}
        guidance={<FormattedMessage id="EditListingReviewPanel.guidance" />}
      />

      <div className={css.sections}>
        <ReviewSection
          titleId="EditListingReviewPanel.aboutYouTitle"
          editLinkProps={sectionLinks.aboutYou}
        >
          <SummaryList rows={getAboutYouRows(listing, intl)} />
        </ReviewSection>

        <ReviewSection
          titleId="EditListingReviewPanel.profileTitle"
          editLinkProps={sectionLinks.profile}
        >
          <SummaryList rows={getProfileRows(listing, config, intl)} />
        </ReviewSection>

        <ReviewSection
          titleId="EditListingReviewPanel.ratesTitle"
          editLinkProps={sectionLinks.rates}
        >
          <SummaryList rows={getRatesRows(listing, config, intl)} />
        </ReviewSection>

        <ReviewSection
          titleId="EditListingReviewPanel.portfolioTitle"
          editLinkProps={sectionLinks.portfolio}
        >
          <PortfolioThumbnails images={images} variantPrefix={variantPrefix} />
        </ReviewSection>

        <div className={css.callout}>
          <h2 className={css.calloutTitle}>
            <FormattedMessage id="EditListingReviewPanel.whatHappensNextTitle" />
          </h2>
          <p className={css.calloutText}>
            <FormattedMessage id="EditListingReviewPanel.whatHappensNextText" />
          </p>
        </div>
      </div>

      <FinalForm
        onSubmit={() => onSubmit(getAccuracyConfirmationValues())}
        render={({ handleSubmit, values }) => {
          const isConfirmed = !!values?.[CONFIRMATION_FIELD];
          const submitDisabled =
            !isConfirmed || !isEmailVerified || disabled || updateInProgress || ready;
          return (
            <Form className={css.form} onSubmit={handleSubmit}>
              <FieldCheckbox
                id="EditListingReviewPanel.accuracyConfirmed"
                name={CONFIRMATION_FIELD}
                className={css.confirmation}
                textClassName={css.confirmationText}
                label={intl.formatMessage({ id: 'EditListingReviewPanel.confirmationLabel' })}
              />

              <ErrorMessages errors={errors} />

              {!isEmailVerified ? (
                <EmailVerificationNotice
                  onResend={handleResend}
                  inProgress={sendVerificationEmailInProgress}
                  resent={resent}
                  error={sendVerificationEmailError}
                />
              ) : null}

              <WizardActions backLinkProps={backLinkProps}>
                <Button
                  className={wizardPrimaryButtonClassName}
                  type="submit"
                  inProgress={updateInProgress}
                  disabled={submitDisabled}
                  ready={ready}
                >
                  {submitButtonText}
                </Button>
              </WizardActions>
            </Form>
          );
        }}
      />
    </main>
  );
};

export default EditListingReviewPanel;
