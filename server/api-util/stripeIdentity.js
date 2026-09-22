/**
 * server/api-util/stripeIdentity.js
 * ---------------------------------------------------------------------------
 * SAF-03 — Client identity verification via Stripe Identity.
 *
 * Low-level helper: talks to the Stripe Identity REST API directly (create a
 * VerificationSession), verifies inbound webhook signatures, and writes ONLY the
 * boolean result back to the client's Sharetribe user metadata via the Integration
 * API. We deliberately do NOT depend on the `stripe` npm package (dependency policy
 * — ask the PM before adding one); this uses Node's built-in `https` + `crypto`.
 *
 * WHAT STRIPE HOLDS vs WHAT WE HOLD: Stripe stores the ID document images and
 * selfie (the special-category data) as its own File objects. We persist ONLY a
 * boolean (`metadata.identity_verified`) plus the session id. We never receive,
 * log, or store document images.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ENV VARS NEIL MUST PROVIDE TO ACTIVATE (Railway + gitignored .env only — never
 * committed; this repo is public):
 *
 *   STRIPE_SECRET_KEY               Platform Stripe *secret* key (TEST-mode while
 *                                   on ndstealth1-test, i.e. sk_test_...). Used
 *                                   server-side to create VerificationSessions.
 *   STRIPE_IDENTITY_WEBHOOK_SECRET  Signing secret (whsec_...) for the webhook
 *                                   endpoint, from the Stripe Dashboard webhook
 *                                   configuration.
 *   SHARETRIBE_INTEGRATION_CLIENT_ID / SHARETRIBE_INTEGRATION_CLIENT_SECRET
 *                                   Operator Integration API creds, used to write
 *                                   the verified flag onto the client's profile
 *                                   metadata (already referenced by SAF-14/SAF-29).
 *
 * STRIPE DASHBOARD SETUP NEIL MUST DO:
 *   1. Enable Stripe Identity on the platform account (TEST mode).
 *   2. Create a webhook endpoint pointing at:
 *          https://<railway-host>/api/stripe-identity-webhook
 *      subscribed to events:
 *          identity.verification_session.verified
 *          identity.verification_session.requires_input
 *          identity.verification_session.redacted   (for GDPR deletions)
 *      then copy its signing secret into STRIPE_IDENTITY_WEBHOOK_SECRET.
 *
 * FAIL-SAFE: when STRIPE_SECRET_KEY / STRIPE_IDENTITY_WEBHOOK_SECRET are absent
 * (the default until Neil provisions), the feature is INACTIVE. `isConfigured()`
 * returns false, the create-session route returns a clear "not configured" error,
 * the webhook rejects unsigned/unverifiable calls, and the booking gate fails OPEN
 * (mirrors SAF-14 residenceBoundary.js). It must never crash or block bookings on
 * the test env before provisioning.
 *
 * ⚠️ TEST MARKETPLACE / TEST-MODE STRIPE ONLY (ndstealth1-test).
 */

const https = require('https');
const crypto = require('crypto');
const log = require('../log');

const STRIPE_API_HOST = 'api.stripe.com';
const STRIPE_IDENTITY_PATH = '/v1/identity/verification_sessions';

// Metadata key written onto the CLIENT's Sharetribe user profile. Deliberately
// DISTINCT from the model display badge key (`metadata.id_verified === 'verified'`,
// see components/VerifiedBadge) so client booking-gate state never collides with,
// or accidentally surfaces as, the public model "Verified" badge.
const IDENTITY_VERIFIED_METADATA_KEY = 'identity_verified';

// Tolerance (seconds) for the webhook timestamp, matching Stripe's default.
const WEBHOOK_TIMESTAMP_TOLERANCE_S = 300;

const getSecretKey = () => process.env.STRIPE_SECRET_KEY;
const getWebhookSecret = () => process.env.STRIPE_IDENTITY_WEBHOOK_SECRET;

/**
 * Whether the Stripe Identity feature is configured (secret key present). When
 * false, the whole feature is inactive and fail-safe.
 * @returns {boolean}
 */
const isConfigured = () => !!getSecretKey();

/**
 * Whether the webhook can verify signatures (signing secret present).
 * @returns {boolean}
 */
const isWebhookConfigured = () => !!getWebhookSecret();

