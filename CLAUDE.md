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
- Brand accent: **electric cobalt `#2B57FF`** (design-system `--accent-500`). Red is danger only. (Superseded the old crimson.) NOTE: the live `--marketplaceColor` is set from the Sharetribe Console branding asset — it must be set to `#2B57FF` in Console or it overrides the code default.

## Design system — USE FOR ALL UI WORK
The canonical reference is **[`design-system/DESIGN_SYSTEM.md`](design-system/DESIGN_SYSTEM.md)** (brand rules, every token with exact hex/px, component specs, full CSS). **Read it before building any UI.**
- **Tokens:** use the design-system CSS custom properties — colours (`--ink-*`, `--accent-*`, semantic aliases like `--text-primary`/`--surface-*`/`--border-hairline`), type (`--font-display` Bricolage, `--font-sans` Hanken, `--font-mono`, `--text-*` scale, `--weight-*`, `--leading-*`, `--tracking-*`), spacing (`--space-*`), radii/borders/shadows (`--radius-*`, `--border-*`, `--shadow-*`), motion (`--dur-*`, `--ease-*`). Defined in `src/styles/designTokens.css` (mirrors `design-system/tokens/`), imported by `marketplaceDefaults.css`. **Never invent new colours, fonts, spacing, or radii** — pull from these tokens.
- **Components:** match the `rt-*` specs (§9 + `design-system/components.css`) — `rt-btn`, `rt-field`/`rt-input`/`rt-select`/`rt-textarea`, `rt-check`/`rt-toggle`, `rt-tag`/`rt-chip`, `rt-badge`/`rt-dot`, `rt-avatar`, `rt-talent` (marketplace card), `rt-nav`, `rt-tabs`/`rt-segmented`. Rebuild them with the repo's patterns (React + CSS Modules on the tokens), preserving exact colours/type/spacing/radii/**states** (hover/active/focus rings). Fonts load via the Google Fonts `<link>` in `public/index.html`.
- **Rollout:** bridge-and-incremental — tokens/fonts are mapped globally (Sharetribe's `--fontFamily`/`--marketplaceColor`/`--colorPrimaryButton`/status colours now point at the DS tokens in `marketplaceDefaults.css`); rebuild/adopt components per screen as we touch them. Reference `design-system/reference/*.html` for the visual target.
- **Brand rules to respect:** one cobalt action per view; red = danger only; hairlines over shadows; no gradients; no emoji; Bricolage never italic (accent words in cobalt); green (not red) for availability.
- **Rollout status — components adopted (all verified live):**
  - ✅ **Foundation** — `designTokens.css` added + imported; global bridges in `marketplaceDefaults.css` (`--fontFamily`, `--marketplaceColor`, `--colorPrimaryButton`, status colours); Google Fonts `<link>` in `public/index.html`. Greys deliberately NOT bridged (near-identical, regression risk); `--borderRadiusMedium` stays 4px (= DS `radius-md`) — buttons/inputs set `radius-lg` (8px) explicitly.
  - ✅ **`rt-btn`** — global button classes in `marketplaceDefaults.css` (`buttonDefault`/`buttonPrimary`/`buttonPrimaryInline`/`buttonSecondary`/`buttonSecondaryInline`/`buttonSmall`): Hanken 700, `radius-lg`, `:active` translateY, focus-visible cobalt ring; secondary = white + ink-900 keyline. `Button.module.css` composes these. (`.socialButtonRoot` SSO buttons left as-is.)
  - ✅ **`rt-field`** — global `input`/`select`/`textarea` element rules + `.marketplaceInputStyles`: 16px Hanken, ink-200 border, `radius-lg`, 12×14 pad, ink-400 placeholder, focus = accent-500 border + 3px accent-100 ring. `--borderErrorField` already → `--colorFail`.
  - ✅ **`rt-check` / `rt-radio`** — `FieldCheckbox`/`FieldRadioButton` (SVG-based): checked = accent-500, unchecked box = ink-300, labels = DS text tokens. (Fixed a live `stroke: pink` radio-hover bug.) `FieldBoolean` renders a *select* (Yes/No), not a toggle — `rt-toggle` is unused.
  - ✅ **`rt-nav`** — `TopbarDesktop.module.css`: hairline bottom border (no shadow), links Hanken 600 secondary→primary (dropped the cobalt underline bars), notification dot recoloured cobalt.
  - ✅ **`rt-tab`** — `TabNavHorizontal.module.css` (also the auth Sign up/Log in tabs via `LinkTabNavHorizontal`): active = cobalt underline + primary text.
  - ✅ **`rt-chip`** — `SearchPage/PopupOpenerButton.module.css`: pill, Hanken 600, ink-200 border; **selected = ink-900** (not cobalt). NOTE: this marketplace uses the sidebar filter layout, so these popup chips may not be visible on `/s`.
  - ✅ **`rt-talent`** — `ListingCard` (search cards). ✅ **`rt-badge--verified`** — `VerifiedBadge`. ✅ **`rt-avatar`** — `Avatar.module.css`: flat ink-100 circle + Bricolage ink-600 monogram (gradient removed).
  - ⬜ **Not adopted (low-value/not wired):** `rt-segmented` (view/role toggles — may be disabled in config), `rt-badge--available`/`rt-dot` (net-new "available now" UI, not surfaced), `rt-toggle` (would require converting `FieldBoolean` select → switch).
- **Deploy/verify loop:** CSS-only DS edits don't change component snapshots (classNames unchanged). Gate with `CI=true node scripts/build.js`; push to `main` → Railway (~5 min); verify computed styles via the browser against the Railway URL.

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
4. ✅ Unified onboarding wizard — "About you" tab is now the FIRST step of the Create-your-profile wizard (before "Your details"). It renders the model's user-profile custom fields (`config.user.userFields`, from Console) and saves them to the user profile via `updateProfile`; fields remain editable in Account Settings too. New `EditListingProfilePanel/` (panel + form + CSS); wired through `EditListingWizardTab.js`, `EditListingWizard.js` (tab order, label/save keys, `hasRequiredProfileFields` gating, `currentUser` threaded into `tabCompleted`/`tabsActive`), and `EditListingPage.js` (`onUpdateProfile` dispatch + profile update state). Model fields themselves live in Sharetribe Console, not the repo — surfaced at runtime via `mergeUserConfig` in configHelpers.js.
   - **Location merged into "About you":** the standalone LOCATION tab is removed from the booking flow. The "About you" step has a city-level Google Places autocomplete (`FieldLocationAutocompleteInput`) which saves to the LISTING's `geolocation` + `publicData.location` (so location search keeps working). The old Console "City" user field was deleted, so location lives solely on the listing.
   - **"About you" is first and creates the draft:** it owns the **display name** (listing title) — moved out of "Your details" (whose title field is hidden when a title already exists, via `hasExistingTitle`). Because it's the first tab, in the new-listing flow "About you" CREATES the draft (`onCreateListingDraft`) using the display name + city + the single resolved listing type (`getListingTypeValues`, assumes one listing type: model-profile) and saves profile fields to the user — a dual save. `/l/new` now redirects to `tab: 'profile'` (routeConfiguration.js). PROFILE gating requires title + city + required profile fields.
   - Also fixed in this round: 72 mojibake strings in en.json (corrupted `…`/`•`/curly-quotes from an earlier hosted-microcopy import); and a tab-gating bug where the step after "About you" unlocked prematurely.
5. ✅ Profile-flow polish (review round 2):
   - **Optional fields** now show "(optional)" after the label — `getLabel` in `CustomExtendedDataField.js` appends it for any non-required custom field (app-wide).
   - **Portfolio** copy (`EditListingPhotosForm.addImagesTip`) now encourages a full portfolio (uploads are uncapped).
   - **"ID verified" → Verified badge:** the Console `id_verified` user field was changed to **metadata** scope (admin-only, removed from forms). New `VerifiedBadge` component (`src/components/VerifiedBadge/`, exported + `isUserVerified` helper) reads `profile.metadata.id_verified === 'verified'` and renders in `UserCard` (listing page "about the provider"). Operator sets it in Console.
   - **"Studio access"** field deleted in Console (was nonsensical for models).
   - **Rates consolidated on "Your rates":** half-day/hourly are Console listing fields (`half_day_rate`, `hourly_rate`) — now rendered on the Pricing tab beside the day rate (native price), not on Details. Shared keys in `EditListingWizard/rateFields.js`; excluded from the Details form/submit and the Details completion check; rendered + saved by `EditListingPricingPanel`/`Form`. Day-rate label changed to "Day rate".

## Phase 3 — Client discovery (in progress)
**Model attributes moved from USER fields → LISTING fields** so they're searchable and display natively (Sharetribe search/CustomListingFields read listings, not user profiles). The operator converted 14 public model-attribute fields to listing fields in Console and deleted the old user fields; `date_of_birth` (private) + `id_verified` (metadata badge) stay as user fields.
- **Wizard split:** "About you" (first tab) now collects only the **display name + city** (creates the draft + geolocation). All model attribute fields are standard listing fields collected on **"Your profile"** (the renamed Details tab, `tabLabelDetails` = "Your profile"). Rates stay on "Your rates". `EditListingProfilePanel`/`Form` stripped back to name+city; Details panel renders all listing fields except rates (`isRateListingField` filter); `EditListingWizard` gating: PROFILE = title+city, DETAILS = all-except-rates. (There is no `profileFields.js` — attributes are just normal Details listing fields.)
- **Profile-page display:** `ListingPage/CustomListingFields.js` detail gate changed from `isDetail` (opt-in) to `isDetail !== false` (opt-out), because the no-code Console doesn't set `isDetail` — otherwise enum/number attributes wouldn't show.
- **Search filters:** fields are `limitToListingTypeIds: ['model-profile']`, so `pickListingFieldFilters` (SearchPage.shared.js) hid them on `/s` when no type was selected. Fixed: falls back to all active listing types when none selected (single-type marketplace has no type selector).
- **Rates as currency:** half-day/hourly rate listing fields (`long`) are rendered as `FieldCurrencyInput` on "Your rates" and **stored as subunits** (like price); displayed via `formatMoney` in `CustomListingFields` (rate keys from `EditListingWizard/rateFields.js`).
- **Search result cards (rt-talent):** `ListingCard` rebuilt to the design-system talent card — portrait 4:5 photo with the Verified badge overlay, Bricolage name + rate, location eyebrow, meta line (gender · height · experience), category tags, "View" CTA. Attributes/tags read from `listing.publicData` via `getTalentCardData` (ListingCard.helpers.js); the search query now includes `profile.metadata` for the badge. This is the first design-system component build (see Design system section above).

## Phase 2 — done
_(Phase 2 onboarding tasks complete — see "Phase 2 development" above.)_

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
