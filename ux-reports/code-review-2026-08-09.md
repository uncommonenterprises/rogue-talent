# Static code read — 2026-08-09 (NOT a journey walk)

> ⚠️ **This is a source-code read, not a PM journey.** On 2026-08-09 the
> product-manager agent was asked to walk Journeys 2 (client discovery), 3
> (booking money-path) and 6 (auth/account), but the Playwright browser tools
> were unavailable, so **no journey was actually walked and no screenshots
> exist.** Rather than fabricate a walkthrough, the agent grounded these findings
> in shipping code (`file:line`). They are kept here because several are real —
> but they are **not journey findings** and do **not** carry approval-gate status.
> The real Journeys 2/3/6 are to be **re-run properly once Playwright is back**;
> their proposals will live in `ux-reports/proposals/` then.


---

## Journey client-discovery — code-read findings

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

### CR-20260809-01 — Model profile page headed "About the listing author"
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

### CR-20260809-02 — Empty search result reads like a broken classifieds site
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

### CR-20260809-03 — Result count and section headings say "results"/"Details", not the marketplace's language
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

### CR-20260809-04 — Talent card CTA "View" is a bare verb
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

### CR-20260809-05 — Card meta line silently blank when a published model skipped optional attributes
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

### CR-20260809-06 — Currency-mismatch price fallback shows a raw code with no explanation
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

---

## Journey booking-money-path — code-read findings

# UX Review — Booking request (money-path) — 2026-08-09
Agent run: pm-2026-08-09-1420 | Test account: hi+rt-client-01@uncommonenterprises.co.uk | Build: abcfcb69d (repo HEAD; live deploy sha not verified this run)

Likely blocker (per seeded-data constraint): a client can pick dates and see the price + 15%-fee breakdown on the profile, but **checkout dead-ends at the Stripe payout guard** — the seeded model has no Stripe payout connected, so the speculative transaction fails with `providerStripeAccountMissingError` and the money-path cannot complete. Reported as RT-20260809-07 (and the dead-end copy is the fix regardless of whether payout is later connected). Everything up to payment (date calendar, "Booking breakdown", 15% fee line) is reachable.

