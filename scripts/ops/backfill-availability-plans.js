/**
 * scripts/ops/backfill-availability-plans.js
 * ---------------------------------------------------------------------------
 * RT-FB-10 backfill. Gives every model-profile listing that has NO availability
 * plan the "available by default" plan that new profiles now get when "About you"
 * creates the draft:
 *
 *   availability-plan/time, Europe/London, all 7 days, 00:00 -> 00:00 (full day),
 *   1 seat per day.
 *
 * Why: the Marketplace API treats a planless listing as available every day, but
 * the web app only loads bookable dates on the listing page when the plan has a
 * time zone (ListingPage.duck.js, fetchMonthlyTimeSlots). So planless profiles
 * can't be booked through the site until they get a plan.
 *
 * SAFETY
 *   - TEST MARKETPLACE ONLY (ndstealth1-test). The script refuses to start unless
 *     SHARETRIBE_MARKETPLACE_ID is exactly "ndstealth1-test". Integration API apps
 *     are created per environment in Console, so the Integration client id/secret
 *     must come from the ndstealth1-test Console (Build > Applications).
 *   - DRY RUN BY DEFAULT. Without --apply it only reads and prints; it writes
 *     nothing.
 *   - --apply also requires --confirm-marketplace=<uuid>, where <uuid> is the
 *     marketplace id the dry run prints. This proves the credentials resolve to the
 *     marketplace you meant before anything is written.
 *   - Never overwrites a plan: only listings whose availabilityPlan is null are
 *     touched, and each one is re-read just before its update and skipped if a
 *     plan has appeared in the meantime.
 *   - Credentials come from env vars only (.env locally, never committed).
 *
 * ENV VARS (in .env; never commit values)
 *   SHARETRIBE_MARKETPLACE_ID             must be: ndstealth1-test
 *   SHARETRIBE_INTEGRATION_CLIENT_ID      Integration app client id (test env)
 *   SHARETRIBE_INTEGRATION_CLIENT_SECRET  Integration app client secret (test env)
 *   SHARETRIBE_TEST_MARKETPLACE_UUID      optional; if set, the resolved
 *                                         marketplace id must match it
 *
 * EXACT COMMANDS (run from the repo root)
 *   1. Dry run: lists the listings that would be updated, and prints the
 *      marketplace name + id. Writes nothing.
 *        node scripts/ops/backfill-availability-plans.js
 *
 *   2. Apply: paste the marketplace id printed by step 1.
 *        node scripts/ops/backfill-availability-plans.js --apply --confirm-marketplace=<marketplace-id-from-dry-run>
 *
 * The plan built here mirrors createAllOpenPlan(DEFAULT_AVAILABILITY_TIMEZONE) in
 * src/containers/EditListingPage/EditListingWizard/EditListingAvailabilityPanel/
 * availability.helpers.js. Node can't require that ES module directly, so it is
 * mirrored here; a jest parity test (availability.helpers.test.js) fails if the
 * two ever differ.
 * ---------------------------------------------------------------------------
 */

/* eslint-disable no-console */

const REQUIRED_MARKETPLACE_ID = 'ndstealth1-test';
const LISTING_TYPE = 'model-profile';
const DEFAULT_AVAILABILITY_TIMEZONE = 'Europe/London';
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const LISTING_STATES = 'draft,pendingApproval,published,closed';
const PER_PAGE = 100;

// Mirror of createAllOpenPlan(timezone).availabilityPlan (see header).
const buildDefaultAvailabilityPlan = (timezone = DEFAULT_AVAILABILITY_TIMEZONE) => ({
  type: 'availability-plan/time',
  timezone,
  entries: WEEKDAYS.map(dayOfWeek => ({
    dayOfWeek,
    startTime: '00:00',
    endTime: '00:00', // 00:00 -> 00:00 represents a full day
    seats: 1,
  })),
});

// A listing needs the backfill only if it is a live (not deleted) model-profile
// listing with no availability plan at all.
const needsBackfill = listing => {
  const attributes = listing?.attributes || {};
  return (
    !attributes.deleted &&
    attributes.publicData?.listingType === LISTING_TYPE &&
    attributes.availabilityPlan == null
  );
};

const parseArgs = argv => {
  const apply = argv.includes('--apply');
  const confirmArg = argv.find(a => a.startsWith('--confirm-marketplace='));
  const confirmMarketplace = confirmArg ? confirmArg.split('=')[1] : null;
  return { apply, confirmMarketplace };
};

const fail = message => {
  console.error(`\nSTOPPED: ${message}\n`);
  process.exit(1);
};

const requireEnv = name => {
  const value = process.env[name];
  if (!value) {
    fail(`missing env var ${name}. Set it in .env (see this file's header).`);
  }
  return value;
};

