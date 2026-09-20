# Live launch runbook — the ordered path to a live marketplace + first £1 (2026-09-20)

Purpose: turn "stand up the live environment" from a vague block into an executable, ordered
checklist, and — critically — surface the **long-lead items to START NOW** (in parallel with the v1
build) so they don't serialise the launch. Companion: `docs/config-as-code-hand-list.md` (what's
code vs scripted vs manual — the detail), `docs/path-to-live-v1.md` (strategy),
`docs/repo-migration-checklist.md` (public→private).

Non-negotiable: live credentials NEVER enter the dev environment; no browser automation is ever
pointed at live; all agent testing stays on the test marketplace.

## ⏰ START NOW — long external lead time (do in parallel with the v1 build) — NEIL
These gate go-live and are NOT instant. Kicking them off today compresses the timeline the most:
1. **Stripe live account + business verification (KYB).** Create/upgrade the live Stripe platform
   account and submit business verification. This is an external review with real lead time (days).
   Nothing charges real money until this clears. **Highest-leverage thing to start.**
2. **Domain — `roguetalent.co`.** Confirm DNS control; decide the live host (Railway prod service or
   other) and how the domain points at it. (Today `roguetalent.co` is a parked page.)
3. **Transactional email provider** (e.g. SendGrid/SES/Postmark) + **domain authentication**
   (SPF/DKIM/DMARC). Required for the approval + booking emails; an unauthenticated domain lands in
   spam, which for an approval email is fatal. Choose the provider and start DNS auth now.
4. **Terms/Privacy legal review** — have a lawyer review before go-live (see `compliance-open-items.md`).

## Phase 1 — v1 feature-complete on TEST (in progress, PM-driven)
- Model lifecycle (RT-01/02/08) ✅; booking-v2 live+verified ✅; client discovery/booking fixed ✅;
  config-as-code ✅. **Remaining:** safety v1 build (SAF-29 reporting in progress; SAF-11/13/14/17/25),
  and the safety-claims copy corrections (`docs/safety-claims-audit-2026-09-20.md`).
- Gate to leave Phase 1: v1 scope built + all public claims true (audit resolved).

## Phase 2 — create the live marketplace + apply config
1. **Create the live Sharetribe marketplace** (separate from `ndstealth1-test`). Note its app
   client id/secret + Integration (Ops) app id/secret — these are per-env (bucket C item 7/8).
2. **Bucket A (code) auto-applies** — deploying the app to the live service brings listing/user
   types+fields, categories, search *display*, `en.json`, landing pages, booking-v2 client map. No
   per-env work.
3. **Bucket B (flex-cli, per env)** against live: `flex-cli process push` (booking-v2 + email
   templates), then `flex-cli process update-alias` to point the listing type's alias at it; and
   **apply the search schema** (`flex-cli search set` — see `config/assets/SEARCH-SCHEMA.snapshot.txt`;
   easy to forget — a field shows in UI but isn't filterable until this runs). Recommend a small
   deploy script that runs these against a target env to avoid drift.
4. **Bucket C (manual Console + env vars, per env)** — reproduce the account-level core from the
   hand-list §C and DIFF against test: access control (user-approval OFF, listing-approval ON — but
   only after emails exist), Stripe Connect (live account + live keys + KYB), commission (confirm NO
   Console commission — the 15% is in code, double-charge risk), social login redirect URIs (live
   domain), **branding asset set to `#2B57FF`** (the override gotcha), general settings.

## Phase 3 — env, domain, security
5. Set the live **Railway env vars** (hand-list §C 7–13): live Sharetribe client id/secret, Ops app,
   live Stripe publishable key, Maps key **with live-domain referrer restriction**,
   `REACT_APP_MARKETPLACE_ROOT_URL=https://roguetalent.co`, `REACT_APP_ENV=production`, Sentry DSN,
   email-provider keys.
6. Point **`roguetalent.co`** at the live service; verify SSL.
7. **Repo privacy migration** (public→private duplicate) per `docs/repo-migration-checklist.md` —
   sequence: rotate the leaked Sharetribe secret first (still-pending `882a…`), verify a test
   booking, then migrate; re-arm `core.hooksPath`, reconnect Railway. Do before real users.
8. **Monitoring**: Sentry project for live.

## Phase 4 — verify on live, then go
9. **Verification pass on live** (careful — real money): walk model onboarding→approval→go-live,
   a booking money-path (use Stripe's live-mode test affordances / a small real transaction you
   refund), cancel + dispute, search filters, and confirm emails actually deliver (not spam).
10. **Go-live gates (all must be true):** listing-approval ON *and* approval/under-review emails
    exist + deliver; all public safety/verification/fee claims true (audit resolved); Terms/Privacy
    lawyer-reviewed; safety reporting (SAF-29) live + `safety@roguetalent.co` monitored; secret
    rotated + repo private.
11. **Onboard the first real models** (see `docs/path-to-first-ten-models.md`), then the first client
    booking = **first £1**.

## Critical path to £1 (the short version)
Stripe KYB + domain + email provider (start now, external lead time) ‖ finish v1 safety build + copy
truth ‖ then: create live marketplace → apply config (A auto / B flex-cli / C manual) → env+domain+
security → verify on live → onboard models → first booking. The long-lead trio is the real schedule
driver — starting it today is worth more than any single build.
