# SAF-25 — "Safety & respect" review dimension: options + recommendation (2026-09-21, Day 3)

Scope: SAF-25 is IN v1 (Neil, 2026-08-09) and Neil chose "build all safety before launch" (2026-09-20).
This memo makes the approach decision-ready. **Needs Neil's call** because the real options involve a
transaction-PROCESS (EDN) change (escalation category) and a public-vs-private trade-off.

## The constraint
Sharetribe reviews are natively a **single** `rating` (1–5) + `content` (text), created by
`:action/post-review-by-provider|customer` in the booking-v2 review transitions
(`ext/transaction-processes/booking-v2/process.edn` lines 207–230). There is **no native second rating
dimension**, and the native review entity is what's shown publicly on profiles. So a structured
"Safety & respect" score can't simply be added to the public review.

## Options
**A. Store `safetyRespectRating` in transaction protectedData (process change).**
- Add `:action/update-protected-data` to the four review transitions; add a second `FieldReviewRating`
  to `ReviewForm`; pass the value through `onSubmitReview`→`sendReview` params; display it by reading the
  transaction's protectedData.
- Pros: real structured data; feeds the operator/SAF-29 safety signal. Cons: **NOT public on profiles**
  (protectedData is visible to the two parties + operator only); it's a **process (EDN) change** → needs
  Neil's approval + a `flex-cli process push` + `update-alias` (same mechanism as the emails activation);
  the dimension lives beside, not inside, the native review.
- Effort: M.

**B. Fold "safety & respect" into the review prompt (no process change).**
- Keep the single native rating, but add guidance/copy prompting reviewers to comment on safety &
  respect in the free-text review, and label the rating context accordingly.
- Pros: zero process change, ships now. Cons: not structured data — can't filter/aggregate or feed a
  clean safety signal; weaker than the scope intends.
- Effort: S.

**C. Defer SAF-25 to post-launch.**
- Ship v1 with SAF-24 (native two-sided reviews) only; add structured dimensions when review volume
  makes them meaningful (the scope itself notes some safety machinery is "worth nothing with ten
  models and no history").
- Pros: no process change, focuses launch. Cons: departs from "build all safety before launch."

## PM recommendation
**A** if we want it genuinely in v1 as structured data (it's the honest read of SAF-25), accepting it's
operator/parties-visible rather than public, and that it's a process change Neil runs. If the goal is
purely to not delay launch, **B** now + **A** post-launch is defensible. I'd not pick C given the
"build all safety" decision — but flag that A's value (a safety signal at ten models) is modest, so B-now/
A-later is a reasonable middle. **Your call.**

## If A is chosen — the change
- EDN: add `{:name :action/update-protected-data}` to `review-1/2-by-provider` and
  `review-1/2-by-customer`; allow a `safetyRespectRating` (+ optional note) param on those transitions.
- Code: 2nd `FieldReviewRating` in `src/containers/TransactionPage/ReviewForm/`; thread the value through
  `onSubmitReview`/`sendReview` params into protectedData; display in `src/components/Reviews/`.
- Deploy: `flex-cli process push` booking-v2 + `update-alias` (Neil, marketplace write) — bundle with the
  emails activation push to do one process push.
- Human dev review pre-go-live (safety flow).
