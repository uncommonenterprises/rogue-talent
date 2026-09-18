# PM review — booking-v2 cancellation UI (increment 2)

**Reviewed 2026-09-18.** Developer local commit `30ec2122d` (NOT pushed; `main` ahead 1 of origin).
Build gate green; TransactionPage tests 192/192.

## Verdict
UI, refund-preview logic, reason taxonomy and button placement are **well-built and approved in
structure**. But there is **one blocking safety issue** to resolve before this ships, plus minor
follow-ups. Nothing is pushed; no urgency, but it must not ship as-is.

## What's good
- Refund preview is **state-driven** (reads the process state + `payinTotal`/`payoutTotal`), not a
  client clock — correct and safest. Two-tier logic correct: customer ≥48h = full refund; customer
  <48h = no refund + model still paid; provider = always full refund to client, £0 to model.
- Customer copy is honest about the <48h non-refundable case (no dark-pattern).
- Cancel is wired as the **secondary/keyline** action on `accepted`/`accepted-late` (not the cobalt
  hero) — matches brand (one cobalt action/view; destructive action de-emphasised).
- Reason taxonomy cleanly split reliability (4) vs safety (3), tagged on submit.

## BLOCKING before ship — safety-reason path over-promises AND under-protects
The safety reason-group note (`CancelBookingModal.reasonGroup.safetyNote`) says:
> "Safety reasons go to the Rogue team for review and never count against your reliability."
Neither is implemented yet:
- The **reliability-vs-safety routing** (safety → ops queue, never the reliability counter) is an
  off-process events listener that is **not built** (backend; needs Neil).
- The reason is stored on the provider-cancel transition as `protectedData: { cancelReason,
  cancelReasonCategory }`, and Sharetribe **transaction `protectedData` is visible to BOTH parties**
  — so a model's safety disclosure ("the client made me feel unsafe") is **readable by that client**.

So the model is told their disclosure is privately reviewed when in fact it is (a) not routed
anywhere yet and (b) exposed to the accused client. This could endanger a model and is a false
promise.

**Decision needed (Neil — safety + product):** before go-live, either
- (a) build the private safety-report routing (events listener → operator-only store / safety-report
  flow; ties to safety framework SAF-29/31/32) AND keep the sensitive reason off any client-visible
  field; or
- (b) interim: remove the "goes to the team / never counts" promise, and for safety-category
  cancellations do a **generic cancel** (no sensitive `protectedData`), directing the model to a
  proper safety-report channel.
PM recommendation: (b) as the interim so nothing over-promises, with (a) as the real go-live fix.
Reliability reasons being visible to the client is acceptable (not sensitive) and can stay.

## Minor / follow-ups (non-blocking)
- Two-tier boundary is state-driven (good), but there's an `enter-late` race edge: if the state
  hasn't flipped yet a customer-cancel (full refund) could be attempted just inside 48h and the
  backend may reject once state flips. Needs live verification after the alias push.
- Align the cancelled/canceled spelling: EDN `:state/cancelled` (two L) vs JS graph `canceled`
  (one L). Harmless in-app (state derived from the transition graph) but tidy up to avoid confusion.

## Do NOT push until
1. The safety-reason decision above is resolved.
2. Booking-v2 EDN is pushed over the `default-booking` alias (money escalation — Neil's sign-off;
   the Sharetribe backend must be updated too).
3. Live verification of the cancel transitions/refunds after that push.

---

# PM review — booking-v2 dispute action + state displays (increment 3)
**Reviewed 2026-09-18.** Developer local commit `744791f98` (NOT pushed). Build gate green;
TransactionPage tests 210/210. Scope respected (client dispute + state displays only; NO in-app
operator controls — those stay Console/Integration-API side). Reuses stock `DisputeModal`.

## Verdict
Well-built and correctly scoped. But it required a **new transaction-process transition** and raises
two real design decisions — all needing Neil. Held unpushed.

## NEEDS NEIL — transaction-process change (escalation)
The booking-v2 EDN had **no client dispute transition** (only operator-side ones); the design doc
§3b narrates "a client can raise a dispute" but never defined it. The Developer added
`transition/dispute` (customer, `completed → disputed-hold`, `update-protected-data`) to the graph +
EDN. This is a **process change requiring your approval** before the EDN is re-validated and pushed
(now 35 transitions / 18 states). Verify my read: the transition is sane and matches the design
intent.

## Design decisions for Neil
1. **A client can unilaterally freeze the model's payout.** `dispute` moves `completed →
   disputed-hold`, pausing payout until an operator resolves. Risk: a bad client could weaponise it
   to withhold/delay a model's pay. Confirm this is acceptable (it's standard marketplace behaviour,
   but flagging the model-harm angle). Also: client- and operator-initiated holds share the
   `disputed-hold` state/feed message (initiator only distinguishable via the reason in protectedData
   / Console).
2. **The dispute window may be short.** `operator-complete` can release payout as early as the next
   working day, so the client's window to dispute *before* payout could be brief. If you want a
   guaranteed minimum dispute window, that's a further process change (a minimum-hold before any
   payout). Flagged, not built.

## Privacy of the dispute reason — my assessment differs from the cancel case
`protectedData.disputeReason` is visible to both parties, so the model can read the client's dispute
reason. Unlike the model's *safety* cancel reason (which must NOT reach the accused client), a
client's dispute reason being visible to the model is **acceptable and arguably right** (natural
justice / the model's right to respond, SAF-34). Recommendation: keep it visible, but **reword the
booking dispute copy so it doesn't imply "team-only" privacy** (the reused stock `DisputeModal`
description says "let the team know what happened," which reads as private). Minor copy fix.

## Minor
- The inline action/button reuse the shared purchase-flavoured `DisputeModal.submit` /
  `TransactionPanel.disputeOrder` = "Dispute order". Consider booking-specific keys ("Report a
  problem") later; the Developer left shared keys untouched to avoid regressing the purchase process.

## Do NOT push until
Same gates as increment 2, plus: Neil approves the new `transition/dispute`; the two design decisions
above are settled; and post-alias-push behavioural verification (the customer `dispute` fires
`completed → disputed-hold` and actually blocks `auto-payout`).
