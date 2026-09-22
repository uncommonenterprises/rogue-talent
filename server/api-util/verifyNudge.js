/**
 * server/api-util/verifyNudge.js
 * ---------------------------------------------------------------------------
 * Account-status Step 4 — "Approved → please verify" email nudge (lifecycle §8).
 *
 * An account that sits in the **Approved** status (Gate A / manual review passed, but
 * Gate B / verification NOT yet done) should be gently nudged to finish verification:
 *   - Models:  "You're approved — verify your identity and add your bank to become
 *              visible and get booked."
 *   - Clients: "You're approved — verify your identity to make your first booking."
 * See docs/specs/account-status-lifecycle.md §8 (the nudge) + §4 (the Approved status).
 *
 * This module owns the SWEEP: find Approved-unverified accounts via the Integration API,
 * space + cap the sends (dedup so a user is never spammed), send via Postmark (mailer.js),
 * and record the send on the user's privateData. It is triggered by a cron pinging the
 * endpoint server/api/verify-nudge.js — this module builds no scheduler.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IDENTIFYING "Approved-but-unverified" SERVER-SIDE (the Integration API has NO Stripe
 * endpoint — we cannot read a model's Stripe status directly, so we use proxies):
 *
 *   MODEL  Approved-unverified ⟺ user.state === 'active' (Gate A done) AND their
 *          model-profile listing is NOT 'published'. The Step-2 reconcile keeps
 *          published ⟺ Verified, so a not-published listing for an active model means
 *          Gate B is incomplete. (A model with no listing at all is skipped — there is
 *          nothing to nudge them to verify for yet.) Readable via Integration API.
 *   CLIENT Approved-unverified ⟺ user.state === 'active' AND
 *          profile.metadata.identity_verified !== true. Readable via Integration API.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEDUP / RATE-LIMIT / CAP (never spam):
 *   - privateData.lastVerifyNudgeAt (ISO string) + privateData.verifyNudgeCount (number)
 *     are recorded on each successful send.
 *   - A user is nudged only if: verifyNudgeCount < MAX_NUDGES (default 3) AND at least
 *     COOLDOWN_MS (default 48h) has passed since lastVerifyNudgeAt.
 *   - Verifying removes them from the Approved-unverified set entirely (they become
 *     Verified), so they naturally stop being nudged. The cap is the hard backstop.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ENV VARS NEIL MUST PROVIDE TO ACTIVATE (Railway + gitignored .env only — never
 * committed; this repo is public). The feature is DORMANT until ALL are present:
 *
 *   SHARETRIBE_INTEGRATION_CLIENT_ID / SHARETRIBE_INTEGRATION_CLIENT_SECRET
 *       Operator Integration API creds (already used by SAF-14/SAF-03/Step-2). Needed to
 *       read Approved-unverified accounts and write the dedup counters.
 *   POSTMARK_SERVER_TOKEN
 *       Activates the Postmark transport (see api-util/mailer.js). Absent → the sweep runs
 *       but sends nothing (mailer resolves { skipped: true }) — reported as configured:false.
 *   CRON_SECRET
 *       Shared secret guarding the endpoint (see server/api/verify-nudge.js). Not read here.
 *   REACT_APP_MARKETPLACE_ROOT_URL (optional)
 *       Base URL for the verify links in the emails. Defaults to https://roguetalent.co.
 *
 * FAIL-SAFE: the sweep NEVER throws. Missing creds → a benign { configured:false }
 * summary. A per-user error is logged and skipped; the sweep continues. A mail failure
 * does NOT record the nudge, so it is retried on the next run.
 *
 * ⚠️ TEST MARKETPLACE ONLY (ndstealth1-test). The sweep issues Integration-API reads +
 * writes at runtime — that is the feature; no manual flex-cli/Console writes are involved.
 */

const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');
const { sendMail, isConfigured: isMailerConfigured } = require('./mailer');
const log = require('../log');

const MODEL_LISTING_TYPE = 'model-profile';
const MODEL_USER_TYPE = 'model';
const CLIENT_USER_TYPE = 'client';

const LISTING_STATE_PUBLISHED = 'published';
const USER_STATE_ACTIVE = 'active';

// Dedup / cap defaults (overridable via the sweep options for tests).
const DEFAULT_COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48h between nudges
const DEFAULT_MAX_NUDGES = 3; // hard cap so a user is never spammed
const DEFAULT_PER_PAGE = 100; // Integration API page size
const MAX_PAGES = 100; // defensive bound on pagination

