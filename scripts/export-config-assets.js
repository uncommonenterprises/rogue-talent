/**
 * export-config-assets.js — READ-ONLY export of Sharetribe hosted config assets.
 *
 * Fetches the marketplace configuration assets (listing types, listing fields,
 * user types, user fields, search/index schema, access control, branding, etc.)
 * from the Asset Delivery API using the Marketplace SDK and writes each one to
 * `config/assets/<name>.json` for version control.
 *
 * This is a groundwork tool for config-as-code (Tier 1). It performs NO writes to
 * any marketplace — it only reads published config assets via the public client ID.
 *
 * Usage:
 *   node scripts/export-config-assets.js
 *
 * Reads REACT_APP_SHARETRIBE_SDK_CLIENT_ID from .env (test marketplace only).
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sharetribeSdk = require('sharetribe-flex-sdk');

const CLIENT_ID = process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID;
if (!CLIENT_ID) {
  console.error('Missing REACT_APP_SHARETRIBE_SDK_CLIENT_ID in .env');
  process.exit(1);
}

// The asset paths the app itself loads (mirrors configDefault.js appCdnAssets),
// minus the binary/design-image ones. name -> asset path.
const ASSETS = {
  'listing-types': '/listings/listing-types.json',
  'listing-fields': '/listings/listing-fields.json',
  'listing-categories': '/listings/listing-categories.json',
  'listing-search': '/listings/listing-search.json',
  'user-types': '/users/user-types.json',
  'user-fields': '/users/user-fields.json',
  'access-control': '/general/access-control.json',
  localization: '/general/localization.json',
  'minimum-transaction-size': '/transactions/minimum-transaction-size.json',
  branding: '/design/branding.json',
  layout: '/design/layout.json',
  'top-bar': '/content/top-bar.json',
  footer: '/content/footer.json',
  analytics: '/integrations/analytics.json',
  'google-search-console': '/integrations/google-search-console.json',
  // NOTE: /integrations/map.json is deliberately NOT exported — it contains the
  // Google Maps API key, which is a per-env secret set via env var
  // (REACT_APP_GOOGLE_MAPS_API_KEY). This repo is public. Keep it out of Git.
};

const OUT_DIR = path.join(__dirname, '..', 'config', 'assets');

const sdk = sharetribeSdk.createInstance({ clientId: CLIENT_ID });

// Convert the SDK's SDKType-decorated response data to plain JSON.
const toPlain = data => JSON.parse(JSON.stringify(data, sharetribeSdk.util.replacer));

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (const [name, assetPath] of Object.entries(ASSETS)) {
    try {
      const res = await sdk.assetByAlias({ path: assetPath, alias: 'latest' });
      // Asset Delivery API shape: res.data = { data: <jsonAsset payload> }
      const payload = res.data.data;
      const plain = toPlain(payload);
      const file = path.join(OUT_DIR, `${name}.json`);
      fs.writeFileSync(file, JSON.stringify(plain, null, 2) + '\n');
      results.push(`  OK   ${name.padEnd(28)} <- ${assetPath}`);
    } catch (e) {
      const status = e && e.status ? e.status : '';
      const msg = e && e.message ? e.message : String(e);
      results.push(`  SKIP ${name.padEnd(28)} <- ${assetPath}  (${status} ${msg})`);
    }
  }
  console.log(results.join('\n'));
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
