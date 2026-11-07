import React from 'react';
import { Helmet } from 'react-helmet-async';

// Import configs and util modules
import {
  LISTING_PAGE_PARAM_TYPE_DRAFT,
  LISTING_PAGE_PARAM_TYPE_NEW,
} from '../../../util/urlHelpers';
import { ensureListing } from '../../../util/data';
import { createResourceLocatorString } from '../../../util/routes';

// Import modules from this directory
import EditListingAvailabilityPanel from './EditListingAvailabilityPanel/EditListingAvailabilityPanel';
import EditListingDetailsPanel from './EditListingDetailsPanel/EditListingDetailsPanel';
import EditListingDeliveryPanel from './EditListingDeliveryPanel/EditListingDeliveryPanel';
import EditListingLocationPanel from './EditListingLocationPanel/EditListingLocationPanel';
import EditListingPhotosPanel from './EditListingPhotosPanel/EditListingPhotosPanel';
import EditListingPricingPanel from './EditListingPricingPanel/EditListingPricingPanel';
import EditListingPricingAndStockPanel from './EditListingPricingAndStockPanel/EditListingPricingAndStockPanel';
import EditListingProfilePanel from './EditListingProfilePanel/EditListingProfilePanel';
import EditListingReviewPanel from './EditListingReviewPanel/EditListingReviewPanel';
import EditListingStylePanel from './EditListingStylePanel/EditListingStylePanel';
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
} from './wizardSteps';

import css from './EditListingWizardTab.module.css';

// Tab names live in wizardSteps.js (a light module other pages can import); re-exported here
// for existing callers.
export {
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
};

// EditListingWizardTab component supports these tabs
export const SUPPORTED_TABS = [
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
];

const pathParamsToNextTab = (params, tab, marketplaceTabs) => {
  const nextTabIndex = marketplaceTabs.findIndex(s => s === tab) + 1;
  const nextTab =
    nextTabIndex < marketplaceTabs.length
      ? marketplaceTabs[nextTabIndex]
      : marketplaceTabs[marketplaceTabs.length - 1];
  return { ...params, tab: nextTab };
};

// When user has update draft listing, he should be redirected to next EditListingWizardTab
const redirectAfterDraftUpdate = (listingId, params, tab, marketplaceTabs, history, routes) => {
  const listingUUID = listingId.uuid;
  const currentPathParams = {
    ...params,
    type: LISTING_PAGE_PARAM_TYPE_DRAFT,
    id: listingUUID,
  };

  // Replace current "new" path to "draft" path.
  // Browser's back button should lead to editing current draft instead of creating a new one.
  if (params.type === LISTING_PAGE_PARAM_TYPE_NEW) {
    const draftURI = createResourceLocatorString('EditListingPage', routes, currentPathParams, {});
    history.replace(draftURI);
  }

  // Redirect to next tab
  const nextPathParams = pathParamsToNextTab(currentPathParams, tab, marketplaceTabs);
  const to = createResourceLocatorString('EditListingPage', routes, nextPathParams, {});
  history.push(to);
};

/**
 * A single tab on the EditListingWizard.
 *
 * @component
 * @param {Object} props
 * @returns {JSX.Element} EditListingWizardTab component
 */
