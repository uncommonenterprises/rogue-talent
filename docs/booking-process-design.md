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
preauthorized → accept/decline). Three areas change:

1. **`:transition/expire` (accept window): 6 days → 48h.** `:at` becomes
   `min(preauthorized + PT48H, booking-start)`. (Provider gets 48h, or until the shoot if
   sooner; then auto-decline + full refund — unchanged actions.)
2. **Cancellation is rebuilt** from a single operator-only full-refund cancel into a two-tier
   customer cancel + always-full-refund provider cancel + operator override, using a time-gated
   state so the process itself enforces the tier.
3. **Payout is split from shoot-completion, opening a dispute window.** `complete` no longer
   pays out; it moves to `completed` at `booking-end`, and `auto-payout` fires 2 days later.
   That gap is an operator dispute/no-show window (§3b) — the old design paid out at `complete`,
   leaving no room to intervene.

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
| **`completed`** | shoot date passed (`booking-end`); **payout pending** — the 2-day dispute window. |
| **`disputed-hold`** | operator paused the payout to investigate a dispute/no-show. |
| **`refunded-dispute`** | operator refunded the client on a dispute/no-show. Terminal. |
| `delivered` → `reviewed-*` → `reviewed` | payout made; reviews. stock (now entered via `auto-payout`, not `complete`). |

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
| `complete` *(changed — no payout)* | auto `booking-end` | accepted → completed | *(none)* |
| `complete-late` *(new)* | auto `booking-end` | accepted-late → completed | *(none)* |
| `auto-payout` *(new)* | auto `booking-end + P2D` | completed → delivered | stripe-create-payout |
| `payout-cancelled-charged` *(new)* | auto `booking-end + P2D` | cancelled-charged → cancelled-charged-paid | stripe-create-payout |

Key points:
- **Provider cancel is always a full refund to the client**, in both `accepted` and
  `accepted-late` (Q5). The model gets nothing; the transition captures a **reason** and routes
  it (§5).
- **No-refund customer cancel keeps the captured money and still pays the model** — routed
  through `cancelled-charged → cancelled-charged-paid`, payout at **`booking-end + P2D`**
  (kept deliberately, not immediate — Neil 2026-08-06: consistency + keeps the dispute window
  meaningful).
- **Payout is now split from shoot-completion.** `complete` fires at `booking-end` into a new
  `completed` state with **no payout**; `auto-payout` fires 2 days later. That 2-day gap is the
  **real dispute window** (§3b) — the operator can act *before* the model is paid, which the old
  "payout-at-complete" design didn't allow.
- `accepted-late` gets its own `complete-late` because a Sharetribe transition has a single
  `:from`. Reviews are unchanged — they still run from `delivered` (now = post-payout).

## 3b. Dispute / no-show path (new — addition 1)

The 2-day `completed → delivered` window is where the operator intervenes. From `completed`
(before `auto-payout` fires):

| Transition | Actor | From → To | Actions |
|---|---|---|---|
| `operator-dispute-refund` | operator | completed → refunded-dispute | calculate-full-refund, stripe-refund-payment, cancel-booking |
| `operator-dispute-hold` | operator | completed → disputed-hold | *(none)* — pause payout to investigate |
| `operator-hold-refund` | operator | disputed-hold → refunded-dispute | calculate-full-refund, stripe-refund-payment, cancel-booking |
| `operator-hold-release` | operator | disputed-hold → delivered | stripe-create-payout |

- **No-show / clear model fault:** `operator-dispute-refund` → client fully refunded, model paid
  £0. Clean, in-process, stock actions.
- **Investigate first:** `operator-dispute-hold` freezes the auto-payout; the operator then
  `operator-hold-refund` (full refund) or `operator-hold-release` (pay the model).
- **Partial "by hand":** true in-process partial refund is the deferred custom-Stripe work
  (`docs/roadmap.md`). For v1 a partial dispute is resolved by the operator refunding part
  **manually in the Stripe dashboard** during a hold, then `operator-hold-release` for the
  remainder — with the honest caveat that Sharetribe's line-item accounting won't perfectly
  reflect a hand-done partial until the roadmap reconciliation lands. In-process, v1 offers
  clean **full-refund** or **full-payout**; partial is manual + flagged.
