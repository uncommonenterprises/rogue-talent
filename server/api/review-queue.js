/**
 * server/api/review-queue.js
 * ---------------------------------------------------------------------------
 * GET /api/review/queue (review tool stage 1, R01). The people waiting for a review decision,
 * oldest first. READ-ONLY: nothing is written to the marketplace.
 *
 * AUTH: reviewers and admins only, resolved from the caller's own session on every request
 * (api-util/reviewerRoles.js). Everyone else gets the identical 404 and nothing is read.
 *
 * Responses (reviewers only):
 *   200 the queue (api-util/reviewQueue.js buildQueue), cached for 30 seconds
 *   503 { error: 'not-configured' }  Integration credentials missing
 *   503 { error: 'busy' }            Sharetribe rate limit hit; try again shortly
 *   500 { error: 'review-queue-failed' }
 *
 * ⚠️ TEST MARKETPLACE ONLY (ndstealth1-test).
 */

const { withReviewerAccess, sendReviewJson } = require('../api-util/reviewerRoles');
const { getIntegrationSdk, getQueue, isRateLimited } = require('../api-util/reviewQueue');

module.exports = withReviewerAccess((req, res) => {
  const integrationSdk = getIntegrationSdk();
  if (!integrationSdk) {
    return sendReviewJson(res, 503, { error: 'not-configured', status: 503 });
  }
  return getQueue({ integrationSdk })
    .then(queue => sendReviewJson(res, 200, queue))
    .catch(e =>
      isRateLimited(e)
        ? sendReviewJson(res, 503, { error: 'busy', status: 503 })
        : sendReviewJson(res, 500, { error: 'review-queue-failed', status: 500 })
    );
});
