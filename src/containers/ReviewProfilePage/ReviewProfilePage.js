import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

// Import contexts and util modules
import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { getModelFirstName } from '../../util/modelProfile';
import {
  REVIEW_KIND_CLIENT,
  REVIEW_KIND_MODEL,
  formatUkDate,
  getCompaniesHouseSearchUrl,
  getUserFieldOptionLabel,
  isReviewBusyError,
  isReviewNoAccessError,
  toAuthorEntity,
  toImageEntities,
  toMoney,
} from '../../util/reviewTool';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';

// Import shared components
import {
  ExternalLink,
  LayoutSingleColumn,
  NamedLink,
  Notice,
  Page,
  RtIcon,
} from '../../components';

// Import modules from parent directory
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import ProfileGallery from '../ListingPage/ModelProfile/ProfileGallery';
import ProfileDetails, { ProfileHead } from '../ListingPage/ModelProfile/ProfileDetails';
import { getWebsiteHref } from '../ListingPage/ModelProfile/profileData';
import profileCss from '../ListingPage/ModelProfile/ModelProfile.module.css';
import ReviewNoAccess from '../ReviewQueuePage/ReviewNoAccess';
import ReviewTimeAgo from '../ReviewQueuePage/ReviewTimeAgo';

// Import modules from this directory
import ReviewPanel, {
  REVIEW_CHECKLIST_ID,
  ReviewDecisionChip,
  SubmittedRow,
  VerificationRows,
} from './ReviewPanel';
import { fetchProfile } from './ReviewProfilePage.duck';
import css from './ReviewProfilePage.module.css';

const BUSINESS_TYPE_SOLE_TRADER = 'sole_trader';

const BackToQueue = () => (
  <NamedLink name="ReviewQueuePage" className={profileCss.backLink}>
    <RtIcon name="arrowLeft" />
    <FormattedMessage id="ReviewTool.backToQueue" />
  </NamedLink>
);

const AlreadyDecided = ({ profile }) =>
  profile?.status?.waiting ? null : (
    <Notice className={css.banner}>
      <FormattedMessage
        id={
          profile?.status?.decision === 'approved'
            ? 'ReviewProfilePage.alreadyDecidedApproved'
            : 'ReviewProfilePage.alreadyDecidedDeclined'
        }
      />{' '}
      <NamedLink name="ReviewQueuePage">
        <FormattedMessage id="ReviewTool.backToQueueLink" />
      </NamedLink>
    </Notice>
  );

/**
 * Phone only (R02): status, submitted date and both Stripe checks first, with a jump to the
 * checklist at the end of the page.
 */
const MiniSummary = ({ profile }) => (
  <div className={css.mini}>
    <div className={css.panelHead}>
      <span className={css.panelTitle}>
        <FormattedMessage id="ReviewPanel.heading" />
      </span>
      <ReviewDecisionChip profile={profile} />
    </div>
    <dl className={css.kv}>
      <SubmittedRow profile={profile} />
      <VerificationRows profile={profile} />
    </dl>
    {profile?.status?.waiting ? (
      <a href={`#${REVIEW_CHECKLIST_ID}`} className={css.jump}>
        <FormattedMessage id="ReviewProfilePage.jumpToPanel" />
      </a>
    ) : null}
  </div>
);

/**
 * R02: the model's profile as clients will see it (the B03 profile sections, read-only, minus
 * reviews and "Checked before going live") with the review panel in the booking panel's place.
 */
const ModelReview = ({ profile, config, onManageDisableScrolling }) => {
  const { listing = {}, author } = profile;
  const images = toImageEntities(listing.images);
  const price = toMoney(listing.price);
  const authorEntity = toAuthorEntity(author);
  const title = listing.title || '';
  const modelName = getModelFirstName(authorEntity, title);
  const isLive = listing.state === 'published';

  return (
    <div className={profileCss.page}>
      <BackToQueue />
      <AlreadyDecided profile={profile} />
      {profile.status?.waiting ? (
        <Notice className={css.banner}>
          <FormattedMessage
            id={
              isLive ? 'ReviewProfilePage.reviewerBannerLive' : 'ReviewProfilePage.reviewerBanner'
            }
            values={{ name: modelName }}
          />
        </Notice>
      ) : null}
      <MiniSummary profile={profile} />

      <ProfileGallery
        images={images}
        title={title}
        onManageDisableScrolling={onManageDisableScrolling}
      />

      <div className={profileCss.grid}>
        <article className={profileCss.main}>
          <ProfileHead title={title} publicData={listing.publicData} config={config} reviews={[]} />
          <ProfileDetails
            publicData={listing.publicData}
            price={price}
            config={config}
            modelName={modelName}
            author={authorEntity}
            reviewMode
          />
        </article>
        <aside className={`${profileCss.aside} ${css.panelAside}`}>
          <ReviewPanel profile={profile} firstName={modelName} />
        </aside>
      </div>
    </div>
  );
};

