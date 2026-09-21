# Safety & verification claims audit — REFRESH (2026-09-21, Day 3)

Supersedes `docs/safety-claims-audit-2026-09-20.md`. Since that audit, Neil decided to **build** both
open items (client-ID verification + contracts), and the contracts build **changed shape** (single
standard licence, no per-booking usage selection). So the truth-gaps have moved. This refresh states,
per claim, what's now honestly backed vs what still gates go-live.

## What changed since the Day-2 audit
- **SAF-03 client-ID verification** — BUILT (Stripe Identity), but **DORMANT**: the gate fails **open**
  until Neil provisions the Stripe Identity keys + Integration creds on Railway and flips
  `REACT_APP_IDENTITY_VERIFICATION_ENABLED=true`. Until then, clients are **only email-verified**.
- **Contracts** — BUILT as **one standard content licence & model release** for every booking (clickwrap
  at checkout, model agrees on Accept). The earlier per-booking "configurable usage rights — duration,
  channels, territory, sublicensing" was **removed** (Neil's 2026-09-21 direction). Copy still in DRAFT
  pending solicitor. **The contract now PROHIBITS sublicensing/transfer** (model protection, clause 2A).

## ✅ Fixed this pass (code — landing copy corrected to match the built contract)
Committed on main. The old copy advertised a feature we removed and that now contradicts the contract:
- `ClientsLandingPage` "Usage rights, locked in" — was *"set image usage — duration, channels,
  territory, **sublicensing** — agreed and **e-signed**"* → now *"one standard content licence and model
  release… broad, worldwide image usage… No per-shoot usage haggling."* (The old line let clients "set
  sublicensing" — directly contrary to cl. 2A no-transfer/no-re-sale.)
- `ClientsLandingPage` feature band — *"**e-signed** releases"* → *"a standard licence and release agreed
  in-platform"* (it's clickwrap, not an e-signature).
- `GeneralLandingPage` "Clear contracts" — *"contract with **configurable** image usage rights —
  duration, channels, territory"* → *"one standard content licence and model release… No per-shoot usage
  negotiation."*

## 🔴 Go-live GATES (not copy edits — sequencing dependencies)

1. **"Models and businesses are verified" is only TRUE once client verification is LIVE.**
   - Claims: `ModelsLandingPage` "Verified businesses only / Every business is verified before they can
     book"; `GeneralLandingPage` "Models and businesses are verified"; Console Safety/FAQ "every user…
     model and client alike… identity verification."
   - Reality: client verification is **built but dormant** (fail-open). Models ARE verified (Stripe
     identity required to go live ✅).
   - **GATE:** this copy must NOT be public until Neil has (a) provisioned Stripe Identity + Integration
     creds on Railway, (b) set `REACT_APP_IDENTITY_VERIFICATION_ENABLED=true`, and (c) the gate is
     confirmed active on a real client booking. Deliberately NOT rewriting the brand claim — it's
     intended to be true at launch; it just isn't yet. Added to the live-launch runbook as a hard gate.
   - Mechanism sub-claim still to fix in **Console** copy: models verify via **Stripe before go-live**,
     not "photo ID at sign-up"; clients via **Stripe Identity**. (Neil — Console.)

2. **Contract copy is DRAFT pending solicitor.** The landing pages now describe the licence in plain,
   non-over-specific terms (safe), but the in-app `Contract.*` / `UsageLicenceSection.*` / checkout
   clickwrap copy is placeholder DRAFT. **GATE:** solicitor sign-off before real users (already tracked
   in `docs/pre-launch-human-review.md`). Contract v3 sent to Neil 2026-09-21.

## 🟠 Console fixes (Neil — one pass; several long-outstanding)
- **FAQ "How do payments work?" still the OLD 10% + 5% model** — contradicts the same page's correct
  "15% only / keep 100%". Pure error (R2-1, still live).
- **Booking-disclosure over-claim** — Safety/FAQ still claim disclosure of "who will be present",
  "usage rights", and "whether nudity is involved". SAF-10 collects only shoot type / location /
  description / address (+ private-residence flag). De-claim the extras.
- **Bouncing inboxes** — `safety@roguetalent.`**com** / `support@roguetalent.`**com** → **.co**
  (R2-3). A safety inbox that bounces is serious.
- **Terms §4** leftover "(less the platform fee)" — re-verify/remove (R2-2).

## ✅ Accurate (no change)
- Fee "How much does it cost?" = 15% / keep 100% ✅. Cancellation 2-tier ✅. Escrow / held-until-complete ✅.
  Identity clarifier ("not a background check") ✅. 999 / "not a monitored emergency service" ✅.
- Shoot disclosure of type/location/description/address IS collected ✅.
- Landing "contracts and releases handled by Rogue" / "clear contract covering how your images can be
  used, agreed before you shoot" ✅ (now matches the single standard licence).

## Ownership recap
- **Code (done this pass):** landing contracts copy — PM. ✅
- **Console (Neil):** payments 10%+5%, nudity/disclosure over-claim, .com→.co emails, verification
  mechanism wording. Bundle in one pass.
- **Gates (Neil, at go-live):** client-verification copy stays down until the gate is live; contract
  copy pending solicitor.
