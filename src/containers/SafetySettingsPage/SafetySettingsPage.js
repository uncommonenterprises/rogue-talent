import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { showCreateListingLinkForUser, showPaymentDetailsForUser } from '../../util/userHelpers';
import { showProfileSettingsForUser, showSafetySettingsForUser } from '../../util/settingsPages';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { H3, LayoutSideNavigation, NamedRedirect, Page, UserNav } from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import SafetySettingsForm from './SafetySettingsForm/SafetySettingsForm';
import { getSafetyBoundariesUpdate, hasNoPrivateResidenceBoundary } from './safetyBoundaries';
import { saveSafetyBoundaries } from './SafetySettingsPage.duck';
import css from './SafetySettingsPage.module.css';

/**
 * Account settings > Safety (models only; tester feedback F5, part C). Holds the model's SAF-13
 * private-residence boundary, moved here unchanged from Profile settings. It saves the identical
 * value, privateData.safety_boundaries.no_private_residence, which SAF-14
 * (server/api-util/residenceBoundary.js) enforces silently server-side.
 *
 * Anyone who isn't a model (e.g. a client following an old link) is sent to Contact details.
 *
 * @component
 * @param {Object} props
 * @param {propTypes.currentUser} [props.currentUser] - The current user
 * @param {Function} props.onSubmitSafetyBoundaries - Saves the updateProfile payload
 * @param {boolean} [props.saveInProgress] - Whether a save is in progress
 * @param {propTypes.error} [props.saveError] - The save error
 * @param {boolean} [props.saved] - Whether the last save succeeded
 * @param {boolean} props.scrollingDisabled - Whether scrolling is disabled
 * @returns {JSX.Element}
 */
export const SafetySettingsPageComponent = props => {
  const config = useConfiguration();
  const intl = useIntl();
  const {
    currentUser,
    onSubmitSafetyBoundaries,
    saveInProgress = false,
    saveError,
    saved = false,
    scrollingDisabled,
  } = props;

  const isLoaded = !!currentUser?.id;
  if (isLoaded && !showSafetySettingsForUser(currentUser)) {
    return <NamedRedirect name="ContactDetailsPage" />;
  }

  const handleSubmit = values => {
    // The same payload Profile settings sent before the move (see safetyBoundaries.js).
    return onSubmitSafetyBoundaries(getSafetyBoundariesUpdate(values.noPrivateResidence)).catch(
      () => null
    );
  };

  const safetyForm = isLoaded ? (
    <SafetySettingsForm
      className={css.form}
      initialValues={{ noPrivateResidence: hasNoPrivateResidenceBoundary(currentUser) }}
      onSubmit={handleSubmit}
      inProgress={saveInProgress}
      ready={saved}
      saveError={saveError}
    />
  ) : null;

  const title = intl.formatMessage({ id: 'SafetySettingsPage.title' });

  const showManageListingsLink = showCreateListingLinkForUser(config, currentUser);
  const { showPayoutDetails, showPaymentMethods } = showPaymentDetailsForUser(config, currentUser);
  const accountSettingsNavProps = {
    currentPage: 'SafetySettingsPage',
    showPaymentMethods,
    showPayoutDetails,
    showSafety: true,
  };

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSideNavigation
        topbar={
          <>
            <TopbarContainer
              desktopClassName={css.desktopTopbar}
              mobileClassName={css.mobileTopbar}
            />
            <UserNav
              currentPage="SafetySettingsPage"
              showManageListingsLink={showManageListingsLink}
              showProfileSettingsLink={showProfileSettingsForUser(currentUser)}
            />
          </>
        }
        sideNav={null}
        useAccountSettingsNav
        accountSettingsNavProps={accountSettingsNavProps}
        footer={<FooterContainer />}
        intl={intl}
      >
        <div className={css.content}>
          <H3 as="h1">
            <FormattedMessage id="SafetySettingsPage.heading" />
          </H3>
          <p className={css.intro}>
            <FormattedMessage id="SafetySettingsPage.intro" />
          </p>
          {safetyForm}
        </div>
      </LayoutSideNavigation>
    </Page>
  );
};

const mapStateToProps = state => {
  // Topbar needs user info.
  const { currentUser } = state.user;
  const { saveInProgress, saveError, saved } = state.SafetySettingsPage;
  return {
    currentUser,
    saveInProgress,
    saveError,
    saved,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  onSubmitSafetyBoundaries: payload => dispatch(saveSafetyBoundaries(payload)),
});

const SafetySettingsPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(SafetySettingsPageComponent);

export default SafetySettingsPage;
