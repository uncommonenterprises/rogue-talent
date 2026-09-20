/**
 * server/api/safety-report.js
 * ---------------------------------------------------------------------------
 * SAF-29 — Safety reporting flow (separate from the booking dispute flow).
 *
 * Receives a "Report a safety concern" submission from the app and captures it
 * reliably so the operator can triage it the same working day (SAF-30 SLA).
 *
 * Capture strategy (v1, launch volume — see docs/safety-framework-v1-scope.md):
 *   1. ALWAYS: structured server logging with a `[SAFETY_REPORT]` marker so the
 *      report is retrievable from the platform logs even with no other infra.
 *   2. BEST-EFFORT durable record: if the Sharetribe Integration API credentials
 *      are configured, append the report to the reporting user's privateData
 *      (`privateData.safetyReports`). This gives a persistent, per-user record the
 *      operator can pull via Console / the Integration API. It is stored on the
 *      REPORTER (who filed and consented), never written onto the reported party's
 *      profile. Degrades gracefully to logging-only when creds are absent or the
 *      reporter is not resolvable (e.g. a logged-out general report).
 *
 * ⚠️ INFRA GAP (flagged for Neil): there is NO transactional-email transport in
 * this stack, so this endpoint does NOT yet email safety@roguetalent.co. Wiring
 * that notification is a remaining infra step. Until then the operator must
 * retrieve reports from the logs / the reporter's privateData.
 *
 * ⚠️ TEST MARKETPLACE ONLY (`ndstealth1-test`). Never point at a live env.
 *
 * Env (optional — enables the durable record; from .env / Railway, gitignored):
 *   SHARETRIBE_INTEGRATION_CLIENT_ID
 *   SHARETRIBE_INTEGRATION_CLIENT_SECRET
 */

const crypto = require('crypto');
const { getSdk } = require('../api-util/sdk');
const log = require('../log');

const VALID_CATEGORIES = [
  'safety-concern',
  'harassment',
  'identity-mismatch',
  'inappropriate-behaviour',
  'other',
];

const MAX_DESCRIPTION_LENGTH = 5000;

// Lazily create a single Integration SDK instance (only if creds are present).
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
    // eslint-disable-next-line global-require
    const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');
    integrationSdkInstance = flexIntegrationSdk.createInstance({ clientId, clientSecret });
  }
  return integrationSdkInstance;
};

const trimString = (value, maxLength) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

// Resolve the authenticated reporter server-side (never trust a client-claimed id).
// Returns null when the request is unauthenticated (e.g. a logged-out general report).
const resolveReporter = sdk =>
  sdk.currentUser
    .show()
    .then(res => {
      const user = res?.data?.data;
      if (!user) {
        return null;
      }
      const profile = user.attributes?.profile || {};
      return {
        id: user.id?.uuid,
        email: user.attributes?.email || null,
        displayName: profile.displayName || null,
      };
    })
    .catch(() => null);

// Append the report to the reporter's privateData.safetyReports (best-effort).
const persistToReporterProfile = (integrationSdk, reporterId, report) =>
  integrationSdk.users.show({ id: reporterId }).then(res => {
    const existing = res?.data?.data?.attributes?.profile?.privateData?.safetyReports;
    const safetyReports = Array.isArray(existing) ? existing : [];
    // Keep the stored record lean and free of duplicated contact PII beyond what
    // is already on the user profile.
    const storedRecord = {
      reportId: report.reportId,
      submittedAt: report.submittedAt,
      category: report.category,
      description: report.description,
      relatedTransactionId: report.relatedTransactionId,
      relatedParty: report.relatedParty,
      source: report.source,
    };
    return integrationSdk.users.updateProfile({
      id: reporterId,
      privateData: { safetyReports: [...safetyReports, storedRecord] },
    });
  });

module.exports = (req, res) => {
  const body = req.body || {};

  const category = trimString(body.category, 100);
  const description = trimString(body.description, MAX_DESCRIPTION_LENGTH);
  const relatedTransactionId = trimString(body.relatedTransactionId, 100) || null;
  const relatedParty = trimString(body.relatedParty, 500) || null;
  const contactEmailInput = trimString(body.contactEmail, 320) || null;
  const contactNameInput = trimString(body.contactName, 200) || null;
  const source = trimString(body.source, 50) || 'general';

  // Minimal validation — description is the load-bearing field.
  if (!description) {
    return res.status(400).json({ error: 'A description of the concern is required.' });
  }
  const normalizedCategory = VALID_CATEGORIES.includes(category) ? category : 'other';

  const sdk = getSdk(req, res);

  return resolveReporter(sdk).then(reporter => {
    const reportId = crypto.randomUUID();
    const submittedAt = new Date().toISOString();

    const report = {
      reportId,
      submittedAt,
      category: normalizedCategory,
      description,
      relatedTransactionId,
      relatedParty,
      source,
      // Prefer the verified account email/name; fall back to what was typed
      // (supports logged-out general reports).
      reporter: {
        userId: reporter?.id || null,
        email: reporter?.email || contactEmailInput,
        name: reporter?.displayName || contactNameInput,
      },
    };

    // 1) Reliable capture: always log with a clear marker (retrievable from platform logs).
    // eslint-disable-next-line no-console
    console.log(`[SAFETY_REPORT] ${JSON.stringify(report)}`);

    // 2) Best-effort durable record on the reporter's profile (if Integration API is configured).
    const integrationSdk = getIntegrationSdk();
    const durablePersist =
      integrationSdk && reporter?.id
        ? persistToReporterProfile(integrationSdk, reporter.id, report).then(
            () => true,
            err => {
              // Do not fail the whole request if the durable write fails — the log capture stands.
              log.error(err, 'safety-report-persist-failed', { reportId });
              return false;
            }
          )
        : Promise.resolve(false);

    return durablePersist.then(persisted => {
      return res.status(200).json({ reportId, persisted });
    });
  });
};
