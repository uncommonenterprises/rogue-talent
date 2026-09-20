# Spike: Client identity verification for v1 (SAF-03)

**Type:** research-only spike (no code changed, nothing committed, no marketplace/Stripe writes)
**Author:** Developer agent · **Date:** 2026-09-20
**Decision context:** Neil decided 2026-09-20 to **build** client identity verification for v1
(SAF-03), not de-claim it. Public copy already claims clients/businesses are verified. Models are
ID-verified via **Stripe Connect identity** (required before go-live). Clients are buyers with **no
Stripe Connect account**, so the Connect mechanism does not apply to them. This spike picks the
mechanism and the build plan.

---

## TL;DR

- **Recommended mechanism: Stripe Identity** (the standalone product, separate from Connect). We
  create a `VerificationSession` server-side with our platform **Stripe secret key**, run Stripe's
  hosted/embedded flow (gov photo ID + selfie), and receive the pass/fail via **webhook**. It is
  feasible and is the right fit: **Stripe holds the ID document images and selfie** (a GDPR win — we
  never store special-category document data), we persist **only the result** (`verified` y/n + a
  session id + minimal name/DOB if we even want it) onto the client's Sharetribe user metadata.
- **Cost flag for Neil: £1.25 per completed document+selfie verification**
  (https://stripe.com/gb/pricing under Identity). Per-verification, only on completion. This is the
  main money decision.
- **Architecture flag (same one the onboarding-split spike raised):** Sharetribe does **NOT**
  mediate Stripe Identity — it only proxies Connect. So Stripe Identity requires our Express server
  to call Stripe's API directly with the **platform Stripe secret key**, which **does not exist in
  our server today** (we only have `REACT_APP_STRIPE_PUBLISHABLE_KEY`; the secret key lives in the
  Sharetribe Console for Connect). New server-side secret + webhook endpoint. Env/Railway only,
  never committed. This is a secret-hygiene + architecture decision for the PM/Neil, and — like all
  identity/safety flows — needs **human dev review before real users** (charter rule).
- **Gate:** add an "identity verified" check to the existing server-side privileged-initiate
  chokepoint (`server/api/initiate-privileged.js`) alongside the current
  email-verification/permission gate, reading the stored flag from the client's user profile so an
  unverified client cannot book.
- **Timing:** verify **after signup, before first booking** (parallel to models doing Stripe before
  go-live) — least friction, still blocks booking.

**File:** `docs/spikes/client-id-verification.md`

---

## Q1 — Mechanism: Stripe Identity vs alternatives

### Stripe Identity (RECOMMENDED)

Stripe Identity is a standalone verification product independent of Connect. The flow:

1. **Create a VerificationSession server-side** with the platform secret key, `type: 'document'`
   (document authenticity + ownership, with an optional selfie check). You attach your own
   `metadata[user_id]` = the Sharetribe user id, and use an idempotency key to avoid duplicates.
   (https://docs.stripe.com/identity/verification-sessions#create)
2. **Return only the `client_secret`** to the frontend; the browser calls `stripe.verifyIdentity()`
   to run Stripe's hosted/embedded flow (camera capture of gov ID + selfie). The client secret is
   sensitive — never logged or put in URLs; TLS required.
   (https://docs.stripe.com/identity/verification-sessions#client-secret)
3. **Receive the result.** Submission/processing updates the session `status` and creates a
   `VerificationReport`, "normally within a few minutes." On success `status` becomes `verified`; on
   failure `requires_input` with a `last_error.code`/`reason`.
   (https://docs.stripe.com/identity/verification-sessions#accessing-results)

**We can store ONLY the result, and Stripe holds the documents.** The document images and selfie
are stored by Stripe as `File` objects; our integration only ever reads the session `status` (and
optionally `verified_outputs` name/DOB/country if we choose to expand it). Stripe supports
**redaction** — on a user data-deletion request we POST `/redact` and Stripe deletes the PII,
`File` contents, `VerificationReports` and request logs, emitting
`identity.verification_session.redacted` (https://docs.stripe.com/identity/verification-sessions#redact).
This is the GDPR win: **we avoid holding any special-category document data** — we persist a boolean
result plus the session id, and Stripe is the data controller/processor for the sensitive images.

**Cost:** £1.25 per completed document+selfie verification; £0.40 per ID-number lookup (US SSN only,
not relevant to us). Charged on completion. (https://stripe.com/gb/pricing — Identity section.)
Flag for Neil: this is a real per-user cost; at low v1 volumes it is small, but it scales with
signups and repeat/failed attempts (reuse the same session on retry to avoid double-charging —
Stripe recommends reusing the session, which also tracks failed attempts).

### Alternative A — Manual operator ID review (fallback, NOT recommended as primary)

Client uploads a photo of gov ID → stored on the marketplace → operator eyeballs it and sets a
verified flag in Console. Pros: zero new Stripe infra, no per-verification fee. Cons: **we would be
storing special-category ID documents ourselves** (GDPR/data-minimisation liability, secure-storage
+ retention/deletion burden), it is manual and slow (does not scale, adds operator SLA load), no
selfie/liveness so weaker fraud resistance, and it contradicts the "Stripe holds the docs" GDPR win.
Reasonable **only** as a narrow manual fallback for the rare client who cannot complete Stripe's
flow (no smartphone camera / document Stripe can't read). Recommendation: keep as a documented
manual escape hatch, not the mechanism.

### Alternative B — Third-party (Onfido / Persona)

Dedicated KYC vendors with richer document coverage and case-management. Cons for v1: another vendor
contract + secret + webhook to integrate (same architecture cost as Stripe Identity but *more* net-
new because we already have a Stripe relationship), generally higher/negotiated pricing, and no
existing footprint in this stack. **Recommendation: not for v1.** Stripe Identity reuses our
existing Stripe account/CSP allowances (`*.stripe.com`, `js.stripe.com` already whitelisted —
`server/csp.js:70,76,114,126`) and keeps one payments vendor.

**Q1 recommendation: Stripe Identity as primary; manual operator review as a documented narrow
fallback; no third-party for v1.**

---

## Q2 — Architecture / secret handling

### What exists in `server/` today

- **No server-side Stripe secret key usage anywhere.** A grep of `server/` for Stripe finds only:
  CSP allow-lists (`server/csp.js`), a currencies comment + support table (`server/api-util/currency.js`),
  and Stripe-related *transaction-state* name lists in `server/api/delete-account.js`. There is **no
  `stripe` npm client call and no `STRIPE_SECRET*` env var** on the server.
- The only Stripe key in our env template is the **publishable** key
  (`.env-template:10` `REACT_APP_STRIPE_PUBLISHABLE_KEY=`) — safe in the client bundle by design.
  The **platform secret key lives in the Sharetribe Console** (see `.env-template:7` "You also need
  to set Stripe secret key in Sharetribe Console"), because **Connect is fully mediated by
  Sharetribe** via the Marketplace SDK (`sdk.stripeAccount.*`) — our app never touches Stripe's API
  directly for Connect.
- **Sharetribe does NOT mediate Stripe Identity.** Its Stripe integration is Connect-only
  (accounts, capabilities, payouts). There is no Marketplace/Integration API surface for Identity
  VerificationSessions. This is the same gap the onboarding-split spike hit for embedded Connect
  components: `docs/spikes/onboarding-split-ux.md` (TL;DR "Escalations" — embedded components
  "require calling Stripe's API directly with the marketplace's Stripe **platform secret key** from
  our Express server (Sharetribe does not proxy Account Sessions)"). Stripe Identity raises the
  **identical** decision.

### What we must add

- The platform **Stripe secret key** as a **new server-only env var** (e.g. `STRIPE_SECRET_KEY`),
  set in **Railway + gitignored `.env` only**, never committed. This repo is public and has push
  protection + the pre-commit hook (`.githooks/pre-commit`) — the key must never appear in a file.
  It should be the **test-mode** secret key while we are on `ndstealth1-test` (charter: test mode
  always).
- The `stripe` Node SDK as a **new server dependency** (ask PM before adding — dependency-policy per
  AGENTS.md). Used only in `server/api/*` handlers.
- A **webhook endpoint** (`server/api/stripe-identity-webhook.js`, mounted in `server/apiRouter.js`)
  to receive `identity.verification_session.verified` / `.requires_input` and persist the result. It
  must verify the Stripe **webhook signing secret** (another server-only env var, e.g.
  `STRIPE_IDENTITY_WEBHOOK_SECRET`) and read the **raw** request body (Stripe signature verification
  needs the unparsed body — note `server/apiRouter.js` currently applies `bodyParser`/transit
  handling, so the webhook route needs a raw-body carve-out mounted before those parsers).

### Secret-hygiene recommendation

Two new server-only secrets (`STRIPE_SECRET_KEY`, `STRIPE_IDENTITY_WEBHOOK_SECRET`) + the existing
optional Integration API creds (`SHARETRIBE_INTEGRATION_CLIENT_ID/SECRET`, `.env-template:80-86`)
for writing the result flag. All live in Railway/`.env` only. Document them in `.env-template` as
names-with-empty-values (as done for the Integration creds). **Escalate to Neil**: introducing the
platform secret key into our server is an architecture + secret decision, and this is a
safety/identity flow → human dev review before real users.

---

## Q3 — Gating booking on client verification

### How booking is gated today

- **Server chokepoint:** `server/api/initiate-privileged.js` is the single trusted path that calls
  `trustedSdk.transactions.initiate` / `initiateSpeculative` (`:96-99`) via `getTrustedSdk(req)`
  (`:79-81`). Email-verification / transaction rights are enforced by **Sharetribe's own
  access-control** (the `initiateTransactions` permission on the user's `effectivePermissionSet`) —
  a trusted initiate fails when that permission is denied.
- **Client-side mirrors:** `src/util/userHelpers.js` exposes `hasPermissionToInitiateTransactions`
  (`:157-166`) and `isUserAuthorized` (`:194`); the checkout redirects an unverified/unauthorised
  user (`src/containers/CheckoutPage/CheckoutPage.js:123-131`) and the listing-page booking/contact
  entry redirects to `NoAccessPage` when these fail
  (`src/containers/ListingPage/ListingPage.shared.js:315-322`).

### How to ADD "identity verified" as a gate

The authoritative gate must be **server-side** in `initiate-privileged.js` (client checks are UX
only and bypassable). Recommended approach:

1. **Store the result on the client's user profile.** From the webhook handler, use the Integration
   API to write `profile.metadata.id_verified` (mirror the model badge's existing key/shape — the
   model verified badge already reads `profile.metadata.id_verified === 'verified'`, so reuse the
   same convention for clients) plus e.g. `metadata.identityVerificationSessionId`. `metadata` is
   operator/server-writable and readable by the app. The Integration SDK pattern already exists in
   this repo: `server/api/safety-report.js:49-62` (lazy `createInstance` from
   `SHARETRIBE_INTEGRATION_CLIENT_ID/SECRET`) and `:102-106` (`integrationSdk.users.updateProfile`).
   Reuse that pattern in the webhook handler.
2. **Enforce in the privileged initiate.** In `server/api/initiate-privileged.js`, before the
   trusted initiate (alongside the existing `enforceResidenceBoundary` step at `:79`), resolve the
   **customer** (the requesting user, via `getSdk(req,res).currentUser.show()` — same technique as
   `safety-report.js:69-84`) and, for a non-speculative booking initiate, throw a booking-blocked
   error if their `profile.metadata.id_verified !== 'verified'`. Speculative calls (price preview)
   can be allowed so the listing/price still renders; block the **real** initiate. This makes the
   gate impossible to bypass from the client.
3. **Client-side UX mirror.** Add an `isClientIdentityVerified(currentUser)` helper in
   `userHelpers.js` and use it in `CheckoutPage.js` / `ListingPage.shared.js` to route an unverified
   client to the verification flow (Q4) instead of letting them reach checkout — same shape as the
   existing `hasPermissionToInitiateTransactions` redirects, so the UX is consistent and the server
   is the backstop.

**Note:** we could alternatively drive Sharetribe's native `initiateTransactions` permission
(operator/Integration-API toggled per user) instead of a metadata flag, so the block reuses the
exact existing permission plumbing. Trade-off: the permission is a coarse account-level right also
tied to approval state; a dedicated `metadata.id_verified` flag is cleaner and orthogonal to
approval. **Recommendation: use the `metadata.id_verified` flag + explicit server check**, reusing
the model badge convention.

---

## Q4 — UX / flow + timing

**Timing recommendation: verify after signup, before first booking** — not blocking signup itself.
Rationale: mirrors the model path (models do Stripe before go-live, not at the signup keystroke),
lets clients browse/search first (discovery is the hook), and defers the £1.25 cost until a client
actually intends to transact (only clients who book get charged-for). Booking is hard-blocked until
verified (Q3), so we lose nothing on trust.

**Screens (sketch):**

1. **Trigger — "Verify to book" interstitial.** When a verified-gate check fails at the booking/
   checkout entry (listing page "Request to book" or checkout arrival), route the client to a
   `ClientVerificationPage` (new route) instead of `NoAccessPage`. Copy: why we verify (safety /
   the public "clients are verified" promise), that it takes ~2 min, that Stripe handles the ID and
   we don't keep the document.
2. **Stripe verification step.** A "Verify my identity" button → our server creates the
   VerificationSession → `stripe.verifyIdentity(clientSecret)` opens Stripe's hosted/embedded flow
   (document capture + selfie, largely on mobile camera). On return, show a **"Verification in
   progress"** state (results are usually minutes; the session may be `processing`).
3. **Result states.** Poll the client's `metadata.id_verified` (or re-fetch currentUser) / rely on
   the webhook having written it: **Verified →** success screen + continue to the booking they were
   attempting. **requires_input / failed →** friendly retry (reuse the same session), with the
   manual-fallback escape hatch surfaced after N failures. **Pending →** "we'll unlock booking as
   soon as this clears" (email/notification when done — note the stack has **no transactional-email
   transport yet**, flagged in `server/api/safety-report.js:20-23`; in-app status is the v1 signal).
4. **Optional prompt placement.** Also surface a passive "Verify your identity" prompt on the client
   dashboard/profile after signup so motivated clients can pre-verify before they hit a booking.

Least-friction principle: don't force verification until the client tries to book; then make it a
single clear step that resumes their booking on success.

---

## Q5 — Neil dependencies

1. **Enable Stripe Identity** on the Stripe account (Dashboard → Identity; in **test mode** while we
   are on `ndstealth1-test`). Confirm it is activated for the platform account.
2. **Provide/confirm the platform Stripe secret key** (test-mode) for the server to create
   VerificationSessions — to be set in **Railway + local `.env` only**, never committed. This is the
   same platform-secret-key decision flagged in `docs/spikes/onboarding-split-ux.md`; approving it
   here also informs that spike.
3. **Configure the webhook endpoint** in the Stripe Dashboard (URL = our Railway `/api/stripe-
   identity-webhook`, events `identity.verification_session.verified` + `.requires_input`
   [+ `.redacted` for deletions]) and **provide the webhook signing secret** (Railway env var).
4. **Confirm Integration API credentials** are available for the result write-back
   (`SHARETRIBE_INTEGRATION_CLIENT_ID/SECRET` — already referenced in `.env-template:80-86`; the
   safety-report endpoint uses them optionally). Needed non-optionally here to set
   `metadata.id_verified`.
5. **Cost approval:** sign off the **£1.25 per completed verification** per-client cost (money
   decision → Neil).
6. **Approvals/reviews:** this is a **user-safety + identity + personal-data flow** → charter
   requires **human dev review before real users**, and it touches public-facing "verified" claims →
   PM→Neil sign-off before anything goes live. Also a light **DPA/GDPR check** that Stripe as the
   document processor is covered in our privacy policy.

---

## Recommended build plan (rough — nothing built)

1. **Server (new deps + secrets):** add `stripe` Node SDK (PM approval for the dependency); add
   `STRIPE_SECRET_KEY` + `STRIPE_IDENTITY_WEBHOOK_SECRET` to Railway/`.env` and document names in
   `.env-template`.
2. **`server/api/create-identity-verification-session.js`** — authenticate the caller
   (`getSdk().currentUser.show()`), create a `VerificationSession` (`type: document`,
   `metadata.user_id`, idempotency key), return only `client_secret`. Mount in `server/apiRouter.js`.
3. **`server/api/stripe-identity-webhook.js`** — raw-body + signature verify; on `.verified` write
   `profile.metadata.id_verified = 'verified'` (+ session id) via Integration SDK (reuse the
   `safety-report.js` lazy-init pattern); on `.requires_input` record failure; on `.redacted` clear
   the flag. Mount with a raw-body carve-out ahead of the transit/bodyParser middleware.
4. **Gate:** add the customer identity check to `server/api/initiate-privileged.js` (real initiate
   only) + an `isClientIdentityVerified` helper in `src/util/userHelpers.js` mirrored into
   `CheckoutPage.js` / `ListingPage.shared.js`.
5. **UX:** new `ClientVerificationPage` container (route in `src/routeConfiguration.js`) using
   `@stripe/stripe-js` `verifyIdentity`, with trigger/progress/result states; en.json strings;
   design-system components. A dashboard pre-verify prompt (optional).
6. **Manual fallback (thin):** documented operator path to set `metadata.id_verified` in Console for
   the rare client who cannot complete Stripe's flow.

---

## Open questions

- **Do we store any `verified_outputs` (name/DOB/country) or purely the boolean?** Recommendation:
  boolean + session id only, to minimise PII; expand outputs only if a later feature needs name-match.
- **Client SDK on the frontend:** we currently only load Stripe.js for Connect/payments — confirm
  `@stripe/stripe-js` `verifyIdentity` is available with our publishable key and CSP (`*.stripe.com`
  already allowed in `server/csp.js`).
- **Re-verification cadence:** one-time at first booking for v1? Or re-verify on some interval? v1
  recommendation: one-time.
- **Transactional email:** the "your verification cleared" notification has **no email transport**
  in this stack yet (`server/api/safety-report.js:20-23`) — v1 relies on in-app status; wiring email
  is a separate infra item.
- **Does verification block *inquiries*/messaging too, or only booking?** Recommendation: block only
  booking (money/safety-critical); allow pre-booking inquiry so clients can ask questions first.
</content>
</invoke>
