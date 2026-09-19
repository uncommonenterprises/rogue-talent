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

| 2026-09-18 | Booking-v2 dispute UI (increment 3) built + PM-reviewed — local commit 744791f98, NOT pushed. Client dispute action (`completed`→`disputed-hold`) + state displays; scope correct (no in-app operator controls); tests 210/210. Required a NEW `transition/dispute` in the EDN (process change → needs Neil's approval). Design calls for Neil: client can unilaterally freeze payout; dispute window may be short. See docs/booking-v2-cancel-ui-review-2026-09-18.md. | Booking-v2 dispute increment | PM (Developer built; flagged for Neil) | Yes (process/money — pending Neil) |

| 2026-09-18 | ✅ END-TO-END MONEY PATH VERIFIED (test mode). Client rt-client-01 booked rt-model-03 (Anais) → Stripe test card → transaction 6aad6151 created on default-booking v1: lastTransition confirm-payment, payin £345 / payout £300 / fee £45 (15%). First real money movement. Client transaction rights were granted via Integration API (Neil ran the command; email-verification gate is the real mechanism). | Verify the booking money path | PM (Neil ran the grant) | No (test-mode verification) |

| 2026-09-18 | Booking-v2 decisions (Neil, via decision cards): (1) SAFETY cancel reasons — INTERIM: do a plain cancel, store nothing client-visible, direct the model to a safety-report channel; build private operator-only routing before go-live (SAF-29/31/32). (2) APPROVE client disputes (new `transition/dispute`) — client can pause payout until ops resolves. (3) Payouts: KEEP FAST (operator-release + P5D backstop), NO minimum dispute hold (preserves 'usually the next working day'). | Booking-v2 safety/process/money design | Neil (accepted PM recommendations) | Yes (safety/money) |

| 2026-09-18 | Safety-report channel = **safety@roguetalent.co** (Neil, decision card). Already the placeholder in the code (commit 7f381d127 safety-reason fix), so NO code change. Neil ACTION before go-live: create + monitor that inbox (copy promises 'a real person will read it'). Also flagged: SAF-29 proper safety-reporting flow still unbuilt — needed before booking-v2 goes live (until then a safety concern only reaches ops if the model emails). | Booking-v2 safety flow | Neil | Yes (safety) |

| 2026-09-19 | Alias push APPROVED by Neil (decision card) — push booking-v2 over the default-booking alias on TEST. Prereq found before push: booking-v2 has NO templates/ dir; its EDN references 11 notification templates, all STOCK default-booking names (which exist locally). So: assemble templates/ (copy stock) + re-validate EDN, THEN push. Developer preparing templates + exact runbook; Neil runs the flex-cli push (guided); live verification pending Playwright reconnect. | Booking-v2 go-live on test (money/process) | Neil approved; PM executing | Yes (money/process) |

| 2026-09-19 | ✅ booking-v2 LIVE on test — Neil pushed version 2 of default-booking + updated the `release-1` alias to point at it (flex-cli). `process list` confirms release-1 → v2 (0 tx yet); old v1 retains the 2 prior test tx. Cancellation/dispute system now active for new model-profile bookings. Behavioural verification pending Playwright reconnect. | Activate booking-v2 (money/process) | Neil ran the flex-cli push+alias (PM-guided) | Yes (money/process) |

<!-- PM: append new rows above this line, newest at the bottom of the table. -->
