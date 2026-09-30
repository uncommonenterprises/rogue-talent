/**
 * server/api-util/decisionEmails.js
 * ---------------------------------------------------------------------------
 * Automatic review-decision emails (account-status amendment 30/09/2026).
 *
 * When the operator sets a user's metadata `reviewDecision` to 'approved' or 'declined' (in
 * Console), the user gets the matching email once. These replace Sharetribe's native
 * user-approval email, which cannot fire because Sharetribe user approval stays off.
 *
 * HOW IT FINDS CHANGES: a scheduled sweep (triggered by the protected cron endpoint
 * server/api/review-decision-emails.js) pages through the users via the Integration API and
 * emails every user whose decision differs from `metadata.reviewDecisionEmailed`. The
 * Integration API events feed (user/updated) was considered, but it needs a durable cursor
 * and this app has no datastore of its own; the metadata stamp below already makes a full
 * scan idempotent and it can never miss a decision if a run is skipped. At launch volume a
 * scan is a handful of API calls. (If volume grows: a user search schema on metadata
 * reviewDecision, or the events feed with a cursor, would cut the scan down.)
 *
 * IDEMPOTENT: after a successful send the sweep stamps metadata.reviewDecisionEmailed =
 * '<decision>', so a re-run never double-sends. A CHANGED decision (e.g. approved, then
 * declined) no longer matches the stamp and is emailed again. The resubmit endpoint clears
 * the stamp with the decision, so a second decline after a resubmission is emailed too.
 * A send failure does not stamp (retried next run). If the send succeeds but the stamp write
 * fails, the next run would send again: logged loudly (recordFailed) for the operator.
 *
 * Also on an 'approved' send: privateData.lastVerifyNudgeAt is set to now, so the separate
 * "please verify" nudge (verifyNudge.js, 48h cooldown) does not repeat the same ask on the
 * same day. The nudge count is not touched.
 *
 * Skipped: banned or deleted users, users with no email, and anyone who is not a model or
 * client. Nothing else about the user is read or written.
 *
 * ENV (Railway + gitignored .env only, never committed; this repo is public). DORMANT unless
 * ALL are present:
 *   REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED=true   the lifecycle is switched on
 *   SHARETRIBE_INTEGRATION_CLIENT_ID / _SECRET   read users + write the stamp
 *   POSTMARK_SERVER_TOKEN                        send (mailer.js)
 *   CRON_SECRET                                  guards the endpoint (not read here)
 *   REACT_APP_MARKETPLACE_ROOT_URL (optional)    base URL for links; default roguetalent.co
 *
 * FAIL-SAFE: never throws; always resolves to a summary. One user's failure never stops
 * the sweep.
 *
 * ⚠️ TEST MARKETPLACE ONLY (ndstealth1-test).
 */

const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');
const { sendMail, isConfigured: isMailerConfigured } = require('./mailer');
const {
  isAccountStatusFlowEnabled,
  getReviewDecision,
  REVIEW_DECISION_APPROVED,
  REVIEW_DECISION_DECLINED,
  REVIEW_DECISION_EMAILED_METADATA_KEY,
  REJECTION_REASON_PRIVATE_DATA_KEY,
} = require('./reviewDecision');
const log = require('../log');

const MODEL_USER_TYPE = 'model';
const CLIENT_USER_TYPE = 'client';

const SUPPORT_EMAIL = 'support@roguetalent.co';
const DEFAULT_PER_PAGE = 100;
const MAX_PAGES = 100; // defensive bound on pagination
const MAX_NOTE_LENGTH = 1000; // the reviewer note is operator-written; keep emails sane

