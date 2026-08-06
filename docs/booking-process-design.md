# Booking transaction process — v1 design (custom `default-booking`)

**Status: DESIGN for review. Nothing pushed.** This is the concrete state machine for the
**one** custom `default-booking` version that carries both (1) the **48h provider accept
window** and (2) the **two-tier customer cancellation** (full refund ≥48h before the shoot, no
refund <48h). It's the merge of `docs/submit-review-golive-flow.md` Part D2 and
`docs/cancellation-process-spec.md`. Do not `flex-cli process push` until Neil okays this.

**Scope note:** this is the *transaction* process only. The go-live / Stripe-payout gating
(payout before a listing goes live) is *listing-lifecycle*, not this process — see
`docs/stripe-kyc-timing.md`. They're independent.

**Two different 48-hour clocks — don't conflate them:**
- **Accept window:** the *provider* has 48h (from the request landing) to accept, or it
  auto-declines. Clock starts at `preauthorized`.
- **Cancellation cutoff:** the *customer's* refund tier flips 48h before the *shoot*. Clock is
  relative to `booking-start`.

---

## 1. What changes vs stock `default-booking` v1

Everything up to `:state/accepted` is **stock** (inquire → request-payment → confirm-payment →
preauthorized → accept/decline). Two areas change:

1. **`:transition/expire` (accept window): 6 days → 48h.** `:at` becomes
   `min(preauthorized + PT48H, booking-start)`. (Provider gets 48h, or until the shoot if
   sooner; then auto-decline + full refund — unchanged actions.)
2. **Cancellation is rebuilt** from a single operator-only full-refund cancel into a two-tier
   customer cancel + always-full-refund provider cancel + operator override, using a time-gated
   state so the process itself enforces the tier.

**All actions used are stock** — `calculate-full-refund`, `stripe-refund-payment`,
`cancel-booking`, `stripe-create-payout`, `update-protected-data`. **No partial refund, no
custom Stripe** (that's the deferred 50% tier — `docs/roadmap.md`).

## 2. States

| State | Meaning |
|---|---|
| `inquiry`, `pending-payment`, `payment-expired`, `preauthorized`, `declined`, `payment-expired` | stock (pre-acceptance) |
| **`accepted`** | confirmed; **≥48h before the shoot** (or shoot >48h out). Customer cancel = full refund. |
| **`accepted-late`** | confirmed; **<48h before the shoot**. Customer cancel = no refund. Entered automatically. |
| **`cancelled`** | cancelled with the client **fully refunded** (customer ≥48h, any provider cancel, operator override). Terminal. |
| **`cancelled-charged`** | customer cancelled **<48h** — no refund; the model is still owed payout. |
| **`cancelled-charged-paid`** | model paid out after a no-refund cancel. Terminal. No reviews. |
| `delivered` → `reviewed-*` → `reviewed` | shoot happened; model paid; reviews. stock. |

## 3. Transitions (the changed/new ones)

| Transition | Actor | From → To | Actions |
|---|---|---|---|
| `expire` *(changed)* | auto `min(preauth+PT48H, booking-start)` | preauthorized → expired | calculate-full-refund, stripe-refund-payment, decline-booking |
| `enter-late` *(new)* | auto `booking-start − PT48H` | accepted → accepted-late | *(none)* — just the state flip (fires immediately if already <48h out) |
| `customer-cancel` *(new)* | customer | accepted → cancelled | calculate-full-refund, stripe-refund-payment, cancel-booking |
| `customer-cancel-late` *(new)* | customer | accepted-late → cancelled-charged | cancel-booking *(no refund)* |
| `provider-cancel` *(new)* | provider | accepted → cancelled | calculate-full-refund, stripe-refund-payment, cancel-booking, update-protected-data *(flag provider-cancelled)* |
| `provider-cancel-late` *(new)* | provider | accepted-late → cancelled | calculate-full-refund, stripe-refund-payment, cancel-booking, update-protected-data *(flag)* |
| `operator-cancel` *(new)* | operator | accepted → cancelled | calculate-full-refund, stripe-refund-payment, cancel-booking |
| `operator-cancel-late` *(new)* | operator | accepted-late → cancelled | calculate-full-refund, stripe-refund-payment, cancel-booking |
| `complete` *(stock)* | auto `booking-end + P2D` | accepted → delivered | stripe-create-payout |
| `complete-late` *(new)* | auto `booking-end + P2D` | accepted-late → delivered | stripe-create-payout |
| `payout-cancelled-charged` *(new)* | auto `booking-end + P2D` | cancelled-charged → cancelled-charged-paid | stripe-create-payout |

Key points:
- **Provider cancel is always a full refund to the client**, in both `accepted` and
  `accepted-late` (Q5). The model gets nothing; the transition flags it for the reliability
  signal (§5).
- **No-refund customer cancel keeps the captured money and still pays the model** — routed
  through `cancelled-charged → cancelled-charged-paid` so the payout runs on the normal
  `booking-end + P2D` schedule. (Design choice: pay on that schedule for consistency/dispute
  window; could be immediate — flag.)
- `accepted-late` gets its own `complete-late` because a Sharetribe transition has a single
  `:from`.

## 4. Notifications (emails)

Keep stock: `booking-new-request` (on confirm-payment→provider), `booking-accepted-request`,
`booking-declined-request`, `booking-expired-request` (now fires at 48h). **New templates:**

| On | To | Gist |
|---|---|---|
| `customer-cancel` / `customer-cancel-late` | provider | "Your client cancelled." (late variant: "…within 48h — you'll be paid.") |
| `provider-cancel(-late)` | customer | "The model cancelled — you've been fully refunded." |

**Reminders (24h/40h to the provider during the accept window) are NOT in this process** —
they're the events-based fast-follow (`submit-review-golive-flow.md` Part D2), added after.

## 5. The provider-cancel reliability signal (off-process)

The transition only *flags* a provider cancellation (transaction protected data). Aggregating
it — counting per model, surfacing to ops, a future suspension threshold — is **off-process**:
a marketplace-events listener (Integration API) reads `provider-cancel*` transitions and bumps
a counter on the model's user metadata. v1 can stop at "flagged + counted"; the ops UI/threshold
is a later refinement (roadmap-adjacent).

## 6. App-side changes required (beyond the EDN push)

Pushing the process is ~⅓ of the work. Also needed:
1. **`src/util/transactions/transactionProcessBooking.js`** — add the new states + transitions
   so the web app understands them.
2. **TransactionPage UI** — expose Cancel actions for customer/provider, gated to the right
   state, and **show the exact refund/charge before confirm** (Journey 4's reconciliation bar:
   full refund vs no refund, computed from the 48h cutoff).
3. **Email templates** (§4).
4. **`transactionProcessAlias`** on `model-profile` → the new process version.
5. Events listener for the reliability flag (§5) — can trail v1.

## 7. Validate before push
- Confirm an **automatic transition with a past `:at`** (the `enter-late` case for
  sub-48h bookings) fires immediately as assumed — verify against a `flex-cli process push` to a
  throwaway process name on `ndstealth1-test` before committing the real alias.
- Confirm `stripe-create-payout` on the `cancelled-charged` path pays the model correctly for a
  captured-but-cancelled booking (money was captured at accept).
- Decide payout timing on a no-refund cancel: `booking-end + P2D` (proposed) vs immediate.

## 8. Out of scope (here)
- The 50% middle tier (`docs/roadmap.md`).
- Accept-window reminders (fast-follow).
- Go-live / payout gating (listing lifecycle — `stripe-kyc-timing.md`).