- For symmetry, the operator also gets a full-refund override from `cancelled-charged` before
  its payout (`operator-cancel-charged` → refunded-dispute) so a disputed no-refund cancel is
  also reachable. (Same P2D window.)

## 4. Notifications (emails)

Keep stock: `booking-new-request` (on confirm-payment→provider), `booking-accepted-request`,
`booking-declined-request`, `booking-expired-request` (now fires at 48h). **New templates:**

| On | To | Gist |
|---|---|---|
| `customer-cancel` / `customer-cancel-late` | provider | "Your client cancelled." (late variant: "…within 48h — you'll be paid.") |
| `provider-cancel(-late)` | customer | "The model cancelled — you've been fully refunded." |
| `operator-dispute-refund` / `operator-hold-refund` | provider + customer | "This booking was refunded by the Rogue team." |
| `operator-dispute-hold` | provider | "Your payout is on hold while we look into this booking." |

**Reminders (24h/40h to the provider during the accept window) are NOT in this process** —
they're the events-based fast-follow (`submit-review-golive-flow.md` Part D2), added after.

## 5. Provider-cancel — reason required, safety routed away from the counter (addition 2)

A blanket reliability black mark is wrong: a model who cancels because a client alarmed her in
messages must **not** be scored the same as one who overslept — that would punish exactly the
safety behaviour our framework exists to encourage.

- **Reason is mandatory.** `provider-cancel` / `provider-cancel-late` require the model to pick a
  reason; the transition stores reason + category (`update-protected-data`). No reason → no cancel.
- **Two categories, two routes** (resolved off-process by the events listener):
  - **Reliability** (unavailable, double-booked, overslept, changed my mind) → increments the
    model's reliability counter (the future suspension-threshold input).
  - **Safety** (client made me uncomfortable/unsafe, inappropriate messages, boundary violation)
    → routes to an **ops safety queue**, **NOT** the reliability counter, and may flag the
    *client* for review. A safety cancel must **never** count against the model.
- The client is fully refunded either way (Q5); only the internal routing differs.
- **Off-process** = the routing/thresholds/ops UI is the events listener + tooling (later
  refinement). But the **reason capture + category MUST ship with v1**, so no early cancellation
  is miscategorised or a safety report lost. Ties into the broader safety framework.

## 6. App-side changes required (beyond the EDN push)

Pushing the process is ~⅓ of the work. Also needed:
1. **`src/util/transactions/transactionProcessBooking.js`** — add the new states + transitions
   so the web app understands them.
2. **TransactionPage UI** —
   - customer/provider **Cancel** actions, gated to state, with the **refund/charge shown before
     confirm** (Journey 4's reconciliation bar: full refund vs no refund from the 48h cutoff);
   - a **required reason picker** on provider-cancel (reliability vs safety categories, §5);
   - **operator dispute controls** (refund / hold / release) on the `completed` + `disputed-hold`
     states.
3. **Email templates** (§4).
4. **`transactionProcessAlias`** on `model-profile` → the new process version.
5. **Events listener** — routes provider-cancel reason/category (reliability counter vs safety
   queue, §5) and could feed dispute alerts. Routing can trail v1, but **reason capture ships in
   v1** (the picker + stored category).

## 7. Validate before push
1. **Structure/actions valid** — `flex-cli process push` to a **throwaway process name** on
   `ndstealth1-test` must accept the EDN (all new transitions, states, actors, actions and `:at`
   expressions valid). This is the first gate: it proves the design is buildable.
2. **Automatic transition with a past `:at`** — the `enter-late` case for sub-48h bookings must
   fire immediately as assumed; also the split `complete`(booking-end) → `auto-payout`
   (booking-end+P2D) timing. Behavioural, needs a live transaction to fully confirm.
3. **Payout on the `cancelled-charged` and `disputed-hold → delivered` paths** — confirm
   `stripe-create-payout` pays the model correctly for a captured-but-cancelled / held booking.
   Behavioural.

**Payout timing on a no-refund cancel: `booking-end + P2D`** (Neil 2026-08-06 — kept, not
immediate: consistency + a meaningful dispute window now that §3b exists).

## 8. Out of scope (here)
- The 50% middle tier (`docs/roadmap.md`).
- Accept-window reminders (fast-follow).
- Go-live / payout gating (listing lifecycle — `stripe-kyc-timing.md`).
