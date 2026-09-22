/**
 * server/api-util/modelVisibility.js
 * ---------------------------------------------------------------------------
 * Account-status Step 2 — model listing visibility reconcile (SAFETY CORE).
 *
 * A model profile is DISCOVERABLE (in search) and BOOKABLE only when the account is
 * **Verified** — i.e. the user is `active` (Gate A / manual review passed) AND their
 * Stripe Connect account can both take charges and pay out (`charges_enabled` &&
 * `payouts_enabled`, Gate B). See docs/specs/account-status-lifecycle.md §4/§6 and
 * account-status-step2-onboarding-and-visibility.md §3.
 *
 * This module owns the mapping "Verified ⟺ listing published (visible)":
 *   - Verified   → publish the profile (pendingApproval → published, or reopen closed).
 *   - Not Verified → hide it (published → closed). The "drops out of Verified"
 *                    live-lapse guarantee (lifecycle §4).
 * The reconcile is IDEMPOTENT: it only issues a state transition when the current
 * listing state disagrees with the computed target; otherwise it is a no-op.
 *
 * WHY A SERVER RECONCILE (not manual Console publish): Sharetribe has no native
 * "quality-approved but hidden pending verification" listing state. So the operator
 * approves the USER (Gate A) and this function — not a human — owns listing publish
 * state, driven by the live Verified computation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ENV VARS NEIL MUST PROVIDE TO ACTIVATE (Railway + gitignored .env only — never
 * committed; this repo is public):
 *
 *   SHARETRIBE_INTEGRATION_CLIENT_ID / SHARETRIBE_INTEGRATION_CLIENT_SECRET
 *       Operator Integration API creds (already used by SAF-14/SAF-03). Presence of
 *       BOTH ACTIVATES the reconcile. Absent → the function is INACTIVE and fail-safe
 *       (returns a "not-configured" result + logs loudly, like residenceBoundary.js).
 *       It never crashes and never blocks the surrounding request.
 *
 *   STRIPE_CONNECT_WEBHOOK_SECRET
 *       Signing secret (whsec_...) for the Stripe Connect `account.updated` webhook
 *       endpoint (server/api/stripe-connect-webhook.js). Distinct from the Identity
 *       webhook secret. Absent → that webhook refuses every call (cannot verify
 *       authenticity); the authenticated own-session reconcile still works.
 *
 * NOTE ON THE VERIFIED PREDICATE: the client computes the same thing via
 * src/util/accountStatus.js (isStripeAccountComplete + user.state active). That module
 * is ES-module frontend code and cannot be `require`d from this CommonJS server
 * runtime, so the two-flag Stripe check + active-state check are mirrored here.
 * Keep them in lockstep if the definition ever changes.
 *
 * ⚠️ TEST MARKETPLACE ONLY (ndstealth1-test). Reconcile issues Integration-API writes
 * at runtime — that is the feature; no manual flex-cli/Console writes are involved.
 */

const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');
const stripeIdentity = require('./stripeIdentity');
const log = require('../log');

const MODEL_LISTING_TYPE = 'model-profile';
const MODEL_USER_TYPE = 'model';

// Sharetribe listing states (mirrors src/util/types.js — kept local to avoid importing
// frontend ESM into this CJS runtime).
const LISTING_STATE_DRAFT = 'draft';
const LISTING_STATE_PENDING_APPROVAL = 'pendingApproval';
const LISTING_STATE_PUBLISHED = 'published';
const LISTING_STATE_CLOSED = 'closed';

const getConnectWebhookSecret = () => process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

/**
 * Whether the reconcile feature is configured (operator Integration creds present).
 * When false the whole reconcile is inactive and fail-safe.
 * @returns {boolean}
 */
const isConfigured = () =>
  !!(
    process.env.SHARETRIBE_INTEGRATION_CLIENT_ID &&
    process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET
  );

/**
 * Whether the Connect webhook can verify signatures (signing secret present).
 * @returns {boolean}
 */
const isConnectWebhookConfigured = () => !!getConnectWebhookSecret();

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
    integrationSdkInstance = flexIntegrationSdk.createInstance({ clientId, clientSecret });
  }
  return integrationSdkInstance;
};

/**
 * The Verified predicate for a model (Gate A + Gate B), computed from raw fields.
 * Mirrors src/util/accountStatus.js (isStripeAccountComplete + active-state); see the
 * module header note on why it is not shared directly.
 *
 * @param {Object} params
 * @param {string} [params.userState] - the Sharetribe user's state ('active' when Gate A done)
 * @param {Object} [params.stripeAccountData] - the raw Stripe Account object
 *   (charges_enabled / payouts_enabled)
 * @returns {boolean}
 */
