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
