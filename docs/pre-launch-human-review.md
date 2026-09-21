# Pre-launch human dev review — required before real users (checklist)

Charter rule: **safety-critical / money / identity / personal-data flows get a human developer review
before real users are onboarded.** These were all built by the agent team on the test env and are
flagged here so nothing ships to real users unreviewed. This is a **go-live gate**, not a today task.

## Flows to review (each: read the code + walk it end-to-end on test in the relevant state)

| Flow | What was built | Key things to check | Refs |
|---|---|---|---|
| **Booking + payments (booking-v2)** | Custom transaction process: request→accept→complete, cancel (2-tier), dispute, operator-release + P5D payout backstop; 15% customer fee, destination charges | Money math (payin/payout/fee/refunds) at every transition; the P5D auto-payout vs weekday-only ops check; dispute window; refund/hold paths | `src/transactions/transactionProcessBooking.js`, `ext/transaction-processes/booking-v2/` |
| **SAF-03 client ID verification** | Stripe Identity: create-session route, signed webhook, boolean write-back, booking gate (`initiate-privileged`), `/verify-identity` | Webhook signature + replay handling; secret handling (env only); gate fail-open when unconfigured; only-real-initiate + client-only; DPA note (Stripe = doc processor) | `server/api-util/stripeIdentity.js`, `server/api/create-identity-session.js`, `server/api/stripe-identity-webhook.js`, `server/api/initiate-privileged.js`, `src/containers/ClientVerificationPage/` |
| **SAF-14 residence boundary** | Server-side silent block of private-residence bookings for opted-out models | Integration-API lookup; fail-open (no creds) vs fail-closed (lookup error); generic client message never reveals the boundary | `server/api-util/residenceBoundary.js`, `server/api/initiate-privileged.js` |
| **SAF-29 safety reporting** | `/report-concern` + transaction/footer entry points; server capture (logging + reporter privateData); **email alert to safety@ via Postmark** (`api-util/mailer.js`, fail-safe) | The 999/not-monitored copy; the Postmark transport (token in env only, fail-safe when absent, never fails the request); confirm alert deliverability once the token is live + Postmark account approved; open-logged-out form (rate-limit?) | `server/api/safety-report.js`, `server/api-util/mailer.js`, `src/containers/SafetyReportPage/` |
| **SAF-11 residence advisory / SAF-17 shoot summary** | Model-side advisory on residence bookings; shareable shoot summary (Web Share + clipboard) | Advisory shows only to model in right states; summary shares only appropriate data (uses display/company name until SAF-03 legal name lands); "we don't monitor/contact" copy accurate | `src/containers/TransactionPage/TransactionPanel/SafetyAdvisoryMaybe.js`, `ShootSummaryShare.js` |
| **Contracts / usage-rights** (building) | Clickwrap usage licence at checkout, agreed at accept, ContractPage | **Lawyer must sign off the licence/release wording + confirm clickwrap sufficiency**; legal-party-name gap; terms freeze correctly onto the transaction | `docs/spikes/contracts-usage-rights.md` + build (pending) |
| **Age gate (SAF-38)** | 18+ signup DOB validator | Cannot be bypassed; DOB parsing | signup form |

## Also required before go-live (non-code, tracked elsewhere)
- **Lawyer:** Terms, Privacy/GDPR + DPAs (Stripe/Identity, email provider, Railway, Maps, Sentry),
  cookie policy + consent banner (not built — queued), content-moderation policy, contract licence wording.
- **Accountant:** VAT agent-vs-principal (gates the "flat 15%" claim); DAC7 filing responsibility.
- **Copy truth:** resolve the safety-claims audit (`docs/safety-claims-audit-2026-09-20.md`) so no public
  claim outruns what's built.
- **Ops:** monitored `safety@roguetalent.co`; the same-working-day safety-triage + 1-day approval + P5D
  dispute-window SLAs are honoured.

## How to run the review
Ideally a human developer (not the agent team) reads each flow's code + walks it on `ndstealth1-test`.
Where the agent team can help: set up the specific transaction states / test accounts on request.
