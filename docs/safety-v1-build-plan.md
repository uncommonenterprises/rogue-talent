# Safety framework v1 — build plan & status (2026-09-20, Day 2)

Scope authority: `docs/safety-framework-v1-scope.md` (Neil's decided per-ID dispositions, 2026-08-09).
This doc = current build state + the sequenced plan to finish the buildable v1 items. Safety-critical
flows get a **human dev review before real users** (charter) — flagged per item.

## Already covered ✅ (no build needed)
- **SAF-01** Model ID verification — now GUARANTEED: models must complete Stripe identity to go live
  (RT-01 reverted 2026-09-20). Every live model is identity-verified → the marketing claim is honestly backed.
- **SAF-10** Shoot-detail disclosure at booking — built: `shoot_type`, `location_type`,
  `shoot_description`, `shoot_address` captured on checkout (order protectedData).
- **SAF-24** Two-sided reviews — native Sharetribe (ReviewForm/ReviewRating/Reviews components).
- **SAF-26** Operator edit-to-neutralise reviews — native Console action + policy (no build).
- **SAF-38** Under-18 age gate — built + verified (signup DOB + 18+ validator).
- **SAF-04/05** Client business/presence checks, **SAF-31/32/34/35/36/39** enforcement/log/dashboard —
  MANUAL/policy at launch volume (operator via Console + spreadsheet). No build; needs written policy.

## Built ✅ (Day 2–3)
- **SAF-25 — "Safety & respect" review dimension — DONE** (merged 2026-09-21; EDN change awaits Neil's flex-cli push, bundled with emails).
- **SAF-29 — Safety reporting flow — DONE + deploy-verified live.** `/report-concern` + transaction
  entry point + footer link; form with mandatory 999/not-monitored copy; server capture (logging +
  reporter privateData). Caught+fixed an SSR crash before it stuck. **Gap:** email alert to safety@ needs
  the email provider (long-lead item) → wire `sendMail` in `server/api/safety-report.js` after.
- **SAF-13/14 — Boundary toggle + silent filter — DONE (merged, build+SSR pass).** Model-only toggle in
  ProfileSettings → `privateData.safety_boundaries.no_private_residence`; server-side silent block in
  `initiate-privileged` (generic "not available", boundary never revealed). **Gap:** enforcement needs
  `SHARETRIBE_INTEGRATION_CLIENT_ID/SECRET` in the Railway server env (else fail-open) → queue for Neil.
- Both are safety-critical → **human dev review before real users** (still required).

## Still to build (sequenced) — now non-colliding since SAF-29's TransactionPage changes are merged
1. **SAF-29 — Safety reporting flow (LAUNCH-CRITICAL).** ✅ DONE (see above). A "Report a safety concern" entry point
   (from a booking/transaction + a general help route), separate from disputes → captured where the
   operator sees it same-working-day. Copy states plainly: *not a monitored emergency service — call
   999*. Design decision needed: where the report lands (server route → email safety@roguetalent.co,
   vs a stored record) given no transactional-email provider is set up yet. → Developer spike+build.
   **Human review before go-live.**
2. **SAF-11 — Private-residence advisory (cheap, high value).** When `location_type = private-residence`
   at booking, show an automatic safety advisory. Frontend-only conditional + copy. → build now.
3. **SAF-13/14 — Model boundary toggle + silent filter.** One "I don't accept private-residence
   shoots" toggle in profile settings (privateData); silently blocks incompatible bookings with a
   GENERIC "not available" to the client (boundary never revealed). Frontend + booking guard.
4. **SAF-17 — Shareable shoot summary.** One tap on a confirmed booking → a complete summary
   (address, date/times, client's verified legal name + registered company) the model shares via her
   OWN apps. We are NOT the channel; no alerting. Frontend (generate/share from booking data).
5. **SAF-25 — "Safety & respect" review dimension.** Add a structured dimension to the review form.
   May touch the review flow/process — assess before building.

## Deferred / escalate
- **SAF-03** Client photo-ID verification — clients have no Stripe Connect; needs a separate Stripe
  Identity (or similar) integration. Bigger build + money/identity-adjacent → assess + likely Neil
  decision on provider. Until built, marketing must not claim clients are ID-verified (only that
  businesses are checked). FLAG for Neil.
- **SAF-06** Sole-trader payment-method rule — payment-config + money-adjacent → Neil decision.

## Marketing-claim guardrail
Per scope doc: anything NOT in v1 must come OUT of public copy. Once the above lands, run a
copy pass: verify Safety/FAQ/landing claims match exactly what's built (esp. client-side
verification wording — see SAF-03 above).
