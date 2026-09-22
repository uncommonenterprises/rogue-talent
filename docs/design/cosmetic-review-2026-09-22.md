# Rogue Talent — cosmetic / visual-polish review

**Author:** UX Designer (capstone review) · **Date:** 2026-09-22
**Scope:** design-only. No code touched.

> **Implementation status (2026-09-22, Neil green-lit "quick wins + global headings"):**
> ✅ IMPLEMENTED + merged (main): COS-02, 06, 07, 08, 21, 24, 25, 28, 33, 34 (one commit per id).
> 🔵 COS-01 (footer slogan) = **Neil, in Console** — chosen slogan: **"Professional talent, booked direct."**
> ⬜ Remaining Medium (COS-04/05, 09/10, 18, 22, 30, 31, 36) + Larger (COS-11, 20, 23, 27, 38) = not yet
> started; the 3 Larger rebuilds (profile page / checkout / transaction panel) are a proposed follow-on project. Grounded in `design-system/DESIGN_SYSTEM.md` +
`src/styles/designTokens.css` + `design-system/components.css` (the target), the actual
component/CSS-module code under `src/` (what exists), and the live test site
(`https://rogue-talent-production.up.railway.app`) fetched for content/structure.

Every recommendation below stays inside the existing token set — no new colours, fonts, spacing
or radii. Each item cites the file(s) to change and the exact DS token to use.

---

## Overall assessment

**What's already strong:** the design system itself is well specified and, where it's been
applied, it's applied faithfully. The **General landing page** (`LandingPageMarketing/`), the
**search-result talent card** (`ListingCard`), the **topbar** (`TopbarDesktop`), and the
**`AccountStatusBadge`** component are genuinely excellent — Bricolage display type, correct
ink/cobalt tokens, hairlines over shadow, one cobalt action per view. These are the reference
implementations; new work should copy their patterns.

**The core problem is uneven rollout, not bad design.** The DS was adopted screen-by-screen
(per CLAUDE.md's own rollout log), and the screens a client sees *first* (landing, search,
topbar) got it — but the screens where money and trust actually change hands (the **model
profile/booking page**, **checkout**, **the transaction/inbox thread**) are still running the
pre-DS Sharetribe template almost untouched: `--colorGrey*`, `h3`/`h4`/`h5` global composes,
2–4px radii, and heavy diffuse box-shadows. The visual "seam" between a polished search result
and the plain page it links to is the single biggest thing undermining the "best it can look"
goal.

**Top 5 themes to fix, in order of leverage:**

1. **Global heading typography never uses Bricolage.** `h1`–`h6` and the `.h1`–`.h6` utility
   classes in `marketplaceDefaults.css` are set in Hanken (`--fontFamily`), not
   `--font-display`. Every page that renders a plain heading (FAQ, Safety, Terms, listing-page
   subheads, checkout, transaction panel) is quietly off-brand as a result. One global fix, huge
   reach.
2. **A handful of specific, wrong colour uses of red/heavy-shadow leftovers** from the
   pre-rebrand template (`--colorFail` used for a non-error "draft" notice; a red notification
   dot where the topbar's own dot was already fixed to cobalt; `--boxShadowListingCard`'s 50px
   diffuse glow instead of the DS's quiet `--shadow-md`). Small, surgical, high-confidence fixes.
3. **The rate/price numeral isn't consistently Bricolage.** `ListingCard` gets it right
   (Bricolage 800, `--text-xl`); the booking panel's own price, the checkout price, and the
   model's own dashboard card price are all still Hanken. The same number should look the same
   everywhere.
4. **Modal chrome carries pre-rebrand decoration** — a heavy 8px solid cobalt bottom border and
   2px radius on every modal (auth, wizard payout dialog) — that reads as a leftover template
   accent bar, not the DS's "cobalt is a scalpel" restraint.
5. **The three highest-stakes screens (profile/booking page, checkout, transaction detail) need
   a real rebuild pass**, not a token swap — they're structurally still the stock Sharetribe
   layout. This is the honest "Larger" bucket item; everything else in this doc is smaller.

Also flagged live on the site and worth an immediate fix regardless of design process: the
**footer shows literal placeholder copy** — *"In Console, go to Content → Footer to add your
slogan here"* — visible twice on every single page. This isn't a code/token issue (the footer is
Console-hosted content) but it's the single most visible unfinished thing on the whole site.

---

