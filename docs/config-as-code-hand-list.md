# Config-as-code — what's in Git vs scripted vs manual per environment

**9 August 2026.** Answers Neil's question: once config-as-code (Tier 1) is done, **what still
has to be configured by hand in each environment** (test + live)? Config-as-code **shrinks** the
manual surface from "everything" to the account-level core — it does not eliminate it. This is the
definitive planning list.

Three buckets:

## A. In Git — identical in both environments, ZERO per-env work
Once ported into `src/config/*.js` with the merge toggles flipped (the Tier-1 work):
- Listing types; the 18 **listing fields**; user types; **user fields**; categories.
- Search **display** config (which fields show as filters in the UI), layout, branding *defaults*.
- All app copy (`en.json`), the hand-coded landing pages, routing.
- The `booking-v2` client process map (`src/transactions/…`).

These deploy with the code. Same commit → same config in both envs. This is the correctness win.

## B. Scripted per environment (flex-cli / CLI) — same command, run against each env
Code-managed but **must be applied to each marketplace separately** (a one-line command per env,
not hand-clicking):
- **Transaction processes** — `flex-cli process push` (booking-v2 + any others). Per env.
- **Email templates** — bundled with the process push. Per env.
- **Search schema** (the extended-data indexing that makes fields *filterable*, distinct from the
  UI display in bucket A) — `flex-cli search set` (or equivalent). **Easy to forget** — a field
  can show in the UI (bucket A) but not be searchable until this is run in that env. Per env.

Automatable via a small deploy script that runs these against a target env. Low risk once scripted.

## C. Manual in Console / env vars per environment — the irreducible core
No API/CLI writes these; they are **hand-configured in each environment**, and are the real
drift risk. Budget for reproducing ALL of these in live, then diffing:

**Console (Build/Advanced):**
1. **Access control** (Build → General → Access control): user-approval toggle **OFF**, listing-
   approval toggle **ON**, private-marketplace toggle. *(Live gate — and listing-approval must not
   go on until emails 1 & 2 exist.)*
2. **Stripe Connect**: the connected **platform Stripe account**, the **secret key** (Console →
   Payments), and **test vs live keys**. Live also needs Stripe **KYB/business verification** (an
   external process with lead time). Per env, and live ≠ test account.
3. **Commission**: the 15% customer fee is applied in **code** via `privileged-set-line-items`, so
   it travels in bucket A — **but confirm there is no conflicting Console commission setting** in
   either env (a Console commission + a code commission would double-charge). Verify per env.
4. **Social login** (Google / Facebook): client IDs + secrets, in Console **and** env vars. Per env
   (redirect URIs differ by domain).
5. **Branding asset**: the Console branding (marketplace colour, logo) **overrides the code
   default** (this is the `#2B57FF` gotcha). Must be set (or deliberately cleared) in **each** env
   or the code branding won't show. Per env.
6. **General/marketplace settings**: name, default locale/currency, notification settings, the
   built-in email "from"/reply-to.

**Env vars (Railway per service / `.env`):**
7. `REACT_APP_SHARETRIBE_SDK_CLIENT_ID` + `SHARETRIBE_SDK_CLIENT_SECRET` — **different per env**
   (each marketplace is a different Sharetribe app).
8. `SHARETRIBE_INTEGRATION_CLIENT_ID/_SECRET` (Ops app) — per env.
9. `REACT_APP_STRIPE_PUBLISHABLE_KEY` — test vs live, per env.
10. `REACT_APP_GOOGLE_MAPS_API_KEY` — + **referrer restrictions per domain** (live domain differs).
11. `REACT_APP_MARKETPLACE_ROOT_URL` — per env; live points at `roguetalent.co`.
12. `REACT_APP_SENTRY_DSN` — per env (separate Sentry projects for test vs live is advisable).
13. Transactional-email-provider keys (once chosen — see `compliance-open-items.md`) — per env.
14. Custom **domain** setup (`roguetalent.co` → the live app) + DNS (incl. email SPF/DKIM/DMARC).

## The honest summary
- **Bucket A** is why config-as-code is now a *correctness* play: it makes the app config
  diff-able and identical across envs.
- **Buckets B and C don't go away.** Standing up live is still: run the CLI pushes against live
  (B), then **hand-reproduce ~14 account-level settings** (C), then env vars, then verify. Budget
  **1–2 days** for C + verification, and it's only *safe* because A removes the field/type/copy
  drift that would otherwise dominate.
- **Do A before live exists**, so live is built from the same source as what you tested — not
  rebuilt beside it.
