// Wizard step rules for the "Create your profile" (EditListingWizard) flow: which tabs a listing
// type has and when each one counts as complete.
//
// This module is deliberately light (config and util imports only, no panels or forms), so code
// outside the wizard (the email-verification and sign-up redirects, the topbar) can work out where
// a model should resume their draft without pulling the wizard into its bundle. EditListingWizard
// uses the same functions, so the two can never disagree.

// Import configs and util modules
import {
  displayDeliveryPickup,
  displayDeliveryShipping,
  displayDescription,
  displayLocation,
  displayPrice,
  requireListingImage,
} from '../../../util/configHelpers';
import {
  SCHEMA_TYPE_ENUM,
  SCHEMA_TYPE_MULTI_ENUM,
  SCHEMA_TYPE_TEXT,
  SCHEMA_TYPE_SHORT_TEXT,
  SCHEMA_TYPE_LONG,
  SCHEMA_TYPE_BOOLEAN,
  SCHEMA_TYPE_YOUTUBE,
} from '../../../util/types';
import {
  isFieldForCategory,
  isFieldForListingType,
  pickCategoryFields,
} from '../../../util/fieldHelpers';

// Import modules from this directory
import { isPricingListingField } from './rateFields';
import { hasMinimumPortfolio } from './portfolioRules';

// Wizard tab names (also the :tab route param). EditListingWizardTab.js re-exports these.
export const DETAILS = 'details';
export const PROFILE = 'profile';
export const PRICING = 'pricing';
export const PRICING_AND_STOCK = 'pricing-and-stock';
export const DELIVERY = 'delivery';
export const LOCATION = 'location';
export const AVAILABILITY = 'availability';
export const PHOTOS = 'photos';
export const REVIEW = 'review';
export const STYLE = 'style';

/**
 * Pick only allowed tabs for the given process and listing type configuration.
 * - The location tab could be omitted for booking process
 * - The delivery tab could be omitted for purchase process
 * - The location and pricing tabs could be omitted for negotiation process
 * - The location and pricing tabs could be omitted for inquiry process
 *
 * @param {string} processName - The name of the process
 * @param {Object} listingTypeConfig - The listing type configuration
 * @param {boolean} [isNewListingFlow] - Whether the listing is being created (new/draft URI)
 * @returns {Array<string>} - The allowed tabs for the given process and listing type configuration
 */
export const tabsForListingType = (processName, listingTypeConfig, isNewListingFlow = false) => {
  const locationMaybe = displayLocation(listingTypeConfig) ? [LOCATION] : [];
  const pricingMaybe = displayPrice(listingTypeConfig) ? [PRICING] : [];
  const deliveryMaybe =
    displayDeliveryPickup(listingTypeConfig) || displayDeliveryShipping(listingTypeConfig)
      ? [DELIVERY]
      : [];
  const styleOrPhotosTab = requireListingImage(listingTypeConfig) ? [PHOTOS] : [STYLE];
  // RT-FB-10: models are available by default (the "About you" step creates the draft with
  // an all-days-open plan, and every booking request still needs the model's acceptance),
  // so the availability step is NOT part of onboarding. After onboarding it's reachable as
  // the last tab ("Your calendar") so a model can block out dates they can't work.
  const calendarTabMaybe = isNewListingFlow ? [] : [AVAILABILITY];
  // Sign-up journey screen 13: the new-listing (onboarding) flow ends on "Review & submit",
  // which is where the profile is published ("Submit for approval"). Edit mode has no
  // review step; it keeps the calendar as its last tab instead.
  const reviewTabMaybe = isNewListingFlow ? [REVIEW] : [];

  // You can reorder these panels.
  // Note 1: You need to change save button translations for new listing flow
  // Note 2: Ensure that draft listing is created after the first panel
  //         and listing publishing happens after last panel.
  // Note 3: The first tab creates a draft listing and title is mandatory attribute for it.
  //         Details tab asks for "title" and is therefore the first tab in the wizard flow.
  const tabs = {
    // Note: PROFILE ("About you") is intentionally the FIRST tab for the booking (model)
    // flow - it collects the model's display name (which seeds the listing title and
    // creates the draft) and their city. The separate LOCATION tab is omitted; the city
    // lives in PROFILE.
    ['default-booking']: [
      PROFILE,
      DETAILS,
      PRICING,
      ...styleOrPhotosTab,
      ...reviewTabMaybe,
      ...calendarTabMaybe,
    ],
    ['default-purchase']: [DETAILS, PRICING_AND_STOCK, ...deliveryMaybe, ...styleOrPhotosTab],
    ['default-negotiation']: [DETAILS, ...locationMaybe, ...pricingMaybe, ...styleOrPhotosTab],
    ['default-inquiry']: [DETAILS, ...locationMaybe, ...pricingMaybe, ...styleOrPhotosTab],
  };

  return tabs[processName] || tabs['default-inquiry'];
};

