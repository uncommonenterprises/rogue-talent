import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { useHistory } from 'react-router-dom';

// Import contexts and util modules
import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { pathByRouteName } from '../../util/routes';
import { isClientUser } from '../../util/userHelpers';
import { isAccountStatusFlowEnabled } from '../../util/accountStatus';
import { isScrollingDisabled } from '../../ducks/ui.duck';

// Import shared components
import { NamedRedirect, Page } from '../../components';

// Import modules from parent directory
import EmailVerifiedNotice from '../TopbarContainer/EmailVerifiedBanner/EmailVerifiedNotice';

// Import modules from this directory
import BusinessDetailsForm from './BusinessDetailsForm/BusinessDetailsForm';
import { getBusinessDetailsPayload, getInitialValues } from './BusinessDetailsPage.helpers';
import { saveBusinessDetails } from './BusinessDetailsPage.duck';
import css from './BusinessDetailsPage.module.css';

/**
 * Where a client goes after "Submit for approval": their account-status page (screen 19,
 * Pending approval) when the account-status lifecycle is switched on, otherwise Browse models
 * (today's client destination).
 *
 * @param {boolean} flagEnabled - isAccountStatusFlowEnabled()
 * @returns {'AccountStatusPage'|'SearchPage'}
 */
export const getAfterSubmitRouteName = flagEnabled =>
  flagEnabled ? 'AccountStatusPage' : 'SearchPage';

/**
 * "Save & exit" leaves for Browse models: browsing is open before approval, and the client can
 * come back to finish the step (they're brought back here when they next log in).
 */
export const SAVE_AND_EXIT_ROUTE_NAME = 'SearchPage';

/**
 * Client "Your business details" step (sign-up journey screen 18). Live regardless of the
 * account-status flag. "Submit for approval" is the client's Gate A submission: it saves the
 * details and records privateData.businessDetailsSubmittedAt (see util/clientBusinessDetails.js).
 *
 * Only clients use this page; anyone else is sent to the homepage.
 *
 * @component
 * @param {Object} props
 * @param {propTypes.currentUser} [props.currentUser]
 * @param {boolean} props.scrollingDisabled
 * @param {boolean} props.saveInProgress
 * @param {propTypes.error} [props.saveError]
 * @param {Function} props.onSaveBusinessDetails - resolves when saved
 * @returns {JSX.Element}
 */
export const BusinessDetailsPageComponent = props => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const history = useHistory();
  const intl = useIntl();
  const {
    currentUser,
    scrollingDisabled,
    saveInProgress = false,
    saveError,
    onSaveBusinessDetails,
  } = props;

  const title = intl.formatMessage({ id: 'BusinessDetailsPage.title' });

  if (currentUser?.id && !isClientUser(currentUser)) {
    return <NamedRedirect name="LandingPage" />;
  }

  const industryField = (config.user?.userFields || []).find(f => f.key === 'industry');
  const industryOptions = industryField?.enumOptions || [];

  const goTo = routeName => history.push(pathByRouteName(routeName, routeConfiguration, {}));

  const handleSubmit = values =>
    onSaveBusinessDetails(getBusinessDetailsPayload(values, { submit: true }))
      .then(() => goTo(getAfterSubmitRouteName(isAccountStatusFlowEnabled())))
      .catch(() => {
        // The error is shown by the form (saveError); stay on the page.
      });

  const handleSaveAndExit = values =>
    onSaveBusinessDetails(getBusinessDetailsPayload(values, { submit: false }))
      .then(() => goTo(SAVE_AND_EXIT_ROUTE_NAME))
      .catch(() => {
        // The error is shown by the form (saveError); stay on the page.
      });

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      {/* Screen 05: the one-off "Your email is verified." banner on the landing destination. */}
      <EmailVerifiedNotice />
      {currentUser?.id ? (
        <BusinessDetailsForm
          initialValues={getInitialValues(currentUser)}
          onSubmit={handleSubmit}
          onSaveAndExit={handleSaveAndExit}
          industryOptions={industryOptions}
          inProgress={saveInProgress}
          saveError={saveError}
        />
      ) : (
        <p className={css.loading}>
          <FormattedMessage id="BusinessDetailsPage.loading" />
        </p>
      )}
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const { saveInProgress, saveError } = state.BusinessDetailsPage;
  return {
    currentUser,
    saveInProgress,
    saveError,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  onSaveBusinessDetails: payload => dispatch(saveBusinessDetails(payload)),
});

const BusinessDetailsPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(BusinessDetailsPageComponent);

export default BusinessDetailsPage;
