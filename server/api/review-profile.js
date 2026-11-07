/**
 * server/api/review-profile.js
 * ---------------------------------------------------------------------------
 * GET /api/review/user/:userId (review tool stage 1, R02 model / R04 client). One person's
 * profile and review facts, as an allow-listed copy (api-util/reviewProfile.js). READ-ONLY.
 *
 * AUTH: reviewers and admins only, resolved from the caller's own session on every request
 * (api-util/reviewerRoles.js). Everyone else gets the identical 404 for real and made-up ids
 * alike, and the target is never looked up for them.
 *
 * Responses (reviewers only):
 *   200 { kind: 'model' | 'client', ... } or { kind: 'not-waiting' } (unknown id, banned,
 *       deleted, staff, or not submitted: R07 state 4)
 *   503 { error: 'not-configured' } / { error: 'busy' }
 *   500 { error: 'review-profile-failed' }
 *
 * ⚠️ TEST MARKETPLACE ONLY (ndstealth1-test).
 */

const log = require('../log');
const { withReviewerAccess, sendReviewJson } = require('../api-util/reviewerRoles');
const { getIntegrationSdk, isRateLimited } = require('../api-util/reviewQueue');
const { loadReviewProfile } = require('../api-util/reviewProfile');

module.exports = withReviewerAccess((req, res) => {
  const integrationSdk = getIntegrationSdk();
  if (!integrationSdk) {
    return sendReviewJson(res, 503, { error: 'not-configured', status: 503 });
  }
  const userId = req.params?.userId;
  return loadReviewProfile({ integrationSdk, userId })
    .then(payload => sendReviewJson(res, 200, payload))
    .catch(e => {
      if (isRateLimited(e)) {
        return sendReviewJson(res, 503, { error: 'busy', status: 503 });
      }
      log.error(e, 'review-profile-failed', { userId });
      return sendReviewJson(res, 500, { error: 'review-profile-failed', status: 500 });
    });
});
