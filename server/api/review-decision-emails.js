/**
 * server/api/review-decision-emails.js
 * ---------------------------------------------------------------------------
 * POST /api/cron/review-decision-emails (account-status amendment 30/09/2026).
 *
 * A PROTECTED cron endpoint. A scheduled job pings it (recommended every 10 minutes); it runs
 * the sweep in server/api-util/decisionEmails.js, which emails each user whose operator review
 * decision ('approved' / 'declined') has not been emailed yet, then stamps
 * metadata.reviewDecisionEmailed so it is never sent twice.
 *
 * AUTH: CRON_SECRET (constant-time compare, api-util/cronAuth.js), same as verify-nudge. Send
 * it as the `X-Cron-Secret` header (or `Authorization: Bearer …`, or `?secret=`).
 *
 * FAIL-SAFE / DORMANT UNTIL PROVISIONED (never crashes):
 *   - CRON_SECRET unset            → 200 { ok:true, configured:false, reason:'cron-secret-not-set' }
 *   - CRON_SECRET set, bad/no secret → 401 { error:'unauthorized' }
 *   - flag off / Integration or Postmark missing → 200 with a { configured:false } summary
 *   - authorised + configured      → 200 with the sweep summary
 *
 * OPTIONS: `?dryRun=true` counts the emails that are owed but sends and stamps nothing.
 *
 * TO ACTIVATE (Neil): every 10 minutes,
 *   POST {ROOT_URL}/api/cron/review-decision-emails   header  X-Cron-Secret: <CRON_SECRET>
 *
 * ⚠️ TEST MARKETPLACE ONLY (ndstealth1-test).
 */

const { runDecisionEmailSweep } = require('../api-util/decisionEmails');
const {
  getCronSecret,
  extractProvidedSecret,
  secretsMatch,
  isDryRun,
} = require('../api-util/cronAuth');
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

  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return respond(200, { ok: true, configured: false, reason: 'cron-secret-not-set' });
  }

  const provided = extractProvidedSecret(req);
  if (!provided || !secretsMatch(provided, cronSecret)) {
    return respond(401, { error: 'unauthorized' });
  }

  return runDecisionEmailSweep({ dryRun: isDryRun(req) })
    .then(summary => respond(200, { ok: true, ...summary }))
    .catch(err => {
      // The sweep never rejects, but guarantee a clean response.
      log.error(err, 'decision-email-endpoint-failed');
      return respond(200, { ok: true, configured: false, reason: 'error' });
    });
};
