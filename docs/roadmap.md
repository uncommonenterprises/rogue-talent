# Rogue Talent — future development roadmap

Deferred features and enhancements — things we've deliberately decided NOT to build for v1,
with enough context to pick them up later. Not a backlog of bugs (those live in
`ux-reports/backlog.md`); this is intentional scope-deferral of real features.

---

## Cancellation policy — add the middle "50% refund" tier

**Deferred:** 2026-08-06 (Neil). **v1 ships a two-tier policy** (full refund before a cutoff,
no refund after — stock-only, no custom payment work). The three-tier policy with a **24–72h
50% refund** middle band is a post-v1 enhancement.

**Why deferred:** Sharetribe stock has **no partial-refund action**, and our flow captures the
payment at provider-accept, so a captured booking can only be *fully* refunded by stock actions
(verified 2026-08-06 — see `docs/cancellation-process-spec.md` §5). A 50% refund therefore
needs custom payment engineering that isn't worth blocking v1 on.

**What it needs when we build it (Route 1 in the spec):**
- A custom server-side partial refund via the Stripe API directly (`refunds.create({
  payment_intent, amount })`) — not the stock `stripe-refund-payment` action.
- `:action/privileged-set-line-items` to rewrite the transaction breakdown so Sharetribe's
  books reconcile (for a £150 booking: client −£86.25, model +£75, RT +£11.25).
- Handling the **retained-portion payout** to the model on a cancelled transaction.
- A marketplace-event/webhook listener (Integration API) to trigger and reconcile it.

**Commercial math is already decided** (spec §7, Neil 2026-08-06) so this is purely an
engineering lift when prioritised: model gets 50% of rate, RT fee scales to the amount charged,
customer fee refunded proportionally, boundaries favour the client.

**Value when added:** kinder to models on medium-notice (24–72h) cancellations — a supply-trust
lever — vs. the v1 cliff from full refund to no refund at a single cutoff.

---

## (add future deferred features below)
