/**
 * server/api/review-access.js
 * ---------------------------------------------------------------------------
 * GET /api/review/access (review tool stage 1). Lets the web app decide whether to show the
 * "Review queue" link in the nav, for admins as well as reviewers (admins are an env-var list the
 * browser cannot see). Display only: every review endpoint re-checks access itself.
 *
 * Reviewers and admins: 200 { canReview: true, isAdmin }. Everyone else (logged out, models,
 * clients, tool off): the identical 404 every review endpoint uses (api-util/reviewerRoles.js).
 * Reads nothing except the caller's own session user.
 */

const { withReviewerAccess, sendReviewJson } = require('../api-util/reviewerRoles');

module.exports = withReviewerAccess((req, res, access) =>
  sendReviewJson(res, 200, { canReview: true, isAdmin: access.isAdmin === true })
);
