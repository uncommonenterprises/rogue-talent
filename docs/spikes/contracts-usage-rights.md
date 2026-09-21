# Spike: Contracts / e-signed image-usage-rights for v1

Status: RESEARCH ONLY — no code written, no commits, no marketplace writes.
Author: Developer agent · Date: 2026-09-21 · For: PM (→ Neil)
Context: Neil approved building contracts / usage-rights for v1 (option B in
`docs/safety-claims-audit-2026-09-20.md`, item 4). Landing pages already claim "e-signed releases"
and "Every booking generates a contract with configurable image usage rights — duration, channels,
territory — agreed by both sides before the shoot." None of it exists yet.

---

## TL;DR
- **Recommended approach:** in-app **clickwrap** contract, not a third-party e-sign tool. The client
  picks usage terms (duration / channels / territory) at checkout; those terms freeze onto the
  transaction `protectedData`; the model reviews and **accepts them as part of accepting the booking**;
  both parties can then view/download a generated contract PDF. Leanest option that honestly satisfies
  "a contract, agreed by both sides before the shoot."
- **Process (EDN) change needed?** **No, for the lean v1.** Usage terms ride on the existing
  `request-payment` step (which already runs `update-protected-data`), and the model's existing
  **Accept** transition — already timestamped and attributed to the provider by the API — is the
  recorded acceptance. An **optional enhanced path** (writing an explicit provider acceptance
  record / contract hash into `protectedData` at accept) *would* need an EDN change → that needs
  Neil + a Sharetribe backend push. Recommend shipping without it.
- **Hard dependencies on humans:** (1) **lawyer drafts + signs off the licence/release wording** and
  confirms clickwrap is sufficient for v1; (2) Neil confirms the usage-rights taxonomy and "no
  third-party e-sign for v1". This is a **legal/contract flow → flag for human review before real
  users are onboarded**; do not quietly ship.
- One likely small gap: a real contract wants **legal party names**; we currently capture display
  name (model) and account name (client), not verified legal names. Flag (see Q1 / open questions).

---

## Q1 — What v1 actually needs (minimal-but-honest contract)

The claim we must honestly satisfy: *"Every booking generates a contract with configurable image
usage rights — duration, channels, territory — agreed by both sides before the shoot."*

Leanest honest contract = a per-booking document that contains:

1. **The parties** — client and model, with enough identity to bind them (see gap below).
2. **The engagement** — listing / model profile, booking dates, agreed rate (already on the tx as
   line items), Rogue's 15% fee context if we want it.
3. **The shoot details already captured** — `shoot_type`, `location_type`, `shoot_address`,
   `shoot_description` (all live today in tx `protectedData`, `config/configListing.js` `transactionFields`).
4. **The image usage licence** — the new bit: **duration**, **channels/media**, **territory**
   (matching the claim). Optional stretch fields the lawyer may want: exclusivity, sublicensing,
   credit/attribution, moral-rights position.
5. **The acceptance record** — who accepted, when, tied to the transaction id: client accepts at
   checkout (paying + ticking the clickwrap box is an affirmative act); model accepts at the Accept
   step (a timestamped, attributed provider transition).
6. **Boilerplate from the lawyer's template** — governing law (England & Wales), the actual grant of
   licence language, warranties, data/privacy line.

Everything in 2–3 already exists on the transaction. v1 adds **4** (three order fields) + **5** (a
clickwrap tick + surfacing the existing accept as "acceptance of the licence") + **a document view**.
That is the minimal honest feature — nothing here requires a heavyweight signing product.

**Identity gap to flag:** a licence is stronger with legal names. Today we hold the model's *display
name* and the client's *account/company name*, not verified legal names. For v1 the contract can name
"[Client account name] ('Client')" and "[Model display name] ('Model')" and rely on the
authenticated, ID-checked accounts behind them — but the lawyer should confirm that's acceptable, or
we add a "legal name" field. Not a blocker; an open question for legal.

---

## Q2 — E-signature approach (compare + recommend)

### (a) In-app agreement / clickwrap acceptance — **RECOMMENDED for v1**
Both parties affirmatively accept in-platform; each acceptance is recorded, timestamped and tied to
the transaction; we generate a summary/PDF. No third party.

- **Pros:** lowest cost (£0 extra), lowest friction, no integration, no data leaving the platform,
  no extra account for models/clients, fits the existing booking flow exactly (the model already
  clicks **Accept**; the client already submits + pays).
- **Cons:** it is a click-through, not a wet/qualified e-signature. Whether that is "enough" is a
  **legal question — flag for the lawyer, do not rule here.**
- **My non-lawyer read (for the lawyer to confirm, not to rely on):** In England & Wales a contract
  needs offer, acceptance, consideration and intention to create legal relations — no signature is
  legally required for a licence of this kind, and **clickwrap acceptance is generally treated as
  enforceable** where terms are clearly presented and affirmatively accepted (tick + button, terms
  visible, no pre-ticked boxes). A commercial image-usage licence between two consenting business
  accounts is squarely the kind of thing clickwrap is used for. This is defensible for v1.

