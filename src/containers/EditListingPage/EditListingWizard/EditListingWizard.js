import React, { Component, useEffect } from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { useConfiguration } from '../../../context/configurationContext';
import { useRouteConfiguration } from '../../../context/routeConfigurationContext';
import { FormattedMessage, intlShape, useIntl } from '../../../util/reactIntl';
import { displayPrice, requirePayoutDetails } from '../../../util/configHelpers';
import {
  LISTING_PAGE_PARAM_TYPE_DRAFT,
  LISTING_PAGE_PARAM_TYPE_NEW,
} from '../../../util/urlHelpers';
import { createResourceLocatorString } from '../../../util/routes';
import { propTypes } from '../../../util/types';
import { ensureCurrentUser, ensureListing } from '../../../util/data';
import { getDisplayAccountType } from '../../../util/stripeConnect';
import { isAccountStatusFlowEnabled } from '../../../util/accountStatus';
import { INQUIRY_PROCESS_NAME, resolveLatestProcessName } from '../../../transactions/transaction';

// Import shared components
import {
  Heading,
  Modal,
  NamedRedirect,
  Tabs,
  StripeConnectAccountStatusBox,
  StripeConnectAccountForm,
} from '../../../components';

// Import modules from this directory
import EditListingWizardTab from './EditListingWizardTab';
import {
  DETAILS,
  PROFILE,
  PRICING,
  PRICING_AND_STOCK,
  DELIVERY,
  LOCATION,
  AVAILABILITY,
  PHOTOS,
  REVIEW,
  STYLE,
  getListingTypeConfig,
  tabCompleted,
  tabsForListingType,
} from './wizardSteps';
import {
  STEP_CURRENT,
  STEP_DONE,
  STEP_TODO,
  WizardStepper,
  WizardTopbar,
} from './WizardShell/WizardShell';
import css from './EditListingWizard.module.css';

// This is the initial tab on editlisting wizard.
// When listing type is known, other tabs are checked from _tabsForListingType_ function.
const TABS_DETAILS_ONLY = [DETAILS];

// Tabs are horizontal in small screens
const MAX_HORIZONTAL_NAV_SCREEN_WIDTH = 1023;

const STRIPE_ONBOARDING_RETURN_URL_SUCCESS = 'success';
const STRIPE_ONBOARDING_RETURN_URL_FAILURE = 'failure';

// Kept as an export of the wizard for existing callers; the rule itself lives in wizardSteps.js.
export { tabsForListingType };

/**
 * Return translations for wizard tab: label and submit button.
 *
 * @param {Object} intl
 * @param {string} tab name of the tab/panel in the wizard
 * @param {boolean} isNewListingFlow
 * @param {string} processName
 */
const tabLabelAndSubmit = (
  intl,
  tab,
  isNewListingFlow,
  isPriceDisabled,
  processName,
  accountStatusFlowEnabled = false
) => {
  const processNameString = isNewListingFlow ? `${processName}.` : '';
  const newOrEdit = isNewListingFlow ? 'new' : 'edit';

  let labelKey = null;
  let submitButtonKey = null;
  if (tab === DETAILS) {
    labelKey = 'EditListingWizard.tabLabelDetails';
    submitButtonKey = `EditListingWizard.${processNameString}${newOrEdit}.saveDetails`;
  } else if (tab === PROFILE) {
    labelKey = 'EditListingWizard.tabLabelProfile';
    submitButtonKey = `EditListingWizard.${processNameString}${newOrEdit}.saveProfile`;
  } else if (tab === PRICING) {
    labelKey = 'EditListingWizard.tabLabelPricing';
    submitButtonKey = `EditListingWizard.${processNameString}${newOrEdit}.savePricing`;
  } else if (tab === PRICING_AND_STOCK) {
    labelKey = 'EditListingWizard.tabLabelPricingAndStock';
    submitButtonKey = `EditListingWizard.${processNameString}${newOrEdit}.savePricingAndStock`;
  } else if (tab === DELIVERY) {
    labelKey = 'EditListingWizard.tabLabelDelivery';
    submitButtonKey = `EditListingWizard.${processNameString}${newOrEdit}.saveDelivery`;
  } else if (tab === LOCATION) {
    labelKey = 'EditListingWizard.tabLabelLocation';
    submitButtonKey =
      isPriceDisabled && isNewListingFlow
        ? `EditListingWizard.${processNameString}${newOrEdit}.saveLocationNoPricingTab`
        : `EditListingWizard.${processNameString}${newOrEdit}.saveLocation`;
  } else if (tab === AVAILABILITY) {
    labelKey = 'EditListingWizard.tabLabelAvailability';
    submitButtonKey = `EditListingWizard.${processNameString}${newOrEdit}.saveAvailability`;
  } else if (tab === PHOTOS) {
    labelKey = 'EditListingWizard.tabLabelPhotos';
    submitButtonKey = `EditListingWizard.${processNameString}${newOrEdit}.savePhotos`;
  } else if (tab === REVIEW) {
    labelKey = 'EditListingWizard.tabLabelReview';
    // "Review & submit" is the final step of the new model booking flow, so its submit button
    // is the "publish the profile" CTA (moved here from the portfolio step). When the step-2
    // account-status flow is ON, this submission no longer requires Stripe and sends the
    // profile for manual review: "Submit for approval". Flag OFF keeps the original
    // "Submit for review" wording (the publish may still open the Stripe payout modal).
    submitButtonKey = accountStatusFlowEnabled
      ? 'EditListingWizard.submitForApproval'
      : `EditListingWizard.${processNameString}${newOrEdit}.saveReview`;
  } else if (tab === STYLE) {
    labelKey = 'EditListingWizard.tabLabelStyle';
    submitButtonKey = `EditListingWizard.${processNameString}${newOrEdit}.saveStyle`;
  }

  return {
    label: intl.formatMessage({ id: labelKey }),
    submitButton: intl.formatMessage({ id: submitButtonKey }),
  };
};