// Lazily create a single Integration SDK instance (only if operator creds exist).
let integrationSdkInstance = null;
let integrationSdkResolved = false;
const getIntegrationSdk = () => {
  if (integrationSdkResolved) {
    return integrationSdkInstance;
  }
  integrationSdkResolved = true;
  const clientId = process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
  const clientSecret = process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;
  if (clientId && clientSecret) {
    // eslint-disable-next-line global-require
    const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');
    integrationSdkInstance = flexIntegrationSdk.createInstance({ clientId, clientSecret });
  }
  return integrationSdkInstance;
};

// Minimal application/x-www-form-urlencoded encoder for nested Stripe params.
const encodeForm = params => {
  const parts = [];
  const add = (key, value) => {
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  };
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value == null) {
      return;
    }
    if (typeof value === 'object') {
      Object.keys(value).forEach(subKey => {
        if (value[subKey] != null) {
          add(`${key}[${subKey}]`, value[subKey]);
        }
      });
    } else {
      add(key, value);
    }
  });
  return parts.join('&');
};

// Low-level HTTPS POST to the Stripe API. Resolves with parsed JSON on 2xx,
// rejects with an Error (carrying .status and .stripeError) otherwise.
const stripePost = (path, params, { idempotencyKey } = {}) =>
  new Promise((resolve, reject) => {
    const secretKey = getSecretKey();
    if (!secretKey) {
      const err = new Error('Stripe Identity is not configured (STRIPE_SECRET_KEY missing).');
      err.status = 503;
      return reject(err);
    }

    const body = encodeForm(params);
    const headers = {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    };
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const request = https.request(
      { method: 'POST', host: STRIPE_API_HOST, path, headers },
      response => {
        let raw = '';
        response.on('data', chunk => {
          raw += chunk;
        });
        response.on('end', () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch (e) {
            const err = new Error('Failed to parse Stripe response.');
            err.status = 502;
            return reject(err);
          }
          if (response.statusCode >= 200 && response.statusCode < 300) {
            return resolve(parsed);
          }
          const err = new Error(parsed?.error?.message || 'Stripe request failed.');
          err.status = response.statusCode;
          err.stripeError = parsed?.error || null;
          return reject(err);
        });
      }
    );
    request.on('error', reject);
    request.write(body);
    request.end();
  });

/**
 * Create a Stripe Identity VerificationSession for a user.
 * Returns only the fields the client needs — never logs the client_secret.
 *
 * @param {Object} args
 * @param {string} args.userId - Sharetribe user id (attached as metadata.user_id)
 * @param {string} [args.email] - optional, for Stripe's records only
 * @returns {Promise<{id: string, clientSecret: string, url: string, status: string}>}
 */
const createVerificationSession = ({ userId, email } = {}) => {
  // Flat, fully-bracketed Stripe form keys (encodeForm encodes each verbatim).
  const params = {
    type: 'document',
    'metadata[user_id]': userId,
    // Require a selfie matched against the document (liveness / ownership).
    'options[document][require_matching_selfie]': 'true',
  };
  if (email) {
    params['metadata[email]'] = email;
  }
  // Idempotency: one in-flight session per user (Stripe recommends reusing a
  // session on retry to avoid double-charging). A per-user key coalesces rapid
  // duplicate create calls; a genuinely new attempt uses a fresh session because
  // Stripe only dedupes identical requests within a 24h window.
  const idempotencyKey = `identity-session-${userId}`;

  return stripePost(STRIPE_IDENTITY_PATH, params, { idempotencyKey }).then(session => ({
    id: session.id,
    clientSecret: session.client_secret,
    url: session.url,
    status: session.status,
  }));
};

/**
 * Verify a Stripe webhook signature against a GIVEN signing secret and return the
 * parsed event. Mirrors Stripe's scheme: HMAC-SHA256 over `${timestamp}.${rawBody}`
 * with the signing secret, compared (constant-time) against the `v1` value in the
 * `Stripe-Signature` header, with a timestamp tolerance window.
 *
 * Exported so other Stripe webhook receivers (e.g. the Connect `account.updated`
 * endpoint in modelVisibility.js) reuse the exact same verified crypto rather than
 * duplicating it — each passes its own signing secret.
 *
 * @param {Buffer|string} rawBody - the UNPARSED request body
 * @param {string} signatureHeader - the `Stripe-Signature` header value
 * @param {string} secret - the webhook signing secret to verify against
 * @returns {Object} the parsed Stripe event
 * @throws {Error} if the signing secret is missing or the signature is invalid
 */
