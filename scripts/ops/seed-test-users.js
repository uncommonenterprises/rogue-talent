/**
 * scripts/ops/seed-test-users.js
 * ---------------------------------------------------------------------------
 * Seeds a small, deterministic roster of TEST users (models + clients) into the
 * `ndstealth1-test` marketplace so the product-manager agent (and manual QA)
 * have stable accounts to walk journeys with.
 *
 * ⚠️  TEST MARKETPLACE ONLY. This must never be pointed at a live marketplace.
 *     There is no live env today; keep it that way (see CLAUDE.md boundaries).
 *
 * What it does per user:
 *   1. Creates the account via the Marketplace API signup endpoint
 *      (`currentUser.create`) — same call the signup form makes, so seeded
 *      users are indistinguishable from real ones (userType in publicData).
 *   2. Approves the account via the Integration API (`users.approve`) — every
 *      Rogue Talent user needs manual admin approval before full access.
 *   3. For models, stamps `metadata.id_verified = 'verified'` so the Verified
 *      badge renders (operator-only field; mirrors what an admin would set).
 *
 * It writes the roster (emails, password, ids) to `.test-accounts.json`
 * (GITIGNORED — it contains a password; never commit it).
 *
 * ---------------------------------------------------------------------------
 * REQUIREMENTS TO RUN (none needed to READ/review this file):
 *   - `npm i sharetribe-flex-integration-sdk` (not yet a repo dependency).
 *   - Env vars (in .env / Railway — never committed):
 *       REACT_APP_SHARETRIBE_SDK_CLIENT_ID   Marketplace clientId (public signup)
 *       SHARETRIBE_INTEGRATION_CLIENT_ID     "Claude Code Ops" Integration app id
 *       SHARETRIBE_INTEGRATION_CLIENT_SECRET "Claude Code Ops" Integration secret
 *       TEST_ACCOUNT_PASSWORD                shared password for all test users
 *       TEST_ACCOUNT_EMAIL_BASE              e.g. hi@uncommonenterprises.co.uk
 *                                            (plus-addressing derives per-user emails)
 *
 * USAGE:
 *   node scripts/ops/seed-test-users.js --dry-run   # prints the plan, no API calls, no creds needed
 *   node scripts/ops/seed-test-users.js             # creates + approves (needs the env vars above)
 *
 * Idempotent: re-running skips users whose email is already taken and still
 * (re)approves + writes the accounts file.
 * ---------------------------------------------------------------------------
 */

/* eslint-disable no-console */
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ACCOUNTS_FILE = path.resolve(__dirname, '../../.test-accounts.json');

// --- The roster -------------------------------------------------------------
// Deliberately small and varied so discovery/search journeys have something to
// filter across. Slugs become plus-addressed emails: <local>+<slug>@<domain>.
const ROSTER = [
  { slug: 'rt-model-01', userType: 'model',  firstName: 'Lucy',   lastName: 'Southern', note: 'Fashion & editorial' },
  { slug: 'rt-model-02', userType: 'model',  firstName: 'Marcus', lastName: 'Bell',     note: 'Commercial & lifestyle' },
  { slug: 'rt-model-03', userType: 'model',  firstName: 'Anais',  lastName: 'Petit',    note: 'Runway' },
  { slug: 'rt-client-01', userType: 'client', firstName: 'Priya', lastName: 'Shah',     note: 'Brand / agency' },
  { slug: 'rt-client-02', userType: 'client', firstName: 'Tom',   lastName: 'Reeves',   note: 'Photographer' },
];

// --- Helpers ----------------------------------------------------------------
function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`✖ Missing required env var: ${name}`);
    console.error('  Set it in .env (see the header of this file). Aborting.');
    process.exit(1);
  }
  return v;
}

function emailFor(slug, base) {
  const [local, domain] = base.split('@');
  if (!domain) {
    console.error(`✖ TEST_ACCOUNT_EMAIL_BASE must be a full email (got: ${base})`);
    process.exit(1);
  }
  return `${local}+${slug}@${domain}`;
}

function buildPlan() {
  const base = process.env.TEST_ACCOUNT_EMAIL_BASE || 'hi@uncommonenterprises.co.uk';
  return ROSTER.map(u => ({ ...u, email: emailFor(u.slug, base) }));
}

// --- Dry run: print the plan and exit, no SDKs, no credentials --------------
if (DRY_RUN) {
  console.log('DRY RUN — no API calls, no accounts file written.\n');
  console.log('Would create + approve the following on ndstealth1-test:\n');
  buildPlan().forEach(u => {
    const badge = u.userType === 'model' ? ' (+ Verified badge)' : '';
    console.log(`  • ${u.userType.padEnd(6)} ${u.firstName} ${u.lastName}  <${u.email}>${badge}`);
  });
  console.log(`\nPassword: value of TEST_ACCOUNT_PASSWORD  →  written to ${path.relative(process.cwd(), ACCOUNTS_FILE)}`);
  console.log('\nRun without --dry-run (and with the Integration API env vars set) to execute.');
  process.exit(0);
}

