# Exported marketplace config assets (`config/assets/`)

**Read-only snapshots** of the Sharetribe **hosted config assets** for the TEST marketplace
`ndstealth1-test`, exported via the Asset Delivery API. This is the config-as-code (Tier 1)
groundwork described in `docs/path-to-live-v1.md` (workstream 5) and planned in
`docs/config-as-code-hand-list.md`.

## Why this exists
There is no live marketplace yet. When one is created, its Console configuration must match what
was built and tested in `ndstealth1-test` — exactly, not approximately. These JSON files are the
authoritative **spec + diffable snapshot** of that configuration so live can be reproduced from a
known-good source instead of being hand-clicked from memory. See
`docs/config-as-code-status.md` for the full audit, the per-item apply-to-live plan, and the
mechanism blockers.

## How these were generated
```
node scripts/export-config-assets.js
```
The script reads each asset path (mirroring `src/config/configDefault.js` `appCdnAssets`) with
the Marketplace SDK using the **public** client ID. It performs **no writes** to any marketplace.
Re-run it any time to refresh the snapshot and `git diff` to see config drift.

## What's here
| File | Source asset | What it is |
|---|---|---|
| `listing-types.json` | `/listings/listing-types.json` | The `model-profile` type: unit `day`, process alias `default-booking/release-1`, its transaction fields (shoot description/type/location). |
| `listing-fields.json` | `/listings/listing-fields.json` | The 18 model-attribute listing fields (gender, measurements, rates, etc.). |
| `listing-search.json` | `/listings/listing-search.json` | Search **UI** config (which filters show on `/s`, sort options, price filter). |
| `user-types.json` | `/users/user-types.json` | `model` (provider) and `client` (customer) user types + signup field settings. |
| `user-fields.json` | `/users/user-fields.json` | User custom fields (company_name, date_of_birth, id_verified metadata, etc.). |
| `access-control.json` | `/general/access-control.json` | Approval toggles: listing-approval ON, user-approval OFF, transactions require permission ON. |
| `localization.json` | `/general/localization.json` | GBP, en-GB, week starts Monday. |
| `minimum-transaction-size.json` | `/transactions/minimum-transaction-size.json` | Minimum listing price (500 subunits). |
| `branding.json` | `/design/branding.json` | Marketplace colours (`#2b57ff`) + image asset refs (logo/favicon/etc.). |
| `layout.json` | `/design/layout.json` | Layout variant config. |
| `footer.json` | `/content/footer.json` | Footer content block config. |
| `SEARCH-SCHEMA.snapshot.txt` | `flex-cli search` | The server-side **search index** schema (distinct from the UI config above). Reference only. |

## Deliberately NOT exported
- `/integrations/map.json` — contains the Google Maps API key. That is a **per-env secret**
  (`REACT_APP_GOOGLE_MAPS_API_KEY`), and this repo is public. It stays in env vars only.
- `/content/translations.json` — app copy lives in `src/translations/en.json` (already in Git; the
  hosted translations asset is unused / overridden).
- Assets returning 404 (not configured in this marketplace): `listing-categories`, `top-bar`,
  `analytics`, `google-search-console`.

## Important: these are a SPEC, not an auto-apply source (yet)
Sharetribe offers **no write API/CLI** for these hosted config assets — they are edited only in the
Console no-code UI, or superseded by defining the same config in code
(`src/config/configListing.js` / `configUser.js`). See `docs/config-as-code-status.md` for the two
strategies and the recommended next step. Do **not** treat a `git diff` here as something a script
can push — nothing pushes these today.