const getRootUrl = () =>
  (process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://roguetalent.co').replace(/\/+$/, '');

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

// ---- Pure decision -------------------------------------------------------------

/**
 * Which decision email (if any) is owed to this user? Pure.
 *
 * @param {Object} user - an Integration API user resource
 * @returns {{ send: boolean, decision?: string, reason?: string }}
 */
const decideDecisionEmail = user => {
  const decision = getReviewDecision(user);
  if (!decision) {
    return { send: false, reason: 'no-decision' };
  }
  const emailed = user?.attributes?.profile?.metadata?.[REVIEW_DECISION_EMAILED_METADATA_KEY];
  if (emailed === decision) {
    return { send: false, reason: 'already-emailed' };
  }
  const attributes = user?.attributes || {};
  if (attributes.banned || attributes.state === 'banned' || attributes.deleted) {
    return { send: false, reason: 'inactive-account' };
  }
  const userType = attributes.profile?.publicData?.userType;
  if (userType !== MODEL_USER_TYPE && userType !== CLIENT_USER_TYPE) {
    return { send: false, reason: 'not-model-or-client' };
  }
  if (!attributes.email) {
    return { send: false, reason: 'no-email' };
  }
  return { send: true, decision };
};

// ---- Email copy (plain text; UK English; no dashes as punctuation) ------------------

const greeting = firstName => (firstName ? `Hi ${firstName},` : 'Hi,');

const getNote = user => {
  const note = user?.attributes?.profile?.privateData?.[REJECTION_REASON_PRIVATE_DATA_KEY];
  if (typeof note !== 'string' || note.trim().length === 0) {
    return null;
  }
  const trimmed = note.trim();
  return trimmed.length > MAX_NOTE_LENGTH ? `${trimmed.slice(0, MAX_NOTE_LENGTH)}...` : trimmed;
};

const noteLines = note =>
  note
    ? ['What our reviewer noted:', `"${note}"`]
    : [
        "We didn't include a specific note this time. If anything's unclear, contact us and",
        "we'll talk you through it.",
      ];

/**
 * Build the decision email for a user. Pure apart from reading the root URL from env.
 *
 * @param {Object} params
 * @param {'approved'|'declined'} params.decision
 * @param {'model'|'client'} params.userType
 * @param {string} [params.firstName]
 * @param {string|null} [params.note] - the private reviewer note (declines only)
 * @param {boolean} [params.identityVerified] - clients: already identity-verified?
 * @returns {{ subject: string, textBody: string, tag: string }}
 */
const buildDecisionEmail = ({ decision, userType, firstName, note = null, identityVerified }) => {
  const statusUrl = `${getRootUrl()}/account-status`;
  const isModel = userType === MODEL_USER_TYPE;
  const signOff = ['', 'The Rogue Talent team'];

  if (decision === REVIEW_DECISION_APPROVED && isModel) {
    return {
      subject: 'Your profile is approved. Verify with Stripe to go live',
      textBody: [
        greeting(firstName),
        '',
        'Good news: your Rogue Talent profile has been approved.',
        '',
        'One step is left before clients can find and book you: verify your identity and add',
        'your bank details with Stripe, our verification and payments partner. Until then, your',
        'profile stays hidden from search.',
        '',
        `Verify with Stripe to go live: ${statusUrl}`,
        '',
        "If you've already verified with Stripe, open the same link to check your profile is live.",
        ...signOff,
      ].join('\n'),
      tag: 'review-approved-model',
    };
  }

  if (decision === REVIEW_DECISION_APPROVED) {
    if (identityVerified) {
      return {
        subject: "Your business is approved. You're ready to book",
        textBody: [
          greeting(firstName),
          '',
          'Good news: your business has been approved on Rogue Talent, and your identity is',
          'already verified, so you can now send booking requests to models.',
          '',
          `Your account: ${statusUrl}`,
          ...signOff,
        ].join('\n'),
        tag: 'review-approved-client',
      };
    }
    return {
      subject: 'Your business is approved. Verify your identity to start booking',
      textBody: [
        greeting(firstName),
        '',
        'Good news: your business has been approved on Rogue Talent.',
        '',
        'One step is left before you can send your first booking request: verify your identity',
        'with Stripe, our verification partner. It takes a few minutes.',
        '',
        `Verify your identity to start booking: ${statusUrl}`,
        ...signOff,
      ].join('\n'),
      tag: 'review-approved-client',
    };
  }

  // Declined.
  const what = isModel ? 'profile' : 'business';
  const steps = isModel
    ? [
        `1. Open your account page: ${statusUrl}`,
        '2. Choose "Edit your profile" and make the changes.',
        '3. Choose "Resubmit for approval". There\'s no limit on attempts.',
      ]
    : [
        `1. Open your account page: ${statusUrl}`,
        '2. Choose "Update your business details" and make the changes.',
        '3. Choose "Submit for approval" again. There\'s no limit on attempts.',
      ];
  return {
    subject: `Your ${what} wasn't approved this time`,
    textBody: [
      greeting(firstName),
      '',
      isModel
        ? "Thanks for creating your Rogue Talent profile. We've reviewed it, and it wasn't approved this time."
        : "Thanks for joining Rogue Talent. We've reviewed your business details, and your business wasn't approved this time.",
      "That's not a permanent decision.",
      '',
      ...noteLines(note),
      '',
      'To resubmit:',
      ...steps,
      '',
      `Questions? Email ${SUPPORT_EMAIL}.`,
      ...signOff,
    ].join('\n'),
    tag: isModel ? 'review-declined-model' : 'review-declined-client',
  };
};

// ---- Integration API -------------------------------------------------------------

const getFirstName = user => {
  const profile = user?.attributes?.profile || {};
  return (
    profile.firstName ||
    (typeof profile.displayName === 'string' ? profile.displayName.split(' ')[0] : '') ||
    ''
  );
};

const fetchAllUsers = (sdk, perPage) => {
  const all = [];
  const fetchPage = page =>
    sdk.users.query({ page, perPage }).then(res => {
      all.push(...(res?.data?.data || []));
      const totalPages = res?.data?.meta?.totalPages || 1;
      if (page < totalPages && page < MAX_PAGES) {
        return fetchPage(page + 1);
      }
      return all;
    });
  return fetchPage(1);
};

// Stamp the decision that was emailed. Resolves true/false, never throws.
const recordEmailed = (sdk, userId, decision, nowIso) =>
  sdk.users
    .updateProfile({
      id: userId,
      metadata: { [REVIEW_DECISION_EMAILED_METADATA_KEY]: decision },
      ...(decision === REVIEW_DECISION_APPROVED
        ? { privateData: { lastVerifyNudgeAt: nowIso } }
        : {}),
    })
    .then(
      () => true,
      err => {
        log.error(err, 'decision-email-record-failed', { userId, decision });
        return false;
      }
    );

// ---- The sweep -------------------------------------------------------------------

// In-process guard so two overlapping cron calls can't both send the same emails.
let sweepInProgress = false;

/**
 * Send any owed review-decision emails. Env-gated, idempotent, fail-safe; never rejects.
 *
 * @param {Object} [options]
 * @param {boolean} [options.dryRun] - decide and count, but send and stamp nothing
 * @param {number} [options.now] - epoch ms (tests)
 * @param {number} [options.perPage]
 * @param {boolean} [options.flowEnabled] - override the account-status flag (tests)
 * @param {Object} [options.sdk] - inject an Integration SDK (tests)
 * @param {Function} [options.mailer] - inject a sendMail (tests)
 * @returns {Promise<Object>} summary counts
 */
const runDecisionEmailSweep = (options = {}) => {
  const { dryRun = false, now = Date.now(), perPage = DEFAULT_PER_PAGE } = options;
  const flowEnabled =
    options.flowEnabled === undefined ? isAccountStatusFlowEnabled() : options.flowEnabled;

  const summary = {
    configured: false,
    dryRun,
    scanned: 0,
    approvedOwed: 0,
    declinedOwed: 0,
    sent: 0,
    sendFailed: 0,
    recordFailed: 0,
    skippedNoEmail: 0,
    skippedInactive: 0,
    errors: 0,
  };

  if (!flowEnabled) {
    summary.reason = 'account-status-flow-disabled';
    return Promise.resolve(summary);
  }
  const sdk = options.sdk || getIntegrationSdk();
  const mailer = options.mailer || sendMail;
  const mailReady = options.mailer ? true : isMailerConfigured();
  if (!sdk || !mailReady) {
    summary.reason = 'not-configured';
    return Promise.resolve(summary);
  }
  if (sweepInProgress) {
    summary.configured = true;
    summary.reason = 'already-running';
    return Promise.resolve(summary);
  }
  summary.configured = true;
  sweepInProgress = true;

  const nowIso = new Date(now).toISOString();

  return fetchAllUsers(sdk, perPage)
    .then(users => {
      summary.scanned = users.length;
      const worklist = [];
      users.forEach(user => {
        const userId = user?.id?.uuid;
        if (!userId) {
          return;
        }
        const { send, decision, reason } = decideDecisionEmail(user);
        if (!send) {
          if (reason === 'no-email') {
            summary.skippedNoEmail += 1;
          } else if (reason === 'inactive-account') {
            summary.skippedInactive += 1;
          }
          return;
        }
        if (decision === REVIEW_DECISION_APPROVED) {
          summary.approvedOwed += 1;
        } else if (decision === REVIEW_DECISION_DECLINED) {
          summary.declinedOwed += 1;
        }
        worklist.push({ user, userId, decision });
      });

      if (dryRun) {
        return null;
      }

      // Sequential, so we never burst Postmark or the Integration API.
      return worklist.reduce(
        (chain, { user, userId, decision }) =>
          chain.then(() => {
            const profile = user.attributes.profile || {};
            const email = buildDecisionEmail({
              decision,
              userType: profile.publicData?.userType,
              firstName: getFirstName(user),
              note: decision === REVIEW_DECISION_DECLINED ? getNote(user) : null,
              identityVerified: profile.metadata?.identity_verified === true,
            });
            return mailer({ to: user.attributes.email, replyTo: SUPPORT_EMAIL, ...email })
              .then(result => {
                if (!result?.sent) {
                  summary.sendFailed += 1;
                  return null; // not stamped, so retried next run
                }
                summary.sent += 1;
                return recordEmailed(sdk, userId, decision, nowIso).then(recorded => {
                  if (!recorded) {
                    summary.recordFailed += 1;
                  }
                });
              })
              .catch(err => {
                log.error(err, 'decision-email-send-error', { userId, decision });
                summary.errors += 1;
                return null;
              });
          }),
        Promise.resolve()
      );
    })
    .then(() => summary)
    .catch(err => {
      log.error(err, 'decision-email-sweep-failed');
      summary.errors += 1;
      summary.reason = 'error';
      return summary;
    })
    .finally(() => {
      sweepInProgress = false;
    });
};

module.exports = {
  decideDecisionEmail,
  buildDecisionEmail,
  runDecisionEmailSweep,
  SUPPORT_EMAIL,
};