### (b) Third-party e-signature (DocuSign / Dropbox Sign / SignWell / etc.)
Real signature ceremony, audit certificate, per-envelope pricing.

- **Pros:** strongest evidentiary trail; recognised "signed document"; useful if a genuine
  **model release** with a formal signature is later required (e.g. for sensitive shoot categories).
- **Cons:** paid per envelope (roughly £0.5–£3/booking depending on plan) or a monthly floor;
  real integration work (API, webhooks to reconcile signed status back onto the transaction, PDF
  storage); added friction (both parties leave the flow / get an email to sign); another vendor +
  another place personal data lives; a provider account Neil has to set up and fund. Overkill for a
  per-booking marketplace transaction that already runs through authenticated, verified accounts.

**Recommendation:** ship **(a) clickwrap** for v1. Keep (b) as a documented upgrade path if the
lawyer later requires a formal signature for specific shoot types (e.g. nudity/lingerie) — it can be
bolted on for just those categories without redoing the base flow.

---

## Q3 — Where usage-rights are captured + agreed (fits the existing flow)

**Yes** to the proposed shape: client proposes usage terms at booking → terms freeze onto the
transaction → model accepts them by accepting the booking → terms are immutable thereafter. Concretely:

1. **Checkout (client proposes).** Add three new **customer-role transaction fields** alongside the
   existing shoot fields in `src/config/configListing.js` (`listingTypes[].transactionFields`):
   - `usage_duration` — enum (e.g. `6-months`, `1-year`, `2-years`, `perpetual`)
   - `usage_channels` — multi-enum (e.g. `social`, `digital-ads`, `website-ecommerce`, `print`,
     `ooh`, `broadcast-tv`, `internal`)
   - `usage_territory` — enum (e.g. `uk`, `europe`, `worldwide`)

   These render **for free** in the existing checkout form: `showTo: 'customer'` transaction fields
   are already rendered by `CheckoutPage/StripePaymentForm/StripePaymentForm.js` (via
   `CustomExtendedDataField`) and collected by `pickTransactionFieldsData` in
   `CheckoutPageWithPayment.js` — exactly how `shoot_type` / `shoot_address` work today. Add a
   **clickwrap checkbox** ("I agree to grant the image usage licence on these terms") to the same form.

2. **Freeze onto the transaction.** On submit, the terms are written to tx `protectedData` under the
   `customer` prefix by the existing `request-payment` transition, whose action list already includes
   `{:name :action/update-protected-data}` (see `ext/transaction-processes/booking-v2/process.edn`,
   lines 7–15). **No EDN change** to capture the terms.

3. **Shown at accept (model agrees).** On `TransactionPage`, the usage terms already surface for the
   provider via `TransactionFields` (customer-role `protectedData` is rendered). We add a prominent
   **"Image usage licence"** block above the Accept action plus the line "By accepting this booking
   you agree to grant the image usage licence on these terms." The model's existing **Accept**
   transition (`:transition/accept`, `:actor.role/provider`, process.edn line 42) is a timestamped,
   provider-attributed event — that *is* the recorded acceptance.

4. **In the contract.** The frozen terms + both acceptance timestamps flow into the generated
   contract (Q4).

**Does agreeing usage terms need an EDN/process change?**
- **Lean v1: no.** Capture rides on `request-payment` (already has `update-protected-data`); model
  acceptance rides on the existing `accept` transition + its API timestamp/actor. Everything works on
  the current pushed process.
- **Optional enhanced path: yes (needs Neil).** If we want an *explicit* provider-side acceptance
  record written into `protectedData` at accept (e.g. `licenceAcceptedByProviderAt`, a contract
  version, or a document hash), note the current `:transition/accept` and `:transition/operator-accept`
  actions do **not** include `update-protected-data` — adding it is a transaction-process change.
  **Per my boundaries and CLAUDE.md, any EDN change needs Neil's approval and a Sharetribe backend
  push (pull the process, propose, remind that the backend must be updated too).** Recommendation:
  skip this for v1 — the transition's own timestamp/actor is sufficient evidence and the terms are
  already frozen from step 2.

---

## Q4 — Contract generation + storage

**Source of truth = the transaction.** The contract is a *deterministic rendering* of data already
frozen on the tx: parties (from tx `customer`/`provider`), listing, booking dates + rate (line
items / booking), shoot fields, usage-rights fields, and acceptance timestamps. We don't need to
store a separate binary as the record — the record is the `protectedData` + the transition history.

**Generation — recommended: a print-optimised contract route, zero new dependency.**
- Add a `ContractPage` container + route (`/contract/:id` or a subroute of the transaction),
  gated to the two parties + operator, using the ducks + `loadData` pattern (fetch the transaction).
- Render the licence template (from the lawyer) populated with tx data, with a print stylesheet, and
  a "Download PDF" button that calls `window.print()` → browser "Save as PDF". Honest, no library,
  identical document for both sides, always reflects the frozen terms.
