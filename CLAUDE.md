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

## Phase 2 — current task (do this next)
**Improve wizard step copy:** Add model-specific guidance/description text to each Create-your-profile wizard panel (Your details, Your rates, Your portfolio, Your availability, Your location). Self-contained copy work in en.json + EditListingPage panels.

## Phase 2 — upcoming tasks (after current)
1. Unified onboarding wizard — merge user profile fields (measurements, gender, experience level, modelling categories etc.) with listing fields into one coherent wizard flow. Currently these are split: profile fields live in Account Settings, listing fields in the Create your profile wizard.

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
