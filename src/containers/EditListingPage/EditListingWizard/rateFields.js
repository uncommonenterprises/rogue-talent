// Listing custom-field keys that live on the Pricing ("Your rates") tab rather than on
// "Your profile". They're excluded from the Details/"Your profile" form, its submit, and
// its completion check, and rendered on the Pricing tab instead (beside the day-rate price).
//
// Two kinds:
// - RATE_LISTING_FIELD_KEYS: monetary rates (long, stored as subunits like the price),
//   rendered as currency inputs and formatted as money on the listing page.
// - the rest (travel costs, how far you'll travel, minimum booking notice): normal fields
//   (enum) that are simply grouped with the rate info as the model's booking terms.
export const RATE_LISTING_FIELD_KEYS = ['half_day_rate', 'hourly_rate'];

// Travel costs: included in the rate or charged separately (required enum).
export const TRAVEL_FEE_POLICY_KEY = 'travel_fee_policy';

// How far the model will travel (required enum). Shown to models as "How far you'll travel";
// the underlying field is still `availability_radius`. It used to be on "Your profile"; sign-up
// journey revision 3 (Neil, 29/09/2026) moved it here, directly below travel costs.
export const TRAVEL_RADIUS_KEY = 'availability_radius';

// Minimum booking notice (required enum). It used to live on the availability step; since
// RT-FB-10 removed that step from onboarding it is collected on "Your rates" instead.
export const MIN_BOOKING_NOTICE_KEY = 'min_booking_notice';

// In render order (sign-up journey screen 11): half-day + hourly rates (a row on desktop),
// travel costs, how far you'll travel, then minimum booking notice.
export const PRICING_LISTING_FIELD_KEYS = [
  ...RATE_LISTING_FIELD_KEYS,
  TRAVEL_FEE_POLICY_KEY,
  TRAVEL_RADIUS_KEY,
  MIN_BOOKING_NOTICE_KEY,
];

// Model-facing label / hint overrides for the pricing-tab fields (en.json message ids). The
// listing-field config (configListing.js) keeps its own labels for the listing page and search
// filters; these only change the wording on "Your rates".
export const PRICING_FIELD_COPY_OVERRIDES = {
  half_day_rate: { labelId: 'EditListingPricingForm.halfDayRateLabel' },
  hourly_rate: { labelId: 'EditListingPricingForm.hourlyRateLabel' },
  [TRAVEL_RADIUS_KEY]: {
    labelId: 'EditListingPricingForm.travelRadiusLabel',
    hintId: 'EditListingPricingForm.travelRadiusHint',
  },
  [MIN_BOOKING_NOTICE_KEY]: { hintId: 'EditListingPricingForm.minBookingNoticeHint' },
};

// Travel costs is a two-option choice, so it's shown as rt-chip pills rather than a select.
export const PRICING_FIELD_DISPLAY = {
  [TRAVEL_FEE_POLICY_KEY]: 'chips',
};

export const isRateListingField = fieldConfig => RATE_LISTING_FIELD_KEYS.includes(fieldConfig?.key);

export const isPricingListingField = fieldConfig =>
  PRICING_LISTING_FIELD_KEYS.includes(fieldConfig?.key);

/**
 * The pricing-tab listing fields from the marketplace config, in PRICING_LISTING_FIELD_KEYS
 * order (not config order), so "Your rates" always reads in the approved order.
 *
 * @param {Array<Object>} listingFields config.listing.listingFields
 * @returns {Array<Object>}
 */
export const getOrderedPricingFields = (listingFields = []) =>
  PRICING_LISTING_FIELD_KEYS.map(key => listingFields.find(f => f.key === key)).filter(Boolean);
