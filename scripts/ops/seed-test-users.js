/**
 * scripts/ops/seed-test-users.js
 * ---------------------------------------------------------------------------
 * Seeds a small, deterministic roster of TEST users into the `ndstealth1-test`
 * marketplace so the product-manager agent (and manual QA) have stable accounts
 * to walk journeys with — deliberately in DIFFERENT states so the agent
 * experiences the product the way real users do, including the unverified and
 * half-built states.
 *
 * ⚠️  TEST MARKETPLACE ONLY. Never point this at a live marketplace. There is no
 *     live env today; keep it that way (see CLAUDE.md boundaries).
 *
 * Roster (models are intentionally in three different states):
 *   model 1  — brand new: account only, NOT id_verified, NO listing.
 *              → agent hits the fresh onboarding + the unverified prompt.
 *   model 2  — half-built: a DRAFT (unpublished) profile with partial data,
 *              NOT id_verified. → agent sees a mid-onboarding, gated state.
 *   model 3  — finished: a PUBLISHED, admin-approved, id_verified profile with
 *              rates + availability (bookable). → the "complete" state.
 *   client 1 / client 2 — approved accounts, no listings.
 *
 * All accounts are approved (every Rogue Talent user needs admin approval before
 * full access). Only model 3 is verified — so the agent meets the unverified
 * experience on models 1 and 2.
 *
 * Writes the roster (emails, password, ids, state) to `.test-accounts.json`
 * (GITIGNORED — it contains a password; never commit it).
 *
 * ---------------------------------------------------------------------------
 * REQUIREMENTS TO RUN (none needed to READ/review this file):
 *   - `npm i sharetribe-flex-integration-sdk` (not yet a repo dependency).
 *   - Env vars (in .env / Railway — never committed):
 *       REACT_APP_SHARETRIBE_SDK_CLIENT_ID   Marketplace clientId (signup + login)
 *       SHARETRIBE_INTEGRATION_CLIENT_ID     "Claude Code Ops" Integration app id
 *       SHARETRIBE_INTEGRATION_CLIENT_SECRET "Claude Code Ops" Integration secret
 *       TEST_ACCOUNT_PASSWORD                shared password for all test users
 *       TEST_ACCOUNT_EMAIL_BASE              e.g. hi@uncommonenterprises.co.uk
 *
 * USAGE:
 *   node scripts/ops/seed-test-users.js --dry-run   # prints the plan, no API calls, no creds
 *   node scripts/ops/seed-test-users.js             # creates/approves/builds (needs env vars)
 *
 * Idempotent-ish: re-running skips users whose email is already taken, still
 * (re)approves, and rewrites the accounts file. It does NOT create duplicate
 * listings for a user who already has one.
 * ---------------------------------------------------------------------------
 */

/* eslint-disable no-console */
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ACCOUNTS_FILE = path.resolve(__dirname, '../../.test-accounts.json');

// --- Booking config (confirmed against src/config/configListing.js) ---------
const LISTING_TYPE = 'model-profile';
const PROCESS_ALIAS = 'default-booking/release-1';
const UNIT_TYPE = 'day';
const CURRENCY = 'GBP';

// Attribute publicData for the "finished" profile. Sharetribe stores unknown
// keys harmlessly, but for these to drive filters/badges the keys + enum values
// must match the Console `listingFields` asset. CONFIRM against Console before a
// real run — half_day_rate/hourly_rate are the keys the app already uses
// (src/.../rateFields.js); the rest are best-effort and marked to verify.
const FINISHED_PROFILE = {
  publicData: {
    // TODO(confirm keys/enums vs Console listingFields asset):
    gender: 'female',
    height_cm: 178,
    experience_level: 'professional',
    hair_colour: 'brown',
    eye_colour: 'green',
    modelling_categories: ['fashion', 'editorial'],
    // rates: `long` fields stored as SUBUNITS (like price) — see rateFields.js
    half_day_rate: 9000, // £90.00
    hourly_rate: 3000, // £30.00
    travel_fee_policy: 'within_city_included',
  },
  priceSubunits: 15000, // day rate £150.00 (native listing price)
  city: 'London, UK',
  lat: 51.5074,
  lng: -0.1278,
};

