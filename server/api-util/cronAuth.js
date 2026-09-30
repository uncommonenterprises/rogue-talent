/**
 * server/api-util/cronAuth.js
 * ---------------------------------------------------------------------------
 * Shared CRON_SECRET check for the protected cron endpoints (verify-nudge, review-decision
 * emails). Moved here unchanged from server/api/verify-nudge.js so every cron endpoint uses
 * the same constant-time comparison.
 *
 * The secret may be supplied as the `X-Cron-Secret` header, an `Authorization: Bearer …`
 * header, or a `?secret=` query param. CRON_SECRET lives in Railway / .env only.
 */

const crypto = require('crypto');

const getCronSecret = () => process.env.CRON_SECRET;

// Extract the caller-supplied secret from any of the accepted locations.
const extractProvidedSecret = req => {
  const header = req.get ? req.get('X-Cron-Secret') : req.headers?.['x-cron-secret'];
  if (header) {
    return header;
  }
  const auth = req.get ? req.get('Authorization') : req.headers?.authorization;
  if (auth && /^Bearer\s+/i.test(auth)) {
    return auth.replace(/^Bearer\s+/i, '').trim();
  }
  const q = req.query?.secret;
  return typeof q === 'string' ? q : null;
};

// Constant-time comparison that is also safe when the two strings differ in length
// (timingSafeEqual throws on unequal-length buffers). Returns false on any mismatch.
const secretsMatch = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Is `?dryRun=true` (or `=1`) set?
 * @param {Object} req
 * @returns {boolean}
 */
const isDryRun = req => req.query?.dryRun === 'true' || req.query?.dryRun === '1';

module.exports = {
  getCronSecret,
  extractProvidedSecret,
  secretsMatch,
  isDryRun,
};