## Per-screen findings

### 1. Landing pages (`GeneralLandingPage`, `ModelsLandingPage`, `ClientsLandingPage`)

Files: `src/containers/LandingPageMarketing/marketing.module.css`, `GeneralLandingPage.js`,
`MarketingNav.module.css`.

This is the best-executed surface in the codebase — hand-coded specifically to the DS mockup,
using `--font-display`/`--font-sans` correctly, `--space-*`/`--radius-lg` throughout, ink-950
dark sections, and a correct "one cobalt action" dual-path CTA pair (only the business card gets
a filled cobalt button; the model card stays ink-keyline). Two small things:

- **COS-09 — Hero scrim is a literal CSS gradient.** `.heroOverlay`
  (`marketing.module.css:124-133`) is `linear-gradient(90deg, rgba(10,10,11,.86) 0%, ... )` over
  the hero. The DS brand rule is explicitly "no gradients." This is a pragmatic
  photo-legibility scrim, not a decorative brand gradient, but it's worth a call: either accept
  it as a named exception (photo scrims only) or flatten it to a single flat tint (e.g.
  `rgba(10,10,11,.65)` solid, no direction) so the codebase has zero gradients to point to.
  Escalate to PM/brand-owner as a judgement call, not a straightforward fix.
- **COS-10 — Placeholder stripe pattern isn't standardised.** The hero background stripe
  (`repeating-linear-gradient(135deg, #15171c 0 22px, #1b1d23 22px 44px)`,
  `marketing.module.css:121`) uses a different scale/colour than the `rt-talent` placeholder
  stripe used on `ListingCard` and the landing page's own `.talentPhoto`/`.featureMedia` blocks
  (`#ECEDEF 0 10px, #F4F5F6 10px 20px` at `marketing.module.css:289`, vs. the DS spec's `0 12px /
  12px 24px`). Three slightly different "no photo yet" patterns exist across the codebase.
  Standardise on one stripe scale/colour pair wherever a photography placeholder is needed.
- **COS-11 — Real photography still needed.** `.featureMedia`/`.featureMediaPortrait` and the
  dark "trust" cards are flat/striped placeholder fills, not photography. This is a content gap,
  not a cosmetic-code fix — flag for asset sourcing, not the Developer.

### 2. Topbar / Nav + Footer

Files: `TopbarContainer/Topbar/TopbarDesktop/TopbarDesktop.module.css`, `FooterContainer/`.

Topbar is fully adopted per the CLAUDE.md rollout log and reads correctly: hairline bottom
border, Hanken 600 links, cobalt notification dot (`.notificationDot` correctly uses
`--accent-500`, not red — this is the reference fix the Inbox dot below should copy).

- **COS-01 — Footer placeholder copy is live.** Confirmed on the fetched homepage: *"In Console,
  go to Content → Footer to add your slogan here"* appears twice. This is Console-hosted content
  (`FooterContainer.js` renders whatever asset is configured; only the appended
  "Report a safety concern" row is repo-controlled). Not a code fix — flag to the PM to fix in
  Console directly. Given it's visible on every page, this should be the very first thing
  addressed, ahead of any of the token-level work below.
- **COS-14 — Footer visual fidelity can't be code-reviewed.** Because the footer is a Console
  asset rendered through `PageBuilder`/`SectionBuilder`, whether its type/colour/spacing matches
  the DS depends on what's configured in Console, not on anything in `src/`. **Needs a
  screenshot/pixel check** by the tester against the DS rather than a source read.

### 3. Auth (signup / login)

Files: `AuthenticationPage/AuthenticationPage.module.css`, `SignupForm/SignupForm.module.css`,
`LoginForm/LoginForm.module.css`.

Inputs/checkboxes/buttons here are fine — they inherit the globally-bridged `rt-field`/`rt-btn`
styles (border ink-200, radius-lg, accent focus ring). The modal *chrome* around them is legacy:

- **COS-04 — Modal has a heavy decorative cobalt bar.** `.marketplaceModalBaseStyles`
  (`marketplaceDefaults.css:1371-1395`) sets `border-bottom: 8px solid var(--marketplaceColor)`
  at `--viewportMedium`. This is the single most visible cobalt usage on the whole page (bigger
  than the actual submit button) and directly contradicts "cobalt is a scalpel... roughly one
  cobalt mark per view." Recommend removing the coloured border entirely (a plain
  `--border-hairline` top/no border reads calmer) or, if a differentiator is wanted, using a 2px
  `--border-bold` cobalt rule instead of 8px solid.
- **COS-05 — Modal radius is 2px, not `--radius-lg`.** Same rule block,
  `border-radius: var(--borderRadius)` (2px). DS spec for modals is `--radius-lg` (8px).
- **COS-16 — "Sign up"/"Log in" tab labels and modal titles are Hanken, not Bricolage.**
  `.tab` (`AuthenticationPage.module.css:47-72`) composes `marketplaceModalTitleStyles`, which is
  `font-weight: var(--fontWeightBold); font-size: 30px` in Hanken. This is the single largest
  piece of type on the page and should be a Bricolage display moment per brand rule 1
  (editorial structure). See the global fix in COS-02 below — fixing the global heading/title
  style fixes this for free.
- **COS-18 — Redundant hardcoded hex fallbacks.** `SignupForm.module.css:49,64` write
  `var(--colorGrey700, #4a4a4a)` and `var(--text-muted, #71757e)` — harmless (the custom
  properties always exist) but an inconsistent authoring pattern that's crept into several files.
  Low-priority hygiene pass: drop the hardcoded fallback hex site-wide once found.

**Needs a screenshot check:** the WebFetch of `/signup` only surfaced a user-type selector,
terms checkbox and submit button — no visible email/password/name fields in the fetched content.
This is very likely a fetch/rendering limitation (client-rendered form fields below the
user-type step), not a real bug, but the tester should click through the actual flow to confirm
every field renders and is styled consistently.

### 4. Search results page + `ListingCard` (rt-talent) grid

Files: `SearchPage/*`, `components/ListingCard/ListingCard.module.css`.

- **COS-19 — `ListingCard` is exemplary.** Hairline border, `--radius-lg`, `--shadow-md` +
  `translateY(-2px)` hover exactly per spec, Bricolage name/rate, ink-100 tag pills, secondary
  (non-cobalt) "View" button so a 4-up grid doesn't flood the view with the accent. No changes.
- **COS-20 — Filter sidebar doesn't use any DS component.** `FilterPlain.module.css` and
  `SearchFiltersPrimary.module.css` render a plain accordion: Grey700 labels
  (`.label { color: var(--colorGrey700) }`), a text-link "Reset all"
  (`SearchPage.module.css:111-136`, `composes: h5 from global`), `colorGrey100` hairlines. The
  live site confirmed this sidebar is dense — gender, height, hair/eye colour, ethnicity,
  experience level, ~13 category tags, availability radius, half-day/hourly rate, dates, travel
  cost, minimum notice, each its own collapsible group. None of it uses `rt-chip`/`rt-tag`. This
  is the least on-brand thing a client sees on first search, and it's also the densest UI in the
  product. **Larger** item: rebuild filter groups with the DS's hairline dividers
  (`--border-subtle` not `--colorGrey100`) and render category/attribute values as `rt-chip`
  pills, not plain checkbox rows.
- **COS-21 — Sort control has a heavy hover shadow and off-scale radius.**
  `SortBy.module.css:37-48`: `border-radius: var(--borderRadiusMedium)` (4px, not `--radius-lg`),
  and hover/focus use `box-shadow: var(--boxShadowFilterButton)` — a dark
  `0 4px 16px rgba(0,0,0,.2)` glow, much heavier than any DS shadow (`--shadow-md` is
  `0 8px 28px rgba(10,10,12,.08)`, an order of magnitude lighter). Recommend hover state match
  `rt-chip:hover` (`border-color: var(--ink-400)`, no shadow) instead.
- **COS-22 — "No results" empty state is unstyled.** `NoSearchResultsMaybe.module.css` composes
  plain `h4`/`h5` globals with `color: var(--marketplaceColor)` links. Given the live catalogue
  is small (search returned exactly 4 results), an empty/near-empty state is a real user path
  worth a proper on-brand treatment (eyebrow + message + `rt-btn--secondary` reset action)
  rather than default body text.

### 5. Listing / model profile page (hero, `UserCard`, gallery, booking panel)

Files: `ListingPage/ListingPage.module.css`, `ListingPage/UserCard/UserCard.module.css`,
`components/OrderPanel/OrderPanel.module.css`.

This is the page a client lands on right after being impressed by the search-result card, and
it's the least-adopted major surface in the product — still the stock Sharetribe template.

- **COS-23 — Whole page still runs on legacy tokens.** Detail rows border on `--colorGrey100`
  (`ListingPage.module.css:680`, should be `--border-hairline`/`--border-subtle`), hero/gallery
  corners use `var(--borderRadius)`/`var(--borderRadiusMedium)` (2–4px, `:70,124,242`) instead of
  `--radius-lg`, and the model's own display name renders via `.mainTitle { composes: h3 from
  global }` — Hanken bold, not the Bricolage the same name gets on the `ListingCard` one click
  earlier. **Larger** item: this page needs an actual rebuild pass, not a token swap, to bring it
  in line with the rest of the funnel.
- **COS-25 — Booking-panel price is Hanken, not Bricolage.** `OrderPanel.module.css:220-231`,
  `.priceValueInCTA { composes: h3 from global; color: var(--marketplaceColor) }` and
  `ListingPage.module.css:460-469` `.desktopPriceValue` (same pattern). Every other big numeral
  in the product (`ListingCard.rate`, the landing page `talentPrice`) is `--font-display`
  `--weight-extrabold`. The one price a client actually commits to paying should look at least as
  considered as the one that got them here. **Quick win**, high visual-consistency payoff: set
  `font-family: var(--font-display); font-weight: var(--weight-extrabold);
  letter-spacing: var(--tracking-tight)` on `.priceValueInCTA` and `.desktopPriceValue`.
- **COS-24 — Bio expand animation is 25x the DS's slowest duration.**
  `UserCard.module.css:33-43`, `.mobileBio`/`.desktopBio` use `transition: all 1s ease-in`. DS
  motion tops out at `--dur-slow` (380ms) for UI, `--dur-editorial` (640ms) for hero reveals; 1s
  linear-ish easing on a "show more" bio toggle will feel sluggish. **Quick win**: swap to
  `max-height var(--dur-base) var(--ease-standard)` (or whatever property actually animates).
- **COS-26 — Booking calendar chrome not verified.** `DatePicker/DatePickers/DatePicker.module.css`
  showed up in the hardcoded-hex grep sweep; I didn't fully trace its computed rendering.
  **Needs a screenshot check** of the booking calendar (colours, radius, selected/hover states)
  against `--datepicker*` tokens in `marketplaceDefaults.css`.

### 6. Checkout (StripePaymentForm + order breakdown + clickwrap/contract summary)

Files: `CheckoutPage/CheckoutPage.module.css`, `CheckoutPage/StripePaymentForm/*.module.css`.

Card/CVC inputs are fine (inherit the globally-bridged `rt-field` styles). Everything around
them is legacy — same pattern as the listing page.

- **COS-27 — Whole checkout surface is pre-DS.** `.detailsContainerDesktop`
  (`CheckoutPage.module.css:263-281`) is `border: 1px solid var(--colorGrey100); border-radius:
  2px`; `.licenceTerms` (the contract/licence-agreement disclosure box,
  `StripePaymentForm.module.css:133-138`) is `border: 1px solid var(--colorGrey100);
  border-radius: var(--borderRadiusMedium)` (4px). This is money- and consent-adjacent UI (the
  clickwrap the client legally agrees to before paying) and it currently looks the least
  finished of anything in the transaction flow. **Larger** item, same rebuild pass as COS-23:
  `--radius-lg` + `--border-hairline` on both the order-breakdown card and the licence box.
- **COS-28 — Red used for a non-error "draft" state.** `.licenceDraftNotice`
  (`StripePaymentForm.module.css:148-155`): `color: var(--colorFail)` on a
  `text-transform: uppercase` "this licence is a draft, not final" notice. A draft notice is an
  *attention/informational* state, not an error or destructive action — this is a direct brand-rule
  violation ("red means danger only"). **Quick win**: switch to `var(--status-warning)`
  (the amber ramp `AccountStatusBadge` already uses for "pending") — one line, one file.

### 7. "Create your profile" wizard + `AccountStatusBadge`

Files: `EditListingPage/EditListingWizard/EditListingWizard.module.css`,
`EditListingWizard/EditListingDetailsPanel/EditListingDetailsForm.module.css`,
`components/AccountStatusBadge/*`.

- **COS-32 — `AccountStatusBadge` is a model implementation.** Tint background + coloured dot +
  coloured text (never a solid saturated fill), amber ramp for "pending," correct on-dark
  handling via `.rt-on-ink`, colour is never the only signal (always paired with a text label).
  Point future cosmetic work at this file as the reference for "how a status/badge component
  should be built here."
- **COS-31 — "Your profile" (Details) panel already partially adopted; other panels likely
  aren't.** `EditListingDetailsForm.module.css:83-164` has genuinely nice DS work: tracked Hanken
  eyebrow section headings (`--text-xs`, `--tracking-wider`, `--text-muted`), and a "still
  needed" checklist rendered as `rt-tag--outline`-style pills. I did not have budget to read
  every other panel's CSS (Photos, Pricing, Location, Availability) — **flag for the Developer
  or tester to spot-check** whether they got the same eyebrow/chip treatment or are still on
  plain Sharetribe field styling; if not, extend the Details panel's pattern to them.
- **COS-30 — Wizard shell uses raw grey tokens instead of DS aliases.**
  `EditListingWizard.module.css:29-52`: `background-color: var(--colorGrey50)`,
  `border-top: 1px solid var(--colorGrey100)`, `box-shadow: var(--boxShadowLight)`. The values
  are numerically close to `--surface-subtle`/`--border-hairline` but reference a different
  token family, so a future palette tweak to one system won't propagate to the other.
  Low-visual-impact, pure hygiene: swap to the semantic DS aliases directly.

### 8. Model dashboard / `ManageListingsPage` + Account Settings / `ProfileSettingsPage`

Files: `ManageListingsPage/ManageListingCard/ManageListingCard.module.css`,
`ProfileSettingsPage/ProfileSettingsForm/ProfileSettingsForm.module.css`.

- **COS-33 — Card hover shadow is far heavier than the DS scale.**
  `ManageListingCard.module.css:15-26`, `.thumbnailContainer:hover` uses
  `box-shadow: var(--boxShadowListingCard)` = `0 0 50px 0 rgba(0,0,0,.1)` — a diffuse 50px
  all-around glow. The DS's own heaviest shadow, `--shadow-lg`, is a directional
  `0 24px 56px rgba(10,10,12,.10)`; the equivalent card-hover shadow used on `ListingCard` itself
  is `--shadow-md`. **Quick win**: swap to `--shadow-md` so a model's own dashboard card hovers
  the same way the public search card does.
- **COS-34 — Same "price should be Bricolage" gap, on the model's own dashboard.**
  `ManageListingCard.module.css:52-65`, `.priceValue`/`.perUnit` are Hanken semibold
  (`font-weight: var(--fontWeightSemiBold)`), not `--font-display`. Bundle with COS-25 as one
  cross-cutting "rate typography" fix (`ListingCard` is already correct and is the reference).
- **COS-07 / COS-35 — Hardcoded, off-token icon colour on "Edit"/"Change avatar" buttons.**
  `ManageListingCard.module.css:148` and `ProfileSettingsForm.module.css:150` both embed an
  inline SVG background-image with `stroke="%234A4A4A"` — a raw hex not in the ink ramp (closest
  DS token is `--ink-600` `#52565F`). Also both buttons sit at `border-radius: 2px`
  (`--borderRadius`), which reads as unintentionally sharp next to the fully round avatar/card
  it's attached to. **Quick win**: recolour the SVG stroke to the ink-600 hex and bump radius to
  at least `--radius-md`.
- **COS-36 — `ProfileSettingsForm` avatar placeholder border uses a dashed `--colorGrey100`/
  `--colorGrey300` treatment** (`ProfileSettingsForm.module.css:81-92`) rather than a DS hairline
  — visually close enough not to be jarring, but worth folding into the same hygiene pass as
  COS-30 once someone's in this file for the icon-colour fix above.

### 9. Transaction / Inbox pages

Files: `InboxPage/InboxPage.module.css`, `TransactionPage/TransactionPanel/*.module.css`,
`TransactionPage/ActionButtons/ActionButtons.module.css`.

- **COS-06 — Inbox unread-message dot is red.** `InboxPage.module.css:256-263`,
  `.notificationDot { background-color: var(--colorFail) }`. This is a plain "you have a new
  message" indicator, not an error or danger state — the exact same kind of dot in the Topbar
  (`TopbarDesktop.module.css:121-143`) was already correctly fixed to
  `background-color: var(--accent-500)` with an explicit code comment ("cobalt notification dot
  (red is reserved for danger)"). The Inbox list just wasn't updated to match. **Quick win**,
  one line, one file — and it's a genuine brand-rule violation, not a style preference.
- **COS-38 — `TransactionPanel` is the same "legacy template" surface as the listing page and
  checkout.** `TransactionPanel.module.css` composes `h3`/`h5` globals throughout, `.detailCard`
  border-radius is `2px` (`:262-268`), dividers use `--colorGrey100`. Same **Larger**-bucket
  rebuild candidate as COS-23/COS-27 — recommend treating these three (profile page, checkout,
  transaction panel) as one consistent "post-DS-rollout" project, since they share almost
  identical legacy patterns and would benefit from the same fix pass.
- One good sign worth calling out: the newer safety-specific additions in this same file
  (`.safetyAdvisory`, `.shootSummary`, `SafetyAdvisoryMaybe.js`, `ShootSummaryShare.js`,
  `TransactionPanel.module.css:535-621`) already reference DS tokens with graceful legacy
  fallbacks, e.g. `border: 1px solid var(--border-hairline, var(--colorGrey100))`. This is a
  solid interim pattern — recommend using it as the house style for any one-off addition to this
  file until the full rebuild happens, rather than reaching for `--colorGrey100` fresh.
- `ActionButtons.module.css` — plain but not wrong; its error text correctly uses `--colorFail`
  for an actual error state (no violation here, unlike COS-06/COS-28).

---

## Prioritised backlog

### Quick wins (high impact / low effort)

| ID | Item | File(s) |
|---|---|---|
| COS-01 | Fix live footer placeholder copy ("...add your slogan here", shown twice) — Console content fix, not code | Console footer asset |
| COS-06 | Inbox unread-message dot: `--colorFail` → `--accent-500` (match Topbar's own fix) | `InboxPage/InboxPage.module.css` |
| COS-28 | Licence "draft" notice: `--colorFail` → `--status-warning` (red misused for a non-error state) | `CheckoutPage/StripePaymentForm/StripePaymentForm.module.css` |
| COS-25 | Booking-panel price → Bricolage extrabold (matches `ListingCard`) | `components/OrderPanel/OrderPanel.module.css`, `ListingPage/ListingPage.module.css` (`.desktopPriceValue`) |
| COS-34 | Manage-listing dashboard price → Bricolage extrabold (same fix, different file) | `ManageListingsPage/ManageListingCard/ManageListingCard.module.css` |
| COS-21 | Sort control hover: drop heavy `--boxShadowFilterButton`, use `rt-chip`-style border hover; radius → `--radius-lg` | `SearchPage/SortBy/SortBy.module.css` |
| COS-24 | Bio show-more transition: `1s ease-in` → `var(--dur-base) var(--ease-standard)` | `ListingPage/UserCard/UserCard.module.css` |
| COS-33 | Manage-listing card hover shadow: `--boxShadowListingCard` (50px glow) → `--shadow-md` | `ManageListingsPage/ManageListingCard/ManageListingCard.module.css` |
| COS-07 | Hardcoded `#4A4A4A` icon stroke on Edit / Change-avatar buttons → ink-600 token; radius 2px → `--radius-md` | `ManageListingCard.module.css`, `ProfileSettingsPage/ProfileSettingsForm/ProfileSettingsForm.module.css` |
| COS-08 | Re-alias legacy `--boxShadow*` custom properties to the nearest DS `--shadow-*` value (one file, sitewide effect on every un-rebuilt component) | `styles/marketplaceDefaults.css` |

### Medium

| ID | Item | File(s) |
|---|---|---|
| COS-02 | Global heading pass: `h1`–`h3`/`.h1`–`.h3` → `--font-display`, `--weight-extrabold`, `--tracking-tight`; snap sizes to the DS scale (`--text-3xl`/`--text-4xl`/`--text-5xl`). Fixes COS-16 (auth modal titles) and every hosted PageBuilder page (FAQ/Safety/Terms) for free | `styles/marketplaceDefaults.css` |
| COS-04/05 | Remove/lighten the 8px solid cobalt modal bottom border; modal radius `2px` → `--radius-lg` | `styles/marketplaceDefaults.css` (`.marketplaceModalBaseStyles`) |
| COS-22 | Redesign "no search results" empty state (eyebrow + Bricolage message + `rt-btn--secondary` reset action) | `SearchPage/NoSearchResultsMaybe/NoSearchResultsMaybe.module.css` |
| COS-18 | Drop redundant hardcoded hex fallbacks on CSS custom properties (hygiene pass, repo-wide grep) | multiple (found in `SignupForm.module.css`, likely elsewhere) |
| COS-30 | Wizard shell: swap `--colorGrey50`/`--colorGrey100`/`--boxShadowLight` for `--surface-subtle`/`--border-hairline` directly | `EditListingWizard/EditListingWizard.module.css` |
| COS-31 | Audit remaining wizard panels (Photos, Pricing, Location, Availability) against the eyebrow+chip pattern already in the Details panel; extend if missing | `EditListingWizard/EditListingPhotosPanel/`, `.../EditListingPricingPanel/`, etc. |
| COS-36 | ProfileSettings avatar placeholder border → DS hairline pattern (bundle with COS-07 file touch) | `ProfileSettingsForm.module.css` |
| COS-09/10 | Landing-page hero scrim (flatten the gradient or accept as a named photo-scrim exception) + standardise the placeholder-stripe pattern to one scale/colour everywhere it's used | `LandingPageMarketing/marketing.module.css` |

### Larger

| ID | Item | File(s) |
|---|---|---|
| COS-23 | Full rebuild pass on the listing/model profile page: hero, gallery, `UserCard`, detail rows — hairlines not `colorGrey100`, `--radius-lg` not 2–4px, Bricolage name heading, `--shadow-md` hover to match `rt-talent` | `ListingPage/ListingPage.module.css`, `ListingPage/UserCard/UserCard.module.css` |
| COS-27 | Full rebuild pass on checkout: order-breakdown card + licence-agreement box → `--radius-lg`/`--border-hairline`; headings → Bricolage | `CheckoutPage/CheckoutPage.module.css`, `CheckoutPage/StripePaymentForm/*.module.css` |
| COS-38 | Full rebuild pass on `TransactionPanel` (post-booking detail/thread view) — same legacy pattern as COS-23/27; treat all three as one project since the fix is nearly identical each time | `TransactionPage/TransactionPanel/TransactionPanel.module.css` |
| COS-20 | Rebuild the search filter sidebar: hairline-divided groups, `rt-chip` pills for attribute/category values instead of plain checkbox rows, lighter "Reset all" treatment | `SearchPage/FilterPlain/`, `SearchPage/SearchFiltersPrimary/`, `SearchPage/SearchPage.module.css` |
| COS-11 | Source real photography to replace placeholder stripe fills (landing-page features/trust cards) — content/asset work, not a code fix | `LandingPageMarketing/` |

---

## Flagged for a pixel/screenshot tester pass (can't be confirmed from source alone)

- **Footer** (COS-14) — Console-hosted content; type/colour/spacing fidelity to the DS can't be
  verified by reading `src/`.
- **Booking calendar** (`DatePicker`) chrome on the listing page's `OrderPanel` (COS-26) —
  hardcoded hex values found via grep but computed rendering not traced.
- **FAQ / Safety / Terms / Privacy** pages — confirmed live via WebFetch to use `h1`/`h2`
  headings, but whether PageBuilder's hosted template renders them through the (currently Hanken)
  global heading styles or its own font-family needs a visual check, especially once COS-02
  ships — worth a before/after screenshot.
- **Signup form** — WebFetch only surfaced the user-type selector, terms checkbox and submit
  button on `/signup`; email/name/password fields should be present but weren't visible in the
  fetched markup. Very likely a fetch limitation, not a bug, but worth a tester click-through to
  confirm.
- **Mobile responsive breakpoints** generally — the CSS collapse rules (e.g.
  `marketing.module.css`'s `@media (max-width: 767px)` block, `SearchFiltersMobile`) look correct
  on paper but weren't visually verified at mobile widths.
- **Hover/focus states** across the board (talent-card hover, sort-button hover, manage-card
  hover) — CSS-only review confirms the rules exist but not their actual rendered feel/timing.

---

## Summary counts

- **Quick wins:** 10 items (COS-01, 06, 07, 08, 21, 24, 25, 28, 33, 34)
- **Medium:** 8 items (COS-02, 04/05, 09/10, 18, 22, 30, 31, 36)
- **Larger:** 5 items (COS-11, 20, 23, 27, 38)
- **Needs a tester screenshot pass:** 6 areas (footer, calendar, hosted content pages, signup
  form, mobile breakpoints, hover/focus states)
