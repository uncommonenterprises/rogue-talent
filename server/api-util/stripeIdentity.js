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
 * selfie (the special-category data) as its own File objects. We persist ONLY
 * booleans (`metadata.identity_verified`, and the RT-FB-03 age flags below) plus the
 * session id. We never receive, log, or store document images.
 *
 * RT-FB-03 AGE GATE (18+ from the VERIFIED ID): on a `verified` event we retrieve the
 * session from Stripe with `expand[]=verified_outputs.dob`, compute the age on today's
 * UK date (ageCheck.js), and only then set `identity_verified: true`. The DOB is held
 * in memory for that one calculation - it is NEVER stored or logged. We store only:
 *   metadata.age_verified_18plus  true only while identity_verified is true (adult ID)
 *   metadata.age_check_failed     true when a verified ID shows the holder is UNDER 18.
 *                                 STICKY: code never clears it (operator only, after
 *                                 review), and while it is set a later "verified" result
 *                                 is HELD (not verified) for operator review (SAF-38).
 *   metadata.age_checked_at       ISO timestamp of the last age decision
 * The age decision FAILS CLOSED: no DOB, an unreadable DOB, a user/session mismatch, a
 * missing restricted key, or under 18 => identity_verified is NOT set true.
 *
 * Why a RESTRICTED key: Stripe only returns `verified_outputs.dob` to a restricted API
 * key with the Identity "Verification Results" + "Recent Detailed Verification Results"
 * Read permissions - the normal secret key cannot read it (Stripe docs, "Access
 * verification results"). Without IP restrictions such a key can read sensitive results
 * for verifications from the LAST 48 HOURS only, which is ample for a webhook.
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
 *   STRIPE_IDENTITY_RESTRICTED_KEY  RT-FB-03: a Stripe RESTRICTED key (rk_test_... while
 *                                   on ndstealth1-test) with Identity "Verification
 *                                   Results" + "Recent Detailed Verification Results"
 *                                   set to Read, and nothing else. Used ONLY to read the
 *                                   verified date of birth for the 18+ check. Absent =>
 *                                   the age check cannot run and NO client can become
 *                                   identity-verified (fail closed, logged loudly).
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
const { sendSafeguardingAlert, ALERT_UNDER_18, ALERT_HELD } = require('./safeguardingAlert');
const { evaluateDobAge, AGE_STATUS_ADULT, AGE_STATUS_UNDER_18 } = require('./ageCheck');

const STRIPE_API_HOST = 'api.stripe.com';
const STRIPE_IDENTITY_PATH = '/v1/identity/verification_sessions';

// Metadata key written onto the CLIENT's Sharetribe user profile. Deliberately
// DISTINCT from the model display badge key (`metadata.id_verified === 'verified'`,
// see components/VerifiedBadge) so client booking-gate state never collides with,
// or accidentally surfaces as, the public model "Verified" badge.
const IDENTITY_VERIFIED_METADATA_KEY = 'identity_verified';

// RT-FB-03 derived age flags (booleans only - the DOB itself is never stored).
const AGE_VERIFIED_METADATA_KEY = 'age_verified_18plus';
const AGE_CHECK_FAILED_METADATA_KEY = 'age_check_failed';
const AGE_CHECKED_AT_METADATA_KEY = 'age_checked_at';

// Outcomes of processVerifiedSession (returned for logging/tests; never contain a DOB).
const AGE_OUTCOME_ADULT = 'adult';
const AGE_OUTCOME_UNDER_18 = 'under-18';
const AGE_OUTCOME_DOB_UNAVAILABLE = 'dob-unavailable';
const AGE_OUTCOME_HELD = 'held-prior-age-check-failure';

// Tolerance (seconds) for the webhook timestamp, matching Stripe's default.
const WEBHOOK_TIMESTAMP_TOLERANCE_S = 300;

const getSecretKey = () => process.env.STRIPE_SECRET_KEY;
const getWebhookSecret = () => process.env.STRIPE_IDENTITY_WEBHOOK_SECRET;
const getRestrictedKey = () => process.env.STRIPE_IDENTITY_RESTRICTED_KEY;

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

/**
 * RT-FB-03: whether the 18+ check can read the verified DOB (restricted key present).
 * When false, no client can become identity-verified (fail closed).
 * @returns {boolean}
 */
const isAgeCheckConfigured = () => !!getRestrictedKey();

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

// Low-level HTTPS request to the Stripe API. Resolves with parsed JSON on 2xx,
// rejects with an Error (carrying .status and .stripeError) otherwise. `body` is an
// already-encoded form string (POST) or null (GET). The API key is passed in so the
// RT-FB-03 DOB read can use the restricted key rather than the platform secret key.
const stripeRequest = ({ method, path, body = null, apiKey, idempotencyKey }) =>
  new Promise((resolve, reject) => {
    const headers = { Authorization: `Bearer ${apiKey}` };
    if (body != null) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const request = https.request({ method, host: STRIPE_API_HOST, path, headers }, response => {
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
    });
    request.on('error', reject);
    if (body != null) {
      request.write(body);
    }
    request.end();
  });

// HTTPS POST with the platform secret key (creates VerificationSessions).
const stripePost = (path, params, { idempotencyKey } = {}) => {
  const secretKey = getSecretKey();
  if (!secretKey) {
    const err = new Error('Stripe Identity is not configured (STRIPE_SECRET_KEY missing).');
    err.status = 503;
    return Promise.reject(err);
  }
  return stripeRequest({
    method: 'POST',
    path,
    body: encodeForm(params),
    apiKey: secretKey,
    idempotencyKey,
  });
};

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
 * the Integration API. Stores ONLY booleans + the session id - never document data,
 * never a date of birth.
 *
 * RT-FB-03 INVARIANT: `identity_verified` is only ever written `true` together with a
 * passed 18+ check (`ageVerified18Plus: true`). Any other combination writes `false`, so
 * no caller can mark a client verified without the age gate.
 * `age_check_failed` is only ever written `true` (sticky); code never clears it.
 *
 * @param {Object} args
 * @param {string} args.userId - Sharetribe user id
 * @param {boolean} args.verified - the Stripe Identity result
 * @param {string} [args.sessionId] - the VerificationSession id (audit reference)
 * @param {boolean} [args.ageVerified18Plus] - true only when the verified DOB shows 18+
 * @param {boolean} [args.ageCheckFailed] - true when the verified DOB shows under 18
 * @param {boolean} [args.ageChecked] - true when an age decision was made (stamps time)
 * @returns {Promise<boolean>} true if the write succeeded, false otherwise
 */
const writeIdentityVerifiedFlag = ({
  userId,
  verified,
  sessionId,
  ageVerified18Plus = false,
  ageCheckFailed = false,
  ageChecked = false,
}) => {
  const integrationSdk = getIntegrationSdk();
  if (!integrationSdk) {
    log.error(
      new Error('SAF-03 cannot persist identity result: Integration API credentials missing'),
      'saf03-no-integration-creds',
      { userId }
    );
    return Promise.resolve(false);
  }
  const nowIso = new Date().toISOString();
  const isVerifiedAdult = verified === true && ageVerified18Plus === true;
  const metadata = {
    [IDENTITY_VERIFIED_METADATA_KEY]: isVerifiedAdult,
    identity_verification_session_id: sessionId || null,
    identity_verified_at: isVerifiedAdult ? nowIso : null,
    [AGE_VERIFIED_METADATA_KEY]: isVerifiedAdult,
  };
  if (ageCheckFailed === true) {
    metadata[AGE_CHECK_FAILED_METADATA_KEY] = true;
  }
  if (ageChecked === true) {
    metadata[AGE_CHECKED_AT_METADATA_KEY] = nowIso;
  }
  return integrationSdk.users
    .updateProfile({ id: userId, metadata })
    .then(() => true)
    .catch(err => {
      log.error(err, 'saf03-identity-flag-write-failed', { userId });
      return false;
    });
};

// `expand[]=verified_outputs.dob` - requests ONLY the DOB from the verified outputs
// (data minimisation: we do not ask for the name/address we don't need).
const DOB_EXPAND_QUERY = `expand${encodeURIComponent('[]')}=verified_outputs.dob`;

/**
 * RT-FB-03: retrieve a VerificationSession with the verified DOB, using the RESTRICTED
 * key. The returned `dob` must be used in memory only - never stored or logged.
 *
 * @param {string} sessionId
 * @returns {Promise<{status: string|null, sessionUserId: string|null, dob: Object|null}>}
 */
const retrieveSessionForAgeCheck = sessionId =>
  stripeRequest({
    method: 'GET',
    path: `${STRIPE_IDENTITY_PATH}/${encodeURIComponent(sessionId)}?${DOB_EXPAND_QUERY}`,
    apiKey: getRestrictedKey(),
  }).then(session => ({
    status: session?.status || null,
    sessionUserId: session?.metadata?.user_id || null,
    dob: session?.verified_outputs?.dob || null,
  }));

// Transient Stripe failures (network, 5xx, rate limit) are re-thrown so the webhook
// returns 500 and Stripe retries. Anything else (e.g. 401/403 key permissions, 404) is
// permanent for this event and resolves as "DOB unavailable" (fail closed).
const isRetryableStripeError = err => !err?.status || err.status >= 500 || err.status === 429;

/**
 * Decide the age status for a verified session. Resolves with { ageStatus, why } and
 * NEVER returns the DOB. Fails closed: every path other than a matching, verified
 * session whose DOB shows 18+ yields a non-adult status.
 *
 * @param {Object} args - { userId, sessionId, now }
 * @returns {Promise<{ageStatus: string, why: string}>}
 */
const determineSessionAgeStatus = ({ userId, sessionId, now }) => {
  const unavailable = why => ({ ageStatus: AGE_OUTCOME_DOB_UNAVAILABLE, why });
  if (!sessionId) {
    return Promise.resolve(unavailable('no-session-id'));
  }
  if (!isAgeCheckConfigured()) {
    return Promise.resolve(unavailable('restricted-key-missing'));
  }
  return retrieveSessionForAgeCheck(sessionId).then(
    ({ status, sessionUserId, dob }) => {
      // Re-confirm from Stripe directly rather than trusting the event alone.
      if (status !== 'verified') {
        return unavailable('session-not-verified');
      }
      if (sessionUserId !== userId) {
        return unavailable('session-user-mismatch');
      }
      return { ageStatus: evaluateDobAge(dob, { now }), why: 'evaluated' };
    },
    err => {
      if (isRetryableStripeError(err)) {
        throw err;
      }
      log.error(err, 'rtfb03-age-check-retrieve-rejected', {
        userId,
        sessionId,
        status: err.status,
      });
      return unavailable('stripe-rejected');
    }
  );
};

// Has this user previously had a verified ID showing them under 18? (sticky flag)
const hasPriorAgeCheckFailure = userId => {
  const integrationSdk = getIntegrationSdk();
  if (!integrationSdk) {
    // The write will also be impossible (and logged) - nothing can be verified.
    return Promise.resolve(false);
  }
  return integrationSdk.users
    .show({ id: userId })
    .then(
      res =>
        res?.data?.data?.attributes?.profile?.metadata?.[AGE_CHECK_FAILED_METADATA_KEY] === true
    );
};

/**
 * RT-FB-03: handle a Stripe Identity `verified` event with the 18+ gate.
 *   - adult DOB                       → identity_verified: true, age_verified_18plus: true
 *   - adult DOB but previously flagged under 18 → HELD: not verified, operator review
 *   - under-18 DOB                    → not verified, age_check_failed: true, loud log
 *   - DOB unavailable (any reason)    → not verified, loud log (fail closed)
 * The DOB is never persisted or logged. Rejects only on a transient failure (Stripe
 * 5xx/network, or the prior-flag lookup failing) so the webhook can 500 → Stripe retries;
 * nothing is marked verified in that case.
 *
 * @param {Object} args
 * @param {string} args.userId - Sharetribe user id (from the session metadata)
 * @param {string} args.sessionId - the VerificationSession id
 * @param {Date} [args.now] - evaluation instant (injectable for tests)
 * @returns {Promise<{persisted: boolean, outcome: string, why?: string}>}
 */
const processVerifiedSession = ({ userId, sessionId, now } = {}) =>
  determineSessionAgeStatus({ userId, sessionId, now }).then(({ ageStatus, why }) => {
    const write = args =>
      writeIdentityVerifiedFlag({ userId, sessionId, ageChecked: true, ...args });

    if (ageStatus === AGE_STATUS_ADULT) {
      return hasPriorAgeCheckFailure(userId).then(priorFailure => {
        if (priorFailure) {
          log.error(
            new Error(
              'RT-FB-03 SAFEGUARDING: adult ID verified on an account previously flagged ' +
                'under 18 - HELD, NOT verified. Operator review required (SAF-38).'
            ),
            'rtfb03-age-check-held',
            { userId, sessionId }
          );
          return Promise.all([
            write({ verified: false }),
            sendSafeguardingAlert({
              kind: ALERT_HELD,
              userId,
              userType: 'client',
              source: 'Stripe Identity (client ID check)',
            }),
          ]).then(([persisted]) => ({
            persisted,
            outcome: AGE_OUTCOME_HELD,
          }));
        }
        return write({ verified: true, ageVerified18Plus: true }).then(persisted => ({
          persisted,
          outcome: AGE_OUTCOME_ADULT,
        }));
      });
    }

    if (ageStatus === AGE_STATUS_UNDER_18) {
      log.error(
        new Error(
          'RT-FB-03 SAFEGUARDING: Stripe-verified ID shows this client is UNDER 18 - NOT ' +
            'verified, flagged age_check_failed. Operator action required (SAF-38).'
        ),
        'rtfb03-age-check-under-18',
        { userId, sessionId }
      );
      return Promise.all([
        write({ verified: false, ageCheckFailed: true }),
        sendSafeguardingAlert({
          kind: ALERT_UNDER_18,
          userId,
          userType: 'client',
          source: 'Stripe Identity (client ID check)',
        }),
      ]).then(([persisted]) => ({
        persisted,
        outcome: AGE_OUTCOME_UNDER_18,
      }));
    }

    log.error(
      new Error(
        'RT-FB-03 age check could not confirm 18+ from the verified ID - client NOT ' +
          'verified (fail closed).'
      ),
      'rtfb03-age-check-dob-unavailable',
      { userId, sessionId, why }
    );
    return write({ verified: false }).then(persisted => ({
      persisted,
      outcome: AGE_OUTCOME_DOB_UNAVAILABLE,
      why,
    }));
  });

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
  isAgeCheckConfigured,
  createVerificationSession,
  constructWebhookEvent,
  verifyStripeWebhookSignature,
  writeIdentityVerifiedFlag,
  processVerifiedSession,
  isUserIdentityVerified,
  IDENTITY_VERIFIED_METADATA_KEY,
  AGE_VERIFIED_METADATA_KEY,
  AGE_CHECK_FAILED_METADATA_KEY,
  AGE_OUTCOME_ADULT,
  AGE_OUTCOME_UNDER_18,
  AGE_OUTCOME_DOB_UNAVAILABLE,
  AGE_OUTCOME_HELD,
};
