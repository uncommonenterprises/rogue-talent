# Journey 3 — PM verification of the UX Tester's report (2026-09-17)

The UX Tester reported a **critical blocker: "date picker broken"** (`journey-3-booking-2026-09-17.md`).
I (PM) verified it by hand via Playwright before assigning any dev work. Findings below.

## 1. The "date picker broken" blocker is a FALSE ALARM (automation artifact)
On Jane F.'s listing I opened the calendar, clicked a real available day, and the field populated
correctly (start = "Mon 21 Sept"); selecting the range produced the full price breakdown. The
tester (Haiku) simply could not drive the react-dates calendar via automation — a known automation
weakness, not an app defect. **No "fix the date picker" work is warranted.**

## 2. The 15% customer booking fee is CORRECT
Verified breakdown on Jane F. (£500/day, 21→22 Sept):
- £500 × 2 days = £1,000 subtotal
- **"Rogue Talent fee" £150 = exactly 15%**
- Total £1,150
Model keeps 100% (£1,000); client pays rate + 15%. Commission model works as designed.
(Copy nit for the copy audit: the line is labelled "Rogue Talent fee" with footnote "The fee helps
us run this platform and provide the best possible service to you!" — generic template copy, and
the "x 2 days" for a 21→22 booking should be confirmed as the intended day-count.)

## 3. REAL blocker: the only payout-enabled model is not bookable
The tester tested Jane F. and Lucykins — NOT rt-model-03. rt-model-03 is **Anais P.** (£150/day),
the model whose Stripe payouts Neil just enabled. Her listing renders **no booking form — only a
"Contact" button**. Integration-API inspection (read-only) shows the only difference from a working
bookable listing is the **availabilityPlan type**:
- Anais P. (rt-model-03): `availability-plan/day`  → booking form does NOT render
- Jane F. (bookable):      `availability-plan/time` → booking form renders
Both are `unitType: day`, `default-booking/release-1`, `model-profile`, published.

**Consequence:** the end-to-end money path STILL cannot be walked — the bookable models (Jane F.,
Lucykins) are not payout-enabled, and the payout-enabled model (Anais P.) does not render a booking
form. We need one model that is BOTH payout-enabled AND renders the booking form.

**Note the direction is counterintuitive** (a `day` plan is normally the correct one for daily
bookings, yet it's the one NOT rendering). So do not assume "seed uses the wrong type" without
Developer root-causing. Candidate causes: the model-profile listing type / config expects
time-based availability (making the seed's `availability-plan/day` wrong for ALL seeded models); or
an OrderPanel/time-slots handling gap. The seed script `scripts/ops/seed-test-users.js` builds
`availability-plan/day` (dayPlan(), ~line 191); Jane F. (not one of our seeded accounts) has a
time plan.

## 4. Other findings observed during verification
- **Search identities:** the 3 search results are Anais P. (our rt-model-03), Jane F., Lucykins —
  but the seed only created Anais under that name (others are Lucy Southern, Marcus Bell). **Jane F.
  and Lucykins are NOT our seeded test accounts** — pre-existing listings of unknown setup.
- **Custom landing page shows "Sign in / Join Rogue Talent" while logged in** (as Priya S / client)
  — the marketing landing doesn't reflect auth state. Minor bug.
- **Anais P. search card:** "No image" (no portfolio photo) and the card link aria-label renders
  `Anais P., ,[object Object], ,[object Object]` — label-composition bug.
- **Footer** still shows placeholder Sharetribe content ("In Console, go to Content → Footer…").
- Anonymous "Request to book" routes to `/no-transaction-rights` (secondary; expected-ish access
  control — confirm intended vs should prompt login).
- Direct `/login` nav redirects logged-in users to the landing (expected, not a bug).

## 5. UPDATE — availability fixed, but a SECOND blocker surfaced: client can't transact
The Developer fixed the availability plan (Anais now `availability-plan/time`), and I re-verified:
**Anais's listing now renders the booking form.** Selected 22→23 Sept: breakdown £150×2 = £300 +
**£45 fee (15%)** + **£345 total** — fee correct on the payout-enabled model too.

But **"Request to book" — while logged in as the approved client (rt-client-01 / Priya) — routes to
`/no-transaction-rights`.** Integration-API read of the client user:
- `state: active`, `banned: false`, `emailVerified: FALSE`
- permissions: `postListings=allow`, `read=allow`, **`initiateTransactions=permission/deny`**

So an "active/approved" client still cannot initiate a transaction. Most likely gate: **transaction
rights require a verified email** (standard Sharetribe behaviour; approval granted postListings+read
but held back initiateTransactions pending verification). Alternatively the approval flow is meant to
grant initiateTransactions and doesn't (a config gap). **Decision needed (Neil):** confirm whether
booking should be gated on email verification (probably yes, and intended) — then unblock the test by
verifying rt-client-01's email (inbox link / "Resend verification" on the account page) and re-check
the permission; OR authorise granting `initiateTransactions` via the Integration API for the test
account. Until then the payment + confirmation leg (Stripe test card → transaction state) remains
unverified.

## Recommended next steps
1. Developer: root-cause why an `availability-plan/day` model-profile listing renders no booking
   form while an `availability-plan/time` one does — determine whether the fix is the seed
   (all seeded models unbookable) or the config/template. Fix so seeded published models are
   bookable.
2. Then re-walk Journey 3 end-to-end on a model that is payout-enabled AND bookable, through the
   test-card payment, to confirm the first end-to-end money movement.
3. Fold the copy + minor-bug items into the copy audit / a polish pass.