const EditListingWizardTab = props => {
  const {
    tab,
    marketplaceTabs,
    params,
    locationSearch,
    errors,
    fetchInProgress,
    newListingPublished,
    handleCreateFlowTabScrolling,
    handlePublishListing,
    history,
    images,
    listing,
    weeklyExceptionQueries,
    monthlyExceptionQueries,
    allExceptions,
    onFetchExceptions,
    onAddAvailabilityException,
    onDeleteAvailabilityException,
    onUpdateListing,
    onUpdateProfile,
    profileUpdateInProgress = false,
    updateProfileError,
    onCreateListingDraft,
    onImageUpload,
    onManageDisableScrolling,
    onListingTypeChange,
    onRemoveImage,
    onReorderImages,
    updatedTab,
    updateInProgress,
    tabSubmitButtonText,
    config,
    currentUser,
    routeConfiguration,
    titleId,
    intl,
    inOnboardingShell = false,
    onResendVerificationEmail,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
  } = props;

  const { type } = params;
  const isNewURI = type === LISTING_PAGE_PARAM_TYPE_NEW;
  const isDraftURI = type === LISTING_PAGE_PARAM_TYPE_DRAFT;
  const isNewListingFlow = isNewURI || isDraftURI;

  const currentListing = ensureListing(listing);

  // "Back" in the onboarding shell's action bar: a link to the previous step, if any.
  const previousTab = marketplaceTabs[marketplaceTabs.indexOf(tab) - 1];
  const backLinkProps =
    inOnboardingShell && previousTab
      ? { name: 'EditListingPage', params: { ...params, tab: previousTab } }
      : null;
  // The "Edit" link of each section on the review step goes back to that step.
  const tabLinkPropsFor = targetTab => ({
    name: 'EditListingPage',
    params: { ...params, tab: targetTab },
  });
  const reviewSectionLinks = {
    aboutYou: tabLinkPropsFor(PROFILE),
    profile: tabLinkPropsFor(DETAILS),
    rates: tabLinkPropsFor(PRICING),
    portfolio: tabLinkPropsFor(PHOTOS),
  };

  // New listing flow has automatic redirects to new tab on the wizard
  // and the last panel calls publishListing API endpoint.
  const automaticRedirectsForNewListingFlow = (tab, listingId) => {
    if (tab !== marketplaceTabs[marketplaceTabs.length - 1]) {
      // Create listing flow: smooth scrolling polyfill to scroll to correct tab
      handleCreateFlowTabScrolling(false);

      // After successful saving of draft data, user should be redirected to next tab
      redirectAfterDraftUpdate(
        listingId,
        params,
        tab,
        marketplaceTabs,
        history,
        routeConfiguration
      );
    } else {
      handlePublishListing(listingId);
    }
  };

  const onCompleteEditListingWizardTab = (tab, updateValues) => {
    const onUpdateListingOrCreateListingDraft = isNewURI
      ? (tab, values) => onCreateListingDraft(values, config)
      : (tab, values) => onUpdateListing(tab, values, config);

    const updateListingValues = isNewURI
      ? updateValues
      : { ...updateValues, id: currentListing.id };

    return onUpdateListingOrCreateListingDraft(tab, updateListingValues)
      .then(r => {
        // Availability ("Your calendar") saves happen in place (baseline plan, mode switch);
        // they must never advance the wizard. Since RT-FB-10 that tab isn't part of the new
        // listing flow at all, but keep the guard so a calendar save can't trigger publish.
        if (isNewListingFlow && tab !== AVAILABILITY) {
          const listingId = r.data.data.id;
          automaticRedirectsForNewListingFlow(tab, listingId);
        }
      })
      .catch(e => {
        // No need for extra actions
      });
  };

  // The "About you" (PROFILE) tab is the first step. The display name (title) and the city
  // (geolocation) save to the listing. Because it's first, in the new-listing flow it CREATES
  // the draft (onCreateListingDraft); otherwise it updates the existing listing. The optional
  // bio, and for models the display name copied to the user's profile.displayName (F5 part C,
  // so the inbox shows the same name), save to the user's profile (onUpdateProfile), only when
  // they changed (profileValues is null otherwise). The profile is saved first: if it fails,
  // the listing is left alone and the form shows the error, so a retry can't create a second
  // draft. If the profile saves but the listing doesn't, the retry sees the profile already up
  // to date (profileValues is null) and only saves the listing. On success it advances the
  // new-listing flow to the next tab using the listing's id.
  const onCompleteEditListingProfileTab = (tab, listingValues, profileValues) => {
    const profileUpdate =
      profileValues && onUpdateProfile ? onUpdateProfile(profileValues) : Promise.resolve(null);

    return profileUpdate
      .then(profileResponse => {
        // onUpdateProfile resolves with the rejected action (carrying `error`) on failure.
        if (profileResponse?.error) {
          return null;
        }
        return isNewURI
          ? onCreateListingDraft(listingValues, config)
          : onUpdateListing(tab, { ...listingValues, id: currentListing.id }, config);
      })
      .then(response => {
        const listingId = response?.data?.data?.id;
        if (isNewListingFlow && listingId) {
          automaticRedirectsForNewListingFlow(tab, listingId);
        }
      })
      .catch(e => {
        // No need for extra actions
      });
  };

  const panelProps = tab => {
    return {
      className: inOnboardingShell ? css.shellPanel : css.panel,
      backLinkProps,
      inOnboardingShell,
      errors,
      listing,
      panelUpdated: updatedTab === tab,
      params,
      locationSearch,
      updateInProgress,
      // newListingPublished and fetchInProgress are flags for the last wizard tab
      ready: newListingPublished,
      disabled: fetchInProgress,
      submitButtonText: tabSubmitButtonText,
      listingTypes: config.listing.listingTypes,
      onManageDisableScrolling,
      onSubmit: values => {
        return onCompleteEditListingWizardTab(tab, values);
      },
      intl,
      updatePageTitle: ({ panelHeading }) => (
        <Helmet>
          <title>{intl.formatMessage({ id: titleId }, { panelHeading })}</title>
        </Helmet>
      ),
    };
  };

  // TODO: add missing cases for supported tabs
  switch (tab) {
    case DETAILS: {
      return (
        <EditListingDetailsPanel
          {...panelProps(DETAILS)}
          onListingTypeChange={onListingTypeChange}
          config={config}
        />
      );
    }
    case PROFILE: {
      return (
        <EditListingProfilePanel
          {...panelProps(PROFILE)}
          config={config}
          currentUser={currentUser}
          updateInProgress={updateInProgress || profileUpdateInProgress}
          errors={{ ...errors, updateProfileError }}
          onSubmit={(listingValues, profileValues) =>
            onCompleteEditListingProfileTab(PROFILE, listingValues, profileValues)
          }
        />
      );
    }
    case PRICING_AND_STOCK: {
      return (
        <EditListingPricingAndStockPanel
          {...panelProps(PRICING_AND_STOCK)}
          marketplaceCurrency={config.currency}
          listingMinimumPriceSubUnits={config.listingMinimumPriceSubUnits}
        />
      );
    }
    case PRICING: {
      return (
        <EditListingPricingPanel
          {...panelProps(PRICING)}
          config={config}
          marketplaceCurrency={config.currency}
          listingMinimumPriceSubUnits={config.listingMinimumPriceSubUnits}
        />
      );
    }
    case DELIVERY: {
      return (
        <EditListingDeliveryPanel {...panelProps(DELIVERY)} marketplaceCurrency={config.currency} />
      );
    }
    case LOCATION: {
      return <EditListingLocationPanel {...panelProps(LOCATION)} />;
    }
    case AVAILABILITY: {
      return (
        <EditListingAvailabilityPanel
          allExceptions={allExceptions}
          weeklyExceptionQueries={weeklyExceptionQueries}
          monthlyExceptionQueries={monthlyExceptionQueries}
          onFetchExceptions={onFetchExceptions}
          onAddAvailabilityException={onAddAvailabilityException}
          onDeleteAvailabilityException={onDeleteAvailabilityException}
          config={config}
          history={history}
          routeConfiguration={routeConfiguration}
          {...panelProps(AVAILABILITY)}
        />
      );
    }
    case PHOTOS: {
      return (
        <EditListingPhotosPanel
          {...panelProps(PHOTOS)}
          listingImageConfig={config.layout.listingImage}
          images={images}
          onImageUpload={onImageUpload}
          onRemoveImage={onRemoveImage}
          onReorderImages={onReorderImages}
        />
      );
    }
    case REVIEW: {
      return (
        <EditListingReviewPanel
          {...panelProps(REVIEW)}
          config={config}
          currentUser={currentUser}
          sectionLinks={reviewSectionLinks}
          onResendVerificationEmail={onResendVerificationEmail}
          sendVerificationEmailInProgress={sendVerificationEmailInProgress}
          sendVerificationEmailError={sendVerificationEmailError}
        />
      );
    }
    case STYLE: {
      return (
        <EditListingStylePanel
          {...panelProps(STYLE)}
          listingImageConfig={config.layout.listingImage}
          images={images}
        />
      );
    }
    default:
      return null;
  }
};

export default EditListingWizardTab;
