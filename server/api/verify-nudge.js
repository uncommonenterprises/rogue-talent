/**
 * server/api/verify-nudge.js
 * ---------------------------------------------------------------------------
 * Account-status Step 4 — "Approved → please verify" nudge endpoint (lifecycle §8).
 *
 * A PROTECTED cron endpoint (POST /api/cron/verify-nudge). A scheduled job (Railway cron
 * or external cron) pings it with the shared secret; it runs the nudge sweep in
 * server/api-util/verifyNudge.js (find Approved-unverified models + clients, space/cap the
 * sends, email via Postmark, record the send) and returns a summary of counts.
 *
 * AUTH: guarded by CRON_SECRET, compared with crypto.timingSafeEqual (constant-time).
 * The secret may be supplied as the `X-Cron-Secret` header, an `Authorization: Bearer …`
 * header, or a `?secret=` query param.
 *
 * FAIL-SAFE / DORMANT UNTIL PROVISIONED (never crashes):
 *   - CRON_SECRET unset            → 200 { ok:true, configured:false, reason:'cron-secret-not-set' }
 *                                    (the feature is dormant; there is no secret to authenticate).
 *   - CRON_SECRET set, bad/no secret in request → 401 { error:'unauthorized' }.
 *   - Authorised, Integration/Postmark not configured → 200 with a { configured:false } summary.
 *   - Authorised + configured      → 200 with the sweep summary. The sweep itself never throws.
 *
 * OPTIONS: `?dryRun=true` classifies + decides but sends/records nothing (safe smoke test).
 *
 * ⚠️ TEST MARKETPLACE ONLY (ndstealth1-test). The sweep makes Integration-API reads +
 * writes at runtime — that is the feature.
 *
 * TO ACTIVATE (Neil): see the env vars in server/api-util/verifyNudge.js, then point a
 * daily cron at:  POST {ROOT_URL}/api/cron/verify-nudge  with header  X-Cron-Secret: <CRON_SECRET>.
 */

const crypto = require('crypto');
const { runVerifyNudgeSweep } = require('../api-util/verifyNudge');
const log = require('../log');

const getCronSecret = () => process.env.CRON_SECRET;

// Extract the caller-supplied secret from any of the accepted locations.
const extractProvidedSecret = req => {
  const header = req.get ? req.get('X-Cron-Secret') : req.headers?.['x-cron-secret'];
  if (header) {
    return header;
  }
  const auth = req.get ? req.get('Authorization') : req.headers?.authorization;
  if (auth && /^Bearer\s+/i.test(auth)) {
    return auth.replace(/^Bearer\s+/i, '').trim();
  }
  const q = req.query?.secret;
  return typeof q === 'string' ? q : null;
};

// Constant-time comparison that is also safe when the two strings differ in length
// (timingSafeEqual throws on unequal-length buffers). Returns false on any mismatch.
const secretsMatch = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

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

  // Dormant: no secret provisioned yet → do nothing, but do not error.
  if (!cronSecret) {
    return respond(200, { ok: true, configured: false, reason: 'cron-secret-not-set' });
  }

  // Authenticate the caller.
  const provided = extractProvidedSecret(req);
  if (!provided || !secretsMatch(provided, cronSecret)) {
    return respond(401, { error: 'unauthorized' });
  }

  const dryRun = req.query?.dryRun === 'true' || req.query?.dryRun === '1';

  return runVerifyNudgeSweep({ dryRun })
    .then(summary => respond(200, { ok: true, ...summary }))
    .catch(err => {
      // runVerifyNudgeSweep is fail-safe and should never reject, but guarantee 200-safety.
      log.error(err, 'verify-nudge-endpoint-failed');
      return respond(200, { ok: true, configured: false, reason: 'error' });
    });
};
