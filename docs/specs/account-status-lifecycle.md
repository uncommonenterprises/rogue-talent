# Account status lifecycle — models & clients (SPEC, for Neil sign-off)

Status: DRAFT SPEC — awaiting Neil sign-off. **No code until signed off** (Neil, 2026-09-21:
"get this very clear before we code anything to avoid any rework").

Owner: PM. Design (colours/badge): ux-designer. Origin: Neil's 2026-09-21 proposal + refinements.

## 1. Purpose
Make each account's onboarding stage explicit, consistent, and visible — one lifecycle shared by both
user types, so "where am I / why can't I do X yet" is always answerable. Replaces today's implicit
state scattered across Sharetribe user-state + Stripe status + listing-state.

## 2. The two gates
Every account passes two gates, in a linear flow where **manual review is the pacing gate**:
- **Gate A — Manual review** (our human approval).
  - Models: **quality control** — review details and especially the **portfolio/images**; stay strict,
    keep quality high early.
  - Clients: **business legitimacy** — Companies House check (manual, v1) + general legitimacy.
- **Gate B — Verification** (identity/payment).
  - Models: Stripe Connect **identity + bank** (identity KYC and payout bank both complete).
  - Clients: Stripe **Identity** (individual ID + selfie). Covers sole-traders/individuals natively.

Gate B is **not** a prerequisite to submit for Gate A. (This supersedes RT-01 "Stripe before submit".)

## 3. States
| Status | Definition | Colour (semantic; exact token = designer) |
|---|---|---|
| **Draft** | Signed up, building profile; not yet submitted for review | Grey (neutral) |
| **Pending approval** | Submitted; Gate A not yet complete. Verification done early is **banked**, not surfaced | Amber (new token) |
| **Approved** | Gate A complete, Gate B not complete | Cobalt |
| **Verified** | Gate A **and** Gate B complete → visible/bookable (models) / can book (clients) | Green |
| **Rejected / Suspended** | Declined at review, or an active account later suspended | Red (danger) |

## 4. Status function (linear, review-first)
`status = f(submitted, manuallyApproved, verified, rejected)`
- `rejected/suspended`            → **Rejected/Suspended**
- `!submitted`                    → **Draft**
- `submitted && !manuallyApproved`→ **Pending approval**  *(regardless of `verified`)*
- `manuallyApproved && !verified` → **Approved**
- `manuallyApproved && verified`  → **Verified**

Two happy routes to Verified:
1. Verify-while-waiting: Draft → Pending approval → **Verified** (skips Approved).
2. Verify-after-approval: Draft → Pending approval → **Approved** → **Verified**.

**"Verified" is a LIVE computation, not a one-time stamp.** If verification later lapses (model's Stripe
charges/payouts disabled or bank removed; client's Stripe Identity redacted/revoked), the account
**drops out of Verified** and becomes hidden/un-bookable automatically. Keeps the safety guarantee honest.

## 5. Transitions
- Draft → Pending approval: user clicks **Submit for approval**.
- Pending approval → Approved: operator approves **and** Gate B not yet done.
- Pending approval → Verified: operator approves **and** Gate B already done (banked).
- Approved → Verified: user completes Gate B.
- Pending approval → Rejected: operator declines at review.
- Verified/Approved → Suspended: operator suspends; or Verified → Approved if verification lapses (§4).

## 6. Per-side specifics
### Models
- Draft captures: profile details + **portfolio/images** + rates + availability + location (existing wizard).
- Gate A reviews portfolio quality. Gate B = Stripe Connect identity + bank.
- Enforcement: **visible in search + bookable only when Verified.** Maps to existing gates (listing
  published + user active + Stripe `charges_enabled`). No unverified model is ever discoverable.

### Clients
- Draft captures: account + **company details incl. company registration number** (NEW field — the
  operator's input for the manual Companies House check).
- Gate A reviews business legitimacy (Companies House). Gate B = Stripe Identity.
- Enforcement: **can make a booking only when Verified.** Maps to existing gates (user active +
  `identity_verified` true; the initiate-privileged SAF-03 gate + native email/permission gate).

## 7. Where the status is surfaced
- **Primary: the user's own dashboard/profile** — their status + the single clear next action.
  While Pending-approval with verification already banked, show a sub-note ("Identity verified ✓ —
  awaiting profile approval") so early-verifiers aren't confused by the Pending badge.
- **Operator:** used for triage (native Console user-state + this derived view).
- **Public:** only "Verified" is ever externally relevant, and since **all visible models are Verified**,
  we do **not** show a per-card/profile badge (see §9). Optionally state the trust globally in copy.

## 8. Email sequence (Approved → verify nudge)
When an account sits in **Approved** (Gate A done, Gate B not) it enters a nudge sequence via **Postmark**
(server-originated lifecycle email — the transport built 2026-09-21):
- Models: "You're approved — verify your identity and add your bank to become visible and get booked."
- Clients: "You're approved — verify your identity to make your first booking."
Needs a small trigger mechanism (detect Approved-unverified accounts + send/space the sequence).
Scope TBD in build (event-on-approval vs a scheduled sweep). Draft-abandon nudge (incomplete profile)
is a possible later addition — out of scope for v1 unless Neil wants it.

## 9. Retire the old Verified badge
Since every visible model is Verified, a per-card/profile "Verified" badge is redundant → **remove it**:
- Remove `VerifiedBadge` usage from `ListingCard` (rt-talent card overlay) and `UserCard`.
- Retire the operator-set `metadata.id_verified` mechanism + `isUserVerified` helper (the new "Verified"
  status is computed from Gate A + Stripe, not a manual metadata flag).
- Drop `profile.metadata` from the search query if it was only included for the badge.
- Optional replacement: one global trust line ("every model on Rogue Talent is identity-verified").

## 10. Open implementation decision (PM to recommend in review)
**Where does Gate A (manual approval) live** — the Sharetribe **user state** (`pending-approval`→`active`)
or the **profile listing state** (`pendingApproval`→`published`)? Clients have no listing, so user-state
is the only consistent home across both types. Leaning: **user-state is the source of truth for Gate A**
(models' listing publish follows from Verified). To confirm in the build spec; affects how "submit for
approval" and operator approval are wired.

## 11. Build scope (after sign-off)
1. A computed `accountStatus` helper (`f` in §4) reading user-state + Stripe status + submission flag.
2. Status badge component (designer spec) + placement on the self dashboard, with next-action CTA.
3. Client company-registration-number field (Draft) + surface it to the operator for the CH check.
4. Rewire model onboarding: submit-for-approval before verification (drop "Stripe before submit").
5. Postmark Approved→verify nudge sequence + its trigger.
6. Remove the old VerifiedBadge (+ metadata/search cleanup).
7. Enforcement audit: confirm "Verified-only" for model visibility/booking and client booking, incl. the
   live-lapse regression (§4).
Each safety/money-adjacent piece → human review pre-go-live.
