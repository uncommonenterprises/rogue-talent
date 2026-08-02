# Cancellation & refund — transaction-process spec (DRAFT)

**Status: DRAFT SPEC. Do NOT build yet.** Several refund/commission rules are
**commercial decisions Neil must make** (see "Open commercial questions"). Nothing
here is decided; the engineering can't start until those are answered, because the
money math is the spec, not an implementation detail.

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

## 5. The partial-refund action — the hard engineering bit
Sharetribe's stock library gives `:action/calculate-full-refund` +
`:action/stripe-refund-payment`. There is **no built-in "refund 50%"**. Two
implementation routes — flag both to validate against the current Sharetribe action
set before building:

- **Option A (recommended): tier encoded in state (above).** The 50% state's cancel
  transition needs a partial-refund mechanism — most likely computing a refund
  amount from the captured total and issuing it via `stripe-refund-payment`, or
  restructuring line items so the retained 50% is a "cancellation fee" line item.
  Exact action availability must be confirmed (this is the single biggest
  engineering unknown).
- **Option B: app-computed tier via a privileged transition.** One cancel
  transition; the trusted server computes the tier from booking start + now and
  sets refund/fee line items via `:action/privileged-set-line-items`. Simpler graph,
  but the tier decision moves into our code and MUST be a **privileged/trusted**
  transition so a user can't force the cheaper tier. Also weaker as an audit trail.

Recommendation: **Option A** for enforceability, if a partial refund can be
expressed cleanly; fall back to B if not. Either way, the **refund base** (what the
50% is 50% *of*) is a commercial decision — see below.

## 6. Notifications & payout implications (engineering, but policy-adjacent)
- New email templates per cancel path (customer-cancelled, provider-cancelled,
  penalty applied) for both parties.
- **Payout timing:** provider payout currently happens at completion. If a 50%
  charge means the model earns something on a cancelled booking, the payout of that
  retained amount must be defined (when, and net of what — see questions).

---

## 7. OPEN commercial questions — Neil to answer before any build

> ✅ **Q0 RESOLVED (Neil, 2026-08-02):** the commission model for cancellations is
> the current one — **15% customer booking fee only, 0% provider commission, model
> keeps 100% of their rate.** The questions below are framed against that model.
> There is no provider commission and no "5% customer fee" — that was the pre-19-July
> split and does not apply.

1. **On a 50% charge, does Rogue Talent still take its 15% customer fee, and on
   what base?** (15% of the full booking value? 15% of the 50% actually charged? Or
   is the fee waived on cancellations?)
2. **Does the model receive the full 50% of their rate?** (0% provider commission,
   so no deduction on that side — confirm the model simply gets 50% of their day
   rate, with nothing skimmed.)
3. **Is the client's 15% customer booking fee refunded — fully, proportionally, or
   not at all?** (Refunded in the >72h full-refund case? Kept as a non-refundable
   service charge? Proportionally refunded in the 50% case?)
4. **Boundary behaviour — exactly at 72h and at 24h.** Is `booking-start − 72h`
   inclusive of the better tier or the worse one (i.e. is *exactly* 72h a full
   refund or a 50% charge)? Same at 24h. Needs to be a strict rule, not "about".
5. **Can a model cancel at all, and with what consequence?** Today neither side can.
   If the model can cancel: does the client always get a full refund (assumed
   above)? Does the model incur a penalty, a fee, or a reliability/ranking
   consequence? Is there a threshold (e.g. N cancellations → suspension)?
6. **Can the client cancel in the <24h window at all**, or only request an
   operator-handled exception? (The table allows a no-refund self-cancel; confirm
   that's desired vs forcing support contact.)
7. **What is the refund "base"** in every tier — the model's rate only, or the rate
   **plus** the customer fee? This determines the actual pounds refunded and must be
   pinned down before the partial-refund action can be written.
8. **Currency/rounding** on a 50% split (e.g. odd-penny amounts) — round in whose
   favour?

## 8. Engineering tasks (only after §7 is answered)
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
