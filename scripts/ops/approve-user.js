/**
 * scripts/ops/approve-user.js
 * ---------------------------------------------------------------------------
 * Approve a single test user by email via the Sharetribe Integration API.
 * Used as the mid-run hand-off in a PM journey: the product-manager agent signs
 * up a fresh model through the UI and stops at the pending-approval wall; this
 * script grants approval so the agent can be resumed into the full wizard.
 *
 * ⚠️  TEST MARKETPLACE ONLY (`ndstealth1-test`). Never point at a live env.
 *
 * Env (from .env, gitignored):
 *   SHARETRIBE_INTEGRATION_CLIENT_ID
 *   SHARETRIBE_INTEGRATION_CLIENT_SECRET
 *
 * USAGE:
 *   node scripts/ops/approve-user.js <email>
 */

/* eslint-disable no-console */
require('dotenv').config();

const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/ops/approve-user.js <email>');
  process.exit(1);
}

const integrationSdk = flexIntegrationSdk.createInstance({
  clientId: requireEnv('SHARETRIBE_INTEGRATION_CLIENT_ID'),
  clientSecret: requireEnv('SHARETRIBE_INTEGRATION_CLIENT_SECRET'),
});

async function findUserIdByEmail(target) {
  const wanted = target.trim().toLowerCase();
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await integrationSdk.users.query({ page, perPage: 100 });
    const users = res.data.data || [];
    for (const u of users) {
      const e = (u.attributes && u.attributes.email) || '';
      if (e.trim().toLowerCase() === wanted) return { id: u.id.uuid, state: u.attributes.state, pendingApproval: u.attributes.pendingApproval };
    }
    const meta = res.data.meta || {};
    if (!meta.totalPages || page >= meta.totalPages) break;
    page += 1;
  }
  return null;
}

(async () => {
  const found = await findUserIdByEmail(email);
  if (!found) {
    console.error(`No user found with email ${email}. (Signup may not have completed.)`);
    process.exit(2);
  }
  console.log(`Found user ${email} → id ${found.id} (state=${found.state}, pendingApproval=${found.pendingApproval})`);
  try {
    await integrationSdk.users.approve({ id: found.id });
    console.log(`✓ Approved ${email}`);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    // Already-approved is not a failure for our purposes.
    console.log(`user approve returned: ${msg} (harmless if already approved)`);
  }
})().catch(err => {
  console.error('Fatal:', err && err.message ? err.message : err);
  process.exit(1);
});
