/**
 * server/api-util/stripeConnectStatus.js
 * ---------------------------------------------------------------------------
 * Review tool (stage 1, READ-ONLY): a model's Stripe Connect progress for the review panel and
 * the queue chip ("Identity" and "Bank"). The Integration API has no Stripe-account endpoint
 * (see providerVerifiedGate.js), so this reads the connected account straight from Stripe:
 *
 *   GET https://api.stripe.com/v1/accounts/{acct_id}   (Stripe API, "Retrieve account")
 *
 * with the existing platform key STRIPE_SECRET_KEY (TEST mode on ndstealth1-test). No new env
 * var, no writes, and no `stripe` npm package (dependency policy; Node https, like
 * stripeIdentity.js).
 *
 * PERSONAL DATA: the Stripe account object holds the model's name, date of birth, address and
 * bank details. NOTHING from it leaves this module except two status words, built from
 * `charges_enabled`, `payouts_enabled` and the identity verification status. The raw object is
 * never logged, cached or returned.
 *
 * Status words:
 *   'verified'     identity: charges enabled or the person's ID verified; bank: payouts enabled
 *   'in-progress'  a Stripe account exists but that part is not finished
 *   'not-started'  no Stripe account yet
 *   'unknown'      not configured, or Stripe could not be read (never blocks anything)
 *
 * Display only: this never decides visibility or bookings (modelVisibility.js does).
 *
 * ⚠️ TEST-MODE STRIPE ONLY.
 */

const https = require('https');
const log = require('../log');

const STRIPE_API_HOST = 'api.stripe.com';
const REQUEST_TIMEOUT_MS = 8000;
const STRIPE_ACCOUNT_ID_PATTERN = /^acct_[A-Za-z0-9]+$/;

const STATUS_VERIFIED = 'verified';
const STATUS_IN_PROGRESS = 'in-progress';
const STATUS_NOT_STARTED = 'not-started';
const STATUS_UNKNOWN = 'unknown';

const getSecretKey = () => process.env.STRIPE_SECRET_KEY;

/**
 * Can this module read Stripe (platform key present)?
 * @returns {boolean}
 */
const isConfigured = () => !!getSecretKey();

const both = status => ({ identity: status, bank: status });

/**
 * Reduce a raw Stripe Account object to the two status words. Pure.
 *
 * @param {Object} account - the Stripe Account object
 * @returns {{identity: string, bank: string}}
 */
const summariseStripeAccount = account => {
  if (!account || typeof account !== 'object') {
    return both(STATUS_UNKNOWN);
  }
  const identityVerified =
    account.charges_enabled === true || account.individual?.verification?.status === 'verified';
  const bankVerified = account.payouts_enabled === true;
  return {
    identity: identityVerified ? STATUS_VERIFIED : STATUS_IN_PROGRESS,
    bank: bankVerified ? STATUS_VERIFIED : STATUS_IN_PROGRESS,
  };
};

/**
 * One combined word for the queue chip: verified only when both parts are verified (R01 note).
 *
 * @param {{identity: string, bank: string}} status
 * @returns {string}
 */
const combineStripeStatus = status => {
  const { identity, bank } = status || {};
  if (identity === STATUS_VERIFIED && bank === STATUS_VERIFIED) {
    return STATUS_VERIFIED;
  }
  if (identity === STATUS_UNKNOWN || bank === STATUS_UNKNOWN) {
    return STATUS_UNKNOWN;
  }
  if (identity === STATUS_NOT_STARTED && bank === STATUS_NOT_STARTED) {
    return STATUS_NOT_STARTED;
  }
  return STATUS_IN_PROGRESS;
};

/**
 * GET a connected account from Stripe. Resolves with the parsed object; rejects on any error.
 * @param {string} stripeAccountId - acct_...
 * @returns {Promise<Object>}
 */
const fetchStripeAccount = stripeAccountId =>
  new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: STRIPE_API_HOST,
        path: `/v1/accounts/${encodeURIComponent(stripeAccountId)}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${getSecretKey()}` },
        timeout: REQUEST_TIMEOUT_MS,
      },
      res => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          raw += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(raw));
            } catch (e) {
              reject(new Error('Stripe account response was not JSON'));
            }
            return;
          }
          const err = new Error(`Stripe account read failed (${res.statusCode})`);
          err.status = res.statusCode;
          reject(err);
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('Stripe account read timed out')));
    req.on('error', reject);
    req.end();
  });

/**
 * The status words for a connected account id. Never throws and never returns raw Stripe data.
 *
 * @param {string|null} stripeAccountId
 * @param {Object} [options]
 * @param {Function} [options.fetchAccount] - inject the Stripe read (tests)
 * @returns {Promise<{identity: string, bank: string}>}
 */
const getStripeAccountStatus = (stripeAccountId, { fetchAccount = fetchStripeAccount } = {}) => {
  if (!stripeAccountId) {
    return Promise.resolve(both(STATUS_NOT_STARTED));
  }
  if (!STRIPE_ACCOUNT_ID_PATTERN.test(stripeAccountId) || !isConfigured()) {
    return Promise.resolve(both(STATUS_UNKNOWN));
  }
  return fetchAccount(stripeAccountId)
    .then(summariseStripeAccount)
    .catch(err => {
      // Ids only: never the response body.
      log.error(err, 'review-stripe-status-failed', { stripeAccountId });
      return both(STATUS_UNKNOWN);
    });
};

module.exports = {
  STATUS_VERIFIED,
  STATUS_IN_PROGRESS,
  STATUS_NOT_STARTED,
  STATUS_UNKNOWN,
  isConfigured,
  summariseStripeAccount,
  combineStripeStatus,
  getStripeAccountStatus,
};