// --- Real run: needs credentials + the Integration SDK ----------------------
const clientId = requireEnv('REACT_APP_SHARETRIBE_SDK_CLIENT_ID');
const integrationClientId = requireEnv('SHARETRIBE_INTEGRATION_CLIENT_ID');
const integrationClientSecret = requireEnv('SHARETRIBE_INTEGRATION_CLIENT_SECRET');
const password = requireEnv('TEST_ACCOUNT_PASSWORD');

let sharetribeSdk;
let flexIntegrationSdk;
try {
  sharetribeSdk = require('sharetribe-flex-sdk');
  flexIntegrationSdk = require('sharetribe-flex-integration-sdk');
} catch (e) {
  console.error('✖ Missing SDK. Install the Integration SDK first:');
  console.error('    npm i sharetribe-flex-integration-sdk');
  process.exit(1);
}

// Marketplace SDK — public signup (clientId only, in-memory token store).
const marketplaceSdk = sharetribeSdk.createInstance({
  clientId,
  tokenStore: sharetribeSdk.tokenStore.memoryStore(),
});

// Integration SDK — privileged, for approval + metadata (Ops app credentials).
const integrationSdk = flexIntegrationSdk.createInstance({
  clientId: integrationClientId,
  clientSecret: integrationClientSecret,
});

const isEmailTakenError = err => {
  const status = err?.status || err?.statusCode;
  const codes = (err?.data?.errors || []).map(e => e.code).join(',');
  return status === 409 || /email-taken|user-email-taken|already/i.test(codes + (err?.message || ''));
};

async function createUser(u) {
  const params = {
    email: u.email,
    password,
    firstName: u.firstName,
    lastName: u.lastName,
    publicData: { userType: u.userType },
    protectedData: {},
  };
  try {
    const res = await marketplaceSdk.currentUser.create(params);
    const id = res?.data?.data?.id?.uuid;
    console.log(`  ✓ created ${u.email} (${id})`);
    return id;
  } catch (err) {
    if (isEmailTakenError(err)) {
      console.log(`  … exists  ${u.email} (skipping create)`);
      return null; // resolve id below via Integration query
    }
    throw err;
  }
}

async function findUserId(email) {
  // Integration API cannot filter users by email directly; page through.
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await integrationSdk.users.query({ page, perPage: 100 });
    const found = (res?.data?.data || []).find(
      d => d?.attributes?.email?.toLowerCase() === email.toLowerCase()
    );
    if (found) return found.id.uuid;
    const meta = res?.data?.meta || {};
    if (!meta.totalPages || page >= meta.totalPages) return null;
    page += 1;
  }
}

async function approveAndBadge(u, id) {
  await integrationSdk.users.approve({ id });
  console.log(`  ✓ approved ${u.email}`);
  if (u.userType === 'model') {
    await integrationSdk.users.updateProfile({ id, metadata: { id_verified: 'verified' } });
    console.log(`  ✓ verified badge ${u.email}`);
  }
}

async function main() {
  console.log(`Seeding ${ROSTER.length} test users into ndstealth1-test …\n`);
  const plan = buildPlan();
  const results = [];

  for (const u of plan) {
    console.log(`- ${u.firstName} ${u.lastName} (${u.userType})`);
    let id = await createUser(u);
    if (!id) id = await findUserId(u.email);
    if (!id) {
      console.log(`  ! could not resolve id for ${u.email}; leaving unapproved`);
      results.push({ ...u, password, userId: null, approved: false });
      continue;
    }
    try {
      await approveAndBadge(u, id);
      results.push({ ...u, password, userId: id, approved: true });
    } catch (err) {
      console.log(`  ! approve/metadata failed for ${u.email}: ${err?.message || err}`);
      results.push({ ...u, password, userId: id, approved: false });
    }
  }

  const payload = {
    marketplace: 'ndstealth1-test',
    generatedBy: 'scripts/ops/seed-test-users.js',
    warning: 'GITIGNORED — contains a password. Never commit. Test marketplace only.',
    users: results,
  };
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log(`\nWrote ${results.length} accounts → ${path.relative(process.cwd(), ACCOUNTS_FILE)}`);
  const ok = results.filter(r => r.approved).length;
  console.log(`Done: ${ok}/${results.length} approved.`);
}

main().catch(err => {
  console.error('\n✖ Seeding failed:', err?.message || err);
  process.exit(1);
});
