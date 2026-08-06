# Cancellation & refund — transaction-process spec (DRAFT)

**Status: BLOCKED on one decision.** Commercial refund math is RESOLVED (§7, Neil 2026-08-06),
but validation (§5, 2026-08-06) found stock Sharetribe **cannot do the 50% partial refund** —
it needs custom server-side Stripe work (Route 1), OR we drop to a stock-only **two-tier**
policy. **Neil must pick that before the combined design is finalised.** Then: **one** custom
`default-booking` version carrying both the 48h request/accept window
(`docs/submit-review-golive-flow.md` Part D2) and the cancellation tiers. Do not push a process
version until the design is written and Neil okays it.

---

## LAUNCH BLOCKER (prominent, on purpose)

> **Our FAQ and Terms describe a three-tier cancellation policy that the product
> cannot perform in ANY form today.** The live `default-booking` process has a
> single **operator-only** cancel that always issues a **full** refund — no
> customer/provider cancellation, no 50% tier, no time logic. Publishing a policy
> we cannot execute is a legal/trust exposure and a support-load problem.
>
> **These two must match before go-live**, by either (a) building this process, or
> (b) changing the FAQ/Terms to describe what the product actually does. This is a
> pre-launch gate, tracked as a launch blocker — not a "nice to have".

---

## 1. Where we are now (fact, from the live process)
`default-booking` v1, transition `:transition/cancel`:
- `:actor :actor.role/operator` — only an admin can cancel.
- actions: `:action/calculate-full-refund` → `:action/stripe-refund-payment` →
  `:action/cancel-booking`; `:from :state/accepted :to :state/cancelled`.
- No partial-refund action exists in the process; no branch reads time-to-booking.

## 2. Target policy (as written in FAQ/Terms — to confirm, see open questions)
By lead time before booking **start**:
- **> 72h:** full refund to client.
- **24–72h:** 50% charge / 50% refund.
- **< 24h:** full charge, no refund.

The spec's job is to turn that into states, transitions, actors, and a refund
action — and to expose every place where the plain-English policy is ambiguous
about **money**.

---

## 3. Proposed states
Building on the existing accepted → cancelled path. Two design options for how the
tier is decided (§5); the states below assume the recommended **Option A**.

- `:state/accepted` — provider accepted, payment pre-authorised (unchanged).
  Represents the **> 72h** window (full-refund tier).
- `:state/accepted-penalty-50` — **24–72h** window. Entered automatically when the
  clock crosses 72h-before-start.
- `:state/accepted-penalty-full` — **< 24h** window. Entered automatically when the
  clock crosses 24h-before-start.
- `:state/cancelled` — terminal cancelled state (unchanged).
- (Downstream delivered/review states unchanged.)

Making the **tier a function of state** (not of app logic at cancel time) means the
process itself enforces the rule and a user cannot select a cheaper tier.

## 4. Proposed transitions & actors
Each tier state gets cancel transitions for the actors we decide can cancel
(**which actors is an open question — today neither side can**):

| From state | Transition | Actor(s) | Refund action | To |
|---|---|---|---|---|
| `accepted` | `customer-cancel-full` | customer | full refund | `cancelled` |
| `accepted` | `provider-cancel` | provider | full refund (+ penalty? — open) | `cancelled` |
| `accepted-penalty-50` | `customer-cancel-half` | customer | **partial refund (50%)** | `cancelled` |
| `accepted-penalty-50` | `provider-cancel` | provider | full refund to client (+ penalty? — open) | `cancelled` |
| `accepted-penalty-full` | `customer-cancel-none` | customer | **no refund** | `cancelled` |
| `accepted-penalty-full` | `provider-cancel` | provider | full refund to client (+ penalty? — open) | `cancelled` |
| any of the above | `operator-cancel` | operator | operator-set (full/partial/none) | `cancelled` |

Plus **automatic, time-triggered** transitions (no actor):
- `accepted → accepted-penalty-50` at `booking-start − 72h`.
- `accepted-penalty-50 → accepted-penalty-full` at `booking-start − 24h`.