/**
 * Validate listing fields (in extended data) that are included through configListing.js
 * This is used to check if listing creation flow can show the "next" tab as active.
 *
 * @param {Object} publicData
 * @param {Object} privateData
 */
const hasValidListingFieldsInExtendedData = (publicData, privateData, config, fieldFilter) => {
  const isValidField = (fieldConfig, fieldData) => {
    const { key, schemaType, enumOptions = [], saveConfig = {} } = fieldConfig;

    const schemaOptionKeys = enumOptions.map(o => `${o.option}`);
    const hasValidEnumValue = optionData => {
      return schemaOptionKeys.includes(optionData);
    };
    const hasValidMultiEnumValues = savedOptions => {
      return savedOptions.every(optionData => schemaOptionKeys.includes(optionData));
    };

    const categoryKey = config.categoryConfiguration.key;
    const categoryOptions = config.categoryConfiguration.categories;
    const categoriesObj = pickCategoryFields(publicData, categoryKey, 1, categoryOptions);
    const currentCategories = Object.values(categoriesObj);

    const isTargetListingType = isFieldForListingType(publicData?.listingType, fieldConfig);
    const isTargetCategory = isFieldForCategory(currentCategories, fieldConfig);
    const isRequired = !!saveConfig.isRequired && isTargetListingType && isTargetCategory;

    if (isRequired) {
      const savedListingField = fieldData[key];
      return schemaType === SCHEMA_TYPE_ENUM
        ? typeof savedListingField === 'string' && hasValidEnumValue(savedListingField)
        : schemaType === SCHEMA_TYPE_MULTI_ENUM
        ? Array.isArray(savedListingField) && hasValidMultiEnumValues(savedListingField)
        : schemaType === SCHEMA_TYPE_SHORT_TEXT
        ? typeof savedListingField === 'string'
        : schemaType === SCHEMA_TYPE_TEXT
        ? typeof savedListingField === 'string'
        : schemaType === SCHEMA_TYPE_LONG
        ? typeof savedListingField === 'number' && Number.isInteger(savedListingField)
        : schemaType === SCHEMA_TYPE_BOOLEAN
        ? savedListingField === true || savedListingField === false
        : schemaType === SCHEMA_TYPE_YOUTUBE
        ? typeof savedListingField === 'string'
        : false;
    }
    return true;
  };
  // The caller passes a filter so each tab only validates the fields it owns (e.g. Details
  // excludes rate fields → Pricing tab, and profile fields → About-you tab; About-you
  // validates only its profile fields). Otherwise a required field on a later tab could
  // deadlock an earlier tab's completion.
  return config.listing.listingFields.filter(fieldFilter).reduce((isValid, fieldConfig) => {
    const data = fieldConfig.scope === 'private' ? privateData : publicData;
    return isValid && isValidField(fieldConfig, data);
  }, true);
};

/**
 * Check if a wizard tab is completed.
 *
 * @param tab wizard's tab
 * @param listing is contains some specific data if tab is completed
 * @param config marketplace configuration
 *
 * @return true if tab / step is completed.
 */
