/**
 * server/api-util/resubmitForReview.js
 * ---------------------------------------------------------------------------
 * Resubmit after a decline (account-status amendment 30/09/2026).
 *
 * Gate A is the operator-set user metadata `reviewDecision`. Users cannot write metadata, so
 * when a declined user fixes their profile / business details and resubmits, this server
 * writes on their behalf via the Integration API. It is deliberately the SMALLEST possible
 * write, with one allowed transition:
 *
 *   reviewDecision === 'declined'  →  cleared (null) = back to Pending approval
 *
 * It can NEVER set 'approved' (or any other value): the only value it ever writes to
 * reviewDecision is null, and only when the stored value is exactly 'declined'.
 *   - no decision (missing / null)  → 200 no-op (idempotent: a second call changes nothing)
 *   - 'approved' or anything else   → 409 refused, nothing written
 *
 * Alongside the decision it clears, in the same single write:
 *   - metadata.reviewDecisionEmailed, so a later decision (even another decline) is emailed
 *     again by the decision-email job (api-util/decisionEmails.js);
 *   - privateData.rejectionReason, so a later decline without a new note shows the general
 *     line rather than the old note.
 *
 * WHOSE ACCOUNT: the caller passes the session user resolved server-side from the request's
 * own token (server/api/resubmit-for-review.js). No account id is ever taken from the client.
 *
 * FAIL-SAFE: without Integration creds the feature is inactive (503 not-configured). A write
 * failure is a 500 and changes nothing.
 *
 * ⚠️ TEST MARKETPLACE ONLY (ndstealth1-test).
 */

const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');
const {
  REVIEW_DECISION_METADATA_KEY,
  REVIEW_DECISION_DECLINED,
  REVIEW_DECISION_EMAILED_METADATA_KEY,
  REJECTION_REASON_PRIVATE_DATA_KEY,
} = require('./reviewDecision');
const log = require('../log');

let integrationSdkInstance = null;
const getIntegrationSdk = () => {
  const clientId = process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
  const clientSecret = process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  if (!integrationSdkInstance) {
    integrationSdkInstance = flexIntegrationSdk.createInstance({ clientId, clientSecret });
  }
  return integrationSdkInstance;
};

/**
 * The single write this module can make. Exported for tests so the exact payload is pinned.
 * @param {string} userId
 * @returns {Object} Integration API users.updateProfile params
 */
const buildResubmitUpdate = userId => ({
  id: userId,
  metadata: {
    [REVIEW_DECISION_METADATA_KEY]: null,
    [REVIEW_DECISION_EMAILED_METADATA_KEY]: null,
  },
  privateData: { [REJECTION_REASON_PRIVATE_DATA_KEY]: null },
});

/**
 * Clear a 'declined' review decision for the given (already authenticated) user.
 * Never throws; resolves to { status, body } for the endpoint to send.
 *
 * @param {Object} params
 * @param {Object} params.user - the session user's own currentUser resource
 * @param {Object} [params.sdk] - inject an Integration SDK (tests)
 * @returns {Promise<{status: number, body: Object}>}
 */
const resubmitDeclinedReview = ({ user, sdk } = {}) => {
  const userId = user?.id?.uuid;
  if (!userId) {
    return Promise.resolve({ status: 401, body: { error: 'unauthorized' } });
  }

  // Read the RAW stored value: only the exact string 'declined' may be cleared.
  const stored = user?.attributes?.profile?.metadata?.[REVIEW_DECISION_METADATA_KEY];

  if (stored === undefined || stored === null) {
    // Already pending (never decided, or resubmitted before): idempotent no-op.
    return Promise.resolve({
      status: 200,
      body: { ok: true, resubmitted: false, reviewDecision: null },
    });
  }

  if (stored !== REVIEW_DECISION_DECLINED) {
    // 'approved' or an unrecognised value: never touched by this endpoint.
    log.error(
      new Error('Resubmit refused: review decision is not declined'),
      'resubmit-review-refused',
      { userId }
    );
    return Promise.resolve({ status: 409, body: { error: 'not-declined' } });
  }

  const integrationSdk = sdk || getIntegrationSdk();
  if (!integrationSdk) {
    log.error(
      new Error('Resubmit for review inactive: Integration credentials missing'),
      'resubmit-review-not-configured',
      { userId }
    );
    return Promise.resolve({ status: 503, body: { error: 'not-configured' } });
  }

  return integrationSdk.users
    .updateProfile(buildResubmitUpdate(userId))
    .then(() => {
      log.error(
        new Error('Declined account resubmitted for review (decision cleared)'),
        'resubmit-review-applied',
        { userId }
      );
      return { status: 200, body: { ok: true, resubmitted: true, reviewDecision: null } };
    })
    .catch(err => {
      log.error(err, 'resubmit-review-write-failed', { userId });
      return { status: 500, body: { error: 'resubmit-failed' } };
    });
};

module.exports = {
  resubmitDeclinedReview,
  buildResubmitUpdate,
};
