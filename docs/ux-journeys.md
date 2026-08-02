# Rogue Talent — PM agent journey list

**Approval: APPROVED by Neil (chat, 2026-08-02).**
**Authorised to run now: Journey 1 (Model onboarding) ONLY.** Journeys 2–7 are
approved as a list but NOT yet authorised to run — Claude Code must not trigger a
PM run on them until Neil explicitly opens them up (one or a few at a time). The
plan is to see one run's proposals, and how long review takes, before opening the
taps.

Purpose: the ordered set of user journeys the PM agent walks on the
`ndstealth1-test` marketplace (Railway dev URL), what account it uses, and what
"done" looks like for each — so a run has a defined scope and a pass/fail bar
rather than open-ended wandering.

Priority reflects business risk: supply-side onboarding first (no models → no
marketplace), then demand-side discovery, then the booking money-path and its
cancellation/refund tiers (where a bug costs real money), then cross-cutting
account flows, then marketing polish.

Test accounts come from `.test-accounts.json` (seeded by
`scripts/ops/seed-test-users.js`). Screenshots → `ux-reports/screenshots/`.

---

## 1. Model onboarding  ⭐ first, most important
**Persona / account:** a fresh model signup (do NOT reuse a seeded, already-
onboarded model — the point is the first-run wizard). Use a new plus-addressed
email; the seeded `rt-model-*` accounts are for journeys that need an
*existing* model.
**Entry point:** `/` → "Create your profile" / sign up as a model.
**Walk:**
1. Sign up as a model; complete email verification (or use the "Later" path and
   note where it lands).
2. Post-signup redirect → the Create-your-profile wizard.
3. Step through **About you** (display name + city) → **Your profile** (all model
   attribute fields: measurements, hair/eye, experience, categories, etc.) →
   **Your rates** (day / half-day / hourly) → **Your availability** → **Your
   portfolio** (photos).
4. Submit for review.
**Done looks like:**
- Every wizard step is completable with realistic input; no dead ends, no lost
  progress on back-navigation, no fields that error without explanation.
- The draft is created at "About you" and survives to submission.
- Required vs optional fields are clear; "(optional)" shows where expected.
- Rates save and display in the right currency (GBP).
- On submit, the profile enters review state and the user sees a clear "what
  happens next" message.
**Score/watch:** clarity of each ask, field-count/effort per step, whether the
measurements ask is explained (known friction point — see the sample proposal),
brand voice, and any step that reads as invasive or generic.
**Out of scope:** admin-side approval, live Stripe payout onboarding.

## 2. Client discovery & search
**Persona / account:** `rt-client-01`.
**Entry point:** `/` → browse, then search `/s`.
**Walk:** browse featured talent → open search → apply filters (gender, height,
experience, category, location) → open a model profile from a result card.
**Done looks like:**
- Search returns seeded models; filters visibly narrow results and can be
  cleared.
- Result cards (rt-talent) show photo, name, rate, location, meta, Verified
  badge where set.
- A profile page opens with all attribute fields rendered and rates shown.
- No empty-state that looks like a bug (distinguish "no results" from "broken").
**Score/watch:** does a client quickly find a relevant model; are filters
discoverable; does the profile page build trust/credibility.

## 3. Booking request (client → model, money-path)
**Persona / account:** `rt-client-01` booking a seeded model.
**Entry point:** a model profile → request/booking CTA.
**Walk:** pick dates on the availability calendar → review price breakdown
(model rate + **15% customer booking fee**, model keeps 100%) → proceed through
Stripe **test** checkout → land on request-submitted / order state.
**Done looks like:**
- Calendar reflects the model's availability; blocked/booked days behave.
- The 15%-customer-fee breakdown is correct and clearly labelled (no provider
  commission shown).
- Stripe test card completes; the transaction reaches the expected initial
  state; both sides can see it.
**Score/watch:** is the fee explained without feeling like a surprise; is the
date/price step trustworthy; any Stripe dead ends.
**Out of scope:** real charges, payout settlement.

## 4. Cancellation & refund (three tiers, money-risk)  ⚠️
**Why:** this is the flow where a bug costs someone real money. Policy is three
tiers by lead time before the booking:
- **>72h before:** full refund to client (no charge to client).
- **24–72h before:** 50% charged (client refunded 50%).
- **<24h before:** full charge (no refund).

Test **all three tiers as separate cases**, and each **from both sides** — the
client cancelling and the model cancelling — because who cancels and when changes
who is made whole. Six cases in total (3 tiers × 2 initiators).
**Persona / accounts:** `rt-client-01` and the finished model (`rt-model-03`),
using bookings created at controlled lead times so each tier is exercised.
**Entry point:** an existing accepted/confirmed booking → cancel.
**Walk (per case):** open the booking → initiate cancellation → read the stated
refund/charge → confirm → verify the resulting transaction state and the amount
actually refunded/charged in Stripe **test**, and what the *other* side sees.
**Done looks like:**
- The refund/charge shown before confirming matches the tier policy exactly
  (100% / 50% / 0% refund by lead-time band), for both initiators.
- The Stripe test refund/charge that actually posts matches what was shown — no
  gap between the promise and the money.
- Both client and model land in a clear, correct final state with a sensible
  notification; no ambiguous "cancelled but who owes what" screens.
- Boundary behaviour at exactly 72h and 24h is defined and not a coin-flip.
**Score/watch:** does the user understand the financial consequence *before*
confirming; is the boundary between tiers unambiguous; any mismatch between the
quoted amount and the Stripe amount (report as a **blocker**).
**Out of scope:** real charges; disputes/chargebacks; payout clawback mechanics.

## 5. Model booking inbox / respond to request
**Persona / account:** the seeded model that received the request from journey 3.
**Entry point:** topbar → Requests / inbox.
**Walk:** open the incoming request → review details → accept and decline paths.
**Done looks like:** the model sees the request with correct dates/amount; accept
and decline both work and produce a clear resulting state and notification.
**Score/watch:** clarity of the decision, what the model knows about the client,
reversibility/undo.

## 6. Auth & account basics (cross-cutting)
**Persona / account:** any seeded account.
**Walk:** login, logout, password reset request, edit Account Settings
(profile fields, contact details), role-aware topbar (model vs client).
**Done looks like:** each action completes; settings persist; the topbar reflects
the role; no broken links or confusing back-nav.
**Score/watch:** friction in returning-user flows; whether edits made here agree
with the onboarding wizard.

## 7. Marketing / landing pages (polish)
**Persona / account:** logged-out visitor.
**Walk:** General `/`, Models `/p/for-models`, Clients `/p/for-business` — nav
active states, CTAs, and every link's destination.
**Done looks like:** each page renders, nav highlights the current page, and
every CTA/link routes to the right place (search, signup, the other landing
pages). Placeholder images/stats are known and not reported as bugs.
**Score/watch:** brand voice and CTA clarity; do the two paths (model vs client)
lead somewhere sensible. Lowest priority — cosmetic, not blocking.

---

### Run conventions
- One proposals file per journey run: `ux-reports/proposals/<journey>-<date>.md`.
- Max 10 proposals per run, ranked by impact; anything cut goes to
  `ux-reports/backlog.md`, and the run summary says how many were cut.
- A journey that cannot be completed at all is a **blocker** — reported in one
  line at the top of the file before anything else.
- The agent proposes only. It never edits `Status:`/`Note:` (a hook enforces
  this) and never touches `src/`.
