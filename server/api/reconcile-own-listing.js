/**
 * server/api/reconcile-own-listing.js
 * ---------------------------------------------------------------------------
 * Account-status Step 2 — authenticated own-session reconcile trigger.
 *
 * Console operator approval (Gate A: pending-approval → active) has NO webhook, and a
 * model returning from Stripe onboarding may not fire a Connect webhook we can map. So
 * the model's OWN authenticated session is the reliable trigger: whenever they load
 * their dashboard/profile the frontend pings this endpoint, and we reconcile their
 * listing visibility to the live Verified state ("approved while away" / "just finished
 * Stripe" both take effect on next load). See account-status-step2 spec §3 triggers (b)+(c).
 *
 * AUTHORITATIVE READ ON THE USER'S OWN TOKEN: we use the request-scoped Marketplace SDK
 * (getSdk) to read the caller's own currentUser + denormalised Stripe account — the same
 * source the client UI reads — then hand the computed Verified boolean + userId to the
 * reconcile core, which performs the operator-only listing write via the Integration API.
 *
 * FAIL-SAFE: never blocks or errors the caller. Not logged in / not a model / feature
 * unconfigured → resolves with a benign JSON note. Mirrors the fail-open posture of the
 * other safety utilities.
 */

const { getSdk } = require('../api-util/sdk');
const modelVisibility = require('../api-util/modelVisibility');
const log = require('../log');

const MODEL_USER_TYPE = 'model';

// Pull the denormalised Stripe account resource out of an `include: ['stripeAccount']`
// currentUser response.
const getStripeAccount = showResponse => {
  const included = showResponse?.data?.included || [];
  return included.find(entry => entry.type === 'stripeAccount') || null;
};

const getStripeAccountData = showResponse =>
  getStripeAccount(showResponse)?.attributes?.stripeAccountData || null;

// The connected account id (acct_…). Canonical field is stripeAccount.attributes.stripeAccountId
// (see src/util/types.js); fall back to the id on the raw Stripe Account object.
const getStripeAccountId = showResponse => {
  const stripeAccount = getStripeAccount(showResponse);
  return (
    stripeAccount?.attributes?.stripeAccountId ||
    stripeAccount?.attributes?.stripeAccountData?.id ||
    null
  );
};

module.exports = (req, res) => {
  const respond = payload => {
    if (res.headersSent) {
      return;
    }
    res
      .status(200)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload))
      .end();
  };

  const sdk = getSdk(req, res);

  sdk.currentUser
    .show({ include: ['stripeAccount'] })
    .then(showResponse => {
      const user = showResponse?.data?.data;
      const userId = user?.id?.uuid;
      const userType = user?.attributes?.profile?.publicData?.userType;
      const userState = user?.attributes?.state;

      // Only models have a discoverable listing to reconcile. Clients/edge roles: no-op.
      if (userType !== MODEL_USER_TYPE || !userId) {
        return respond({ reconciled: false, skipped: true, why: 'not-a-model' });
      }

      const stripeAccountData = getStripeAccountData(showResponse);
      const stripeAccountId = getStripeAccountId(showResponse);
      const verified = modelVisibility.computeModelVerified({ userState, stripeAccountData });

      // Passing stripeAccountId stamps the durable acct→listing link (idempotent, only when
      // missing/changed) so the Connect webhook can later map the account back to this model.
      return modelVisibility
        .reconcileModelListingVisibility({
          userId,
          verified,
          reason: 'own-session',
          stripeAccountId,
        })
        .then(result => respond(result));
    })
    .catch(e => {
      // Not authenticated (no session) is expected + harmless — treat as a benign no-op
      // rather than an error, so an anonymous page load never surfaces a failure.
      const status = e?.status || e?.statusCode;
      if (status === 401 || status === 403) {
        return respond({ reconciled: false, skipped: true, why: 'not-authenticated' });
      }
      log.error(e, 'acct-status-own-session-reconcile-failed');
      // Still fail-safe: do not break the caller's page. Return a benign note.
      return respond({ reconciled: false, skipped: false, why: 'error' });
    });
};
