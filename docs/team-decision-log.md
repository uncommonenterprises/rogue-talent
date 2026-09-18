# Rogue Talent — team decision log

Maintained by the Product Manager. One dated line per decision: **what** was decided, **why**, and
whether it was **escalated** to Neil. This is how Neil audits the team without reading every session.

| Date | Decision | Why | Decided by | Escalated? |
|---|---|---|---|---|
| 2026-09-17 | Agent team stood up (PM lead + Developer + UX Tester + UX Designer) | Run development under Neil's direction | Neil | — |
| 2026-09-17 | Four briefs + charter approved as-is; models opus (PM/Dev), haiku (Tester), sonnet (Designer) | Stage 3 sign-off | Neil | — |
| 2026-09-17 | Pilot: UX Designer delivered `docs/design/dob-field-spec.md` (DOB signup field); accepted after PM review (in-bounds, no src/ touched) | Prove the reporting chain on a low-risk task | PM | No (low-risk design doc) |

| 2026-09-17 | Age gate SIGNED OFF by Neil; on origin/main + test deploy. NOTE: reached origin early via a stacked push before sign-off (test-only, no harm) — fix: isolate held-for-sign-off commits, don't push over them | Safety/legal sign-off (SAF-38) | Neil | Yes (safety) |

| 2026-09-17 | Journey 3 verified by PM: tester's "date-picker blocker" was a FALSE ALARM (automation artifact, not a defect); 15% customer fee confirmed correct (£300→£45→£345). Found availability-plan seed bug (seed wrote `availability-plan/day`; app produces `/time`) → fixed Anais/rt-model-03 listing in place + corrected seed script (commit 2b73928a7). | Unblock the booking money-path test | PM (Developer executed) | No (test data + dev-tool fix) |
| 2026-09-17 | Confirmed booking requires an email-verified client — `initiateTransactions` is gated on email verification (approved/active is not enough). Intended behaviour. | Access-control / product policy | Neil | Yes (product) |

| 2026-09-18 | Booking-v2 cancellation UI (increment 2) built + PM-reviewed — local commit 30ec2122d, NOT pushed. Structure/refund-logic approved. BLOCKING safety issue: provider safety-cancel reasons are written to client-visible transaction `protectedData` and the copy promises private team review + no reliability impact, neither of which is built. Must fix before ship (rec: interim generic-cancel for safety reasons; build private routing at go-live, ties to SAF-29/31/32). See docs/booking-v2-cancel-ui-review-2026-09-18.md. | Safety review of booking-v2 build | PM (flagged for Neil) | Yes (safety — pending Neil) |

<!-- PM: append new rows above this line, newest at the bottom of the table. -->