const verifyStripeWebhookSignature = (rawBody, signatureHeader, secret) => {
  if (!secret) {
    const err = new Error('Webhook signing secret not configured.');
    err.status = 503;
    throw err;
  }
  if (!signatureHeader) {
    const err = new Error('Missing Stripe-Signature header.');
    err.status = 400;
    throw err;
  }

  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');

  // Parse `t=...,v1=...` (there may be multiple v1 entries).
  const parts = signatureHeader.split(',').reduce(
    (acc, part) => {
      const [k, v] = part.split('=');
      if (k === 't') {
        acc.timestamp = v;
      } else if (k === 'v1') {
        acc.signatures.push(v);
      }
      return acc;
    },
    { timestamp: null, signatures: [] }
  );

  if (!parts.timestamp || parts.signatures.length === 0) {
    const err = new Error('Invalid Stripe-Signature header format.');
    err.status = 400;
    throw err;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parts.timestamp}.${payload}`, 'utf8')
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const matches = parts.signatures.some(sig => {
    const sigBuf = Buffer.from(sig, 'utf8');
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
  if (!matches) {
    const err = new Error('Stripe webhook signature verification failed.');
    err.status = 400;
    throw err;
  }

  // Replay protection: reject events outside the tolerance window.
  const nowS = Math.floor(Date.now() / 1000);
  if (Math.abs(nowS - Number(parts.timestamp)) > WEBHOOK_TIMESTAMP_TOLERANCE_S) {
    const err = new Error('Stripe webhook timestamp outside tolerance.');
    err.status = 400;
    throw err;
  }

  return JSON.parse(payload);
};

/**
 * Verify a Stripe Identity webhook event using this module's signing secret.
 * Thin wrapper around verifyStripeWebhookSignature.
 *
 * @param {Buffer|string} rawBody - the UNPARSED request body
 * @param {string} signatureHeader - the `Stripe-Signature` header value
 * @returns {Object} the parsed Stripe event
 * @throws {Error} if the signing secret is missing or the signature is invalid
 */
const constructWebhookEvent = (rawBody, signatureHeader) =>
  verifyStripeWebhookSignature(rawBody, signatureHeader, getWebhookSecret());

/**
 * Write the identity-verified boolean onto a user's Sharetribe profile metadata via
 * the Integration API. Stores ONLY the boolean + the session id — never document data.
 *
 * @param {Object} args
 * @param {string} args.userId - Sharetribe user id
 * @param {boolean} args.verified - the result
 * @param {string} [args.sessionId] - the VerificationSession id (audit reference)
 * @returns {Promise<boolean>} true if the write succeeded, false otherwise
 */
const writeIdentityVerifiedFlag = ({ userId, verified, sessionId }) => {
  const integrationSdk = getIntegrationSdk();
  if (!integrationSdk) {
    log.error(
      new Error('SAF-03 cannot persist identity result: Integration API credentials missing'),
      'saf03-no-integration-creds',
      { userId }
    );
    return Promise.resolve(false);
  }
  return integrationSdk.users
    .updateProfile({
      id: userId,
      metadata: {
        [IDENTITY_VERIFIED_METADATA_KEY]: !!verified,
        identity_verification_session_id: sessionId || null,
        identity_verified_at: verified ? new Date().toISOString() : null,
      },
    })
    .then(() => true)
    .catch(err => {
      log.error(err, 'saf03-identity-flag-write-failed', { userId });
      return false;
    });
};

/**
 * Read whether a user entity is identity-verified (server-side check).
 * @param {Object} user - a Sharetribe user/currentUser API entity
 * @returns {boolean}
 */
const isUserIdentityVerified = user =>
  user?.attributes?.profile?.metadata?.[IDENTITY_VERIFIED_METADATA_KEY] === true;

module.exports = {
  isConfigured,
  isWebhookConfigured,
  createVerificationSession,
  constructWebhookEvent,
  verifyStripeWebhookSignature,
  writeIdentityVerifiedFlag,
  isUserIdentityVerified,
  IDENTITY_VERIFIED_METADATA_KEY,
};
