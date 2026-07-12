// Listing custom-field keys that describe the MODEL (the person) rather than their
// offering or rates. These were originally user-profile fields; they now live on the
// listing so they are searchable/filterable and displayable via Sharetribe's native
// listing machinery. They are collected on the "About you" (PROFILE) wizard step and are
// therefore excluded from "Your details" (rendering, submit, and its completion check).
//
// Keep this list in sync with the model-attribute listing fields configured in Console.
export const PROFILE_LISTING_FIELD_KEYS = [
  'modelling_categories',
  'ethnicity',
  'experience_level',
  'gender',
  'hair_colour',
  'eye_colour',
  'availability_radius',
  'height_cm',
  'bust_chest_cm',
  'waist_cm',
  'hips_cm',
  'shoe_size_uk',
  'model_website_url',
  'instagram_url',
];

export const isProfileListingField = fieldConfig =>
  PROFILE_LISTING_FIELD_KEYS.includes(fieldConfig?.key);
