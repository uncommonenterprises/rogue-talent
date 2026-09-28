/**
 * server/api/stripe-identity-webhook.js
 * ---------------------------------------------------------------------------
 * SAF-03 — Stripe Identity webhook receiver.
 *
 * Receives Stripe Identity events, VERIFIES the Stripe signature against the
 * webhook signing secret, and persists ONLY the boolean result onto the client's
 * Sharetribe user metadata via the Integration API. We never receive or store the
 * ID document images/selfie — Stripe holds those.
 *
 * ⚠️ RAW BODY REQUIRED: Stripe signature verification needs the UNPARSED request
 * body. This route is therefore mounted at the APP level in server/index.js with
 * `express.raw()` — BEFORE the JSON/transit body parsers — rather than inside
 * apiRouter.js (whose middleware would consume/parse the stream first). `req.body`
 * arrives here as a Buffer.
 *
 * Handled events:
 *   identity.verification_session.verified        → RT-FB-03 18+ check on the verified
 *                                                    DOB; metadata.identity_verified = true
 *                                                    ONLY if 18+ (fail closed otherwise; see
 *                                                    stripeIdentity.processVerifiedSession)
 *   identity.verification_session.requires_input  → metadata.identity_verified = false (retry)
 *   identity.verification_session.redacted        → metadata.identity_verified = false (GDPR)
 *
 * ENV VARS NEIL MUST PROVIDE TO ACTIVATE (Railway + gitignored .env only):
 *   STRIPE_IDENTITY_WEBHOOK_SECRET  webhook signing secret (whsec_...)
 *   STRIPE_IDENTITY_RESTRICTED_KEY  restricted key that can read the verified DOB (RT-FB-03)
 *   SHARETRIBE_INTEGRATION_CLIENT_ID / SHARETRIBE_INTEGRATION_CLIENT_SECRET
 * WEBHOOK ENDPOINT TO REGISTER IN THE STRIPE DASHBOARD:
 *   POST https://<railway-host>/api/stripe-identity-webhook
 *
 * FAIL-SAFE: without the signing secret the route rejects every call with 503
 * (cannot verify authenticity) rather than trusting unsigned input. It never crashes.
 *
 * ⚠️ TEST MARKETPLACE / TEST-MODE STRIPE ONLY (ndstealth1-test).
 */

const stripeIdentity = require('../api-util/stripeIdentity');
const log = require('../log');

const getUserIdFromSession = session =>
  session?.metadata?.user_id || null;

module.exports = (req, res) => {
  if (!stripeIdentity.isWebhookConfigured()) {
    // Cannot verify authenticity → refuse. Fail-safe, never trust unsigned input.
    return res.status(503).json({ error: 'Webhook not configured.' });
  }

  let event;
  try {
    const signature = req.headers['stripe-signature'];
    // req.body is a Buffer here (express.raw). constructWebhookEvent verifies the
    // signature over the raw bytes before we parse/trust anything.
    event = stripeIdentity.constructWebhookEvent(req.body, signature);
  } catch (err) {
    log.error(err, 'saf03-webhook-signature-failed');
    return res.status(400).json({ error: 'Signature verification failed.' });
  }

  const type = event?.type;
  const session = event?.data?.object;
  const userId = getUserIdFromSession(session);
  const sessionId = session?.id || null;

  if (!userId) {
    // Nothing we can persist against — acknowledge so Stripe doesn't retry forever.
    log.error(
      new Error('SAF-03 webhook missing metadata.user_id'),
      'saf03-webhook-no-user',
      { type, sessionId }
    );
    return res.status(200).json({ received: true, persisted: false });
  }

  let resultPromise;
  switch (type) {
    case 'identity.verification_session.verified':
      // RT-FB-03: verified ID is necessary but not sufficient - the holder must also be
      // 18+ on the verified DOB. The DOB is read from Stripe, used, and discarded.
      resultPromise = stripeIdentity
        .processVerifiedSession({ userId, sessionId })
        .then(({ persisted, outcome }) => ({
          persisted,
          outcome,
          verified: outcome === stripeIdentity.AGE_OUTCOME_ADULT,
        }));
      break;
    case 'identity.verification_session.requires_input':
    case 'identity.verification_session.redacted':
      resultPromise = stripeIdentity
        .writeIdentityVerifiedFlag({ userId, verified: false, sessionId })
        .then(persisted => ({ persisted, verified: false }));
      break;
    default:
      // Unhandled event type — acknowledge without a write.
      return res.status(200).json({ received: true, ignored: true });
  }

  return resultPromise
    .then(({ persisted, verified, outcome }) => {
      log.error(new Error('SAF-03 identity result persisted'), 'saf03-webhook-processed', {
        type,
        userId,
        sessionId,
        verified,
        outcome,
        persisted,
      });
      // Always 200 so Stripe considers the event delivered; the durable-write
      // outcome is logged for the operator.
      return res.status(200).json({ received: true, persisted });
    })
    .catch(err => {
      log.error(err, 'saf03-webhook-persist-error', { type, userId, sessionId });
      // Return 500 so Stripe retries a transient write failure.
      return res.status(500).json({ error: 'Failed to persist verification result.' });
    });
};