const Row = ({ labelId, children, hint }) => (
  <div>
    <dt>
      <FormattedMessage id={labelId} />
    </dt>
    <dd>
      {children}
      {hint ? <small>{hint}</small> : null}
    </dd>
  </div>
);

const NotGiven = () => (
  <span className={css.notGiven}>
    <FormattedMessage id="ReviewProfilePage.notGiven" />
  </span>
);

/**
 * R04: a client has no public profile, so the page is the facts a reviewer decides on. Email,
 * phone and date of birth are deliberately not shown (the server never sends them).
 */
const ClientReview = ({ profile, config }) => {
  const { business = {}, person = {}, account = {} } = profile;
  const isSoleTrader = business.businessType === BUSINESS_TYPE_SOLE_TRADER;
  const companiesHouseUrl = getCompaniesHouseSearchUrl(business.companyNumber);
  const websiteHref = getWebsiteHref(business.website);
  const firstName = (person.name || '').split(/\s+/)[0] || '';
  const businessTypeId = isSoleTrader
    ? 'ReviewProfilePage.businessTypeSoleTrader'
    : business.businessType
    ? 'ReviewProfilePage.businessTypeLimited'
    : null;
  const rightsId =
    profile.transactionRights === 'allowed'
      ? 'ReviewProfilePage.transactionRightsAllowed'
      : profile.transactionRights === 'denied'
      ? 'ReviewProfilePage.transactionRightsDenied'
      : 'ReviewProfilePage.transactionRightsUnknown';

  return (
    <div className={css.clientPage}>
      <BackToQueue />
      <AlreadyDecided profile={profile} />
      <header className={css.whoHead}>
        <span className={css.monogramLarge} aria-hidden="true">
          {person.initials}
        </span>
        <div className={css.whoText}>
          <span className={css.eyebrow}>
            <FormattedMessage id="ReviewProfilePage.clientEyebrow" />
            {businessTypeId ? (
              <>
                {' · '}
                <FormattedMessage id={businessTypeId} />
              </>
            ) : null}
          </span>
          <h1 className={css.whoName}>{person.name}</h1>
          {business.companyName ? <span className={css.whoSub}>{business.companyName}</span> : null}
        </div>
      </header>

      <div className={css.cols}>
        <div className={css.facts}>
          <section className={css.factSection} aria-labelledby="review-business">
            <h2 id="review-business" className={css.factTitle}>
              <FormattedMessage id="ReviewProfilePage.sectionBusiness" />
            </h2>
            <dl className={css.factRows}>
              <Row
                labelId={
                  isSoleTrader ? 'ReviewProfilePage.tradingName' : 'ReviewProfilePage.companyName'
                }
              >
                {business.companyName || <NotGiven />}
              </Row>
              {isSoleTrader ? (
                <Row
                  labelId="ReviewProfilePage.companiesHouse"
                  hint={<FormattedMessage id="ReviewProfilePage.companiesHouseSoleTraderHint" />}
                >
                  <FormattedMessage id="ReviewProfilePage.companiesHouseNotApplicable" />
                </Row>
              ) : (
                <Row labelId="ReviewProfilePage.companyNumber">
                  {business.companyNumber ? (
                    <span className={css.companyNumber}>
                      <span className={css.mono}>{business.companyNumber}</span>
                      {companiesHouseUrl ? (
                        <ExternalLink href={companiesHouseUrl} className={css.extLink}>
                          <FormattedMessage id="ReviewProfilePage.companiesHouseLink" />
                        </ExternalLink>
                      ) : null}
                    </span>
                  ) : (
                    <NotGiven />
                  )}
                </Row>
              )}
              <Row
                labelId={
                  isSoleTrader
                    ? 'ReviewProfilePage.businessAddress'
                    : 'ReviewProfilePage.registeredOffice'
                }
              >
                {business.address || <NotGiven />}
              </Row>
              <Row labelId="ReviewProfilePage.industry">
                {getUserFieldOptionLabel(config, 'industry', business.industry) || <NotGiven />}
              </Row>
              <Row
                labelId={
                  isSoleTrader ? 'ReviewProfilePage.websiteOrSocial' : 'ReviewProfilePage.website'
                }
              >
                {websiteHref ? (
                  <ExternalLink href={websiteHref} className={css.extLink}>
                    {business.website}
                  </ExternalLink>
                ) : (
                  business.website || <NotGiven />
                )}
              </Row>
            </dl>
            {!isSoleTrader && companiesHouseUrl ? (
              <p className={css.hint}>
                <FormattedMessage id="ReviewProfilePage.companiesHouseHint" />
              </p>
            ) : null}
          </section>

          <section className={css.factSection} aria-labelledby="review-contact">
            <h2 id="review-contact" className={css.factTitle}>
              <FormattedMessage id="ReviewProfilePage.sectionContact" />
            </h2>
            <dl className={css.factRows}>
              <Row labelId="ReviewProfilePage.contactName">{person.name || <NotGiven />}</Row>
            </dl>
          </section>

          <section className={css.factSection} aria-labelledby="review-account">
            <h2 id="review-account" className={css.factTitle}>
              <FormattedMessage id="ReviewProfilePage.sectionAccount" />
            </h2>
            <dl className={css.factRows}>
              <Row labelId="ReviewProfilePage.signedUp">
                {formatUkDate(account.createdAt) || '-'}
              </Row>
              <Row
                labelId="ReviewProfilePage.businessDetailsSubmitted"
                hint={<ReviewTimeAgo value={profile.submittedAt} overdue={profile.overdue} />}
              >
                {formatUkDate(profile.submittedAt) || '-'}
              </Row>
              <Row labelId="ReviewProfilePage.emailVerified">
                <FormattedMessage id={account.emailVerified ? 'ReviewTool.yes' : 'ReviewTool.no'} />
              </Row>
              <Row
                labelId="ReviewProfilePage.transactionRights"
                hint={<FormattedMessage id="ReviewProfilePage.transactionRightsHint" />}
              >
                <FormattedMessage id={rightsId} />
              </Row>
            </dl>
          </section>
        </div>

        <aside className={css.panelAside}>
          <ReviewPanel profile={profile} firstName={firstName} />
        </aside>
      </div>
    </div>
  );
};