- **Dependency note:** a "real" server-/client-generated PDF (jsPDF / pdfmake / @react-pdf/renderer)
  would be a **new dependency — per AGENTS.md I must ask the PM before adding one.** The print-route
  approach avoids it. If Neil/lawyer want a pixel-fixed, self-contained PDF file, that's the moment to
  approve a PDF lib (client-side render preferred; or server-side in the Express layer if we want to
  attach it to emails).

**Storage / access.**
- **Primary:** nothing extra — regenerate on demand from `protectedData`. Add a **"View contract"**
  link on `TransactionPage` for both parties (and operator), visible from `preauthorized` onwards.
- **Optional integrity guard:** stamp a `contractVersion` (and, if we go enhanced, a hash of the
  rendered terms) into `protectedData` so a later change to the template/taxonomy can't retroactively
  alter what a past booking agreed. Cheap; worth doing even in the lean path (it can be written at
  `request-payment`, no EDN change).
- **Sharetribe has no generic per-transaction file/asset store**, so a stored binary would have to
  live in `protectedData` (text/base64 — avoid) or an external bucket (new infra). Recommend **not**
  storing a binary for v1; regenerate. Emailing a copy is possible but Sharetribe's templated
  notification emails can't easily attach a generated PDF — treat "email the contract" as a later
  enhancement (would need the server-side PDF path).

---

## Q5 — Build shape + where it lives

**Repo work (developer):**
- `src/config/configListing.js` — add `usage_duration` / `usage_channels` / `usage_territory` to
  `transactionFields` (customer role, required). *(Mirror in Console — see dependencies.)*
- `src/containers/CheckoutPage/StripePaymentForm/StripePaymentForm.js` (+ its form) — add the
  clickwrap checkbox + licence-summary/link near submit. (Usage fields themselves render
  automatically.)
- `src/containers/TransactionPage/` — add the "Image usage licence" block + acceptance statement
  above the provider Accept action; add a "View contract" link for both parties.
- New `src/containers/ContractPage/` (container + duck + `loadData` + print CSS) and a route in
  `src/routeConfiguration.js`; access-gated to the two parties + operator.
- `src/translations/en.json` — all new copy (field labels/options, clickwrap text, licence block,
  contract-page strings). The **legal body text** comes from the lawyer.
- Optional integrity: write `contractVersion` into `protectedData` at checkout (no EDN change).
- Build gate: `CI=true node scripts/build.js`; run TransactionPage/checkout tests touched.

**Config-as-code / Console (operator):** the new transaction fields must also exist in the Sharetribe
Console (transaction/protected-data fields) — same pattern as the current shoot fields, which are
tracked in `src/util/configAsCode.verify.test.js`. Add them there too.

**Explicitly NOT in lean v1:** any EDN/process change, a third-party e-sign integration, a stored PDF
binary, emailed PDF attachments, per-category formal signatures.

### Neil / lawyer dependencies (blocking)
1. **Lawyer — contract/licence template + legality sign-off (blocking, legal/compliance).** Draft the
   image-usage-licence / release wording (grant of licence, the duration/channels/territory
   mechanics, warranties, governing law, data line) and confirm **clickwrap acceptance is sufficient
   for v1** and that naming parties by account/display name (not verified legal name) is acceptable.
   This is a legal flow → **flag for human review before real users are onboarded; do not quietly
   ship.**
2. **Neil — usage-rights taxonomy.** Confirm the option sets for duration / channels / territory (or
   delegate to the lawyer/an industry standard). Needed before wiring the enum fields.
3. **Neil — "no third-party e-sign for v1" decision.** Confirm clickwrap is the v1 approach (cost
   avoided). If he wants a third-party tool now or later, he must provision + fund the provider
   account.
4. **Neil (only if enhanced path) — EDN change + backend push.** Approve adding
   `update-protected-data` to `accept`/`operator-accept` if we want an explicit provider acceptance
   record. Recommendation: skip for v1.
5. **PM — dependency approval** if we later decide we need a PDF library (AGENTS.md: ask before
   adding a dependency). Lean path needs none.

---

## Open questions
- **Legal names:** name parties by account/display name, or add a "legal name" field for the
  contract? (Lawyer to decide; small build if needed.)
- **Model consent granularity:** is accepting the booking sufficient consent to the licence, or does
  the lawyer want a separate explicit tick on the model side too? (If the latter and we want it
  *recorded*, that pushes us toward the enhanced EDN path.)
- **Amendments/negotiation:** v1 assumes the client's proposed terms are take-it-or-leave-it (model
  accepts or declines the whole booking). Counter-proposing usage terms would need process work
  (closer to the negotiation process) — recommend out of scope for v1.
- **Sensitive categories:** should nudity/lingerie shoots require a stronger (third-party-signed)
  release? Ties to the separate safety-claims/nudity-disclosure thread — coordinate, don't solve here.
- **Landing copy alignment:** once scope is fixed, the "e-signed releases" wording should be trued up
  to what we actually ship (clickwrap-agreed contract), per the safety-claims audit item 4.