const getRootUrl = () =>
  (process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://roguetalent.co').replace(/\/+$/, '');

/**
 * Whether the sweep's data plane is configured (operator Integration creds present).
 * Distinct from mail configuration (isMailerConfigured) — both are required to actually
 * send, but the query layer needs only the Integration creds.
 * @returns {boolean}
 */
const isIntegrationConfigured = () =>
  !!(
    process.env.SHARETRIBE_INTEGRATION_CLIENT_ID && process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET
  );

/**
 * Whether the whole nudge feature is active: Integration creds AND Postmark both present.
 * @returns {boolean}
 */
const isConfigured = () => isIntegrationConfigured() && isMailerConfigured();

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

// ---- Pure predicates ---------------------------------------------------------

/**
 * Is this CLIENT user Approved-but-unverified? active AND identity_verified !== true.
 * @param {Object} user - an Integration API user resource
 * @returns {boolean}
 */
const isClientApprovedUnverified = user => {
  const state = user?.attributes?.state;
  const identityVerified = user?.attributes?.profile?.metadata?.identity_verified;
  return state === USER_STATE_ACTIVE && identityVerified !== true;
};

/**
 * Is this MODEL user Approved-but-unverified? active AND has a model-profile listing whose
 * state is NOT 'published'. A model with no listing is NOT nudged (nothing to verify for).
 * @param {Object} user - an Integration API user resource
 * @param {string|null} listingState - the model's model-profile listing state, or null
 * @returns {boolean}
 */
const isModelApprovedUnverified = (user, listingState) => {
  const state = user?.attributes?.state;
  if (state !== USER_STATE_ACTIVE) {
    return false;
  }
  // No listing → not submitted / nothing to publish → don't nudge to verify yet.
  if (!listingState) {
    return false;
  }
  return listingState !== LISTING_STATE_PUBLISHED;
};

/**
 * Dedup + cap decision. Pure: given the user's current nudge counters and "now",
 * decide whether to send and why-not when skipping.
 *
 * @param {Object} params
 * @param {string} [params.lastVerifyNudgeAt] - ISO timestamp of the last nudge
 * @param {number} [params.verifyNudgeCount] - how many nudges already sent
 * @param {number} params.now - current epoch ms
 * @param {number} [params.cooldownMs] - min gap between nudges
 * @param {number} [params.maxNudges] - hard cap
 * @returns {{ send: boolean, reason: ('cap'|'cooldown'|'due') }}
 */
const decideNudge = ({
  lastVerifyNudgeAt,
  verifyNudgeCount = 0,
  now,
  cooldownMs = DEFAULT_COOLDOWN_MS,
  maxNudges = DEFAULT_MAX_NUDGES,
} = {}) => {
  const count = Number.isFinite(verifyNudgeCount) ? verifyNudgeCount : 0;
  if (count >= maxNudges) {
    return { send: false, reason: 'cap' };
  }
  if (lastVerifyNudgeAt) {
    const last = Date.parse(lastVerifyNudgeAt);
    if (!Number.isNaN(last) && now - last < cooldownMs) {
      return { send: false, reason: 'cooldown' };
    }
  }
  return { send: true, reason: 'due' };
};

// ---- Email templates ---------------------------------------------------------

/**
 * Build the nudge email (subject + plain-text body) for a user type. Inline + minimal,
 * matching lifecycle §8. Warm, accurate, one clear action.
 *
 * @param {Object} params
 * @param {('model'|'client')} params.userType
 * @param {string} [params.firstName] - for a light greeting
 * @returns {{ subject: string, textBody: string, tag: string }}
 */
const buildNudgeEmail = ({ userType, firstName } = {}) => {
  const greetingName = firstName ? ` ${firstName}` : '';
  const rootUrl = getRootUrl();

  if (userType === MODEL_USER_TYPE) {
    const verifyUrl = `${rootUrl}/account/payments`;
    const subject = "You're approved — verify to get booked on Rogue Talent";
    const textBody = [
      `Hi${greetingName},`,
      '',
      'Great news — your Rogue Talent profile has passed review and been approved.',
      '',
      'One step is left before clients can find and book you: verify your identity and',
      'add your bank details. Until that is done, your profile stays hidden from search.',
      '',
      `Verify and add your bank: ${verifyUrl}`,
      '',
      'Once you are verified you are visible in search, bookable, and paid directly —',
      'you keep 100% of your rate.',
      '',
      '— The Rogue Talent team',
    ].join('\n');
    return { subject, textBody, tag: 'verify-nudge-model' };
  }

  // Client (and any non-model fallback).
  const verifyUrl = `${rootUrl}/verify-identity`;
  const subject = "You're approved — verify to make your first booking";
  const textBody = [
    `Hi${greetingName},`,
    '',
    'Good news — your Rogue Talent account has been approved.',
    '',
    'One step is left before you can book a model: verify your identity. It only takes',
    'a minute, and it keeps every booking on Rogue Talent trusted on both sides.',
    '',
    `Verify your identity: ${verifyUrl}`,
    '',
    '— The Rogue Talent team',
  ].join('\n');
  return { subject, textBody, tag: 'verify-nudge-client' };
};

// ---- Integration API reads ---------------------------------------------------

// Extract a usable first name for the greeting (best-effort; falls back to no name).
const getFirstName = user => {
  const profile = user?.attributes?.profile || {};
  return (
    profile.firstName ||
    (typeof profile.displayName === 'string' ? profile.displayName.split(' ')[0] : '') ||
    ''
  );
};

// Page through every user via the Integration API. Returns the raw user resources.
const fetchAllUsers = (sdk, perPage) => {
  const all = [];
  const fetchPage = page =>
    sdk.users.query({ page, perPage }).then(res => {
      const users = res?.data?.data || [];
      all.push(...users);
      const totalPages = res?.data?.meta?.totalPages || 1;
      if (page < totalPages && page < MAX_PAGES) {
        return fetchPage(page + 1);
      }
      return all;
    });
  return fetchPage(1);
};

// Page through every model-profile listing and build an authorId → state map, so we can
// classify active models without an N+1 per-user listing query.
const fetchModelListingStateByAuthor = (sdk, perPage) => {
  const byAuthor = new Map();
  const fetchPage = page =>
    sdk.listings.query({ pub_listingType: MODEL_LISTING_TYPE, page, perPage }).then(res => {
      const listings = res?.data?.data || [];
      listings.forEach(listing => {
        const authorId = listing?.relationships?.author?.data?.id?.uuid;
        const state = listing?.attributes?.state;
        if (authorId && !byAuthor.has(authorId)) {
          byAuthor.set(authorId, state);
        }
      });
      const totalPages = res?.data?.meta?.totalPages || 1;
      if (page < totalPages && page < MAX_PAGES) {
        return fetchPage(page + 1);
      }
      return byAuthor;
    });
  return fetchPage(1);
};

// Record a successful nudge on the user's privateData (dedup counters). Best-effort:
// resolves true on success, false on failure (logged) — never throws.
const recordNudge = (sdk, userId, priorCount, nowIso) =>
  sdk.users
    .updateProfile({
      id: userId,
      privateData: {
        lastVerifyNudgeAt: nowIso,
        verifyNudgeCount: (Number.isFinite(priorCount) ? priorCount : 0) + 1,
      },
    })
    .then(
      () => true,
      err => {
        log.error(err, 'verify-nudge-record-failed', { userId });
        return false;
      }
    );

// ---- The sweep ---------------------------------------------------------------

/**
 * Run the Approved → verify nudge sweep. Env-gated, fail-safe, idempotent-per-cooldown.
 * NEVER throws — always resolves to a summary the endpoint can return.
 *
 * @param {Object} [options]
 * @param {boolean} [options.dryRun] - classify + decide but send/record nothing
 * @param {number} [options.now] - epoch ms (injectable for tests; defaults to Date.now())
 * @param {number} [options.cooldownMs]
 * @param {number} [options.maxNudges]
 * @param {number} [options.perPage]
 * @param {Object} [options.sdk] - inject an Integration SDK (tests); defaults to the module's
 * @param {Function} [options.mailer] - inject a sendMail (tests); defaults to mailer.sendMail
 * @returns {Promise<Object>} summary counts (never rejects)
 */
const runVerifyNudgeSweep = (options = {}) => {
  const {
    dryRun = false,
    now = Date.now(),
    cooldownMs = DEFAULT_COOLDOWN_MS,
    maxNudges = DEFAULT_MAX_NUDGES,
    perPage = DEFAULT_PER_PAGE,
  } = options;

  const summary = {
    configured: false,
    dryRun,
    scanned: 0,
    approvedUnverifiedModels: 0,
    approvedUnverifiedClients: 0,
    nudged: 0,
    cappedSkipped: 0,
    cooldownSkipped: 0,
    sendFailed: 0,
    recordFailed: 0,
    errors: 0,
  };

  // Env gate. Missing Integration creds OR Postmark → dormant. Report, don't crash.
  const sdk = options.sdk || getIntegrationSdk();
  const mailer = options.mailer || sendMail;
  const mailReady = options.mailer ? true : isMailerConfigured();
  if (!sdk || !mailReady) {
    summary.reason = 'not-configured';
    return Promise.resolve(summary);
  }
  summary.configured = true;

  const nowIso = new Date(now).toISOString();

  return Promise.all([fetchAllUsers(sdk, perPage), fetchModelListingStateByAuthor(sdk, perPage)])
    .then(([users, modelListingStateByAuthor]) => {
      summary.scanned = users.length;

      // Build the eligible worklist (classify + dedup decision) up front.
      const worklist = [];
      users.forEach(user => {
        const userId = user?.id?.uuid;
        if (!userId) {
          return;
        }
        const userType = user?.attributes?.profile?.publicData?.userType;
        let approvedUnverified = false;
        if (userType === CLIENT_USER_TYPE) {
          approvedUnverified = isClientApprovedUnverified(user);
          if (approvedUnverified) {
            summary.approvedUnverifiedClients += 1;
          }
        } else if (userType === MODEL_USER_TYPE) {
          const listingState = modelListingStateByAuthor.get(userId) || null;
          approvedUnverified = isModelApprovedUnverified(user, listingState);
          if (approvedUnverified) {
            summary.approvedUnverifiedModels += 1;
          }
        }
        if (!approvedUnverified) {
          return;
        }

        const privateData = user?.attributes?.profile?.privateData || {};
        const decision = decideNudge({
          lastVerifyNudgeAt: privateData.lastVerifyNudgeAt,
          verifyNudgeCount: privateData.verifyNudgeCount,
          now,
          cooldownMs,
          maxNudges,
        });
        if (!decision.send) {
          if (decision.reason === 'cap') {
            summary.cappedSkipped += 1;
          } else if (decision.reason === 'cooldown') {
            summary.cooldownSkipped += 1;
          }
          return;
        }

        worklist.push({
          userId,
          userType,
          email: user?.attributes?.email || null,
          firstName: getFirstName(user),
          priorCount: privateData.verifyNudgeCount,
        });
      });

      // Process the worklist sequentially so we never burst the mail/API rate limits.
      // Each item is fully isolated: one failure never aborts the sweep.
      return worklist.reduce(
        (chain, item) =>
          chain.then(() => {
            if (!item.email) {
              // No address to send to — skip quietly (counts as neither nudged nor error).
              return null;
            }
            if (dryRun) {
              summary.nudged += 1; // "would nudge" under dry-run
              return null;
            }
            const { subject, textBody, tag } = buildNudgeEmail({
              userType: item.userType,
              firstName: item.firstName,
            });
            return mailer({ to: item.email, subject, textBody, tag })
              .then(result => {
                if (!result?.sent) {
                  summary.sendFailed += 1;
                  return null; // do NOT record → retried next run
                }
                return recordNudge(sdk, item.userId, item.priorCount, nowIso).then(recorded => {
                  if (recorded) {
                    summary.nudged += 1;
                  } else {
                    summary.recordFailed += 1;
                  }
                });
              })
              .catch(err => {
                // Belt-and-braces: sendMail is already fail-safe, but never let one user
                // break the sweep.
                log.error(err, 'verify-nudge-send-error', { userId: item.userId });
                summary.errors += 1;
                return null;
              });
          }),
        Promise.resolve()
      );
    })
    .then(() => summary)
    .catch(err => {
      // The query layer failed (e.g. Integration API down). Fail-safe: report, never throw.
      log.error(err, 'verify-nudge-sweep-failed');
      summary.errors += 1;
      summary.reason = 'error';
      return summary;
    });
};

module.exports = {
  isConfigured,
  isIntegrationConfigured,
  isClientApprovedUnverified,
  isModelApprovedUnverified,
  decideNudge,
  buildNudgeEmail,
  runVerifyNudgeSweep,
  DEFAULT_COOLDOWN_MS,
  DEFAULT_MAX_NUDGES,
  MODEL_USER_TYPE,
  CLIENT_USER_TYPE,
};