const NotWaiting = () => (
  <div className={css.plainPage}>
    <h1 className={css.plainTitle}>
      <FormattedMessage id="ReviewProfilePage.notWaitingTitle" />
    </h1>
    <p className={css.plainText}>
      <FormattedMessage id="ReviewProfilePage.notWaitingText" />
    </p>
    <NamedLink name="ReviewQueuePage" className={css.primaryLink}>
      <FormattedMessage id="ReviewTool.backToQueueLink" />
    </NamedLink>
  </div>
);

/**
 * Review page (review tool stage 1): R02 for a model, R04 for a client, R07 states for no
 * access and "not waiting". Read-only: the checklist ticks are local and nothing is saved.
 * Anyone without review access gets "You don't have access to this page", the same for real and
 * made-up links (the server decides and sends nothing about the person).
 *
 * @component
 * @param {Object} props
 * @param {Object} [props.profile] - from GET /api/review/user/:userId
 * @param {boolean} props.fetchInProgress
 * @param {Object} [props.fetchError] - { error, status }
 * @param {Object} props.params - { userId }
 * @param {boolean} props.scrollingDisabled
 * @param {Function} props.onRetry
 * @param {Function} props.onManageDisableScrolling
 * @returns {JSX.Element}
 */
export const ReviewProfilePageComponent = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const {
    profile,
    fetchInProgress,
    fetchError,
    params,
    scrollingDisabled,
    onRetry,
    onManageDisableScrolling,
  } = props;

  const noAccess = isReviewNoAccessError(fetchError);
  const name =
    profile?.kind === REVIEW_KIND_MODEL
      ? profile?.listing?.title
      : profile?.kind === REVIEW_KIND_CLIENT
      ? profile?.person?.name
      : null;
  const title = noAccess
    ? intl.formatMessage({ id: 'ReviewNoAccess.title' })
    : name
    ? intl.formatMessage({ id: 'ReviewProfilePage.titleWithName' }, { name })
    : intl.formatMessage({ id: 'ReviewProfilePage.title' });

  const content = noAccess ? (
    <ReviewNoAccess />
  ) : fetchError ? (
    <div className={css.plainPage}>
      <Notice variant="error" role="alert">
        <FormattedMessage
          id={isReviewBusyError(fetchError) ? 'ReviewTool.busy' : 'ReviewTool.error'}
        />
      </Notice>
      <button
        type="button"
        className={css.secondaryButton}
        onClick={() => onRetry(params?.userId)}
        disabled={fetchInProgress}
      >
        <FormattedMessage id="ReviewTool.retry" />
      </button>
    </div>
  ) : !profile ? (
    <div className={css.plainPage}>
      <p className={css.plainText}>
        <FormattedMessage id="ReviewTool.loading" />
      </p>
    </div>
  ) : profile.kind === REVIEW_KIND_MODEL ? (
    <ModelReview
      profile={profile}
      config={config}
      onManageDisableScrolling={onManageDisableScrolling}
    />
  ) : profile.kind === REVIEW_KIND_CLIENT ? (
    <ClientReview profile={profile} config={config} />
  ) : (
    <NotWaiting />
  );

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled} noIndex>
      <LayoutSingleColumn
        className={profileCss.pageRoot}
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
        {content}
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { profile, fetchInProgress, fetchError } = state.ReviewProfilePage;
  return {
    profile,
    fetchInProgress,
    fetchError,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  onRetry: userId => dispatch(fetchProfile(userId)),
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
});

const ReviewProfilePage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ReviewProfilePageComponent);

export default ReviewProfilePage;
