import { LISTING_STATE_PENDING_APPROVAL, LISTING_STATE_PUBLISHED } from './types';
import { isClientUser, isClientIdentityVerified } from './userHelpers';
import { hasSubmittedBusinessDetails } from './clientBusinessDetails';

/**
 * Account-status lifecycle — computed status for a single account.
 * See docs/specs/account-status-lifecycle.md (§4 status function, §6 per-side criteria, and the
 * "Amendment 30/09/2026" block: Gate A is an operator-set review decision).
 *
 * One lifecycle is shared by both user types (model / client). The status is a LIVE
 * computation from the operator's review decision + Gate B verification + a submission signal +
 * the Sharetribe ban state, never a stored stamp (so e.g. a model whose Stripe payouts lapse
 * drops out of Verified automatically; see spec §4).
 */

// Gate A (manual review) since the 30/09/2026 amendment: an operator-only user metadata key.
// Only the operator (Console) or our server (Integration API) can write metadata. The user's own
// resubmit after a decline goes through a server endpoint that can only clear 'declined'.
export const REVIEW_DECISION_METADATA_KEY = 'reviewDecision';
export const REVIEW_DECISION_APPROVED = 'approved';
export const REVIEW_DECISION_DECLINED = 'declined';

/**
 * The operator's review decision for an account: 'approved', 'declined', or null (no decision
 * yet, or resubmitted since a decline). Any other stored value counts as no decision, so a typo
 * in Console can never read as approved.
 *
 * @param {Object} currentUser - a user/currentUser API entity
 * @returns {'approved'|'declined'|null}
 */
export const getReviewDecision = currentUser => {
  const decision = currentUser?.attributes?.profile?.metadata?.[REVIEW_DECISION_METADATA_KEY];
  return decision === REVIEW_DECISION_APPROVED || decision === REVIEW_DECISION_DECLINED
    ? decision
    : null;
};

/**
 * Was the account declined at review (and not resubmitted since)?
 * @param {Object} currentUser - a user/currentUser API entity
 * @returns {boolean}
 */
export const isReviewDeclined = currentUser =>
  getReviewDecision(currentUser) === REVIEW_DECISION_DECLINED;

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
 * Amendment 30/09/2026: the server reads the same variable, and with it ON the server gates
 * (reconcile, provider booking gate, client booking gate, verify nudge) also require the
 * operator-set metadata reviewDecision === 'approved' (server/api-util/reviewDecision.js).
 * Sharetribe's "approve users who want to join" stays OFF; the operator approves or declines
 * by setting that metadata in Console.
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
 * - Client: they pressed "Submit for approval" on the "Your business details" step (sign-up
 *   journey screen 18), which records `privateData.businessDetailsSubmittedAt` (see
 *   util/clientBusinessDetails.js). This only separates Draft from Pending approval; it is not
 *   read by any gate.
 *
 * @param {Object} params
 * @param {Object} params.currentUser - currentUser API entity
 * @param {Object} [params.ownListing] - the user's own model-profile listing entity
 * @returns {boolean}
 */
export const isAccountSubmitted = ({ currentUser, ownListing } = {}) => {
  if (isClientUser(currentUser)) {
    return hasSubmittedBusinessDetails(currentUser);
  }
  const listingState = ownListing?.attributes?.state;
  return MODEL_SUBMITTED_LISTING_STATES.includes(listingState);
};

/**
 * Compute the account status (spec §4, review-first linear flow). PURE: reads only its inputs.
 *
 * Gate A (manual review) is the operator-set user metadata `reviewDecision` (spec amendment
 * 30/09/2026), NOT the Sharetribe user state: Sharetribe user approval stays off, so every user
 * is 'active' from sign-up and 'active' on its own no longer means approved.
 *   - user.state === 'banned'          → Rejected/Suspended (the operator removed the account)
 *   - reviewDecision === 'declined'    → Rejected (not approved; resubmitting clears the decision)
 *   - reviewDecision === 'approved'    → Verified if Gate B done, else Approved
 *   - no decision                      → Pending approval if submitted, else Draft
 *                                        (regardless of Gate B: verification is banked)
 *
 * @param {Object} params
 * @param {Object} params.currentUser - currentUser API entity
 * @param {Object} [params.stripeAccount] - Stripe account entity (model Gate B)
 * @param {Object} [params.ownListing] - the user's own model-profile listing (model submission)
 * @returns {'draft'|'pending-approval'|'approved'|'verified'|'rejected'}
 */
export const getAccountStatus = ({ currentUser, stripeAccount, ownListing } = {}) => {
  if (currentUser?.attributes?.state === 'banned') {
    return ACCOUNT_STATUS_REJECTED;
  }

  const decision = getReviewDecision(currentUser);

  if (decision === REVIEW_DECISION_DECLINED) {
    return ACCOUNT_STATUS_REJECTED;
  }

  if (decision === REVIEW_DECISION_APPROVED) {
    return isAccountVerified({ currentUser, stripeAccount })
      ? ACCOUNT_STATUS_VERIFIED
      : ACCOUNT_STATUS_APPROVED;
  }

  // No review decision yet (or resubmitted since a decline).
  return isAccountSubmitted({ currentUser, ownListing })
    ? ACCOUNT_STATUS_PENDING
    : ACCOUNT_STATUS_DRAFT;
};