const computeModelVerified = ({ userState, stripeAccountData } = {}) => {
  const gateA = userState === 'active';
  const gateB = !!(
    stripeAccountData &&
    stripeAccountData.charges_enabled === true &&
    stripeAccountData.payouts_enabled === true
  );
  return gateA && gateB;
};

/**
 * Find a user's model-profile listing via the Integration API (any state).
 * @param {Object} integrationSdk
 * @param {string} userId
 * @returns {Promise<Object|null>} the listing resource, or null if none
 */
const findModelListing = (integrationSdk, userId) =>
  integrationSdk.listings
    .query({ authorId: userId })
    .then(res => {
      const listings = res?.data?.data || [];
      // A model has a single model-profile listing; prefer that type, else the first.
      const modelListing = listings.find(
        l => l?.attributes?.publicData?.listingType === MODEL_LISTING_TYPE
      );
      return modelListing || listings[0] || null;
    });

/**
 * Decide the transition needed to make a listing's visibility match the Verified state.
 * Pure + idempotent: returns one of 'approve' | 'open' | 'close' | null (no-op).
 *
 * @param {string} listingState - current listing state
 * @param {boolean} verified - the computed Verified state
 * @returns {('approve'|'open'|'close'|null)}
 */
const decideTransition = (listingState, verified) => {
  if (verified) {
    if (listingState === LISTING_STATE_PENDING_APPROVAL) {
      return 'approve'; // quality-approved-and-verified → make visible
    }
    if (listingState === LISTING_STATE_CLOSED) {
      return 'open'; // was hidden by an earlier lapse → re-verified, restore
    }
    return null; // already published, or still a draft (nothing to publish yet)
  }
  // Not verified → must be hidden.
  if (listingState === LISTING_STATE_PUBLISHED) {
    return 'close'; // live-lapse guarantee: hide a no-longer-verified profile
  }
  return null; // pendingApproval/closed/draft are already not-visible
};

/**
 * Reconcile a model's listing visibility to their computed Verified state. Fail-safe,
 * env-gated, idempotent. NEVER throws — resolves to a result object the caller can log.
 *
 * @param {Object} params
 * @param {string} params.userId - the model's Sharetribe user id
 * @param {boolean} params.verified - the computed Verified state (caller computes it
 *   from an authoritative source: the model's own Stripe account on their session, or
 *   the Connect webhook's account object + a user-state lookup)
 * @param {string} [params.reason] - a short trigger tag for logs (e.g. 'own-session')
 * @returns {Promise<Object>} { reconciled, action, listingId, from, to, reason, skipped }
 */
const reconcileModelListingVisibility = ({ userId, verified, reason = 'unspecified' } = {}) => {
  if (!userId) {
    return Promise.resolve({ reconciled: false, skipped: true, why: 'no-user-id', reason });
  }
  const integrationSdk = getIntegrationSdk();
  if (!integrationSdk) {
    // Inactive until provisioned. Fail-safe + loud log (mirrors SAF-14). We do NOT block
    // anything; the model simply stays hidden until reconcile is live — never the reverse.
    log.error(
      new Error('Account-status reconcile inactive: Integration credentials missing'),
      'acct-status-reconcile-inactive',
      { userId, reason }
    );
    return Promise.resolve({ reconciled: false, skipped: true, why: 'not-configured', reason });
  }

  return findModelListing(integrationSdk, userId)
    .then(listing => {
      if (!listing) {
        return { reconciled: false, skipped: true, why: 'no-listing', reason };
      }
      const listingId = listing.id?.uuid || listing.id;
      const from = listing.attributes?.state;
      const action = decideTransition(from, verified);

      if (!action) {
        // Already in the correct visibility state — idempotent no-op.
        return { reconciled: false, skipped: false, action: null, listingId, from, verified, reason };
      }

      const opById = { id: listingId };
      const op =
        action === 'approve'
          ? integrationSdk.listings.approve(opById)
          : action === 'open'
          ? integrationSdk.listings.open(opById)
          : integrationSdk.listings.close(opById);

      return op.then(() => {
        const to =
          action === 'close' ? LISTING_STATE_CLOSED : LISTING_STATE_PUBLISHED;
        log.error(
          new Error('Account-status reconcile applied a visibility change'),
          'acct-status-reconcile-applied',
          { userId, listingId, action, from, to, verified, reason }
        );
        return { reconciled: true, action, listingId, from, to, verified, reason };
      });
    })
    .catch(err => {
      // Never let reconcile break the caller. Log loudly for the operator.
      log.error(err, 'acct-status-reconcile-failed', { userId, reason });
      return { reconciled: false, skipped: false, why: 'error', reason };
    });
};