Notes:
- **Provider cancellation is always a full refund to the client** in the table
  above (the client shouldn't be out of pocket because the model pulled out) — but
  whether the model faces a penalty/reliability consequence is an **open question**.
- Operator keeps an override cancel from every state for support cases.

## 5. The partial-refund mechanism — VALIDATED: stock can't do it; the 50% tier needs custom Stripe

**Validated 2026-08-06** against Sharetribe's action reference + payments docs + help centre:
- The only refund action is `:action/stripe-refund-payment` = **full refund** of the captured
  payment. `:action/calculate-full-refund` zeroes the whole transaction and takes **no
  config**. **There is no partial/percentage refund action.**
- Our flow **captures at provider accept**, so by the time anyone cancels a *confirmed*
  booking the money is already captured — and a captured payment can only be **fully** refunded
  by stock actions. Sharetribe docs, verbatim: *"Partial refunds are not currently supported by
  the default Stripe integration."*

**⇒ The 50% tier cannot be built with stock actions alone.** The >72h (full refund) and <24h
(no refund) tiers are trivial (`calculate-full-refund` + `stripe-refund-payment`, or just
`cancel-booking`). The **24–72h 50% tier is the hard part** and forces one of:

- **Route 1 — Custom server-side partial refund (recommended).** Stripe *itself* does partial
  refunds (`refunds.create({ payment_intent, amount })`); only Sharetribe's stock *action*
  doesn't. So the 50% cancel transition does **not** use `stripe-refund-payment`; instead our
  own server (marketplace-event/webhook listener + Integration API) issues the partial refund
  directly via Stripe, and `:action/privileged-set-line-items` rewrites the breakdown so
  Sharetribe's books reconcile (client −£86.25, model +£75, RT +£11.25). The retained-portion
  **payout to the model** must also be handled. **This is custom server code + Stripe API +
  reconciliation — not just a flex-cli EDN push.**
- **Route 2 — Full refund + separate re-charge.** Refund 100% (stock), then charge a *new*
  PaymentIntent for the £86.25. Stock-only, but = **two charges on the client's statement** and
  an **off-session charge that can hit SCA and fail** (client not present). Fragile for a
  money-critical flow.
- **Route 3 — Deferred capture.** Rejected: only works inside Stripe's ~7-day auth window and
  still needs partial *capture* (also not in stock).

**Recommendation: Route 1** — the clean, correct mechanism serious marketplaces use — but be
clear-eyed that it upgrades this workstream from "push a custom process version" to "custom
process **plus** a server-side partial-refund + payout-reconciliation component."

> **NEW DECISION (Neil):** given the true cost of the 50% tier, do we (a) commit to Route 1's
> custom Stripe work, or (b) drop to a **two-tier** policy for v1 — full refund before a cutoff,
> no refund after — which needs **no** partial refund and is entirely stock? The three-tier
> policy is a real build; two-tier ships far sooner.

## 6. Notifications & payout implications (engineering, but policy-adjacent)
- New email templates per cancel path (customer-cancelled, provider-cancelled,
  penalty applied) for both parties.
- **Payout timing:** provider payout currently happens at completion. If a 50%
  charge means the model earns something on a cancelled booking, the payout of that
  retained amount must be defined (when, and net of what — see questions).

---

## 7. Commercial decisions — RESOLVED

> ✅ **Q0 RESOLVED (Neil, 2026-08-02):** commission model = **15% customer booking fee
> only, 0% provider, model keeps 100% of their rate.**
>
> ✅ **Q1–Q8 RESOLVED (Neil, chat 2026-08-06)** — verbatim: *"the 50% tier = your
> recommendation / Q4 - agree / Q5 - I agree with your proposal / Q6 - agree / Q8 - agree"*.

**Worked reference:** a 1-day booking at a £150 rate → client pays £150 + £22.50 (15% fee)
= **£172.50**; model keeps **£150**; RT keeps **£22.50**.

**The three tiers (by lead time before booking start):**

| Tier | Client refunded | Client net cost | Model receives | RT keeps |
|---|---|---|---|---|
| **>72h — full refund** | £172.50 | £0 | £0 | £0 |
| **24–72h — 50%** | £86.25 | £86.25 | £75 | £11.25 |
| **<24h — full charge** | £0 | £172.50 | £150 | £22.50 |

- **The 50% tier (Q1/Q2/Q3/Q7):** model gets **50% of the rate** (£75), with nothing skimmed.
  RT's **fee scales to the amount actually charged** — 15% of £75 = £11.25 — so the customer
  fee is **refunded proportionally** (the client gets back half the fee). Refund base = the
  rate, fee computed on the charged portion. (NOT the "fee non-refundable" alternative.)
- **Boundaries (Q4):** favour the client. **≥72h = full refund; 24h up to <72h = 50%; <24h =
  full charge.** Exactly 72h → full refund; exactly 24h → 50%.
- **Model-initiated cancellation (Q5):** a model MAY cancel; the **client always gets a 100%
  refund** (fee included) regardless of timing, and the model receives nothing. Each model
  cancellation is **recorded as a reliability signal** (surfaced to ops; no automatic penalty
  in v1; a suspension threshold is a later refinement).
- **Client cancel in the <24h window (Q6):** allowed as a **self-serve, no-refund** cancel
  (no forced support contact).
- **Rounding (Q8):** round any split **in the client's favour** (refunds rounded up to the
  nearest penny).

This fully specifies the refund math for the partial-refund action — §8 engineering can proceed.

## 8. Engineering tasks (§7 resolved — ready to design)
- Validate the partial-refund mechanism against the current Sharetribe action set
  (Option A vs B).
- Author the custom process (`cancellation-booking` or a new `default-booking`
  version), push a **new version** via flex-cli, and point `model-profile`'s
  `transactionProcessAlias` at it.
- Build/adjust the TransactionPage UI to expose the correct cancel action + show
  the exact refund/charge **before** confirm (Journey 4's Stripe-reconciliation
  bar).
- New email templates.
- Then, and only then, un-gate Journey 4 in `docs/ux-journeys.md`.