// Partial publicData for the "half-built" draft — a couple of fields, no rates,
// not published.
const HALFBUILT_PROFILE = {
  publicData: { gender: 'male', modelling_categories: ['commercial'] },
  city: 'Manchester, UK',
  lat: 53.4808,
  lng: -2.2426,
};

// --- The roster -------------------------------------------------------------
// slug → plus-addressed email: <local>+<slug>@<domain>
const ROSTER = [
  { slug: 'rt-model-01', userType: 'model',  firstName: 'Lucy',   lastName: 'Southern', state: 'new',      verified: false, note: 'Brand new — no listing, unverified' },
  { slug: 'rt-model-02', userType: 'model',  firstName: 'Marcus', lastName: 'Bell',     state: 'half',     verified: false, note: 'Half-built draft profile, unverified' },
  { slug: 'rt-model-03', userType: 'model',  firstName: 'Anais',  lastName: 'Petit',    state: 'finished', verified: true,  note: 'Published, approved, id_verified' },
  { slug: 'rt-client-01', userType: 'client', firstName: 'Priya', lastName: 'Shah',     state: 'account',  verified: false, note: 'Brand / agency' },
  { slug: 'rt-client-02', userType: 'client', firstName: 'Tom',   lastName: 'Reeves',   state: 'account',  verified: false, note: 'Photographer' },
];

// --- Helpers ----------------------------------------------------------------
function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`✖ Missing required env var: ${name}\n  Set it in .env (see this file's header). Aborting.`);
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

const STATE_LABEL = {
  new: 'account only, UNVERIFIED, no listing',
  half: 'DRAFT profile (partial), UNVERIFIED',
  finished: 'PUBLISHED + approved + VERIFIED, bookable',
  account: 'approved account',
};

// --- Dry run: print the plan and exit, no SDKs, no credentials --------------
if (DRY_RUN) {
  console.log('DRY RUN — no API calls, no accounts file written.\n');
  console.log('Would create the following on ndstealth1-test:\n');
  buildPlan().forEach(u => {
    console.log(`  • ${u.userType.padEnd(6)} ${(u.firstName + ' ' + u.lastName).padEnd(16)} <${u.email}>`);
    console.log(`      state: ${STATE_LABEL[u.state]}`);
  });
  console.log(`\nPassword: TEST_ACCOUNT_PASSWORD  →  written to ${path.relative(process.cwd(), ACCOUNTS_FILE)}`);
  console.log('\nRun without --dry-run (with the Integration API env vars set) to execute.');
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
  console.error('✖ Missing SDK. Install the Integration SDK first:\n    npm i sharetribe-flex-integration-sdk');
  process.exit(1);
}

const { Money, LatLng } = sharetribeSdk.types;

const newMarketplaceSdk = () =>
  sharetribeSdk.createInstance({ clientId, tokenStore: sharetribeSdk.tokenStore.memoryStore() });

const integrationSdk = flexIntegrationSdk.createInstance({
  clientId: integrationClientId,
  clientSecret: integrationClientSecret,
});

const dayPlan = () => ({
  type: 'availability-plan/day',
  entries: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => ({ dayOfWeek: d, seats: 1 })),
});

const isEmailTakenError = err => {
  const status = err?.status || err?.statusCode;
  const codes = (err?.data?.errors || []).map(e => e.code).join(',');
  return status === 409 || /email-taken|already/i.test(codes + (err?.message || ''));
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
    const res = await newMarketplaceSdk().currentUser.create(params);
    const id = res?.data?.data?.id?.uuid;
    console.log(`  ✓ created ${u.email} (${id})`);
    return id;
  } catch (err) {
    if (isEmailTakenError(err)) {
      console.log(`  … exists  ${u.email} (skipping create)`);
      return null;
    }
    throw err;
  }
}