> Run note — no live screenshots this run. Browser / computer-use MCP tools were not loaded
> (ToolSearch disabled; `mcp__claude-in-chrome__*` and `mcp__computer-use__*` returned "No such
> tool available"). Findings are grounded in the exact shipping copy/logic; `Evidence:` cites
> file:line. Recommend a re-run with browser access to attach visual evidence and to confirm
> whether rt-model-03's payout is connected before Neil sets statuses.

### CR-20260809-07 — Checkout dead-ends at the payout guard with an off-brand "contact support" message
Journey:   booking-money-path
Screen:    CheckoutPage (`/l/:id/checkout`) → speculative-transaction error
Severity:  blocker
Evidence:  src/containers/CheckoutPage/ErrorMessages.js:88-91 → en.json:88 ("CheckoutPage.providerStripeAccountMissingError": "This listing is currently unavailable because the listing author hasn't added their payout details yet. Please contact support.")
User view: "I picked my dates, saw the price, hit Request to book — and now a red error says the listing is 'unavailable' and to 'contact support'. Is the model real? Is the site broken? There's no support link and no way forward. I'm gone."
Proposal:  Two parts. (1) Product: models with no payout should not be bookable-looking in the first place — surface "not yet accepting bookings" on the profile/card and hide/disable the booking CTA there, so the client never reaches a dead checkout (this is the completion-rate lever). (2) Copy, immediately: rewrite the message to stop blaming a faceless "listing author", drop "contact support" as the only exit, and give a way back — e.g. "This model isn't set up to take bookings just yet. {browseLink}" with `{browseLink}` = "Browse other models" routing to `/s`. Replace "listing author" with the model's display name if available.
Touches:   src/translations/en.json (CheckoutPage.providerStripeAccountMissingError), src/containers/CheckoutPage/ErrorMessages.js (add browse link), src/containers/ListingPage/* + ListingCard (gate the booking CTA on payout-connected)
Effort:    L (product gate) / S (copy-only interim)
Impact:    Highest on this journey — this is where a ready-to-pay client hits a wall and leaves; even the copy-only interim converts a dead end into a redirect.
---

### CR-20260809-08 — CTA says "Book now" but it's a request the model must accept
Journey:   booking-money-path
Screen:    Model profile → OrderPanel primary CTA
Severity:  friction
Evidence:  src/components/OrderPanel/OrderPanel.js:590-591 → en.json:785 ("OrderPanel.ctaButtonMessageBooking": "Book now"). The form's own submit is "Request to book" (en.json:45, BookingDatesForm.requestToBook) and the live process is request→provider-accept (default-booking).
User view: "The button said 'Book now' so I thought she was booked. Then the next screen calls it a 'request' and later I get told she has to accept. Which is it? If she can say no, don't tell me it's booked."
Proposal:  Align the promise with the mechanic. Change `OrderPanel.ctaButtonMessageBooking` from "Book now" to "Request to book" (matches the form submit and the accept-based process). "Book now" implies instant confirmation the process can't deliver and erodes trust at the money moment.
Touches:   src/translations/en.json (OrderPanel.ctaButtonMessageBooking)
Effort:    S
Impact:    Med-high — sets the correct expectation before payment; prevents the "I thought I'd booked" confusion and post-request support pings.
---

### CR-20260809-09 — The 15% fee is unlabelled and unexplained at the exact moment it matters
Journey:   booking-money-path
Screen:    Booking breakdown (profile estimate + checkout) → customer fee line
Severity:  friction
Evidence:  src/components/OrderBreakdown/LineItemCustomerCommissionMaybe.js:54-57 → en.json:771 ("OrderBreakdown.commission": "{marketplaceName} fee *") + en.json:772 ("commissionFeeNote": "* The fee helps us run this platform and provide the best possible service to you!")
User view: "There's a 'Rogue Talent fee' added on with an asterisk that says it 'helps us run the platform and provide the best service' — generic filler. How much is it, why am I paying it, and is the model getting a cut too?"
Proposal:  This is the money screen — the place to make the fee feel fair and land the core wedge. Name the number and the promise. Rewrite `commissionFeeNote` to: "* A flat 15% booking fee. Your model keeps 100% of their rate — no agency markup." (Optionally show "(15%)" inline in the label so the amount is legible next to the figure.) This turns an unexplained add-on into the brand's differentiator at the decision point.
Touches:   src/translations/en.json (OrderBreakdown.commission, OrderBreakdown.commissionFeeNote)
Effort:    S
Impact:    High — reframes the fee from surprise-cost to fairness signal and reinforces "model keeps 100%" precisely where price sensitivity peaks.
---

### CR-20260809-10 — "You won't be charged yet" without saying when you will be
Journey:   booking-money-path
Screen:    OrderPanel fine print under the submit button
Severity:  friction
Evidence:  src/components/OrderPanel/SubmitFinePrint/SubmitFinePrint.js:27 → en.json:795 ("OrderPanel.youWontBeChargedInfo": "You won't be charged yet")
User view: "'You won't be charged yet.' Yet — so when? When she accepts? Right away? I'm about to enter a card; I want to know exactly what triggers the charge."
Proposal:  Complete the sentence with the actual trigger. Rewrite to: "You won't be charged until {name/your model} accepts. If they decline or don't respond, nothing is taken." (Match the real accept window/behaviour of the live default-booking process.) A one-line expectation here removes the biggest pre-payment hesitation on a request-to-book flow.
Touches:   src/translations/en.json (OrderPanel.youWontBeChargedInfo), src/components/OrderPanel/SubmitFinePrint/SubmitFinePrint.js
Effort:    S
Impact:    Med — reduces card-entry hesitation and "when am I charged?" support contacts.
---

### CR-20260809-11 — Cancellation policy is invisible at the point of paying
Journey:   booking-money-path
Screen:    CheckoutPage / OrderPanel — before card entry
Severity:  friction
Evidence:  No cancellation/refund terms rendered in the booking flow (SubmitFinePrint.js shows only "won't be charged"); the three-tier policy lives only in FAQ/terms per docs/ux-journeys.md §4 and the booking-process design commits.
User view: "I'm committing money for a shoot date. What happens if the shoot falls through — do I get it back? There's nothing here about cancellation before I pay."
Proposal:  Surface the cancellation terms where the money decision is made, not buried in FAQ. Add one line + link near the submit fine print: "Free cancellation up to 72h before the shoot. See {cancellationPolicyLink}." Even while the three-tier logic isn't yet enforced in the transaction process (known gap), showing the policy the marketplace intends to honour builds trust at checkout and sets expectations. Coordinate wording with whatever the process will actually enforce so copy and money never diverge.
Touches:   src/translations/en.json (new OrderPanel cancellation key), src/components/OrderPanel/SubmitFinePrint/SubmitFinePrint.js (render link)
Effort:    S
Impact:    Med — cancellation clarity is a top trust driver on high-value bookings; its absence at checkout is a silent hesitation.
---

### CR-20260809-12 — "Booking start / Booking end" reads oddly for a day-rate shoot
Journey:   booking-money-path
Screen:    Booking breakdown — booking date rows
Severity:  polish
Evidence:  src/translations/en.json:44 ("BookingDatesForm.priceBreakdownTitle": "Booking breakdown"), :768-769 ("OrderBreakdown.bookingStart": "Booking start" / "bookingEnd": "Booking end")
User view: "'Booking start' / 'Booking end' — I'm booking shoot days, not a hotel stay. Minor, but it reads like a rental template."
Proposal:  Light relabel to the domain: "Booking breakdown" → "Your booking"; "Booking start/end" → "Shoot dates" (or "First day"/"Last day"). Cosmetic, but it's the difference between feeling built-for-fashion and feeling like a generic rentals fork. Ranked last on this journey.
Touches:   src/translations/en.json (BookingDatesForm.priceBreakdownTitle, OrderBreakdown.bookingStart, OrderBreakdown.bookingEnd)
Effort:    S
Impact:    Low — brand polish on the breakdown; no completion effect.
---

---

## Journey auth-account — code-read findings

# UX Review — Auth & account basics — 2026-08-09
Agent run: pm-2026-08-09-1440 | Test account: hi+rt-client-01@uncommonenterprises.co.uk (+ role checks vs rt-model-03) | Build: abcfcb69d (repo HEAD; live deploy sha not verified this run)

Journey completes: login, logout, password-reset request, and Account/Contact-details editing are
all wired and reachable in code; the topbar is role-aware (providers see "Requests", customers see
"My bookings"). No blocker. Findings are brand voice on the returning-user front door and a
terminology contradiction in the profile menu.

> Run note — no live screenshots this run. Browser / computer-use MCP tools were not loaded
> (ToolSearch disabled; `mcp__claude-in-chrome__*` and `mcp__computer-use__*` returned "No such
> tool available"). Findings are grounded in exact shipping copy/logic; `Evidence:` cites
> file:line. One item (RT-...-16) needs a Console value confirmed — flagged as verify. Recommend
> a re-run with browser access to attach visual evidence before Neil sets statuses.

### CR-20260809-13 — Login page is generic Sharetribe boilerplate — the returning-user front door has no brand
Journey:   auth-account
Screen:    Log in (`/login`)
Severity:  friction
Evidence:  src/translations/en.json:637-646 (LoginForm.emailLabel "Email", emailPlaceholder "jane.doe@example.com", passwordPlaceholder "Enter your password…", logIn "Log in")
User view: "Every marketing page screamed 'go rogue' — then I log back in through a form that could belong to any SaaS. 'jane.doe@example.com'. It's fine, but it's nobody's brand."
Proposal:  Give the log-in its own voice — it's the screen returning models and clients see most. Add a branded heading/subhead ("Welcome back" / "Back to it.") and fashion-flavoured placeholders (email "you@studio.com"; keep the password placeholder). Mirrors the already-backlogged signup brand-voice item so the two auth screens match. Copy-only; no logic change.
Touches:   src/translations/en.json (LoginForm.* / AuthenticationPage login heading keys), src/containers/AuthenticationPage/LoginForm/LoginForm.js if a heading is added
Effort:    S
Impact:    Med — highest-frequency auth surface; cheap brand consistency win for every returning user.
---

### CR-20260809-14 — Profile menu still says "Your listings" — contradicts the shipped "profile, not listings" decision
Journey:   auth-account
Screen:    Topbar avatar → profile dropdown (models)
Severity:  friction
Evidence:  src/containers/TopbarContainer/Topbar/TopbarDesktop/TopbarDesktop.js:84 → en.json:1232 ("TopbarDesktop.yourListingsLink": "Your listings"); mobile equivalent en.json:1243 ("TopbarMobileMenu.yourListingsLink": "Your listings")
User view: "I have one profile, but the menu says 'Your listings' — plural. Did I accidentally create several? Which one do clients see?"
Proposal:  A model has exactly one profile — the whole terminology system was moved to "Create your profile" / "My profile" (CLAUDE.md, en.json changes). This dropdown was missed. Change `TopbarDesktop.yourListingsLink` and `TopbarMobileMenu.yourListingsLink` from "Your listings" to "Your profile". Purely a string change; the target (ManageListingsPage) is unchanged.
Touches:   src/translations/en.json (TopbarDesktop.yourListingsLink, TopbarMobileMenu.yourListingsLink)
Effort:    S
Impact:    Med — removes a "why do I have multiple listings?" confusion and closes a gap in the terminology decision the rest of the app already honours.
---

### CR-20260809-15 — Email-verification nag close button is a shouty all-caps "LATER"
Journey:   auth-account
Screen:    Post-signup / re-login email-verification banner
Severity:  polish
Evidence:  src/translations/en.json:31 ("AuthenticationPage.verifyEmailClose": "LATER")
User view: "The dismiss option is 'LATER' in shouting caps next to warm sentence-case copy — jarring, and it reads more like an ultimatum than a friendly skip."
Proposal:  Sentence-case and soften to match the surrounding tone (and the model-specific "Set up your profile now — verify later" line already added at :34): change to "Later" or "Do this later". One-word polish on a screen every new user hits.
Touches:   src/translations/en.json (AuthenticationPage.verifyEmailClose)
Effort:    S
Impact:    Low — small tonal consistency fix on a high-traffic screen.
---

### CR-20260809-16 — Verify that clients don't see "Create your profile" / "Your listings" in the topbar
Journey:   auth-account
Screen:    Topbar (logged-in client, rt-client-01)
Severity:  friction
Evidence:  src/util/userHelpers.js:216-229 (showCreateListingLinkForUser → `accountLinksVisibility.postListings` from the user-type Console config) gates both the create-profile link and the "Your listings" profile-menu item (TopbarDesktop.js:193, :77).
User view: "I'm a brand here to book models — why is the app inviting me to 'Create your profile' and showing me 'Your listings'? I don't post anything."
Proposal:  Confirm the `client` user type has `accountLinksVisibility.postListings = false` in Sharetribe Console. If it's true/unset, a client sees provider-only nav (create profile + your listings), which is confusing and off-model for the demand side. If false, no change needed — this is a verify-in-Console item. Flagged because I could not read the Console value from code this run.
Touches:   Sharetribe Console (user-type `client` → accountLinksVisibility.postListings); no repo change if already false
Effort:    S
Impact:    Med if misconfigured (client sees supply-side nav); zero if already correct — hence a verify item.
---

### CR-20260809-17 — Contact-details field copy is inconsistent (trailing period, generic placeholders)
Journey:   auth-account
Screen:    Account settings → Contact details
Severity:  polish
Evidence:  src/translations/en.json:135 ("ContactDetailsForm.phonePlaceholder": "Enter your phone number.") ends in a full stop while sibling placeholders end in an ellipsis (e.g. passwordPlaceholder ":129 "Enter your current password…").
User view: "Tiny thing — one placeholder ends in a period, the others in '…'. Looks unproofed."
Proposal:  Normalise placeholder punctuation to the app's ellipsis convention: "Enter your phone number…". Trivially cheap consistency pass on the settings form.
Touches:   src/translations/en.json (ContactDetailsForm.phonePlaceholder)
Effort:    S
Impact:    Low — proofing polish on the account settings form.
---

### CR-20260809-18 — Password-recovery copy is on-brand — keep it, and mirror it on login
Journey:   auth-account
Screen:    Forgot password (`/recover-password`)
Severity:  polish
Evidence:  src/translations/en.json:834 ("…Hmm. We didn't find an account with that email address…"), :846 ("No worries! Please enter the email address you used…"), :837 ("Suddenly remembered your password? {loginLink}")
User view: "This flow actually sounds like a person wrote it — warm and human."
Proposal:  Not a defect — a positive to preserve and propagate. The recovery flow already has the voice the login screen (RT-20260809-13) lacks; use its register ("No worries!", "Suddenly remembered your password?") as the reference when brand-voicing login so the two don't clash. No change to recovery itself; logged so it isn't "improved" into blandness later.
Touches:   (reference only) src/translations/en.json PasswordRecovery* — no edit proposed
Effort:    S
Impact:    Low — preserves an existing brand win and anchors the login rewrite.
---
