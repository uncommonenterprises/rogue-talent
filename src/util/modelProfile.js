/**
 * Helpers for reading a model's profile (the `model-profile` listing) on the discovery and
 * booking journey (design: docs/design/booking-journey B01-B04). Pure functions, no React.
 */

// The model's minimum-notice options (listing field `min_booking_notice`) in hours.
// Minimum notice is a GUIDE, not a rule (Neil, open question 3, 01/11/2026): nothing here blocks
// a booking; it only decides whether to show the calm "asks for at least ... notice" line.
export const MIN_NOTICE_HOURS = {
  'same-day': 0,
  '24-hours': 24,
  '48-hours': 48,
  '1-week': 168,
  '2-weeks': 336,
};

const HOUR_MS = 60 * 60 * 1000;

/**
 * The model's city, for the location eyebrow. Location is saved at city level from the
 * "About you" step ("Manchester, UK"); only the first part (the city) is shown.
 *
 * @param {Object} publicData listing public data
 * @returns {string|null} e.g. "Manchester"
 */
export const getModelCity = publicData => {
  const address = publicData?.location?.address;
  if (typeof address !== 'string' || address.trim() === '') {
    return null;
  }
  return address.split(',')[0].trim();
};

/**
 * The name used inside sentences ("Ava keeps 100% of the day rate"). Sharetribe display names
 * are "First L", so the first word is the first name. Falls back to the listing title.
 *
 * @param {Object} author user entity
 * @param {string} title listing title (the model's display name on the profile)
 * @returns {string}
 */
export const getModelFirstName = (author, title = '') => {
  const displayName = author?.attributes?.profile?.displayName;
  const source = typeof displayName === 'string' && displayName.trim() ? displayName : title;
  return (source || '').trim().split(/\s+/)[0] || '';
};

/**
 * Number of hours of notice the model asks for, or null when not set / unknown.
 *
 * @param {string} noticeKey value of `min_booking_notice`
 * @returns {number|null}
 */
export const getMinNoticeHours = noticeKey =>
  Object.prototype.hasOwnProperty.call(MIN_NOTICE_HOURS, noticeKey)
    ? MIN_NOTICE_HOURS[noticeKey]
    : null;

/**
 * Is the chosen start date inside the model's minimum notice? The shoot is treated as starting
 * at the beginning of the start day (the conservative reading). Informational only.
 *
 * @param {Object} params
 * @param {Date} params.startDate start of the first booked day (listing time zone)
 * @param {string} params.noticeKey value of `min_booking_notice`
 * @param {Date} [params.now] current time (defaults to new Date())
 * @returns {boolean}
 */
export const isInsideMinimumNotice = ({ startDate, noticeKey, now = new Date() }) => {
  const hours = getMinNoticeHours(noticeKey);
  if (!hours || !(startDate instanceof Date) || isNaN(startDate)) {
    return false;
  }
  return startDate.getTime() - now.getTime() < hours * HOUR_MS;
};

const findField = (config, key) => (config?.listing?.listingFields || []).find(f => f.key === key);

/**
 * Client-facing label for a listing-field option. A short label in en.json
 * ("ModelField.<key>.<option>", e.g. "New face", "Local only (25 miles)") wins; otherwise the
 * label configured on the listing field; otherwise the raw option.
 *
 * @param {Object} intl react-intl (needs `messages` and `formatMessage`)
 * @param {Object} config app configuration
 * @param {string} key listing field key
 * @param {string} option stored option value
 * @returns {string}
 */
export const getOptionLabel = (intl, config, key, option) => {
  const id = `ModelField.${key}.${option}`;
  if (intl?.messages && Object.prototype.hasOwnProperty.call(intl.messages, id)) {
    return intl.formatMessage({ id });
  }
  const found = findField(config, key)?.enumOptions?.find(o => `${o.option}` === `${option}`);
  return found?.label || `${option}`;
};
