/**
 * Pure helpers for showing a model's profile fields (B03).
 */

const isHttpUrl = s => /^https?:\/\//i.test(s);

/**
 * A safe link for the model's website: http(s) only. A bare "www.example.com" gets https://.
 *
 * @param {string} value as typed by the model
 * @returns {string|null}
 */
export const getWebsiteHref = value => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return null;
  }
  if (isHttpUrl(trimmed)) {
    return trimmed;
  }
  // Anything with another scheme ("javascript:", "data:") is not linked.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return null;
  }
  return `https://${trimmed}`;
};

/**
 * Instagram link from a handle ("@name", "name") or a full instagram.com URL.
 *
 * @param {string} value as typed by the model
 * @returns {string|null}
 */
export const getInstagramHref = value => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (isHttpUrl(trimmed)) {
    return /^https?:\/\/(www\.)?instagram\.com\//i.test(trimmed) ? trimmed : null;
  }
  const handle = trimmed.replace(/^@/, '').replace(/^(www\.)?instagram\.com\//i, '');
  return /^[A-Za-z0-9._]{1,30}\/?$/.test(handle)
    ? `https://www.instagram.com/${handle.replace(/\/$/, '')}`
    : null;
};

/**
 * Average star rating of the loaded reviews, or null when there are none.
 *
 * @param {Array<Object>} reviews review entities
 * @returns {number|null}
 */
export const getAverageRating = (reviews = []) => {
  const ratings = reviews.map(r => r?.attributes?.rating).filter(n => typeof n === 'number');
  if (ratings.length === 0) {
    return null;
  }
  return ratings.reduce((sum, n) => sum + n, 0) / ratings.length;
};
