# Rogue Talent — Claude Code Briefing

## What this project is
Rogue Talent (roguetalent.co) is a two-sided marketplace for professional models and clients. It disrupts the traditional agency model by letting models book directly with clients — no agency taking 30%. Built on the Sharetribe Web Template (React/Node.js), connected to a Sharetribe Extend marketplace backend.

## Architecture
- **Frontend/server:** This repo — Sharetribe Web Template (React + Express SSR)
- **Marketplace backend:** Sharetribe Extend — https://console.sharetribe.com/o/ndstealth1/m/ndstealth1-test/
- **Live dev URL:** https://rogue-talent-production.up.railway.app (Railway, auto-deploys from main)
- **Payments:** Stripe Connect (GBP)
- **Maps:** Google Maps API key AIzaSyAukffGuSop5-olv_RSrcyAgBgMePdELqc

## User types
- **Model** (userType: `model`) — provider role. Posts their profile as a listing. Sets rates, availability, portfolio.
- **Client** (userType: `client`) — customer role. Searches and books models.

## Key decisions already made
- Models CREATE A PROFILE (not "post a listing") — all listing/profile terminology has been updated in en.json
- The listing type is `model-profile` with calendar booking (daily unit)
- Commission: 10% provider + 5% customer
- All users require manual admin approval before full access
- Brand colour: #c41e3a (crimson red)

## Translation changes already made (en.json)
- "Post a new listing" → "Create your profile" (nav, topbar, manage page)
- Wizard tabs: Details→"Your details", Photos→"Your portfolio", Pricing→"Your rates", Location→"Your location", Availability→"Your availability"
- "Publish listing" → "Submit for review"
- "Manage your listings" → "Your profile"
- "Listing title" field → "Your display name", placeholder → "e.g. Fashion & Editorial Model"

## Phase 2 development — what's been done
1. ✅ Terminology/language changes (en.json commit b82fb2c3d1)
2. ✅ Post-signup redirect for models — models (userType = 'model') are redirected to `/l/new` (Create your profile) after signup instead of the default landing page (commit 0ad369239). Follow-ups: email-verification 'Later' link points models to profile creation (ccd65f868); own-profile banners use profile-first wording (272dac672).
3. ✅ Wizard step guidance copy — each Create-your-profile panel (details, portfolio, rates, location, availability) now shows a model-specific guidance paragraph beneath its heading (commit 147547baf). Adds a `.guidance` style per panel CSS module + five `*.guidance` keys in en.json.
4. ✅ Unified onboarding wizard — new "About you" tab added to the Create-your-profile wizard (after "Your details") that renders the model's user-profile custom fields (`config.user.userFields`, from Console) and saves them to the user profile via `updateProfile`. Fields remain editable in Account Settings too. New `EditListingProfilePanel/` (panel + form + CSS); wired through `EditListingWizardTab.js`, `EditListingWizard.js` (tab order, label/save keys, `hasRequiredProfileFields` gating, `currentUser` threaded into `tabCompleted`/`tabsActive`), and `EditListingPage.js` (`onUpdateProfile` dispatch + profile update state). Model fields themselves live in Sharetribe Console, not the repo — surfaced at runtime via `mergeUserConfig` in configHelpers.js.
   - **Location merged into "About you":** the standalone LOCATION tab is removed from the booking flow. The "About you" step now also has a city-level Google Places autocomplete (`FieldLocationAutocompleteInput`) which saves to the LISTING's `geolocation` + `publicData.location` (so location search keeps working) — a dual save (profile→user, city→listing). The old Console "City" user field is excluded from the form via `CITY_PROFILE_FIELD_KEYS` (keys: city/town/location) — **remove that field in Console to retire it fully**; if its key differs, update that constant. PROFILE tab gating also requires the city to be set.
   - Also fixed in this round: 72 mojibake strings in en.json (corrupted `…`/`•`/curly-quotes from an earlier hosted-microcopy import); and a tab-gating bug where the step after "About you" unlocked prematurely.

## Phase 2 — current task (do this next)
_(none queued — Phase 2 onboarding tasks complete; define next priorities)_

## Phase 2 — upcoming tasks (after current)
_(none queued)_

## Environment variables (set in Railway)
```
REACT_APP_SHARETRIBE_SDK_CLIENT_ID=5b1ca222-2626-4f0c-afd8-929af29de2b1
SHARETRIBE_SDK_CLIENT_SECRET=882a986433265d752d6a9a2198f4c01dd27d7e90
REACT_APP_MARKETPLACE_NAME=Rogue Talent
REACT_APP_MARKETPLACE_ROOT_URL=https://rogue-talent-production.up.railway.app
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyAukffGuSop5-olv_RSrcyAgBgMePdELqc
REACT_APP_ENV=development
```

## Key files to know
- `src/translations/en.json` — all user-facing strings
- `src/config/configBranding.js` — brand colour, logo (overridden by Sharetribe Console branding asset)
- `src/styles/marketplaceDefaults.css` — CSS variables
- `src/containers/EditListingPage/` — the "Create your profile" wizard
- `src/containers/AuthenticationPage/` — signup/login flow
- `src/routeConfiguration.js` — app routing

## Deployment
Every push to `main` automatically deploys to Railway. Build takes ~5 minutes. Check https://rogue-talent-production.up.railway.app after pushing.

## GitHub
Repo: https://github.com/uncommonenterprises/rogue-talent
Push directly to main for now (no PR review process yet).
