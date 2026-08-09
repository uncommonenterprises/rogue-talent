# UX Review — Client discovery & search — 2026-08-09
Agent run: pm-2026-08-09-1400 | Test account: hi+rt-client-01@uncommonenterprises.co.uk | Build: abcfcb69d (repo HEAD; live deploy sha not verified this run)

> Run note — no live screenshots this run. The browser / computer-use MCP tools were not
> loaded in this session (ToolSearch disabled; `mcp__claude-in-chrome__*` and
> `mcp__computer-use__*` both returned "No such tool available"), so I could not walk the
> Railway site or capture `screenshots/*.png`. Every finding below is grounded in the exact
> shipping copy/logic that renders these screens; `Evidence:` cites file:line so each is
> verifiable and implementable without a screenshot. Recommend a re-run with browser access
> to attach visual evidence before Neil sets statuses.

Journey completes: discovery/search is functional in code — seeded published model (rt-model-03)
renders a talent card (photo, name, rate, location, meta, Verified badge) and a profile page with
attribute rows + rates. No blocker. Findings are trust/brand/copy on the surfaces a client judges
credibility by.

## RT-20260809-01 — Model profile page headed "About the listing author"
Journey:   client-discovery
Screen:    Model profile page (`/l/:id`) → author section heading
Severity:  friction
Evidence:  src/containers/ListingPage/SectionAuthorMaybe.js:45 → en.json:606 ("ListingPage.aboutProviderTitle": "About the listing author")
User view: "'The listing author'? I'm looking at a model I might book for a shoot, and the site calls her a 'listing author' like she posted a used sofa. Feels like a generic classifieds template, not a talent marketplace."
Proposal:  This is the single biggest credibility tell on the page a client uses to decide. Rewrite the heading to name the human: change `ListingPage.aboutProviderTitle` to "About {name}" (interpolate the display name via SectionAuthorMaybe, which already has `listing.author`), or if interpolation is out of scope, "About this model". Contradicts the shipped "models have a profile, not a listing" terminology decision (CLAUDE.md).
Touches:   src/translations/en.json (ListingPage.aboutProviderTitle), src/containers/ListingPage/SectionAuthorMaybe.js (pass author displayName if interpolating)
Effort:    S
Impact:    Med-high — trust on the profile page is the last step before a client decides to book; off-brand "listing author" copy undercuts it site-wide.
---
Status: PENDING
Note:

## RT-20260809-02 — Empty search result reads like a broken classifieds site
Journey:   client-discovery
Screen:    Search `/s` → no-results state
Severity:  friction
Evidence:  src/translations/en.json:1005 ("SearchPage.noResults": "Couldn't find any listings that match your search criteria.")
User view: "No listings? I'm not searching listings, I'm looking for a model. And now what — do I clear something? Is it broken? There's nothing telling me what to do next."
Proposal:  The journey's own bar is "distinguish 'no results' from 'broken'." Rewrite brand-voiced and action-first: "No models match those filters — yet. Try widening your dates, loosening a filter, or {resetLink}." Wire `{resetLink}` to the existing reset handler (en.json `SearchPage.resetAllFilters` = "Reset filters" already exists) so the recovery action sits inside the empty state, not only in the sidebar. Replace "listings" with "models" everywhere in this string.
Touches:   src/translations/en.json (SearchPage.noResults), src/containers/SearchPage/* (inject reset link into the no-results copy)
Effort:    S
Impact:    Med — an empty state that looks broken is a silent exit point; a clear recovery CTA keeps the search alive.
---
Status: PENDING
Note:

## RT-20260809-03 — Result count and section headings say "results"/"Details", not the marketplace's language
Journey:   client-discovery
Screen:    Search `/s` results header + model profile "Details" section
Severity:  polish
Evidence:  src/translations/en.json:647 ("MainPanelHeader.foundResults": "{count} {plural result/results}"); en.json:611 ("ListingPage.detailsTitle": "Details")
User view: "'12 results.' Results of what? And the profile just says 'Details' over a block of measurements — reads like a spec sheet, not a model's card."
Proposal:  Small brand-voice pass on the two most-seen discovery labels. Results header: "{count, plural, one {# model} other {# models}}". Profile section: rename `ListingPage.detailsTitle` from "Details" to "Stats" (the block is height/measurements/hair/eye/experience — "Stats" is the industry word and matches the onboarding "Your stats" grouping already proposed for the wizard).
Touches:   src/translations/en.json (MainPanelHeader.foundResults, ListingPage.detailsTitle)
Effort:    S
Impact:    Low-med — reinforces the "talent marketplace, not classifieds" positioning on every search and every profile.
---
Status: PENDING
Note:

## RT-20260809-04 — Talent card CTA "View" is a bare verb
Journey:   client-discovery
Screen:    Search result card (rt-talent)
Severity:  polish
Evidence:  src/components/ListingCard/ListingCard.js:221 → en.json:595 ("ListingCard.viewProfile": "View")
User view: "'View'… view what? I assume the profile, but on a card next to a rate and a name it's ambiguous — am I viewing photos, viewing availability?"
Proposal:  Make the card CTA name its destination: "View profile". The key is literally named `viewProfile` but its value is "View" — set the value to "View profile". Keeps the design-system card intact (single-word-to-two-word change, no layout risk on the 4:5 card foot).
Touches:   src/translations/en.json (ListingCard.viewProfile)
Effort:    S
Impact:    Low — small clarity gain on the primary discovery affordance.
---
Status: PENDING
Note:

## RT-20260809-05 — Card meta line silently blank when a published model skipped optional attributes
Journey:   client-discovery
Screen:    Search result card (rt-talent) — meta line + tags
Severity:  polish
Evidence:  src/components/ListingCard/ListingCard.helpers.js:120-146 (getTalentCardData: metaParts = [gender, height, experience].filter(Boolean); categories from modelling_categories) — renders nothing when those publicData keys are absent.
User view: "Some cards show 'Female · 178cm · Experienced' with category tags; others are just a name and a rate. The sparse ones look half-finished, like the model didn't bother — I'll skip them."
Proposal:  A published profile with an empty meta line reads as low-quality and depresses click-through. Two options: (a) enforce at least gender+height+one category as required to publish (Console listing-field required flags) so no live card is bare; or (b) in `getTalentCardData`, when `metaParts` is empty, fall back to a single neutral chip (e.g. category-only, or "New face" when experience is entry-level) so every card carries at least one signal. Prefer (a) for data quality, (b) as the safety net.
Touches:   src/components/ListingCard/ListingCard.helpers.js, Sharetribe Console (required flags on gender/height_cm/modelling_categories)
Effort:    M
Impact:    Med — bare cards are a discovery drag; every card earning a meta line lifts result-page engagement.
---
Status: PENDING
Note:

## RT-20260809-06 — Currency-mismatch price fallback shows a raw code with no explanation
Journey:   client-discovery
Screen:    Search result card — price block when listing currency ≠ GBP
Severity:  polish
Evidence:  src/components/ListingCard/ListingCard.helpers.js:10-27 (priceData → en.json ListingCard.unsupportedPrice renders the bare currency code)
User view: "This card just shows a currency code where the day rate should be. Is that a bug? Can I even book them?"
Proposal:  Low-frequency (marketplace is GBP-only today) but a jarring dead-signal if any non-GBP listing slips in. Confirm `ListingCard.unsupportedPrice` copy is human ("Rate on request" rather than a code), and log/monitor so a mispriced profile is caught operator-side rather than shown to clients. Ranked last — verify-and-tidy, not a hot path.
Touches:   src/translations/en.json (ListingCard.unsupportedPrice / unsupportedPriceTitle)
Effort:    S
Impact:    Low — edge case in a single-currency marketplace; tidy for robustness.
---
Status: PENDING
Note:
