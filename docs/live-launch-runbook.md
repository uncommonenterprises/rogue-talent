# Live launch runbook — path to first £1 (v2, refreshed 2026-09-24, Day 6)

Single source of truth for getting Rogue Talent from "built" to "first real booking." The v1 build is
**essentially complete** — what remains is launch logistics, a few Neil-gated provisioning/legal items,
and a human review. Companion detail: `docs/config-as-code-hand-list.md` (code vs scripted vs manual),
`docs/repo-migration-checklist.md` (public→private), `docs/pre-launch-human-review.md` (the review gate).

**Non-negotiable:** live credentials NEVER enter the dev environment; no agent/browser automation is
ever pointed at live; all agent testing stays on `ndstealth1-test`.

---

## ✅ Where we are — the build is done
- **v1 features:** model lifecycle, booking-v2 (cancel/dispute/backstop, verified end-to-end), client
  discovery/search, config-as-code — all built + verified on test.
- **Safety framework:** SAF-01/03(dormant)/10/11/13/14/17/24/25/29/38 — built. SAF-29 reporting live +
  emailing via Postmark (verified). Booking emails + SAF-25 review dimension pushed to test (process v3).
- **Contracts:** single standard content licence + release, clickwrap in checkout; **v3 draft with you
  for the solicitor**.
- **Account-status lifecycle:** fully built, **dormant behind a flag** (Draft→Pending→Approved→Verified,
  Verified-only visibility, verify-nudge emails, client company field). Cutover checklist in
  `docs/specs/account-status-step2-onboarding-and-visibility.md`.
- **Design:** full cosmetic backlog done — the site reads as one branded system.
- **Copy-truth:** Console copy pass done on test (fees, disclosure, `.co` inboxes, footer). Landing/app
  copy corrected.
- **Long-lead trio (was the schedule driver):** Stripe **live account + KYB ✅**; **Postmark** live +
  `roguetalent.co` DKIM/DMARC-authed ✅. **Remaining long-lead: the domain pointing at a live host, and
  legal review.**

---

## 🔑 Three launch-scope DECISIONS for Neil (these shape the path)

**D1 — Client-ID verification (SAF-03).** Built, dormant. To make the "clients/businesses are verified"
copy true at launch, it must be **live** (Stripe Identity keys + Integration creds on Railway, flag on).
- **Recommend:** provision it for launch (it's cheap ~£1.25/verif, backs the trust claim + pairs with the
  manual Companies House check). Alternative: launch with honest "businesses are checked" copy and add
  client-ID as a fast-follow.

**D2 — Account-status lifecycle cutover.** Built, dormant. **Launch does NOT require it** — the current
flow (Stripe-before-submit + manual user approval) is safe and works; no unverified model can be
discoverable/bookable today.
- **Recommend:** **fast-follow after £1** (it's a UX enhancement + needs the Connect webhook, Integration
  creds, listing-approval ON, and a human review). Launching on the current flow is the faster, lower-risk
  path to first revenue. Alternative: do the cutover pre-launch if you want the nicer onboarding from day 1.

**D3 — Contract sign-off.** Launch **requires** the solicitor to sign off the licence wording (v3 is with
you). Until then the in-app contract copy stays DRAFT. This is a hard gate. → get it to the solicitor.

---

## 📋 The ordered path to £1 (remaining work, with owners)

### Step 1 — Long-lead finish (NEIL, start now; external lead time)
- **Domain:** point `roguetalent.co`'s web record at the live host (Railway prod service). Keep the
  Google Workspace MX untouched. (DNS control confirmed via the Postmark setup.)
- **Legal:** contract v3 → solicitor; Terms/Privacy + cookie/consent review (`compliance-open-items.md`).
- **Accountant:** VAT agent-vs-principal (gates the flat-15% claim); DAC7 filing responsibility.
- **(If D1=yes) provision client-ID:** Stripe Identity keys + Connect webhook — you have the click-by-click.

### Step 2 — Create the live marketplace + apply config (NEIL runs writes, PM prepares/guides)
1. **Create the live Sharetribe marketplace** (separate from `ndstealth1-test`); note its app client
   id/secret + Integration (Ops) app id/secret (per-env).
2. **Bucket A (code) — auto-applies** on deploying the app to the live service (listing/user
   types+fields, categories, search *display*, `en.json`, landing pages, booking-v2 client map).
3. **Bucket B (flex-cli, per env)** against live — same push we just did on test: `process push`
   default-booking (v3 EDN: booking emails + SAF-25) → `update-alias release-1`; **apply the search
   schema** (`flex-cli search set` — `config/assets/SEARCH-SCHEMA.snapshot.txt`; easy to forget — a field
   shows but isn't filterable until this runs). I'll prep the exact commands like I did for test.
4. **Bucket C (manual Console, per env)** — reproduce from `config-as-code-hand-list.md` §C and DIFF vs
   test: access control (user-approval ON; listing-approval OFF unless D2=cutover), Stripe Connect (live
   account + live keys + KYB), **confirm NO Console commission** (15% is in code — double-charge risk),
   social-login redirect URIs (live domain), **branding asset = `#2B57FF`** (override gotcha), and — this
   one's important — **redo the Console copy pass on live** (pages/footer/email-texts are per-marketplace;
   the test copy fixes don't carry over). I'll hand you the same paste-ready copy.

### Step 3 — Env, domain, security (NEIL sets vars; PM prepares the list)
- Live **Railway env vars** (hand-list §C 7–13): live Sharetribe client id/secret, Ops app, live Stripe
  publishable key, `POSTMARK_SERVER_TOKEN`, Maps key **with live-domain referrer restriction**,
  `REACT_APP_MARKETPLACE_ROOT_URL=https://roguetalent.co`, `REACT_APP_ENV=production`, Sentry DSN.
- **Sharetribe outgoing email address** (Console, live-only): set to a `roguetalent.co` sender (needs
  Sharetribe's own sender-domain verification → allow lead time). Carries Sharetribe's txn emails.
- Point `roguetalent.co` at the live service; verify SSL.
- **Repo privacy migration** (public→private) per `docs/repo-migration-checklist.md` — rotate the leaked
  Sharetribe secret `882a…` first, then migrate; re-arm `core.hooksPath`, reconnect Railway.
- **Monitoring:** Sentry project for live.

### Step 4 — Verify on live, then go (PM verifies on test-parity; NEIL for real-money bits)
- **Human dev review** of the safety/money/identity flows (`docs/pre-launch-human-review.md`) — the gate.
- **Verification pass on live** (careful — real money): model onboarding→approval→live, a booking
  money-path (small real transaction, refunded), cancel + dispute, search filters, and confirm emails
  actually deliver (not spam).

### Step 5 — Go-live gates (ALL true) → onboard first models → first booking = **first £1**
- Approval/booking emails deliver; all public fee/safety/verification claims true (audits resolved);
  **contract wording lawyer-signed-off** (D3); SAF-29 live + `safety@roguetalent.co` monitored; secret
  rotated + repo private; human review passed.
- **Client-verification copy gate:** the "clients/businesses are verified" claims stay down unless D1 is
  live (Stripe Identity provisioned + confirmed on a real booking). Otherwise use honest "businesses
  checked" wording.
- Then onboard the first real models (`docs/path-to-first-ten-models.md`) → first client booking = £1.

---

## 🕓 Fast-follow (post-£1, not launch-blocking)
- Account-status lifecycle cutover (D2) — flag on + provisioning + human review.
- Contract in-app copy sync to the solicitor's final wording.
- SAF-25 behavioural test (needs a full booking→review lifecycle on the live/test process).
- COS-11 real photography; COS-20 already done; remaining tester screenshot-pass areas.

## Critical path, short version
**Domain live + solicitor sign-off + human review** are the three things most likely to gate £1 now
(the long-lead trio is essentially cleared). Everything else is a well-understood create-live-marketplace
→ apply-config → verify sequence I can drive with you. Launching on the **current** flow (D2=fast-follow)
is the fastest safe route to first revenue.
