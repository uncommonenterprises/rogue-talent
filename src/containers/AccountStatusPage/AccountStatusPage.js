import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

// Import contexts and util modules
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isAccountStatusFlowEnabled, isReviewDeclined } from '../../util/accountStatus';
import { isScrollingDisabled } from '../../ducks/ui.duck';

// Import shared components
import { LayoutSingleColumn, NamedRedirect, Page } from '../../components';

// Import modules from parent directory
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

// Import modules from this directory
import AccountStatusScreen from './AccountStatusScreens';
import { getStatusView, getRejectionReason } from './AccountStatusPage.helpers';
import { resubmitForReview } from './AccountStatusPage.duck';
import css from './AccountStatusPage.module.css';

/**
 * Account-status home (sign-up journey screens 14 to 17 for models, 19 to 21 and the client
 * variant of 17 for clients). The one place a user sees where they are in the lifecycle and the
 * single next action. The status comes from util/accountStatus.js getAccountStatus.
 *
 * Part of the dormant account-status lifecycle (REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED). With the
 * flag off, this page renders nothing of its own and forwards models to "Your profile"
 * (ManageListingsPage) and clients to Browse models (SearchPage), exactly as today. Draft
 * accounts (not submitted yet) are forwarded to where they finish their submission.
 *
 * @component
 * @param {Object} props
 * @param {Object} [props.currentUser] - currentUser API entity
 * @param {Object} [props.ownListing] - the model's own profile listing
 * @param {boolean} props.ownListingFetched - whether the own-listing query has finished
 * @param {boolean} props.scrollingDisabled
 * @param {boolean} [props.resubmitInProgress] - screen 17 (model) resubmission in flight
 * @param {Object} [props.resubmitError] - screen 17 (model) resubmission error
 * @param {Function} [props.onResubmit] - screen 17 (model): resubmit for approval
 * @returns {JSX.Element}
 */
export const AccountStatusPageComponent = props => {
  const intl = useIntl();
  const {
    currentUser,
    ownListing,
    ownListingFetched,
    scrollingDisabled,
    resubmitInProgress = false,
    resubmitError = null,
    onResubmit,
  } = props;

  const view = getStatusView({
    flagEnabled: isAccountStatusFlowEnabled(),
    currentUser,
    ownListing,
    ownListingFetched,
  });

  if (view.kind === 'redirect') {
    return <NamedRedirect name={view.name} />;
  }

  const isScreen = view.kind === 'screen';
  // Resubmitting only applies to a review decline, not a suspension (ban).
  const canResubmit = isReviewDeclined(currentUser);
  const title = intl.formatMessage({ id: 'AccountStatusPage.title' });

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        topbar={<TopbarContainer accountStatus={isScreen ? view.status : null} />}
        footer={<FooterContainer />}
      >
        <div className={css.shell}>
          {isScreen ? (
            <AccountStatusScreen
              role={view.role}
              status={view.status}
              verified={view.verified}
              currentUser={currentUser}
              ownListing={ownListing}
              rejectionReason={getRejectionReason(currentUser)}
              onResubmit={canResubmit ? onResubmit : null}
              resubmitInProgress={resubmitInProgress}
              resubmitError={resubmitError}
            />
          ) : (
            <p className={css.loading}>
              <FormattedMessage id="AccountStatusPage.loading" />
            </p>
          )}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    ownListing,
    ownListingFetched,
    resubmitInProgress,
    resubmitError,
  } = state.AccountStatusPage;
  return {
    currentUser,
    ownListing,
    ownListingFetched,
    resubmitInProgress,
    resubmitError,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  onResubmit: () => dispatch(resubmitForReview()),
});

const AccountStatusPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(AccountStatusPageComponent);

export default AccountStatusPage;
