/**
 * server/api-util/reviewerRoles.js
 * ---------------------------------------------------------------------------
 * Review tool (stage 1): who may use it. See docs/specs/review-tool-spike.md §1.
 *
 *   Admins     REVIEW_ADMIN_USER_IDS, a comma-separated list of Sharetribe user ids, held in
 *              Railway / the gitignored .env only. It cannot be granted through the website, so
 *              a compromised reviewer account can never make itself an admin.
 *   Reviewers  the operator-only user METADATA key `roles` contains "reviewer". Metadata can only
 *              be written by the operator (Console) or this server (Integration API), never by the
 *              user, so a role cannot be self-granted. (Metadata is publicly readable, which is why
 *              reviewers are dedicated staff accounts; see the spike §1.4.)
 *
 * Admins can do everything a reviewer can. Every review endpoint resolves the caller from the
 * request's OWN session token (sdk.currentUser.show) and re-checks access on every request: no
 * caching and no user id is ever taken from the browser for "who am I". Removing a role takes
 * effect on the reviewer's very next request.
 *
 * NO-ACCESS RESPONSE: anyone without access (logged out, a model, a client, a banned account, or
 * the tool switched off) gets ONE identical 404 response, whatever id they asked for, and nothing
 * about the target is read before the check. So the endpoints cannot be used to find out whether
 * a person exists or that a review tool exists (R07 state 1).
 *
 * FLAG: the tool is part of the account-status lifecycle and is only on when
 * REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED === 'true' (api-util/reviewDecision.js). Off = 404 for all.
 *
 * ⚠️ TEST MARKETPLACE ONLY (ndstealth1-test).
 */

const { getSdk } = require('./sdk');
const { isAccountStatusFlowEnabled } = require('./reviewDecision');
const log = require('../log');

const ROLES_METADATA_KEY = 'roles';
const REVIEWER_ROLE = 'reviewer';

const NO_ACCESS_STATUS = 404;
// The one body every caller without access gets (also embeds the status, because the web app's
// fetch helper only passes the JSON body on to the page).
const NO_ACCESS_BODY = Object.freeze({ error: 'not-found', status: NO_ACCESS_STATUS });

/**
 * Parse the admin allow-list. Comma or whitespace separated; blanks ignored; compared lower-case
 * (Sharetribe ids are UUIDs).
 *
 * @param {string} [raw] - the REVIEW_ADMIN_USER_IDS value
 * @returns {Set<string>}
 */