/**
 * Verify a Stripe Connect webhook event using this module's OWN signing secret
 * (STRIPE_CONNECT_WEBHOOK_SECRET). Reuses the shared, tested signature verifier.
 *
 * @param {Buffer|string} rawBody
 * @param {string} signatureHeader
 * @returns {Object} the parsed Stripe event
 * @throws {Error} if the secret is missing or the signature is invalid
 */
const constructConnectWebhookEvent = (rawBody, signatureHeader) =>
  stripeIdentity.verifyStripeWebhookSignature(rawBody, signatureHeader, getConnectWebhookSecret());

// Candidate metadata keys where a Sharetribe user id MIGHT live on the connected
// Stripe account. ⚠️ UNCERTAIN — Sharetribe creates the Custom Connect account and it
// is NOT confirmed which (if any) metadata key carries the marketplace user id. This
// must be verified against a real test connected account before the webhook path is
// relied on for the lapse-while-away case (see the developer's step-2 report). When the
// id cannot be resolved, the webhook logs loudly and acknowledges WITHOUT a write.
const USER_ID_METADATA_KEYS = ['sharetribe-user-id', 'sharetribeUserId', 'user_id', 'userId'];

/**
 * Best-effort resolution of a Sharetribe user id from a Connect `account.updated` event.
 * @param {Object} event - the parsed Stripe event
 * @returns {string|null}
 */
const resolveUserIdFromConnectEvent = event => {
  const metadata = event?.data?.object?.metadata || {};
  for (const key of USER_ID_METADATA_KEYS) {
    if (metadata[key]) {
      return metadata[key];
    }
  }
  return null;
};

/**
 * Reconcile from a Connect `account.updated` event: map the account to a Sharetribe
 * user, confirm Gate A (user active) via the Integration API, combine with the event's
 * Stripe flags (Gate B), and reconcile. Fail-safe; never throws.
 *
 * @param {Object} event - the parsed, signature-verified Stripe event
 * @returns {Promise<Object>} a reconcile result (or a skipped result)
 */
const reconcileFromConnectEvent = event => {
  const account = event?.data?.object || {};
  const userId = resolveUserIdFromConnectEvent(event);
  if (!userId) {
    log.error(
      new Error('Connect webhook could not map account → Sharetribe user (metadata gap)'),
      'acct-status-connect-no-user',
      { accountId: event?.account || account?.id || null }
    );
    return Promise.resolve({ reconciled: false, skipped: true, why: 'no-user-mapping' });
  }

  const integrationSdk = getIntegrationSdk();
  if (!integrationSdk) {
    log.error(
      new Error('Account-status reconcile inactive: Integration credentials missing'),
      'acct-status-reconcile-inactive',
      { userId, reason: 'connect-webhook' }
    );
    return Promise.resolve({ reconciled: false, skipped: true, why: 'not-configured' });
  }

  // Gate A (user state) is not in the Stripe event — look it up authoritatively.
  return integrationSdk.users
    .show({ id: userId })
    .then(res => {
      const user = res?.data?.data;
      const userState = user?.attributes?.state;
      const userType = user?.attributes?.profile?.publicData?.userType;
      // Only models have a discoverable listing to reconcile.
      if (userType && userType !== MODEL_USER_TYPE) {
        return { reconciled: false, skipped: true, why: 'not-a-model' };
      }
      const verified = computeModelVerified({ userState, stripeAccountData: account });
      return reconcileModelListingVisibility({ userId, verified, reason: 'connect-webhook' });
    })
    .catch(err => {
      log.error(err, 'acct-status-connect-user-lookup-failed', { userId });
      return { reconciled: false, skipped: false, why: 'error' };
    });
};

module.exports = {
  isConfigured,
  isConnectWebhookConfigured,
  computeModelVerified,
  decideTransition,
  reconcileModelListingVisibility,
  reconcileFromConnectEvent,
  constructConnectWebhookEvent,
  resolveUserIdFromConnectEvent,
  MODEL_LISTING_TYPE,
  MODEL_USER_TYPE,
};
