/**
 * server/api-util/mailer.js
 * ---------------------------------------------------------------------------
 * Transactional email transport (Postmark).
 *
 * The ONLY server-originated mail transport in this stack. Used for emails our
 * Express server sends itself — e.g. the SAF-29 safety-report alert to
 * safety@roguetalent.co. It is NOT used for Sharetribe's built-in transaction
 * notifications (booking-v2): those are sent by Sharetribe from its own
 * infrastructure, with the from-address configured in Console — Postmark is not
 * in that path.
 *
 * Talks to the Postmark REST API directly over Node's built-in `https` (no
 * `postmark` npm dependency — dependency policy: ask the PM before adding one),
 * matching server/api-util/stripeIdentity.js.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ENV VARS (Railway + gitignored .env only — never committed; this repo is public):
 *
 *   POSTMARK_SERVER_TOKEN   Postmark *Server* API token (Servers → Rogue Talent →
 *                           API Tokens). Presence of this token ACTIVATES sending.
 *   POSTMARK_FROM_EMAIL     From address, on the verified roguetalent.co domain.
 *                           Optional — defaults to "Rogue Talent <no-reply@roguetalent.co>".
 *   POSTMARK_MESSAGE_STREAM Message stream id. Optional — defaults to "outbound"
 *                           (Postmark's Default Transactional Stream).
 *
 * FAIL-SAFE: when POSTMARK_SERVER_TOKEN is absent (the default until Neil
 * provisions), sending is INACTIVE. `isConfigured()` returns false and
 * `sendMail()` RESOLVES to { skipped: true, reason: 'not-configured' } without
 * throwing — callers must treat mail as best-effort and never fail their request
 * because mail did not send. A send error likewise resolves to { sent: false, ... },
 * never rejects. Mirrors the fail-open posture of stripeIdentity / residenceBoundary.
 *
 * The domain roguetalent.co is DKIM + Return-Path verified in Postmark (2026-09-21);
 * any @roguetalent.co From address is deliverable. While the Postmark server is in
 * Test mode / pending approval, live delivery to arbitrary recipients is limited by
 * Postmark — this transport is correct regardless of that account state.
 */

const https = require('https');
const log = require('../log');

const POSTMARK_API_HOST = 'api.postmarkapp.com';
const POSTMARK_EMAIL_PATH = '/email';

const DEFAULT_FROM = 'Rogue Talent <no-reply@roguetalent.co>';
const DEFAULT_STREAM = 'outbound';

const getServerToken = () => process.env.POSTMARK_SERVER_TOKEN;
const getFrom = () => process.env.POSTMARK_FROM_EMAIL || DEFAULT_FROM;
const getStream = () => process.env.POSTMARK_MESSAGE_STREAM || DEFAULT_STREAM;

/**
 * Whether the mail transport is configured (server token present). When false the
 * transport is inactive and fail-safe.
 * @returns {boolean}
 */
const isConfigured = () => !!getServerToken();

// Low-level HTTPS POST to the Postmark API. Resolves with parsed JSON on 2xx,
// rejects with an Error (carrying .status) otherwise. Callers wrap this so a
// rejection never escapes as an unhandled failure of the surrounding request.
const postmarkPost = (path, payload) =>
  new Promise((resolve, reject) => {
    const token = getServerToken();
    if (!token) {
      const err = new Error('Postmark is not configured (POSTMARK_SERVER_TOKEN missing).');
      err.status = 503;
      return reject(err);
    }

    const body = JSON.stringify(payload);
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': token,
      'Content-Length': Buffer.byteLength(body),
    };

    const request = https.request(
      { method: 'POST', host: POSTMARK_API_HOST, path, headers },
      response => {
        let raw = '';
        response.on('data', chunk => {
          raw += chunk;
        });
        response.on('end', () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch (e) {
            const err = new Error('Failed to parse Postmark response.');
            err.status = 502;
            return reject(err);
          }
          if (response.statusCode >= 200 && response.statusCode < 300) {
            return resolve(parsed);
          }
          // Postmark returns { ErrorCode, Message } on failure.
          const err = new Error(parsed?.Message || 'Postmark request failed.');
          err.status = response.statusCode;
          err.postmarkErrorCode = parsed?.ErrorCode ?? null;
          return reject(err);
        });
      }
    );
    request.on('error', reject);
    request.write(body);
    request.end();
  });

/**
 * Send a transactional email (best-effort, never throws).
 *
 * @param {Object} args
 * @param {string} args.to        - recipient address(es), comma-separated
 * @param {string} args.subject   - subject line
 * @param {string} [args.textBody]- plain-text body (at least one of text/html required)
 * @param {string} [args.htmlBody]- HTML body
 * @param {string} [args.replyTo] - Reply-To address
 * @param {string} [args.from]    - override From (must be on a verified domain)
 * @param {string} [args.tag]     - Postmark tag for grouping/analytics
 * @param {string} [args.messageStream] - override the message stream id
 * @returns {Promise<{sent: boolean, skipped?: boolean, reason?: string, messageId?: string}>}
 */
const sendMail = ({ to, subject, textBody, htmlBody, replyTo, from, tag, messageStream } = {}) => {
  if (!isConfigured()) {
    // Inactive until provisioned — resolve, do not throw. Callers log-capture anyway.
    return Promise.resolve({ sent: false, skipped: true, reason: 'not-configured' });
  }
  if (!to || !subject || (!textBody && !htmlBody)) {
    log.error(new Error('sendMail called with missing to/subject/body'), 'mailer-bad-args', {
      hasTo: !!to,
      hasSubject: !!subject,
    });
    return Promise.resolve({ sent: false, skipped: true, reason: 'bad-args' });
  }

  const payload = {
    From: from || getFrom(),
    To: to,
    Subject: subject,
    MessageStream: messageStream || getStream(),
  };
  if (textBody) {
    payload.TextBody = textBody;
  }
  if (htmlBody) {
    payload.HtmlBody = htmlBody;
  }
  if (replyTo) {
    payload.ReplyTo = replyTo;
  }
  if (tag) {
    payload.Tag = tag;
  }

  return postmarkPost(POSTMARK_EMAIL_PATH, payload).then(
    result => ({ sent: true, messageId: result?.MessageID || null }),
    err => {
      // Never let a mail failure break the caller — log and report failure.
      log.error(err, 'mailer-send-failed', {
        tag: tag || null,
        postmarkErrorCode: err?.postmarkErrorCode ?? null,
      });
      return { sent: false, skipped: false, reason: 'send-error' };
    }
  );
};

module.exports = {
  isConfigured,
  sendMail,
};
