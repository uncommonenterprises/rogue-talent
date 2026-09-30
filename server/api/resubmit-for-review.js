/**
 * server/api/resubmit-for-review.js
 * ---------------------------------------------------------------------------
 * POST /api/resubmit-for-review (account-status amendment 30/09/2026).
 *
 * A declined user (model: screen 17 "Resubmit for approval"; client: submitting business
 * details again) asks to go back to Pending approval. The only effect is clearing their own
 * metadata reviewDecision when it is exactly 'declined'; see
 * api-util/resubmitForReview.js for the full rules. It can never approve anyone.
 *
 * AUTH: the logged-in user's own account only. The account is resolved server-side from the
 * request's session token (sdk.currentUser.show); no account id is accepted from the client.
 * If a body tries to name a different user, the request is refused (403) and nothing is read
 * or written for that user. Not logged in → 401.
 *
 * ⚠️ TEST MARKETPLACE ONLY (ndstealth1-test).
 */

const { getSdk } = require('../api-util/sdk');
const { resubmitDeclinedReview } = require('../api-util/resubmitForReview');
const log = require('../log');

module.exports = (req, res) => {
  const respond = (status, payload) => {
    if (res.headersSent) {
      return;
    }
    res
      .status(status)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload))
      .end();
  };

  const requestedUserId = req.body?.userId;
  const sdk = getSdk(req, res);

  return sdk.currentUser
    .show()
    .then(response => {
      const user = response?.data?.data;
      const userId = user?.id?.uuid;
      if (!userId) {
        return respond(401, { error: 'unauthorized' });
      }
      if (requestedUserId !== undefined && requestedUserId !== userId) {
        // Never act on another account, whatever the client sends.
        log.error(
          new Error('Resubmit refused: request named a different user'),
          'resubmit-review-other-user',
          { userId }
        );
        return respond(403, { error: 'forbidden' });
      }
      return resubmitDeclinedReview({ user }).then(({ status, body }) => respond(status, body));
    })
    .catch(e => {
      const status = e?.status || e?.statusCode;
      if (status === 401 || status === 403) {
        return respond(401, { error: 'unauthorized' });
      }
      log.error(e, 'resubmit-review-failed');
      return respond(500, { error: 'resubmit-failed' });
    });
};