async function findUserId(email) {
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

async function loginSdk(email) {
  const sdk = newMarketplaceSdk();
  await sdk.login({ username: email, password });
  return sdk;
}

async function userHasListing(userId) {
  const res = await integrationSdk.listings.query({ authorId: userId, perPage: 1 });
  return (res?.data?.data || []).length > 0;
}

// Build a draft profile listing as the user; optionally publish it.
async function buildProfile(u, userId, profile, { publish }) {
  if (await userHasListing(userId)) {
    console.log(`  … listing exists for ${u.email} (skipping build)`);
    return;
  }
  const sdk = await loginSdk(u.email);
  const draftParams = {
    title: `${u.firstName} ${u.lastName[0]}.`,
    geolocation: new LatLng(profile.lat, profile.lng),
    publicData: {
      listingType: LISTING_TYPE,
      transactionProcessAlias: PROCESS_ALIAS,
      unitType: UNIT_TYPE,
      location: { address: profile.city, building: '' },
      ...profile.publicData,
    },
  };
  if (profile.priceSubunits) draftParams.price = new Money(profile.priceSubunits, CURRENCY);
  if (publish) draftParams.availabilityPlan = dayPlan();

  const draft = await sdk.ownListings.createDraft(draftParams, { expand: true });
  const listingId = draft?.data?.data?.id?.uuid;
  console.log(`  ✓ ${publish ? 'draft→publish' : 'draft'} listing for ${u.email} (${listingId})`);

  if (publish) {
    await sdk.ownListings.publishDraft({ id: listingId }, { expand: true });
    // If the marketplace requires listing approval, publish lands in
    // pendingApproval; approve it via the Integration API. Harmless if already open.
    try {
      await integrationSdk.listings.approve({ id: listingId });
      console.log(`  ✓ approved listing ${listingId}`);
    } catch (err) {
      console.log(`  · listing approve skipped (${err?.message || 'not required'})`);
    }
  }
}

async function main() {
  console.log(`Seeding ${ROSTER.length} test users into ndstealth1-test …\n`);
  const results = [];

  for (const u of buildPlan()) {
    console.log(`- ${u.firstName} ${u.lastName} (${u.userType}, ${u.state})`);
    let id = await createUser(u);
    if (!id) id = await findUserId(u.email);
    if (!id) {
      console.log(`  ! could not resolve id for ${u.email}; skipping`);
      results.push({ ...u, password, userId: null, approved: false });
      continue;
    }

    // Every user is approved.
    let approved = false;
    try {
      await integrationSdk.users.approve({ id });
      approved = true;
      console.log(`  ✓ approved user ${u.email}`);
    } catch (err) {
      console.log(`  ! user approve failed for ${u.email}: ${err?.message || err}`);
    }

    // Only model 3 is verified.
    if (u.verified) {
      await integrationSdk.users.updateProfile({ id, metadata: { id_verified: 'verified' } });
      console.log(`  ✓ id_verified badge ${u.email}`);
    }

    // Listing state.
    if (u.state === 'half') {
      await buildProfile(u, id, HALFBUILT_PROFILE, { publish: false });
    } else if (u.state === 'finished') {
      await buildProfile(u, id, FINISHED_PROFILE, { publish: true });
    }

    results.push({ ...u, password, userId: id, approved });
  }

  const payload = {
    marketplace: 'ndstealth1-test',
    generatedBy: 'scripts/ops/seed-test-users.js',
    warning: 'GITIGNORED — contains a password. Never commit. Test marketplace only.',
    users: results.map(({ note, ...rest }) => ({ ...rest, note })),
  };
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log(`\nWrote ${results.length} accounts → ${path.relative(process.cwd(), ACCOUNTS_FILE)}`);
  console.log(`Done: ${results.filter(r => r.approved).length}/${results.length} approved.`);
}

main().catch(err => {
  console.error('\n✖ Seeding failed:', err?.message || err);
  process.exit(1);
});