const queryAllListings = async integrationSdk => {
  const all = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await integrationSdk.listings.query({
      states: LISTING_STATES,
      page,
      perPage: PER_PAGE,
    });
    all.push(...(res?.data?.data || []));
    const totalPages = res?.data?.meta?.totalPages || 1;
    if (page >= totalPages) {
      return all;
    }
    page += 1;
  }
};

async function main() {
  const { apply, confirmMarketplace } = parseArgs(process.argv.slice(2));

  require('dotenv').config();

  // Guard 1: the configured target must be the test marketplace.
  const marketplaceId = process.env.SHARETRIBE_MARKETPLACE_ID;
  if (marketplaceId !== REQUIRED_MARKETPLACE_ID) {
    fail(
      `SHARETRIBE_MARKETPLACE_ID must be "${REQUIRED_MARKETPLACE_ID}" (got "${marketplaceId ||
        ''}"). This script only ever runs against the test marketplace.`
    );
  }

  const clientId = requireEnv('SHARETRIBE_INTEGRATION_CLIENT_ID');
  const clientSecret = requireEnv('SHARETRIBE_INTEGRATION_CLIENT_SECRET');

  const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');
  const integrationSdk = flexIntegrationSdk.createInstance({ clientId, clientSecret });

  // Guard 2: show which marketplace the credentials actually resolve to.
  const marketplaceRes = await integrationSdk.marketplace.show();
  const marketplace = marketplaceRes?.data?.data;
  const resolvedUuid = marketplace?.id?.uuid;
  const resolvedName = marketplace?.attributes?.name;
  console.log(`Marketplace (from the Integration API credentials):`);
  console.log(`  name: ${resolvedName}`);
  console.log(`  id:   ${resolvedUuid}`);
  console.log(`  target declared in env: ${marketplaceId}\n`);

  const expectedUuid = process.env.SHARETRIBE_TEST_MARKETPLACE_UUID;
  if (expectedUuid && expectedUuid !== resolvedUuid) {
    fail(
      `SHARETRIBE_TEST_MARKETPLACE_UUID (${expectedUuid}) does not match the marketplace these credentials resolve to (${resolvedUuid}).`
    );
  }

  // Guard 3: writing needs an explicit confirmation of the resolved marketplace id.
  if (apply && confirmMarketplace !== resolvedUuid) {
    fail(
      `--apply needs --confirm-marketplace=${resolvedUuid} (the id printed above). Check it is ${REQUIRED_MARKETPLACE_ID} before confirming.`
    );
  }

  const listings = await queryAllListings(integrationSdk);
  const targets = listings.filter(needsBackfill);
  const modelProfiles = listings.filter(
    l => l?.attributes?.publicData?.listingType === LISTING_TYPE
  );

  console.log(
    `Found ${listings.length} listings; ${modelProfiles.length} model-profile; ${targets.length} with no availability plan:\n`
  );
  targets.forEach(l => {
    console.log(`  ${l.id.uuid}  [${l.attributes.state}]  ${l.attributes.title}`);
  });

  const plan = buildDefaultAvailabilityPlan(DEFAULT_AVAILABILITY_TIMEZONE);

  if (!apply) {
    console.log('\nDRY RUN: nothing was written.');
    console.log('Plan that --apply would set on each listing above:');
    console.log(JSON.stringify(plan, null, 2));
    console.log(
      `\nTo apply: node scripts/ops/backfill-availability-plans.js --apply --confirm-marketplace=${resolvedUuid}`
    );
    return;
  }

  console.log(`\nAPPLYING to ${targets.length} listing(s) on ${REQUIRED_MARKETPLACE_ID}...`);
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const listing of targets) {
    const id = listing.id;
    try {
      // Re-read just before writing so a plan set in the meantime is never overwritten.
      const fresh = await integrationSdk.listings.show({ id });
      if (!needsBackfill(fresh?.data?.data)) {
        skipped += 1;
        console.log(`  skipped ${id.uuid} (now has a plan)`);
        continue;
      }
      await integrationSdk.listings.update({ id, availabilityPlan: plan });
      updated += 1;
      console.log(`  updated ${id.uuid}  ${listing.attributes.title}`);
    } catch (err) {
      failed += 1;
      console.log(`  FAILED  ${id.uuid}: ${err?.message || err}`);
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

module.exports = {
  buildDefaultAvailabilityPlan,
  needsBackfill,
  parseArgs,
  DEFAULT_AVAILABILITY_TIMEZONE,
  REQUIRED_MARKETPLACE_ID,
};

if (require.main === module) {
  main().catch(err => {
    console.error(`\nBackfill failed: ${err?.message || err}`);
    process.exit(1);
  });
}
