// Read-only summary rows for "Review & submit" (sign-up journey screen 13). Pure helpers so the
// summary can be unit tested without rendering the wizard.

import { formatMoney } from '../../../../util/currency';
import { types as sdkTypes } from '../../../../util/sdkLoader';

import {
  MIN_BOOKING_NOTICE_KEY,
  TRAVEL_FEE_POLICY_KEY,
  TRAVEL_RADIUS_KEY,
  RATE_LISTING_FIELD_KEYS,
} from '../rateFields';

const { Money } = sdkTypes;

// "Your profile" summary: the headline attributes from the mockup (the step itself has them
// all). Each row: the listing-field key, the review label (en.json) and how to show the value.
const PROFILE_SUMMARY_ROWS = [
  { key: 'gender', labelId: 'EditListingReviewPanel.gender' },
  { key: 'height_cm', labelId: 'EditListingReviewPanel.height', format: 'centimetres' },
  { key: 'experience_level', labelId: 'EditListingReviewPanel.experience', format: 'short' },
  { key: 'modelling_categories', labelId: 'EditListingReviewPanel.categories', format: 'list' },
];

// How many category labels to name before "+N".
const LIST_PREVIEW_COUNT = 2;

const findField = (config, key) => (config?.listing?.listingFields || []).find(f => f.key === key);

const optionLabel = (fieldConfig, option) =>
  fieldConfig?.enumOptions?.find(o => `${o.option}` === `${option}`)?.label || `${option}`;

// "Some experience (a handful of shoots or jobs so far)" -> "Some experience"
const shortLabel = label => `${label}`.replace(/\s*\(.*\)\s*$/, '');

const hasValue = value =>
  value !== null &&
  typeof value !== 'undefined' &&
  value !== '' &&
  !(Array.isArray(value) && !value.length);

/**
 * Format a listing-field value for the summary.
 *
 * @param {Object} fieldConfig listing-field config (for enum labels)
 * @param {*} value the stored value
 * @param {string} [format] 'centimetres' | 'short' | 'list'
 * @param {Object} intl
 * @returns {string|null} display value, or null when not set
 */
export const formatFieldValue = (fieldConfig, value, format, intl) => {
  if (!hasValue(value)) {
    return null;
  }
  if (Array.isArray(value)) {
    const labels = value.map(v => optionLabel(fieldConfig, v));
    if (format === 'list' && labels.length > LIST_PREVIEW_COUNT) {
      return intl.formatMessage(
        { id: 'EditListingReviewPanel.listMore' },
        {
          items: labels.slice(0, LIST_PREVIEW_COUNT).join(', '),
          count: labels.length - LIST_PREVIEW_COUNT,
        }
      );
    }
    return labels.join(', ');
  }
  if (format === 'centimetres') {
    return intl.formatMessage({ id: 'EditListingReviewPanel.centimetres' }, { value });
  }
  const label = fieldConfig?.enumOptions ? optionLabel(fieldConfig, value) : `${value}`;
  return format === 'short' ? shortLabel(label) : label;
};

/**
 * Rows for the "About you" section.
 *
 * @param {Object} listing
 * @param {Object} intl
 * @returns {Array<{ key: string, label: string, value: string }>}
 */
export const getAboutYouRows = (listing, intl) => {
  const { title, publicData } = listing?.attributes || {};
  return [
    {
      key: 'title',
      label: intl.formatMessage({ id: 'EditListingReviewPanel.displayName' }),
      value: title,
    },
    {
      key: 'location',
      label: intl.formatMessage({ id: 'EditListingReviewPanel.city' }),
      value: publicData?.location?.address,
    },
  ].filter(row => hasValue(row.value));
};

/**
 * Rows for the "Your profile" section.
 *
 * @param {Object} listing
 * @param {Object} config
 * @param {Object} intl
 * @returns {Array<{ key: string, label: string, value: string }>}
 */
export const getProfileRows = (listing, config, intl) => {
  const { publicData = {}, privateData = {} } = listing?.attributes || {};
  return PROFILE_SUMMARY_ROWS.map(({ key, labelId, format }) => {
    const fieldConfig = findField(config, key);
    const data = fieldConfig?.scope === 'private' ? privateData : publicData;
    return {
      key,
      label: intl.formatMessage({ id: labelId }),
      value: formatFieldValue(fieldConfig, data?.[key], format, intl),
    };
  }).filter(row => hasValue(row.value));
};

/**
 * Rows for the "Rates" section: day rate (the listing price), the optional half-day and
 * hourly rates (stored as subunits, like the price), travel costs, how far you'll travel and
 * the minimum booking notice.
 *
 * @param {Object} listing
 * @param {Object} config
 * @param {Object} intl
 * @returns {Array<{ key: string, label: string, value: string }>}
 */
export const getRatesRows = (listing, config, intl) => {
  const { price, publicData = {} } = listing?.attributes || {};
  const currency = price?.currency || config?.currency;

  const rateLabelIds = {
    half_day_rate: 'EditListingReviewPanel.halfDayRate',
    hourly_rate: 'EditListingReviewPanel.hourlyRate',
  };
  const rateRows = RATE_LISTING_FIELD_KEYS.map(key => {
    const amount = publicData[key];
    return {
      key,
      label: intl.formatMessage({ id: rateLabelIds[key] || 'EditListingReviewPanel.rate' }),
      value:
        typeof amount === 'number' && currency
          ? formatMoney(intl, new Money(amount, currency))
          : null,
    };
  });

  const termRows = [
    { key: TRAVEL_FEE_POLICY_KEY, labelId: 'EditListingReviewPanel.travelCosts' },
    { key: TRAVEL_RADIUS_KEY, labelId: 'EditListingReviewPanel.travelRadius' },
    { key: MIN_BOOKING_NOTICE_KEY, labelId: 'EditListingReviewPanel.minBookingNotice' },
  ].map(({ key, labelId }) => ({
    key,
    label: intl.formatMessage({ id: labelId }),
    value: formatFieldValue(findField(config, key), publicData[key], null, intl),
  }));

  return [
    {
      key: 'price',
      label: intl.formatMessage({ id: 'EditListingReviewPanel.dayRate' }),
      value: price ? formatMoney(intl, price) : null,
    },
    ...rateRows,
    ...termRows,
  ].filter(row => hasValue(row.value));
};