/**
 * Check which wizard tabs are active and which are not yet available. Tab is active if previous
 * tab is completed. In edit mode all tabs are active.
 *
 * @param isNew flag if a new listing is being created or an old one being edited
 * @param listing data to be checked
 * @param tabs array of tabs used for this listing. These depend on transaction process.
 *
 * @return object containing activity / editability of different tabs of this wizard
 */
const tabsActive = (isNew, listing, tabs, config) => {
  return tabs.reduce((acc, tab) => {
    const previousTabIndex = tabs.findIndex(t => t === tab) - 1;
    const validTab = previousTabIndex >= 0;
    const hasListingType = !!listing?.attributes?.publicData?.listingType;
    const prevTabComletedInNewFlow = tabCompleted(tabs[previousTabIndex], listing, config);
    const isActive =
      validTab && !isNew ? hasListingType : validTab && isNew ? prevTabComletedInNewFlow : true;
    return { ...acc, [tab]: isActive };
  }, {});
};

const scrollToTab = (tabPrefix, tabId) => {
  const el = document.querySelector(`#${tabPrefix}_${tabId}`);
  if (el && el.scrollIntoView) {
    el.scrollIntoView({
      block: 'start',
      behavior: 'smooth',
    });
  }
};

// Create return URL for the Stripe onboarding form
const createReturnURL = (returnURLType, rootURL, routes, pathParams) => {
  const path = createResourceLocatorString(
    'EditListingStripeOnboardingPage',
    routes,
    { ...pathParams, returnURLType },
    {}
  );
  const root = rootURL.replace(/\/$/, '');
  return `${root}${path}`;
};

// Get attribute: stripeAccountData
const getStripeAccountData = stripeAccount => stripeAccount.attributes.stripeAccountData || null;

// Get last 4 digits of bank account returned in Stripe account
const getBankAccountLast4Digits = stripeAccountData =>
  stripeAccountData && stripeAccountData.external_accounts.data.length > 0
    ? stripeAccountData.external_accounts.data[0].last4
    : null;

// Check if there's requirements on selected type: 'past_due', 'currently_due' etc.
const hasRequirements = (stripeAccountData, requirementType) =>
  stripeAccountData != null &&
  stripeAccountData.requirements &&
  Array.isArray(stripeAccountData.requirements[requirementType]) &&
  stripeAccountData.requirements[requirementType].length > 0;

// Redirect user to Stripe's hosted Connect account onboarding form
const handleGetStripeConnectAccountLinkFn = (getLinkFn, commonParams) => type => () => {
  getLinkFn({ type, ...commonParams })
    .then(url => {
      window.location.href = url;
    })
    .catch(err => console.error(err));
};

