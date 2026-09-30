/**
 * server/api-util/reviewDecision.js
 * ---------------------------------------------------------------------------
 * Gate A (manual review) on the SERVER, after the account-status amendment of 30/09/2026
 * (docs/specs/account-status-lifecycle.md, "Amendment 30/09/2026").
 *
 * Gate A is the operator-set user METADATA key `reviewDecision`:
 *   'approved'  the operator approved the account at review
 *   'declined'  the operator declined it (the user may resubmit, which clears the decision)
 *   anything else (missing, null, a typo) = no decision = NOT approved
 * Only the operator (Console) or this server (Integration API) can write metadata, so a user can
 * never approve themselves. Sharetribe user approval stays OFF, so every user is 'active' from
 * sign-up and the user state on its own no longer means "approved". A ban (state 'banned') is
 * still the separate Suspended path.
 *
 * FLAG: the new requirement is behind the same switch as the rest of the lifecycle,
 * REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED === 'true' (read at runtime from the server's env; the
 * same Railway variable that is baked into the client bundle). With the flag OFF every server
 * gate keeps today's exact behaviour (Gate A = user state 'active'), so nothing changes on the
 * test env until the cutover. With the flag ON, Gate A = 'active' AND reviewDecision ===
 * 'approved': strictly narrower than before, never wider.
 *
 * Mirrors src/util/accountStatus.js getReviewDecision (frontend ES module, which this CommonJS
 * runtime cannot require). Keep the two in lockstep.
 */

const REVIEW_DECISION_METADATA_KEY = 'reviewDecision';
const REVIEW_DECISION_APPROVED = 'approved';
const REVIEW_DECISION_DECLINED = 'declined';

// Which decision the decision-email job last emailed (metadata; see decisionEmails.js).
const REVIEW_DECISION_EMAILED_METADATA_KEY = 'reviewDecisionEmailed';

// The operator's optional decline note (PRIVATE data: visible to the user and operator only).
const REJECTION_REASON_PRIVATE_DATA_KEY = 'rejectionReason';

const USER_STATE_ACTIVE = 'active';

/**
 * Is the account-status lifecycle switched on for this server process?
 * @returns {boolean}
 */
const isAccountStatusFlowEnabled = () =>
  process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED === 'true';

/**
 * The review decision on a Sharetribe user resource (Marketplace or Integration API shape).
 * Unrecognised values are treated as no decision, so a typo can never read as approved.
 *
 * @param {Object} user - a user / currentUser resource
 * @returns {'approved'|'declined'|null}
 */
const getReviewDecision = user => {
  const decision = user?.attributes?.profile?.metadata?.[REVIEW_DECISION_METADATA_KEY];
  return decision === REVIEW_DECISION_APPROVED || decision === REVIEW_DECISION_DECLINED
    ? decision
    : null;
};

/**
 * THE server Gate A predicate, from raw fields. Pure when `flowEnabled` is passed explicitly.
 *   flag OFF: userState === 'active'                                   (unchanged, pre-amendment)
 *   flag ON:  userState === 'active' AND reviewDecision === 'approved'  (amendment 30/09/2026)
 *
 * @param {Object} params
 * @param {string} [params.userState] - the Sharetribe user state
 * @param {string|null} [params.reviewDecision] - getReviewDecision(user)
 * @param {boolean} [params.flowEnabled] - defaults to isAccountStatusFlowEnabled()
 * @returns {boolean}
 */
const isGateAPassed = ({
  userState,
  reviewDecision,
  flowEnabled = isAccountStatusFlowEnabled(),
} = {}) => {
  const active = userState === USER_STATE_ACTIVE;
  if (!flowEnabled) {
    return active;
  }
  return active && reviewDecision === REVIEW_DECISION_APPROVED;
};

/**
 * Convenience wrapper: Gate A for a whole user resource.
 * @param {Object} user - a user / currentUser resource
 * @param {Object} [options] - { flowEnabled }
 * @returns {boolean}
 */
const isUserGateAPassed = (user, { flowEnabled } = {}) =>
  isGateAPassed({
    userState: user?.attributes?.state,
    reviewDecision: getReviewDecision(user),
    ...(flowEnabled === undefined ? {} : { flowEnabled }),
  });

module.exports = {
  isAccountStatusFlowEnabled,
  getReviewDecision,
  isGateAPassed,
  isUserGateAPassed,
  REVIEW_DECISION_METADATA_KEY,
  REVIEW_DECISION_APPROVED,
  REVIEW_DECISION_DECLINED,
  REVIEW_DECISION_EMAILED_METADATA_KEY,
  REJECTION_REASON_PRIVATE_DATA_KEY,
  USER_STATE_ACTIVE,
};
