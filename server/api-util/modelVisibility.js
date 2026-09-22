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
 * ACCT → MODEL MAPPING (Connect webhook): the connected Stripe account id is stamped onto
 * the model's listing publicData (`pub_stripeAccountId`) during the own-session reconcile,
 * where the model is authenticated and we can read their account id. The Connect webhook
 * then resolves `acct_…` → model by querying that listing via the Integration API (which,
 * unlike the Marketplace API, can filter listings by publicData in any state). This removes
 * the earlier reliance on unconfirmed Stripe metadata (kept only as a last-resort fallback
 * for the narrow window before a model has ever loaded their dashboard).
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

// The listing publicData key that stores the connected Stripe account id. This is the
// DURABLE acct→listing link the Connect webhook uses to map an `acct_…` back to a model
// (queryable via the Integration API as `pub_stripeAccountId`), replacing the earlier
// unconfirmed Stripe-metadata guess. Stamped on the own-session reconcile (see
// stampStripeAccountId): the model is authenticated there and we can read their account id.
const STRIPE_ACCOUNT_ID_PUBLIC_DATA_KEY = 'stripeAccountId';

const pickModelListing = listings => {
  const arr = listings || [];
  // A model has a single model-profile listing; prefer that type, else the first.
  const modelListing = arr.find(
    l => l?.attributes?.publicData?.listingType === MODEL_LISTING_TYPE
  );
  return modelListing || arr[0] || null;
};

const getListingId = listing => listing?.id?.uuid || listing?.id || null;

/**
 * Find a user's model-profile listing via the Integration API (any state).
 * @param {Object} integrationSdk
 * @param {string} userId
 * @returns {Promise<Object|null>} the listing resource, or null if none
 */
const findModelListing = (integrationSdk, userId) =>
  integrationSdk.listings.query({ authorId: userId }).then(res => pickModelListing(res?.data?.data));

/**
 * Find the model-profile listing carrying a given Stripe connected account id, via the
 * Integration API publicData filter (`pub_stripeAccountId`). The Integration API returns
 * listings in ALL states (draft/pendingApproval/published/closed), so this resolves the
 * model even while their listing is hidden. The author relationship id is present without
 * an `include`, so the caller can read `relationships.author.data.id.uuid`.
 *
 * @param {Object} integrationSdk
 * @param {string} stripeAccountId - the connected account id (acct_…)
 * @returns {Promise<Object|null>} the listing resource, or null if none
 */
const findListingByStripeAccountId = (integrationSdk, stripeAccountId) =>
  integrationSdk.listings
    .query({ [`pub_${STRIPE_ACCOUNT_ID_PUBLIC_DATA_KEY}`]: stripeAccountId })
    .then(res => pickModelListing(res?.data?.data));

/**
 * Idempotently stamp the connected Stripe account id onto a model's listing publicData —
 * the durable acct→listing link the Connect webhook resolves against. Only writes when the
 * id is missing or has changed; a match is a no-op. Best-effort: a stamp failure is logged
 * but never propagated (it must not block the visibility transition, e.g. hiding a lapse).
 *
 * @param {Object} integrationSdk
 * @param {Object} listing - the model's listing resource (already fetched)
 * @param {string} stripeAccountId - the connected account id (acct_…)
 * @param {Object} ctx - log context ({ userId, reason })
 * @returns {Promise<{stamped: boolean, why?: string}>}
 */
const stampStripeAccountId = (integrationSdk, listing, stripeAccountId, ctx = {}) => {
  if (!stripeAccountId) {
    return Promise.resolve({ stamped: false, why: 'no-acct-id' });
  }
  const listingId = getListingId(listing);
  const current = listing?.attributes?.publicData?.[STRIPE_ACCOUNT_ID_PUBLIC_DATA_KEY] || null;
  if (current === stripeAccountId) {
    return Promise.resolve({ stamped: false, why: 'already-stamped' });
  }
  return integrationSdk.listings
    .update({ id: listingId, publicData: { [STRIPE_ACCOUNT_ID_PUBLIC_DATA_KEY]: stripeAccountId } })
    .then(() => {
      log.error(
        new Error('Account-status reconcile stamped stripeAccountId on listing'),
        'acct-status-stamp-applied',
        { ...ctx, listingId, stripeAccountId }
      );
      return { stamped: true };
    })
    .catch(err => {
      log.error(err, 'acct-status-stamp-failed', { ...ctx, listingId });
      return { stamped: false, why: 'error' };
    });
};

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
 * @param {string} [params.stripeAccountId] - the model's connected Stripe account id. When
 *   present it is stamped onto the listing's publicData (idempotently) so the Connect
 *   webhook can later map the account back to this model. Typically supplied by the
 *   own-session reconcile (the model is authenticated → we can read their account id).
 * @returns {Promise<Object>} { reconciled, action, listingId, from, to, reason, skipped, stamped }
 */
