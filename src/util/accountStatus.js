import { LISTING_STATE_PENDING_APPROVAL, LISTING_STATE_PUBLISHED } from './types';
import { isClientUser, isClientIdentityVerified } from './userHelpers';

/**
 * Account-status lifecycle — computed status for a single account.
 * See docs/specs/account-status-lifecycle.md (§4 status function, §6 per-side criteria).
 *
 * One lifecycle is shared by both user types (model / client). The status is a LIVE
 * computation from Sharetribe user-state + Gate B verification + a submission signal —
 * never a stored stamp (so e.g. a model whose Stripe payouts lapse drops out of Verified
 * automatically; see spec §4).
 */

// The five lifecycle statuses (spec §3).
export const ACCOUNT_STATUS_DRAFT = 'draft';
export const ACCOUNT_STATUS_PENDING = 'pending-approval';
export const ACCOUNT_STATUS_APPROVED = 'approved';
export const ACCOUNT_STATUS_VERIFIED = 'verified';
export const ACCOUNT_STATUS_REJECTED = 'rejected';

export const ACCOUNT_STATUSES = [
  ACCOUNT_STATUS_DRAFT,
  ACCOUNT_STATUS_PENDING,
  ACCOUNT_STATUS_APPROVED,
  ACCOUNT_STATUS_VERIFIED,
  ACCOUNT_STATUS_REJECTED,
];

/**
 * Step-2 onboarding-rewire feature flag (client-visible, non-secret).
 *
 * DEFAULT OFF → today's exact behaviour: the RT-01 "Stripe before submit" modal gate in
 * EditListingWizard.handlePublishListing stays in force, and the submit CTA keeps its
 * current wording. Only when `REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED === 'true'` does the
 * new flow activate: "Submit for approval" publishes the draft (to pendingApproval when
 * listing-approval is ON in Console) WITHOUT requiring Stripe, and the server-side
 * reconcile function owns when a listing becomes visible (published ⟺ Verified).
 *
 * ⚠️ SAFETY — cutover preconditions before flipping this ON (see the step-2 spec):
 *   1. Listing-approval turned ON in the Sharetribe Console (so a submitted profile lands
 *      in pendingApproval / hidden — NOT auto-published while unverified).
 *   2. The reconcile function is live (SHARETRIBE_INTEGRATION_CLIENT_ID/SECRET present on
 *      the server) so Verified models actually get published and lapses get hidden.
 *   3. The Stripe Connect `account.updated` webhook is registered + its signing secret set.
 * Turning this ON while (1) is false would let an unverified model auto-publish (visible) —
 * never do that. The flag exists so the code can merge/deploy safely and be cut over
 * deliberately once all three are true.
 *
 * @returns {boolean}
 */
export const isAccountStatusFlowEnabled = () =>
  process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED === 'true';

/**
 * Whether a user is a model (provider). Clients are handled by isClientUser().
 * @param {Object} user - a user/currentUser API entity
 * @returns {boolean}
 */
export const isModelUser = user => user?.attributes?.profile?.publicData?.userType === 'model';

/**
 * Gate B for models: is the connected Stripe Connect account complete (identity + bank)?
 *
 * Derivation: the template denormalises the Stripe account onto `currentUser.stripeAccount`
 * (see user.duck.js `include: ['stripeAccount']`) and stores the raw Stripe Account object at
 * `stripeAccount.attributes.stripeAccountData`. Stripe exposes two top-level booleans on that
 * object — `charges_enabled` and `payouts_enabled` — which are true only once identity KYC and a
 * payout bank are both in place. The rest of the template reasons about the same object via
 * `getStripeAccountData` + a `requirements[...]`-length check (EditListingWizard/StripePayoutPage);
 * there is no pre-existing "is complete" boolean helper, so we read the two enabled flags directly,
 * which is Stripe's canonical "ready to charge and pay out" signal. This mirrors spec §6:
 * "listing published + user active + Stripe charges_enabled".
 *
 * @param {Object} [stripeAccount] - a Stripe account API entity (currentUser.stripeAccount)
 * @returns {boolean} true when the account can both accept charges and receive payouts
 */
