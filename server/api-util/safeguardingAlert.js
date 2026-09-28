/**
 * server/api-util/safeguardingAlert.js
 * ---------------------------------------------------------------------------
 * RT-FB-03 / SAF-38 - email the safety inbox when the 18+ check blocks someone, so the
 * operator (Neil, at launch volume) doesn't have to watch the logs. Decided 28/09/2026.
 *
 * Best-effort and fail-safe: never throws, never blocks the caller (the account is
 * already blocked by the age gate itself; this is only the notification). Uses the
 * Postmark transport (inactive without POSTMARK_SERVER_TOKEN).
 *
 * DATA MINIMISATION: the email carries the Sharetribe user id, user type and which check
 * raised it - never the date of birth or any ID document detail.
 */

const { sendMail } = require('./mailer');
const log = require('../log');

const SAFETY_ALERT_EMAIL = process.env.SAFETY_ALERT_EMAIL || 'safety@roguetalent.co';

const ALERT_UNDER_18 = 'under-18';
const ALERT_HELD = 'held';

const buildBody = ({ kind, userId, userType, source }) => {
  const what =
    kind === ALERT_HELD
      ? 'An account that was previously blocked as under 18 has now passed an ID check showing an adult. It has been HELD (not verified), because the adult ID may belong to someone else, for example a parent.'
      : 'A Stripe-verified ID shows this person is UNDER 18. The account has been blocked automatically: it cannot book or be booked.';
  return [
    'Rogue Talent safeguarding alert - action needed.',
    '',
    what,
    '',
    `User ID:     ${userId || '(unknown)'}`,
    `User type:   ${userType || '(unknown)'}`,
    `Raised by:   ${source}`,
    `Time (UTC):  ${new Date().toISOString()}`,
    '',
    'What to do:',
    '1. Find the user in Sharetribe Console > Users (search by the user ID above).',
    '2. Review the account. Do not ask the person to send ID documents by email.',
    kind === ALERT_HELD
      ? '3. Decide whether to keep the account blocked or delete it, per the safeguarding policy (SAF-38).'
      : '3. Delete the account and its data promptly, per the safeguarding policy (SAF-38).',
    '',
    'This alert contains no date of birth or ID details by design.',
  ].join('\n');
};

/**
 * Send a safeguarding alert. Resolves true if Postmark accepted it, false otherwise.
 * @param {Object} args
 * @param {'under-18'|'held'} args.kind
 * @param {string} args.userId
 * @param {'client'|'model'} args.userType
 * @param {string} args.source - e.g. 'Stripe Identity (client ID check)'
 * @returns {Promise<boolean>}
 */
const sendSafeguardingAlert = ({ kind = ALERT_UNDER_18, userId, userType, source } = {}) => {
  const subject =
    kind === ALERT_HELD
      ? `[Safeguarding] Previously under-18 account held for review (${userType || 'user'})`
      : `[Safeguarding] Under-18 ${userType || 'user'} blocked - action needed`;
  return sendMail({
    to: SAFETY_ALERT_EMAIL,
    subject,
    textBody: buildBody({ kind, userId, userType, source }),
    tag: 'safeguarding-age-check',
  })
    .then(result => !!result?.sent)
    .catch(err => {
      log.error(err, 'safeguarding-alert-failed', { userId, kind });
      return false;
    });
};

module.exports = { sendSafeguardingAlert, ALERT_UNDER_18, ALERT_HELD };