export const tabCompleted = (tab, listing, config) => {
  const {
    availabilityPlan,
    description,
    geolocation,
    price,
    title,
    publicData,
    privateData,
  } = listing.attributes;
  const images = listing.images;
  const {
    listingType,
    transactionProcessAlias,
    unitType,
    shippingEnabled,
    pickupEnabled,
    cardStyle,
  } = publicData || {};
  const listingTypeConfig = config.listing.listingTypes.find(
    config => config.listingType === listingType
  );

  const descriptionRequired = displayDescription(listingTypeConfig);
  const hasValidDescription = descriptionRequired ? description : true;

  const deliveryOptionPicked = publicData && (shippingEnabled || pickupEnabled);

  switch (tab) {
    case DETAILS:
      return !!(
        (!descriptionRequired || hasValidDescription) &&
        title &&
        listingType &&
        transactionProcessAlias &&
        unitType &&
        // Validate all listing fields except the pricing-tab fields (rates, travel fee
        // policy, minimum booking notice), which are collected on "Your rates".
        hasValidListingFieldsInExtendedData(
          publicData,
          privateData,
          config,
          f => !isPricingListingField(f)
        )
      );
    case PROFILE:
      // PROFILE ("About you") is the first tab: it creates the draft from the display name
      // (title) and captures the city (listing geolocation). It's complete once the title
      // and city are on the listing. The model's attribute fields live on the next tab.
      return !!(title && geolocation && publicData?.location?.address);
    case PRICING:
      // "Your rates" also collects the pricing-tab listing fields (half-day/hourly rates and
      // the required travel fee policy, how far you'll travel and minimum booking notice), so
      // validate those alongside the day-rate price.
      return !!(
        price &&
        hasValidListingFieldsInExtendedData(publicData, privateData, config, isPricingListingField)
      );
    case PRICING_AND_STOCK:
      return !!price;
    case DELIVERY:
      return !!deliveryOptionPicked;
    case LOCATION:
      return !!(geolocation && publicData?.location?.address);
    case AVAILABILITY:
      return !!availabilityPlan;
    case PHOTOS:
      // A portfolio needs at least 3 photos (Neil, 29/09/2026) before "Review & submit".
      return hasMinimumPortfolio(images);
    case REVIEW:
      // The review step is completed by publishing, which leaves the new-listing flow.
      return false;
    case STYLE:
      return !!cardStyle;
    default:
      return false;
  }
};

/**
 * The listing type config for a listing: its saved type, else the type picked in the wizard,
 * else the only type when the marketplace has just one.
 *
 * @param {Object} listing
 * @param {Object} [selectedListingType]
 * @param {Object} config marketplace config
 * @returns {Object|null}
 */
export const getListingTypeConfig = (listing, selectedListingType, config) => {
  const existingListingType = listing?.attributes?.publicData?.listingType;
  const validListingTypes = config.listing.listingTypes;
  const hasOnlyOneListingType = validListingTypes?.length === 1;

  const listingTypeConfig = existingListingType
    ? validListingTypes.find(conf => conf.listingType === existingListingType)
    : selectedListingType
    ? validListingTypes.find(conf => conf.listingType === selectedListingType.listingType)
    : hasOnlyOneListingType
    ? validListingTypes[0]
    : null;
  return listingTypeConfig;
};

/**
 * Where a model should pick up their draft profile: the first onboarding step that isn't
 * complete yet, or "Review & submit" once every step is. Steps are completed in order, so the
 * first incomplete step is always reachable (the step before it is done).
 *
 * A draft whose listing type is no longer configured can only be edited on its first tab, which
 * is where the wizard sends it anyway.
 *
 * @param {Object} listing the model's own draft listing (with images)
 * @param {Object} config marketplace config
 * @returns {string} wizard tab name
 */
export const getResumeTab = (listing, config) => {
  const listingTypeConfig = getListingTypeConfig(listing, null, config);
  if (!listingTypeConfig) {
    return DETAILS;
  }
  const savedProcessAlias = listing?.attributes?.publicData?.transactionProcessAlias;
  const processName = savedProcessAlias
    ? savedProcessAlias.split('/')[0]
    : listingTypeConfig.transactionType?.process;
  const tabs = tabsForListingType(processName, listingTypeConfig, true);
  const firstIncomplete = tabs
    .filter(tab => tab !== REVIEW)
    .find(tab => !tabCompleted(tab, listing, config));
  return firstIncomplete || (tabs.includes(REVIEW) ? REVIEW : tabs[tabs.length - 1]);
};