const parseAdminUserIds = raw =>
  new Set(
    String(raw || '')
      .split(/[\s,]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  );

/**
 * The current admin allow-list, read from the environment on every call (no caching).
 * @returns {Set<string>}
 */
const getAdminUserIds = () => parseAdminUserIds(process.env.REVIEW_ADMIN_USER_IDS);

/**
 * Is this user id on the admin allow-list?
 * @param {string} userId
 * @returns {boolean}
 */
const isAdminUserId = userId =>
  typeof userId === 'string' && userId.length > 0 && getAdminUserIds().has(userId.toLowerCase());

/**
 * The roles on a user resource (Marketplace or Integration API shape). Only strings count.
 * @param {Object} user
 * @returns {Array<string>}
 */
const getRoles = user => {
  const roles = user?.attributes?.profile?.metadata?.[ROLES_METADATA_KEY];
  return Array.isArray(roles) ? roles.filter(r => typeof r === 'string') : [];
};

/**
 * Does this user hold the reviewer role?
 * @param {Object} user
 * @returns {boolean}
 */
const isReviewerUser = user => getRoles(user).includes(REVIEWER_ROLE);

/**
 * Is this a staff account (reviewer role or admin)? Staff accounts never appear in the queue.
 * @param {Object} user
 * @returns {boolean}
 */
const isStaffUser = user => isReviewerUser(user) || isAdminUserId(user?.id?.uuid);

const isBlockedAccount = user => {
  const attrs = user?.attributes || {};
  return attrs.banned === true || attrs.deleted === true || attrs.state === 'banned';
};

/**
 * Pure access decision for a resolved session user.
 *
 * @param {Object|null} user - the caller's own currentUser resource (null when logged out)
 * @param {Object} [options]
 * @param {boolean} [options.toolEnabled] - defaults to the account-status flag
 * @returns {{allowed: boolean, userId: (string|null), isAdmin: boolean, isReviewer: boolean}}
 */
const getReviewAccess = (user, { toolEnabled = isAccountStatusFlowEnabled() } = {}) => {
  const userId = user?.id?.uuid || null;
  const none = { allowed: false, userId, isAdmin: false, isReviewer: false };
  if (!toolEnabled || !userId || isBlockedAccount(user)) {
    return none;
  }
  const isAdmin = isAdminUserId(userId);
  const isReviewer = isReviewerUser(user);
  return { allowed: isAdmin || isReviewer, userId, isAdmin, isReviewer };
};

/**
 * Resolve the caller from their own session and decide access. Never throws.
 * A missing or expired session is "no access", the same as a non-reviewer.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} [options]
 * @param {Function} [options.getSdkFn] - inject getSdk (tests)
 * @returns {Promise<{allowed: boolean, userId: (string|null), isAdmin: boolean, isReviewer: boolean, failed?: boolean}>}
 */
const resolveReviewer = (req, res, { getSdkFn = getSdk } = {}) => {
  if (!isAccountStatusFlowEnabled()) {
    // Tool off: do not even call the Marketplace API.
    return Promise.resolve(getReviewAccess(null, { toolEnabled: false }));
  }
  let sdk;
  try {
    sdk = getSdkFn(req, res);
  } catch (e) {
    log.error(e, 'review-access-sdk-failed');
    return Promise.resolve({ ...getReviewAccess(null), failed: true });
  }
  return sdk.currentUser
    .show()
    .then(response => getReviewAccess(response?.data?.data || null))
    .catch(e => {
      const status = e?.status || e?.statusCode;
      if (status === 401 || status === 403) {
        return getReviewAccess(null);
      }
      log.error(e, 'review-access-check-failed');
      return { ...getReviewAccess(null), failed: true };
    });
};

/**
 * Send a JSON response with the headers every review endpoint uses: never cached (personal data),
 * never indexed.
 *
 * @param {Object} res
 * @param {number} status
 * @param {Object} body
 */
const sendReviewJson = (res, status, body) => {
  if (res.headersSent) {
    return;
  }
  res
    .status(status)
    .set('Content-Type', 'application/json')
    .set('Cache-Control', 'no-store')
    .set('X-Robots-Tag', 'noindex, nofollow')
    .send(JSON.stringify(body))
    .end();
};

/**
 * The single no-access response.
 * @param {Object} res
 */
const sendNoAccess = res => sendReviewJson(res, NO_ACCESS_STATUS, NO_ACCESS_BODY);

/**
 * Wrap a review endpoint: resolve + check the caller first, and only call the handler for
 * reviewers and admins. Everyone else gets the identical no-access response, and the handler
 * (which is where anything about the target is read) never runs.
 *
 * @param {Function} handler - (req, res, access) => Promise|void
 * @param {Object} [options] - passed to resolveReviewer (tests)
 * @returns {Function} an Express handler
 */
const withReviewerAccess = (handler, options) => (req, res) =>
  resolveReviewer(req, res, options).then(access => {
    if (access.failed) {
      // We could not tell who the caller is (Marketplace API error). Nothing about the target
      // has been read, so this reveals nothing; it just asks them to try again.
      return sendReviewJson(res, 503, { error: 'unavailable', status: 503 });
    }
    if (!access.allowed) {
      return sendNoAccess(res);
    }
    return handler(req, res, access);
  });

module.exports = {
  ROLES_METADATA_KEY,
  REVIEWER_ROLE,
  NO_ACCESS_STATUS,
  NO_ACCESS_BODY,
  parseAdminUserIds,
  getAdminUserIds,
  isAdminUserId,
  getRoles,
  isReviewerUser,
  isStaffUser,
  getReviewAccess,
  resolveReviewer,
  sendReviewJson,
  sendNoAccess,
  withReviewerAccess,
};
