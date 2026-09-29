import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

// Import contexts and util modules
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isAccountStatusFlowEnabled } from '../../util/accountStatus';
import { isScrollingDisabled } from '../../ducks/ui.duck';

// Import shared components
import { LayoutSingleColumn, NamedRedirect, Page } from '../../components';

// Import modules from parent directory
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

// Import modules from this directory
import AccountStatusScreen from './AccountStatusScreens';
import { getStatusView, getRejectionReason } from './AccountStatusPage.helpers';
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
 * @returns {JSX.Element}
 */
export const AccountStatusPageComponent = props => {
  const intl = useIntl();
  const { currentUser, ownListing, ownListingFetched, scrollingDisabled } = props;

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
  const { ownListing, ownListingFetched } = state.AccountStatusPage;
  return {
    currentUser,
    ownListing,
    ownListingFetched,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const AccountStatusPage = compose(connect(mapStateToProps))(AccountStatusPageComponent);

export default AccountStatusPage;
