// Listing custom-field keys that represent secondary rates (beyond the day rate, which is
// the listing's native price). These are rendered on the Pricing ("Your rates") tab beside
// the day rate — NOT on the Details tab. They're therefore excluded from the Details form,
// from the Details onSubmit, and from the Details completion check, so they neither show in
// the wrong place nor block that step.
export const RATE_LISTING_FIELD_KEYS = ['half_day_rate', 'hourly_rate'];

export const isRateListingField = fieldConfig => RATE_LISTING_FIELD_KEYS.includes(fieldConfig?.key);
