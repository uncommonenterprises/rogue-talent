# UX Review — Model onboarding — 2026-08-02
Agent run: pm-20260802-1352 | Test account: hi+rt-journey1-2026-08-02@uncommonenterprises.co.uk | Build: 365b30043 (bundle main.472feeea.js)

Not a hard blocker, but note up top: the journey **cannot reach "submitted / under review" state without completing Stripe Connect payout onboarding** — "Submit for review" opens a mandatory Stripe KYC/bank modal instead of submitting (see RT-20260802-01). The wizard itself (About you → Your profile → Your rates → Your availability → Your portfolio) is otherwise completable with realistic input, rates save/display in GBP, and back-navigation preserves progress.

Context note (not a wizard-flow issue, flagged for decision as RT-20260802-08): the "require admin approval for new users" gate is OFF in `ndstealth1-test` — this fresh model signup landed `state=active` with `postListings=permission/allow` and walked straight into the wizard. No approval wall was hit. Verified server-side by the coordinator via the Integration API.

## RT-20260802-01 — "Submit for review" hard-gates on Stripe payout onboarding
Journey:   Model onboarding
Screen:    Your portfolio → "Submit for review" (payout modal "One more thing: Payout preferences")
Severity:  blocker
Evidence:  screenshots/13-submit-stripe-payout-modal.png, screenshots/14-your-listings-draft-state.png
User view: "I filled in everything, hit Submit for review — and now it's demanding my bank details and a Stripe verification before it'll even look at my profile? I haven't been booked by anyone. I'll do this later… except there is no later, the profile just stays a draft."
Proposal:  Decouple profile review from Stripe onboarding. In `handlePublishListing` (EditListingWizard.js ~L481-508), call `onPublishListingDraft(id)` regardless of `stripeConnected`, so the profile enters review immediately, and surface payout setup as a non-blocking task (a dashboard banner + a step gated only at first booking-acceptance). If decoupling is out of scope for now, at minimum retitle the modal and set expectations: change the button from "Submit for review" to "Continue" on this step and add one line to the portfolio panel copy — "Last step before review: add your payout details so you can get paid." Keep the model informed that bank details are coming.
Touches:   src/containers/EditListingPage/EditListingWizard/EditListingWizard.js, src/containers/EditListingPage/EditListingPage.js, src/translations/en.json (EditListingWizard.payoutModal* keys, EditListingPhotosForm.* )
Effort:    L
Impact:    Highest single lever on completion — this is where a fully-completed profile silently fails to submit; likely a large share of finished models never reach review.
---
Status: APPROVED
Note: APPROVED by Neil in chat 2026-08-02 — "approve RT-01 through RT-10 and also RT-11 and RT-12".
Implemented: held — merged submit/review/go-live (docs/submit-review-golive-flow.md); build after Neil signs off the spec.

## RT-20260802-02 — No "what happens next" after submit; profile silently stays a draft
Journey:   Model onboarding
Screen:    Post-submit (there is no success screen) / Your listings
Severity:  friction
Evidence:  screenshots/14-your-listings-draft-state.png
User view: "Did that work? It just closed a box. My listing page still says 'draft, not yet available' — am I live? Under review? Rejected? No idea."
Proposal:  After a successful submit, route to a confirmation screen (or inline banner) with brand-voiced next steps, e.g. heading "You're in review" and body "Your profile's with the Rogue team — we check every model before they go live, usually within one working day. We'll email you the moment you're approved. Meanwhile, you can still tweak your rates and calendar." This depends on RT-20260802-01 landing (submit must actually complete first).
Touches:   src/containers/EditListingPage/EditListingWizard/EditListingWizard.js, src/translations/en.json (add EditListingWizard.submittedForReview* keys)
Impact:    Reduces post-submit anxiety/abandonment and support pings; compounds the value of fixing 01.
Effort:    M
---
Status: APPROVED
Note: APPROVED by Neil in chat 2026-08-02 — "approve RT-01 through RT-10 and also RT-11 and RT-12".
Implemented: held — merged submit/review/go-live (docs/submit-review-golive-flow.md); build after Neil signs off the spec.