const RedirectToStripe = ({ redirectFn }) => {
  useEffect(redirectFn('custom_account_verification'), []);
  return <FormattedMessage id="EditListingWizard.redirectingToStripe" />;
};

/**
 * Whether the wizard uses the model onboarding shell (sign-up journey screens 08 to 13): its
 * own top bar ("Rogue." + "Save & exit"), a 4-step stepper and Back / Continue action bars,
 * instead of the site topbar and the side tab navigation. That's the new-listing flow of the
 * booking (model profile) listing type, i.e. the flow that starts on "About you". Edit mode and
 * other listing flows keep the standard layout.
 *
 * EditListingPage uses this to leave out the site topbar; the wizard uses the same rule.
 *
 * @param {Object} params route params ({ type })
 * @param {Object} listing the listing being edited (may be empty in the "new" flow)
 * @param {Object} config marketplace config
 * @returns {boolean}
 */
export const isOnboardingShellFlow = (params, listing, config) => {
  const isNewListingFlow = [LISTING_PAGE_PARAM_TYPE_NEW, LISTING_PAGE_PARAM_TYPE_DRAFT].includes(
    params?.type
  );
  if (!isNewListingFlow || !config?.listing?.listingTypes) {
    return false;
  }
  const listingTypeConfig = getListingTypeConfig(listing, null, config);
  if (!listingTypeConfig) {
    return false;
  }
  const savedProcessAlias = listing?.attributes?.publicData?.transactionProcessAlias;
  const processName = savedProcessAlias
    ? savedProcessAlias.split('/')[0]
    : listingTypeConfig.transactionType?.process;
  return tabsForListingType(processName, listingTypeConfig, true).includes(PROFILE);
};

// The stepper's steps: every tab except the review step, each done / current / to-do.
const getStepperSteps = (tabs, selectedTab, listing, config, tabsStatus, tabLink, labelFor) =>
  tabs
    .filter(tab => tab !== REVIEW)
    .map(tab => {
      const status =
        tab === selectedTab
          ? STEP_CURRENT
          : tabCompleted(tab, listing, config)
          ? STEP_DONE
          : STEP_TODO;
      return {
        tab,
        label: labelFor(tab),
        status,
        linkProps: tabsStatus[tab] ? tabLink(tab) : null,
      };
    });

/**
 * EditListingWizard is a component that renders the tabs that update the different parts of the listing.
 * It also handles the payout details modal and the Stripe onboarding form if the listing is a new one.
 * TODO: turn this into a functional component
 *
 * @component
 * @param {Object} props - The props object
 * @param {string} props.id - The id of the listing
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {Object} props.config - The config object
 * @param {Object} props.routeConfiguration - The route configuration object
 * @param {Object} props.params - The params object
 * @param {string} props.params.id - The id of the listing
 * @param {string} props.params.slug - The slug of the listing
 * @param {'new'|'draft'|'edit'} props.params.type - The type of the listing
 * @param {DETAILS | PRICING | PRICING_AND_STOCK | DELIVERY | LOCATION | AVAILABILITY | PHOTOS} props.params.tab - The name of the tab
 * @param {propTypes.ownListing} props.listing - The listing object
 * @param {propTypes.error} [props.errors.createListingDraftError] - The error object for createListingDraft
 * @param {propTypes.error} [props.errors.publishListingError] - The error object for publishListing
 * @param {propTypes.error} [props.errors.updateListingError] - The error object for updateListing
 * @param {propTypes.error} [props.errors.showListingsError] - The error object for showListings
 * @param {propTypes.error} [props.errors.uploadImageError] - The upload image error object
 * @param {propTypes.error} [props.errors.createStripeAccountError] - The error object for createStripeAccount
 * @param {propTypes.error} [props.errors.addExceptionError] - The error object for addException
 * @param {propTypes.error} [props.errors.deleteExceptionError] - The error object for deleteException
 * @param {propTypes.error} [props.errors.setStockError] - The error object for setStock
 * @param {boolean} props.fetchInProgress - Whether the fetch is in progress
 * @param {boolean} props.getAccountLinkInProgress - Whether the get account link is in progress
 * @param {boolean} props.payoutDetailsSaveInProgress - Whether the payout details save is in progress
 * @param {boolean} props.payoutDetailsSaved - Whether the payout details saved is in progress
 * @param {Function} props.onPayoutDetailsChange - The on payout details change function
 * @param {Function} props.onPayoutDetailsSubmit - The on payout details submit function
 * @param {Function} props.onGetStripeConnectAccountLink - The get StripeConnectAccountLink function
 * @param {propTypes.error} [props.createStripeAccountError] - The error object for createStripeAccount (TODO: errors object contains this)
 * @param {propTypes.error} [props.updateStripeAccountError] - The error object for updateStripeAccount (TODO: errors object contains this)
 * @param {propTypes.error} [props.fetchStripeAccountError] - The error object for fetchStripeAccount
 * @param {propTypes.error} [props.stripeAccountError] - The error object for stripeAccount (TODO: errors object contains this)
 * @param {propTypes.error} [props.stripeAccountLinkError] - The error object for stripeAccountLink
 * @param {Function} props.onManageDisableScrolling - The on manage disable scrolling function
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element} EditListingWizard component
 */
