/**
 * server/api/create-identity-session.js
 * ---------------------------------------------------------------------------
 * SAF-03 — Create a Stripe Identity VerificationSession for the logged-in CLIENT.
 *
 * The browser POSTs here; we resolve the authenticated user server-side (never
 * trust a client-claimed id), create a VerificationSession with the platform
 * secret key, and return ONLY the client_secret (+ session id/url/status). The
 * client_secret is sensitive — it is never logged.
 *
 * ENV VARS NEIL MUST PROVIDE TO ACTIVATE (Railway + gitignored .env only; see
 * server/api-util/stripeIdentity.js for the full list + Stripe Dashboard setup):
 *   STRIPE_SECRET_KEY               platform Stripe secret key (TEST-mode: sk_test_...)
 *   STRIPE_IDENTITY_WEBHOOK_SECRET  webhook signing secret (for the result write-back)
 *   SHARETRIBE_INTEGRATION_CLIENT_ID / SHARETRIBE_INTEGRATION_CLIENT_SECRET
 *   + enable Stripe Identity on the account and register the webhook endpoint
 *     POST /api/stripe-identity-webhook
 *
 * FAIL-SAFE: when STRIPE_SECRET_KEY is absent this returns a 503 with a clear
 * `not-configured` code (the client UX shows "verification isn't available yet").
 * It never crashes.
 *
 * ⚠️ TEST MARKETPLACE / TEST-MODE STRIPE ONLY (ndstealth1-test).
 */

const { getSdk, handleError } = require('../api-util/sdk');
const stripeIdentity = require('../api-util/stripeIdentity');
const log = require('../log');

module.exports = (req, res) => {
  if (!stripeIdentity.isConfigured()) {
    // Fail-safe: feature not provisioned yet. Clear, non-crashing response.
    return res.status(503).json({
      error: 'Identity verification is not configured.',
      code: 'identity-verification-not-configured',
    });
  }

  const sdk = getSdk(req, res);

  return sdk.currentUser
    .show()
    .then(response => {
      const user = response?.data?.data;
      if (!user?.id?.uuid) {
        const err = new Error('You must be signed in to verify your identity.');
        err.status = 401;
        throw err;
      }
      const userId = user.id.uuid;
      const email = user.attributes?.email || null;

      // Already verified — no need to create (and pay for) a new session.
      if (stripeIdentity.isUserIdentityVerified(user)) {
        return res.status(200).json({ alreadyVerified: true });
      }

      return stripeIdentity.createVerificationSession({ userId, email }).then(session => {
        // NOTE: never log session.clientSecret.
        log.error(
          new Error('SAF-03 identity session created'),
          'saf03-session-created',
          { userId, sessionId: session.id, status: session.status }
        );
        return res.status(200).json({
          clientSecret: session.clientSecret,
          sessionId: session.id,
          url: session.url,
          status: session.status,
        });
      });
    })
    .catch(e => {
      handleError(res, e);
    });
};