## RT-20260802-03 — "Your profile" step is a 14-field wall with no grouping
Journey:   Model onboarding
Screen:    Your profile (details tab)
Severity:  friction
Evidence:  screenshots/07-yourprofile-empty.png, screenshots/08-yourprofile-filled.png
User view: "That's a lot. Gender, five body measurements, hair, eye, ethnicity, experience, categories, radius, website, Instagram — all on one screen, and only the last two say optional so I guess I have to do the other twelve right now."
Proposal:  Chunk the single flat list into labelled sections to lower perceived effort — "Your stats" (height, waist, hips, bust, shoe), "Appearance" (gender, hair, eye, ethnicity), "Your work" (experience, categories, availability radius), "Links (optional)" (website, Instagram). The per-field measurement hints are good and should stay. Consider making bust/waist/hips optional or adding "prefer not to say" (see RT-20260802-09). Field grouping is config/markup on the details panel; section subheads come from en.json.
Touches:   src/containers/EditListingPage/EditListingWizard/EditListingDetailsPanel/*, Sharetribe Console listing-field config (field order/section), src/translations/en.json
Impact:    High — this is the heaviest single step; grouping meaningfully cuts drop-off on the longest screen.
Effort:    M
---
Status: APPROVED
Note: APPROVED by Neil in chat 2026-08-02 — "approve RT-01 through RT-10 and also RT-11 and RT-12".
Implemented: 7a188c09f 2026-08-02

## RT-20260802-04 — Email-verification screen is a dead end with no way forward
Journey:   Model onboarding
Screen:    Post-signup email-verification nag (/signup verify state)
Severity:  friction
Evidence:  screenshots/03-verify-email-nag.png
User view: "OK, verify my email — but I'm not near my inbox right now. There's no 'continue' or 'skip for now' button, only Resend and Fix it. Am I stuck until I check email?"
Proposal:  The block is actually soft (a model can reach the wizard via the topbar with email unverified — confirmed), so the screen over-states the wall. Add a clear forward CTA: a secondary button "Set up your profile now — verify later" pointing to `/l/new`, plus one honest line "You can start building your profile now; you'll need a verified email before you go live." This restores the intended soft-nag behaviour that `EmailVerificationInfo.js` currently hard-codes away ("there is no 'Later' escape").
Touches:   src/containers/AuthenticationPage/EmailVerificationInfo.js, src/translations/en.json (AuthenticationPage.* verify keys)
Impact:    Med-high — first screen after signup; a perceived dead end here loses people before they ever see the wizard.
Effort:    S
---
Status: APPROVED
Note: APPROVED by Neil in chat 2026-08-02 — "approve RT-01 through RT-10 and also RT-11 and RT-12".
Implemented: f23b8d3db 2026-08-02

## RT-20260802-05 — Model can create multiple orphan draft profiles ("You have 2 listings")
Journey:   Model onboarding
Screen:    Your listings
Severity:  friction
Evidence:  screenshots/14-your-listings-draft-state.png
User view: "Why do I have two profiles? One's got my photo and rate, the other's blank with 'Price not set'. Which one is the real me? Did I do something wrong?"
Proposal:  A model is meant to have one profile. Re-entering `/l/new` spawns a fresh draft rather than resuming the existing one. On `/l/new`, if the current user already owns a draft `model-profile`, redirect to that draft's first incomplete tab instead of creating a new one; and hide/disable the "Create your profile" nav entry once a profile exists (show "Your profile" → edit). At minimum, dedupe so "Your listings" never shows two model profiles for one user.
Touches:   src/routing/routeConfiguration.js (/l/new handling), src/containers/EditListingPage/EditListingPage.js, src/containers/EditListingPage/EditListingWizard/EditListingProfilePanel/*, TopbarDesktop nav
Impact:    Med — prevents a confusing split-brain state and abandoned half-drafts that look broken.
Effort:    M
---
Status: APPROVED
Note: APPROVED by Neil in chat 2026-08-02 — "approve RT-01 through RT-10 and also RT-11 and RT-12".
Implemented: pending — architectural (routing/data-fetch/redirect); approach needs sign-off before build (see chat).

## RT-20260802-06 — "Your profile" intro promises a bio field that isn't on the step
Journey:   Model onboarding
Screen:    Your profile (details tab), intro paragraph
Severity:  friction
Evidence:  screenshots/07-yourprofile-empty.png
User view: "It says 'Write a short bio, then fill in your stats' — but there's no bio box anywhere on this page. Where do I write it?"
Proposal:  The bio lives in Profile settings, not this listing step. Either (a) add the bio textarea to this step so the copy is true, or (b) fix the copy to match what's here: "Fill in your stats and details — your measurements, appearance, experience, and the categories you work in. (You can add a written bio later in Profile settings.) These power search, so the right clients can find you."
Touches:   src/translations/en.json (EditListingDetailsPanel guidance/subtitle key)
Impact:    Med — removes a broken-feeling promise on the highest-effort step.
Effort:    S
---
Status: APPROVED
Note: APPROVED by Neil in chat 2026-08-02 — "approve RT-01 through RT-10 and also RT-11 and RT-12".
Implemented: c450c0e10 2026-08-02

## RT-20260802-07 — Signup password field has no requirements hint
Journey:   Model onboarding
Screen:    Sign up (model), Password field
Severity:  friction
Evidence:  screenshots/02b-signup-model-form.png
User view: "Enter your password… OK, how long? Do I need a number, a symbol? I'll find out only when it rejects me."
Proposal:  Show the password rule inline under the field before submit, e.g. helper text "8+ characters" (match the actual Sharetribe min). Prevents guess-and-error on the very first form.
Touches:   src/containers/AuthenticationPage/SignupForm/SignupForm.js, src/translations/en.json (SignupForm.password* keys)
Impact:    Med — small change, measurable reduction in signup submit errors.
Effort:    S
---
Status: APPROVED
Note: APPROVED by Neil in chat 2026-08-02 — "approve RT-01 through RT-10 and also RT-11 and RT-12".
Implemented: cb6fe05c1 2026-08-02

## RT-20260802-08 — New-user admin-approval gate is OFF (contradicts documented policy)
Journey:   Model onboarding (config observation)
Screen:    N/A (server-side marketplace setting)
Severity:  friction
Evidence:  Phase-1 current_user response (state=active, postListings=permission/allow on a fresh, un-approved signup); coordinator confirmed via Integration API that every user in ndstealth1-test is state=active.
User view: (operator/trust) "We tell ourselves every model is vetted before they can post — but a brand-new signup got posting rights instantly with nobody reviewing them."
Proposal:  Decision needed, not a code change I should make: either (a) turn ON "require admin approval for new users" in Sharetribe Console so fresh models land pending-approval and the existing NoAccessPage wall actually functions as designed, or (b) if instant posting rights are intentional, update CLAUDE.md's "All users require manual admin approval before full access" so docs match reality. Flagging the discrepancy for Neil to resolve.
Touches:   Sharetribe Console (user-approval setting) OR /Users/neildobbins/rogue-talent/CLAUDE.md (doc correction)
Impact:    Trust/safety and doc-accuracy; no direct completion-rate effect but material to the marketplace's vetting promise.
Effort:    S
---
Status: APPROVED
Note: APPROVED by Neil in chat 2026-08-02 — "approve RT-01 through RT-10 and also RT-11 and RT-12".
Implemented: held — merged submit/review/go-live (docs/submit-review-golive-flow.md); build after Neil signs off the spec.

## RT-20260802-09 — Website & Instagram fields show the wrong placeholder "Write description…"
Journey:   Model onboarding
Screen:    Your profile (details tab), Website (optional) and Instagram Handle (optional)
Severity:  polish
Evidence:  screenshots/07-yourprofile-empty.png
User view: "It says 'Write description…' in the box but the label is 'Website'. Do they want a URL or a paragraph?"
Proposal:  Set field-appropriate placeholders — Website: "https://yourportfolio.com", Instagram Handle: "@yourhandle". These are the default catch-all placeholder leaking through; set the placeholder on the two Console listing fields (or the corresponding en.json key).
Touches:   Sharetribe Console listing-field config (website, instagram placeholders), src/translations/en.json if overridden there
Impact:    Low-med — removes a small confusion on two optional fields.
Effort:    S
---
Status: APPROVED
Note: APPROVED by Neil in chat 2026-08-02 — "approve RT-01 through RT-10 and also RT-11 and RT-12".
Implemented: n/a — Console-only: set placeholderMessage on the website & instagram listing fields.

## RT-20260802-10 — Signup "Phone number" field lacks an "(optional)" marker
Journey:   Model onboarding
Screen:    Sign up (model)
Severity:  polish
Evidence:  screenshots/02b-signup-model-form.png
User view: "Do I have to give my phone number to sign up? Nothing says it's optional, so I assume it's required — one more thing before I can get in."
Proposal:  If phone is optional at signup, append "(optional)" to the label (the app already does this pattern elsewhere via getLabel for non-required fields). If it's required, leave as-is but that's a heavier ask worth reconsidering for a first-touch form.
Touches:   Sharetribe Console user-field config (phoneNumber required flag/label) or src/containers/AuthenticationPage/SignupForm/SignupForm.js, src/translations/en.json
Impact:    Low — minor clarity on the signup form.
Effort:    S
---
Status: APPROVED
Note: APPROVED by Neil in chat 2026-08-02 — "approve RT-01 through RT-10 and also RT-11 and RT-12".
Implemented: a3bbad35d 2026-08-02

## RT-20260802-11 — Body measurements are all required with no opt-out (hard completion blocker)
Journey:   Model onboarding
Screen:    Your profile (details tab), measurements block (bust/chest, waist, hips, height, shoe)
Severity:  blocker
Evidence:  screenshots/07-yourprofile-empty.png, screenshots/08-yourprofile-filled.png
User view: "I'm a new face — I genuinely don't know my exact bust and hip measurements in cm, and I can't leave them blank. So I either guess wrong numbers that'll show to clients, or I can't finish my profile at all."
Proposal:  Promoted from backlog and re-rated: this is a hard completion blocker, not polish — a model who doesn't know exact figures literally cannot submit. Make bust/waist/hips optional (turn OFF the required flag on those Console listing fields) or add a "prefer not to say" option; keep height required if it's a primary client filter. Pair with the sectioning in RT-20260802-03 (a "Your stats" group where some fields are optional reads much better). Note: the required flag is Console listing-field config (operator-side), not a repo change.
Touches:   Sharetribe Console listing-field required flags (bust_chest_cm, waist_cm, hips_cm), src/containers/EditListingPage/EditListingWizard/EditListingDetailsPanel/* (optional markers/opt-out UI), src/translations/en.json
Impact:    High — removes an outright completion blocker for the "new face" segment the marketplace most wants to attract.
Effort:    S (Console flag) + S (opt-out UI if added)
---
Status: APPROVED
Note: APPROVED by Neil in chat 2026-08-02 — "approve RT-01 through RT-10 and also RT-11 and RT-12".
Implemented: n/a — Console-only: turn off required on bust_chest_cm / waist_cm / hips_cm.

## RT-20260802-12 — Browser tab title shows literal "{panelHeading}" on the About-you step
Journey:   Model onboarding
Screen:    Create-your-profile wizard, "About you" (first / new-draft) tab — browser tab/window title
Severity:  polish
Evidence:  screenshots/04-wizard-aboutyou-reached.png
User view: "The browser tab says 'Create your profile | {panelHeading}' with the code showing through. Small, but it looks broken and unfinished — not what I want to see the moment I start."
Proposal:  Promoted from backlog as a visible bug. Root cause: `EditListingPage.titleCreateListing` (en.json:307) interpolates `{panelHeading}`, and `EditListingWizardTab.js:216` passes it via `intl.formatMessage({ id: titleId }, { panelHeading })` — but the custom "About you" tab (EditListingProfilePanel, added in Phase 2/3) doesn't supply a `panelHeading`, so the placeholder renders literally. Fix: have the About-you panel provide its `panelHeading` to `updatePageTitle` (or default it in EditListingWizardTab) so the title resolves to a real heading.
Touches:   src/containers/EditListingPage/EditListingWizard/EditListingProfilePanel/*, src/containers/EditListingPage/EditListingWizard/EditListingWizardTab.js, src/translations/en.json
Impact:    Low — cosmetic, but it's a code-through-the-UI glitch on the very first wizard screen.
Effort:    S
---
Status: APPROVED
Note: APPROVED by Neil in chat 2026-08-02 — "approve RT-01 through RT-10 and also RT-11 and RT-12".
Implemented: 8d7c98275 2026-08-02