class EditListingWizard extends Component {
  constructor(props) {
    super(props);

    // Having this info in state would trigger unnecessary rerendering
    this.hasScrolledToTab = false;

    this.state = {
      draftId: null,
      showPayoutDetails: false,
      selectedListingType: null,
      mounted: false,
    };
    this.handleCreateFlowTabScrolling = this.handleCreateFlowTabScrolling.bind(this);
    this.handlePublishListing = this.handlePublishListing.bind(this);
    this.handlePayoutModalClose = this.handlePayoutModalClose.bind(this);
  }

  componentDidMount() {
    const { stripeOnboardingReturnURL } = this.props;

    if (stripeOnboardingReturnURL != null && !this.showPayoutDetails) {
      this.setState({ showPayoutDetails: true });
    }
    if (!this.mounted) {
      this.mounted = true;
    }
  }

  handleCreateFlowTabScrolling(shouldScroll) {
    this.hasScrolledToTab = shouldScroll;
  }

  handlePublishListing(id) {
    const { onPublishListingDraft, currentUser, stripeAccount, listing, config } = this.props;
    const processName = listing?.attributes?.publicData?.transactionProcessAlias.split('/')[0];
    const isInquiryProcess = processName === INQUIRY_PROCESS_NAME;

    // Step-2 account-status flow (flag ON): drop the RT-01 "Stripe before submit" modal gate.
    // "Submit for approval" publishes the draft regardless of Stripe state; with listing-approval
    // ON in Console the draft lands in pendingApproval (hidden) and the server reconcile function
    // publishes it only once the account is Verified. When the flag is OFF, the original modal
    // gate below is preserved exactly (today's behaviour) — see isAccountStatusFlowEnabled().
    if (isAccountStatusFlowEnabled()) {
      onPublishListingDraft(id);
      return;
    }

    const listingTypeConfig = getListingTypeConfig(listing, this.state.selectedListingType, config);
    // Through hosted configs (listingTypeConfig.defaultListingFields?.payoutDetails),
    // it's possible to publish listing without payout details set by provider.
    // Customers can't purchase these listings - but it gives operator opportunity to discuss with providers who fail to do so.
    const isPayoutDetailsRequired = requirePayoutDetails(listingTypeConfig);

    const stripeConnected = !!currentUser?.stripeAccount?.id;
    const stripeAccountData = stripeConnected ? getStripeAccountData(stripeAccount) : null;
    const stripeRequirementsMissing =
      stripeAccount &&
      (hasRequirements(stripeAccountData, 'past_due') ||
        hasRequirements(stripeAccountData, 'currently_due'));

    if (
      isInquiryProcess ||
      !isPayoutDetailsRequired ||
      (stripeConnected && !stripeRequirementsMissing)
    ) {
      onPublishListingDraft(id);
    } else {
      this.setState({
        draftId: id,
        showPayoutDetails: true,
      });
    }
  }

  handlePayoutModalClose() {
    this.setState({ showPayoutDetails: false });
  }