const reconcileModelListingVisibility = ({
  userId,
  verified,
  reason = 'unspecified',
  stripeAccountId = null,
} = {}) => {
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
      const listingId = getListingId(listing);
      const from = listing.attributes?.state;

      // Stamp the durable acct→listing link first (idempotent, best-effort). Doing it
      // before the transition means the mapping is in place even if the transition
      // errors — the webhook can then still resolve this model on a later event.
      return stampStripeAccountId(integrationSdk, listing, stripeAccountId, { userId, reason }).then(
        stampResult => {
          const stamped = stampResult.stamped === true;
          const action = decideTransition(from, verified);

          if (!action) {
            // Already in the correct visibility state — idempotent no-op.
            return {
              reconciled: false,
              skipped: false,
              action: null,
              listingId,
              from,
              verified,
              reason,
              stamped,
            };
          }

          const opById = { id: listingId };
          const op =
            action === 'approve'
              ? integrationSdk.listings.approve(opById)
              : action === 'open'
              ? integrationSdk.listings.open(opById)
              : integrationSdk.listings.close(opById);

          return op.then(() => {
            const to = action === 'close' ? LISTING_STATE_CLOSED : LISTING_STATE_PUBLISHED;
            log.error(
              new Error('Account-status reconcile applied a visibility change'),
              'acct-status-reconcile-applied',
              { userId, listingId, action, from, to, verified, reason }
            );
            return { reconciled: true, action, listingId, from, to, verified, reason, stamped };
          });
        }
      );
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

// LAST-RESORT FALLBACK ONLY. The primary acct→user mapping is now the durable listing link
// (findListingByStripeAccountId, keyed on pub_stripeAccountId — stamped on the own-session
// reconcile). These candidate metadata keys are where a Sharetribe user id MIGHT ALSO live
// on the connected Stripe account, but it is NOT confirmed Sharetribe sets any of them; the
// listing lookup is authoritative. Kept only to cover the narrow window before a model has
// ever loaded their dashboard (so the listing is not yet stamped). On a miss the webhook
// logs loudly and acknowledges WITHOUT a write.
const USER_ID_METADATA_KEYS = ['sharetribe-user-id', 'sharetribeUserId', 'user_id', 'userId'];

/**
 * Best-effort resolution of a Sharetribe user id from a Connect `account.updated` event's
 * Stripe metadata. Fallback only — see resolveUserIdFromConnectEvent's callers.
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
 * Resolve the Sharetribe user (model) for a Connect account id — PRIMARY PATH. Queries the
 * model-profile listing carrying `pub_stripeAccountId === accountId` and returns its author
 * id. Falls back to the (unconfirmed) Stripe-metadata guess only when no stamped listing is
 * found. Never throws.
 *
 * @param {Object} integrationSdk
 * @param {Object} event - the parsed Stripe event
 * @param {string} accountId - the connected account id (acct_…)
 * @returns {Promise<{userId: string|null, via: string}>}
 */
const resolveUserForConnectAccount = (integrationSdk, event, accountId) => {
  const metadataUserId = () => ({ userId: resolveUserIdFromConnectEvent(event), via: 'metadata' });
  if (!accountId) {
    return Promise.resolve(metadataUserId());
  }
  return findListingByStripeAccountId(integrationSdk, accountId)
    .then(listing => {
      const authorId = listing?.relationships?.author?.data?.id?.uuid || null;
      if (authorId) {
        return { userId: authorId, via: 'listing' };
      }
      // No stamped listing yet (e.g. model never loaded their dashboard) → fallback.
      return metadataUserId();
    })
    .catch(err => {
      log.error(err, 'acct-status-connect-listing-lookup-failed', { accountId });
      return metadataUserId();
    });
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
  const accountId = event?.account || account?.id || null;

  const integrationSdk = getIntegrationSdk();
  if (!integrationSdk) {
    log.error(
      new Error('Account-status reconcile inactive: Integration credentials missing'),
      'acct-status-reconcile-inactive',
      { accountId, reason: 'connect-webhook' }
    );
    return Promise.resolve({ reconciled: false, skipped: true, why: 'not-configured' });
  }

  // PRIMARY: map acct_… → model via the durable listing link (pub_stripeAccountId). Falls
  // back to the (unconfirmed) Stripe-metadata guess only if no stamped listing exists yet.
  return resolveUserForConnectAccount(integrationSdk, event, accountId).then(({ userId, via }) => {
    if (!userId) {
      // No listing stamped and no usable metadata → cannot map. Log loudly, no write.
      log.error(
        new Error('Connect webhook could not map account → Sharetribe user (no stamped listing)'),
        'acct-status-connect-no-user',
        { accountId }
      );
      return Promise.resolve({ reconciled: false, skipped: true, why: 'no-user-mapping' });
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
        // Pass the account id so the listing stays stamped (idempotent no-op via the
        // listing path; a real stamp if we resolved via the metadata fallback).
        return reconcileModelListingVisibility({
          userId,
          verified,
          reason: `connect-webhook:${via}`,
          stripeAccountId: accountId,
        });
      })
      .catch(err => {
        log.error(err, 'acct-status-connect-user-lookup-failed', { userId });
        return { reconciled: false, skipped: false, why: 'error' };
      });
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
  resolveUserForConnectAccount,
  findListingByStripeAccountId,
  stampStripeAccountId,
  MODEL_LISTING_TYPE,
  MODEL_USER_TYPE,
  STRIPE_ACCOUNT_ID_PUBLIC_DATA_KEY,
};
