/**
 * server/api/stripe-connect-webhook.js
 * ---------------------------------------------------------------------------
 * Account-status Step 2 — Stripe Connect `account.updated` webhook receiver.
 *
 * Fires when a model's connected Stripe account changes (identity KYC completed, bank
 * added/removed, capability enabled/disabled). We VERIFY the Stripe signature, then
 * reconcile that model's listing visibility to the live Verified state — the key path
 * for the "drops out of Verified" live-lapse guarantee when the model is NOT currently
 * on the site (the own-session reconcile covers them when they are).
 *
 * ⚠️ RAW BODY REQUIRED: Stripe signature verification needs the UNPARSED request body,
 * so this route is mounted at the APP level in server/index.js with `express.raw()`
 * BEFORE the JSON/transit parsers (same as the Identity webhook). `req.body` is a Buffer.
 *
 * ⚠️ KNOWN UNCERTAINTY — account → Sharetribe-user mapping: it is NOT confirmed which
 * metadata key Sharetribe sets on the Custom Connect account it creates. If we cannot
 * map the account to a user, we log loudly and 200-acknowledge WITHOUT a write (Stripe
 * must not retry forever). The authenticated own-session reconcile is the backstop, and
 * the booking-time provider gate re-checks at money time. See the step-2 report.
 *
 * ENV VARS NEIL MUST PROVIDE TO ACTIVATE (Railway + gitignored .env only):
 *   STRIPE_CONNECT_WEBHOOK_SECRET   webhook signing secret (whsec_...) for this endpoint
 *   SHARETRIBE_INTEGRATION_CLIENT_ID / SHARETRIBE_INTEGRATION_CLIENT_SECRET
 * WEBHOOK ENDPOINT TO REGISTER IN THE STRIPE DASHBOARD (platform account, TEST mode):
 *   POST https://<railway-host>/api/stripe-connect-webhook   event: account.updated
 *
 * FAIL-SAFE: without the signing secret the route rejects every call with 503 (cannot
 * verify authenticity) rather than trusting unsigned input. It never crashes.
 *
 * ⚠️ TEST MARKETPLACE / TEST-MODE STRIPE ONLY (ndstealth1-test).
 */

const modelVisibility = require('../api-util/modelVisibility');
const log = require('../log');

module.exports = (req, res) => {
  if (!modelVisibility.isConnectWebhookConfigured()) {
    // Cannot verify authenticity → refuse. Fail-safe, never trust unsigned input.
    return res.status(503).json({ error: 'Webhook not configured.' });
  }

  let event;
  try {
    const signature = req.headers['stripe-signature'];
    // req.body is a Buffer here (express.raw). The signature is verified over the raw
    // bytes before we parse/trust anything.
    event = modelVisibility.constructConnectWebhookEvent(req.body, signature);
  } catch (err) {
    log.error(err, 'acct-status-connect-webhook-signature-failed');
    return res.status(400).json({ error: 'Signature verification failed.' });
  }

  // Only account capability changes matter for visibility. Acknowledge everything else.
  if (event?.type !== 'account.updated') {
    return res.status(200).json({ received: true, ignored: true });
  }

  return modelVisibility
    .reconcileFromConnectEvent(event)
    .then(result => {
      log.error(
        new Error('Account-status Connect webhook processed'),
        'acct-status-connect-webhook-processed',
        { accountId: event?.account || null, result }
      );
      // Always 200 so Stripe considers the event delivered; the outcome is logged.
      return res.status(200).json({ received: true, result });
    })
    .catch(err => {
      log.error(err, 'acct-status-connect-webhook-error', { accountId: event?.account || null });
      // 500 → Stripe retries a transient failure.
      return res.status(500).json({ error: 'Failed to process Connect event.' });
    });
};