  render() {
    const {
      id,
      className,
      rootClassName,
      params,
      listing,
      intl,
      errors,
      fetchInProgress,
      payoutDetailsSaveInProgress,
      payoutDetailsSaved,
      onManageDisableScrolling,
      onPayoutDetailsChange,
      onGetStripeConnectAccountLink,
      getAccountLinkInProgress,
      createStripeAccountError,
      updateStripeAccountError,
      fetchStripeAccountError,
      stripeAccountFetched,
      stripeAccount,
      stripeAccountError,
      stripeAccountLinkError,
      currentUser,
      config,
      routeConfiguration,
      authScopes,
      ...rest
    } = this.props;

    const selectedTab = params.tab;
    const isNewListingFlow = [LISTING_PAGE_PARAM_TYPE_NEW, LISTING_PAGE_PARAM_TYPE_DRAFT].includes(
      params.type
    );
    const rootClasses = rootClassName || css.root;
    const classes = classNames(rootClasses, className);
    const currentListing = ensureListing(listing);
    const savedProcessAlias = currentListing.attributes?.publicData?.transactionProcessAlias;
    const transactionProcessAlias =
      savedProcessAlias || this.state.selectedListingType?.transactionProcessAlias;

    // NOTE: If the listing has invalid configuration in place,
    // the listing is considered deprecated and we don't allow user to modify the listing anymore.
    // Instead, operator should do that through Console or Integration API.
    const validListingTypes = config.listing.listingTypes;
    const listingTypeConfig = getListingTypeConfig(
      currentListing,
      this.state.selectedListingType,
      config
    );
    const existingListingType = currentListing.attributes?.publicData?.listingType;
    const invalidExistingListingType = existingListingType && !listingTypeConfig;
    // TODO: displayPrice aka config.defaultListingFields?.price with false value is only available with inquiry process
    //       if it's enabled with other processes, translations for "new" flow needs to be updated.
    const isPriceDisabled = !displayPrice(listingTypeConfig);

    // Transaction process alias is used here, because the process defineds whether the listing is supported
    // I.e. old listings might not be supported through listing types, but client app might still support those processes.
    const processName = transactionProcessAlias
      ? transactionProcessAlias.split('/')[0]
      : validListingTypes.length === 1
      ? validListingTypes[0].transactionType.process
      : INQUIRY_PROCESS_NAME;

    const hasListingTypeSelected =
      existingListingType || this.state.selectedListingType || validListingTypes.length === 1;

    // For oudated draft listing, we don't show other tabs but the "details"
    const tabs =
      isNewListingFlow && (invalidExistingListingType || !hasListingTypeSelected)
        ? TABS_DETAILS_ONLY
        : tabsForListingType(processName, listingTypeConfig, isNewListingFlow);

    // Check if wizard tab is active / linkable.
    // When creating a new listing, we don't allow users to access next tab until the current one is completed.
    const tabsStatus = tabsActive(isNewListingFlow, currentListing, tabs, config);

    // Redirect user to first tab when encoutering outdated draft listings.
    if (invalidExistingListingType && isNewListingFlow && selectedTab !== tabs[0]) {
      return <NamedRedirect name="EditListingPage" params={{ ...params, tab: tabs[0] }} />;
    }

    // If selectedTab is not active for listing with valid listing type,
    // redirect to the beginning of wizard
    if (!invalidExistingListingType && !tabsStatus[selectedTab]) {
      // A tab that isn't in this flow at all (e.g. an old "availability" link to a draft,
      // which no longer has that step) is treated as "past the end", so the model lands on
      // the furthest step they can reach rather than the second-to-last one.
      const selectedTabIndex = tabs.indexOf(selectedTab);
      const currentTabIndex = selectedTabIndex >= 0 ? selectedTabIndex : tabs.length;
      const nearestActiveTab = tabs
        .slice(0, currentTabIndex)
        .reverse()
        .find(t => tabsStatus[t]);

      // eslint-disable-next-line no-console
      console.log(
        `You tried to access an EditListingWizard tab (${selectedTab}), which was not yet activated.`
      );
      return <NamedRedirect name="EditListingPage" params={{ ...params, tab: nearestActiveTab }} />;
    }

    const isBrowser = typeof window !== 'undefined';
    const hasMatchMedia = isBrowser && window?.matchMedia;
    const isMobileLayout = hasMatchMedia
      ? window.matchMedia(`(max-width: ${MAX_HORIZONTAL_NAV_SCREEN_WIDTH}px)`)?.matches
      : true;

    const hasHorizontalTabLayout = this.mounted && isMobileLayout;
    const hasVerticalTabLayout = this.mounted && !isMobileLayout;

    // Check if scrollToTab call is needed (tab is not visible on mobile)
    if (hasVerticalTabLayout) {
      this.hasScrolledToTab = true;
    } else if (hasHorizontalTabLayout && !this.hasScrolledToTab) {
      const tabPrefix = id;
      scrollToTab(tabPrefix, selectedTab);
      this.hasScrolledToTab = true;
    }

    const tabLink = tab => {
      return { name: 'EditListingPage', params: { ...params, tab } };
    };

    const formDisabled = getAccountLinkInProgress;
    const ensuredCurrentUser = ensureCurrentUser(currentUser);
    const currentUserLoaded = !!ensuredCurrentUser.id;
    const stripeConnected = currentUserLoaded && !!stripeAccount && !!stripeAccount.id;

    const rootURL = config.marketplaceRootURL;
    const { returnURLType, ...pathParams } = params;
    const successURL = createReturnURL(
      STRIPE_ONBOARDING_RETURN_URL_SUCCESS,
      rootURL,
      routeConfiguration,
      pathParams
    );
    const failureURL = createReturnURL(
      STRIPE_ONBOARDING_RETURN_URL_FAILURE,
      rootURL,
      routeConfiguration,
      pathParams
    );

    const accountId = stripeConnected ? stripeAccount.id : null;
    const stripeAccountData = stripeConnected ? getStripeAccountData(stripeAccount) : null;

    const requirementsMissing =
      stripeAccount &&
      (hasRequirements(stripeAccountData, 'past_due') ||
        hasRequirements(stripeAccountData, 'currently_due'));

    const savedCountry = stripeAccountData ? stripeAccountData.country : null;
    const savedAccountType = stripeAccountData ? getDisplayAccountType(stripeAccountData) : null;
    const { marketplaceName } = config;
    const payoutModalInfo = stripeAccountData ? (
      <FormattedMessage id="EditListingWizard.payoutModalInfo" values={{ marketplaceName }} />
    ) : (
      <FormattedMessage id="EditListingWizard.payoutModalInfoNew" values={{ marketplaceName }} />
    );

    const handleGetStripeConnectAccountLink = handleGetStripeConnectAccountLinkFn(
      onGetStripeConnectAccountLink,
      {
        accountId,
        successURL,
        failureURL,
      }
    );

    const returnedNormallyFromStripe = returnURLType === STRIPE_ONBOARDING_RETURN_URL_SUCCESS;
    const returnedAbnormallyFromStripe = returnURLType === STRIPE_ONBOARDING_RETURN_URL_FAILURE;
    const showVerificationNeeded = stripeConnected && requirementsMissing;

    // Check if user has limited rights and set button titles accordingly
    const limitedRights = authScopes?.indexOf('user:limited') >= 0;
    const stripeButtonTitle = limitedRights
      ? intl.formatMessage({ id: 'StripePayoutPage.submitButtonText' })
      : null;

    // Redirect from success URL to basic path for StripePayoutPage
    if (returnedNormallyFromStripe && stripeConnected && !requirementsMissing) {
      return <NamedRedirect name="EditListingPage" params={pathParams} />;
    }

    const tabTranslationsFor = tab =>
      tabLabelAndSubmit(
        intl,
        tab,
        isNewListingFlow,
        isPriceDisabled,
        resolveLatestProcessName(processName),
        isAccountStatusFlowEnabled()
      );

    // Model onboarding shell (sign-up journey 08 to 13): new-listing flow of the model profile.
    const useOnboardingShell = isNewListingFlow && tabs.includes(PROFILE);

    const renderTab = (tab, shellProps = {}) => {
      const tabTranslations = tabTranslationsFor(tab);
      return (
        <EditListingWizardTab
          {...rest}
          {...shellProps}
          key={tab}
          tabId={`${id}_${tab}`}
          tabLabel={tabTranslations.label}
          tabSubmitButtonText={tabTranslations.submitButton}
          tabLinkProps={tabLink(tab)}
          selected={selectedTab === tab}
          disabled={isNewListingFlow && !tabsStatus[tab]}
          tab={tab}
          params={params}
          listing={listing}
          marketplaceTabs={tabs}
          errors={errors}
          handleCreateFlowTabScrolling={this.handleCreateFlowTabScrolling}
          handlePublishListing={this.handlePublishListing}
          fetchInProgress={fetchInProgress}
          onListingTypeChange={selectedListingType => this.setState({ selectedListingType })}
          onManageDisableScrolling={onManageDisableScrolling}
          config={config}
          currentUser={currentUser}
          routeConfiguration={routeConfiguration}
          intl={intl}
        />
      );
    };

    const navigation = useOnboardingShell ? (
      <>
        <WizardTopbar exitLinkProps={{ name: 'ManageListingsPage' }} />
        <div className={css.shellMain}>
          <WizardStepper
            steps={getStepperSteps(
              tabs,
              selectedTab,
              currentListing,
              config,
              tabsStatus,
              tabLink,
              tab => tabTranslationsFor(tab).label
            )}
            isComplete={selectedTab === REVIEW}
          />
          {renderTab(selectedTab, { inOnboardingShell: true })}
        </div>
      </>
    ) : (
      <Tabs
        rootClassName={css.tabsContainer}
        navRootClassName={css.nav}
        tabRootClassName={css.tab}
        ariaLabel={intl.formatMessage({ id: 'EditListingWizard.screenreader.tabNavigation' })}
      >
        {tabs.map(tab => renderTab(tab))}
      </Tabs>
    );

    return (
      <div className={classNames(classes, { [css.shellRoot]: useOnboardingShell })}>
        {navigation}
        <Modal
          id="EditListingWizard.payoutModal"
          isOpen={this.state.showPayoutDetails}
          onClose={() => {
            this.handlePayoutModalClose();
            const main = document.getElementsByTagName('main')?.[0];
            const submitButtons = main?.querySelectorAll('button[type="submit"]');
            const lastSubmitButton = submitButtons?.[submitButtons.length - 1];
            if (lastSubmitButton) {
              lastSubmitButton.focus();
            }
          }}
          onManageDisableScrolling={onManageDisableScrolling}
          usePortal
        >
          <div className={css.modalPayoutDetailsWrapper}>
            <Heading as="h2" rootClassName={css.modalTitle}>
              <FormattedMessage id="EditListingWizard.payoutModalTitleOneMoreThing" />
              <br />
              <FormattedMessage id="EditListingWizard.payoutModalTitlePayoutPreferences" />
            </Heading>
            {!currentUserLoaded ? (
              <FormattedMessage id="StripePayoutPage.loadingData" />
            ) : returnedAbnormallyFromStripe && !stripeAccountLinkError ? (
              <p className={css.modalMessage}>
                <RedirectToStripe redirectFn={handleGetStripeConnectAccountLink} />
              </p>
            ) : (
              <>
                <p className={css.modalMessage}>{payoutModalInfo}</p>
                <StripeConnectAccountForm
                  disabled={formDisabled}
                  inProgress={payoutDetailsSaveInProgress}
                  ready={payoutDetailsSaved}
                  currentUser={currentUser}
                  stripeBankAccountLastDigits={getBankAccountLast4Digits(stripeAccountData)}
                  savedCountry={savedCountry}
                  savedAccountType={savedAccountType}
                  submitButtonText={intl.formatMessage({
                    id: 'StripePayoutPage.submitButtonText',
                  })}
                  stripeAccountError={stripeAccountError}
                  stripeAccountFetched={stripeAccountFetched}
                  stripeAccountLinkError={stripeAccountLinkError}
                  onChange={onPayoutDetailsChange}
                  onSubmit={rest.onPayoutDetailsSubmit}
                  stripeConnected={stripeConnected}
                  authScopes={authScopes}
                >
                  {stripeConnected && !returnedAbnormallyFromStripe && showVerificationNeeded ? (
                    <StripeConnectAccountStatusBox
                      type="verificationNeeded"
                      inProgress={getAccountLinkInProgress}
                      onGetStripeConnectAccountLink={handleGetStripeConnectAccountLink(
                        'custom_account_verification'
                      )}
                      disabled={limitedRights}
                      title={stripeButtonTitle}
                    />
                  ) : stripeConnected && savedCountry && !returnedAbnormallyFromStripe ? (
                    <StripeConnectAccountStatusBox
                      type="verificationSuccess"
                      inProgress={getAccountLinkInProgress}
                      disabled={payoutDetailsSaveInProgress || limitedRights}
                      onGetStripeConnectAccountLink={handleGetStripeConnectAccountLink(
                        'custom_account_update'
                      )}
                      title={stripeButtonTitle}
                    />
                  ) : null}
                </StripeConnectAccountForm>
              </>
            )}
          </div>
        </Modal>
      </div>
    );
  }
}

const EnhancedEditListingWizard = props => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();
  return (
    <EditListingWizard
      config={config}
      routeConfiguration={routeConfiguration}
      intl={intl}
      {...props}
    />
  );
};

export default EnhancedEditListingWizard;