export const isStripeAccountComplete = stripeAccount => {
  const data = stripeAccount?.attributes?.stripeAccountData;
  return !!(data && data.charges_enabled === true && data.payouts_enabled === true);
};

/**
 * Gate B (verification), per user type. LIVE computation, not a stored stamp (spec §4).
 * - Model: Stripe Connect account complete (charges_enabled && payouts_enabled).
 * - Client: `profile.metadata.identity_verified === true` (server-written Stripe Identity flag).
 *
 * @param {Object} params
 * @param {Object} params.currentUser - currentUser API entity
 * @param {Object} [params.stripeAccount] - Stripe account entity; falls back to
 *   currentUser.stripeAccount (denormalised by user.duck.js) when not passed explicitly
 * @returns {boolean}
 */
export const isAccountVerified = ({ currentUser, stripeAccount } = {}) => {
  if (isClientUser(currentUser)) {
    return isClientIdentityVerified(currentUser);
  }
  // Models (providers) — and any non-client fallback — verify via Stripe Connect.
  const account = stripeAccount || currentUser?.stripeAccount;
  return isStripeAccountComplete(account);
};

// Listing states that mean a model has submitted their profile for review (spec §6).
const MODEL_SUBMITTED_LISTING_STATES = [LISTING_STATE_PENDING_APPROVAL, LISTING_STATE_PUBLISHED];

/**
 * Gate A submission signal (has the account been submitted for manual review?).
 * - Model: their own model-profile listing is past draft (state 'pendingApproval' | 'published').
 *   Requires the own listing to be passed in — when it is not available on the surface (e.g. the
 *   profile-settings page does not currently load it), we cannot prove submission and fall back to
 *   `false` (→ Draft), which is safe for step 1.
 * - Client: there is no client "Submit for approval" flag yet.
 *   TODO(account-status): wire the definitive client submission flag when the "Submit for approval"
 *   UX lands (later task, per spec §11 item 4). Treated as not-submitted for now.
 *
 * @param {Object} params
 * @param {Object} params.currentUser - currentUser API entity
 * @param {Object} [params.ownListing] - the user's own model-profile listing entity
 * @returns {boolean}
 */
export const isAccountSubmitted = ({ currentUser, ownListing } = {}) => {
  if (isClientUser(currentUser)) {
    // TODO(account-status): no client submission flag exists yet — later task.
    return false;
  }
  const listingState = ownListing?.attributes?.state;
  return MODEL_SUBMITTED_LISTING_STATES.includes(listingState);
};

/**
 * Compute the account status (spec §4, review-first linear flow). Gate A (manual approval) is
 * sourced from the Sharetribe user state — the only home consistent across both user types since
 * clients have no listing (spec §10 leaning):
 *   - user.state === 'banned'  → Rejected/Suspended
 *   - user.state === 'active'  → Verified if Gate B done, else Approved
 *   - otherwise (pending-approval) → Pending approval if submitted, else Draft
 *
 * @param {Object} params
 * @param {Object} params.currentUser - currentUser API entity
 * @param {Object} [params.stripeAccount] - Stripe account entity (model Gate B)
 * @param {Object} [params.ownListing] - the user's own model-profile listing (model submission)
 * @returns {'draft'|'pending-approval'|'approved'|'verified'|'rejected'}
 */
export const getAccountStatus = ({ currentUser, stripeAccount, ownListing } = {}) => {
  const state = currentUser?.attributes?.state;

  if (state === 'banned') {
    return ACCOUNT_STATUS_REJECTED;
  }

  if (state === 'active') {
    return isAccountVerified({ currentUser, stripeAccount })
      ? ACCOUNT_STATUS_VERIFIED
      : ACCOUNT_STATUS_APPROVED;
  }

  // Pending approval (Gate A not yet complete) — or state undefined.
  return isAccountSubmitted({ currentUser, ownListing })
    ? ACCOUNT_STATUS_PENDING
    : ACCOUNT_STATUS_DRAFT;
};
