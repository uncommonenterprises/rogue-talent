// Listing custom-field keys that live on the Pricing ("Your rates") tab rather than on
// "Your profile". They're excluded from the Details/"Your profile" form, its submit, and
// its completion check, and rendered on the Pricing tab instead (beside the day-rate price).
//
// Two kinds:
// - RATE_LISTING_FIELD_KEYS: monetary rates (long, stored as subunits like the price) —
//   rendered as currency inputs and formatted as money on the listing page.
// - the rest (e.g. travel fee policy): normal fields (enum) that are simply grouped with
//   the rate info.
export const RATE_LISTING_FIELD_KEYS = ['half_day_rate', 'hourly_rate'];

export const PRICING_LISTING_FIELD_KEYS = [...RATE_LISTING_FIELD_KEYS, 'travel_fee_policy'];

export const isRateListingField = fieldConfig => RATE_LISTING_FIELD_KEYS.includes(fieldConfig?.key);

export const isPricingListingField = fieldConfig =>
  PRICING_LISTING_FIELD_KEYS.includes(fieldConfig?.key);
