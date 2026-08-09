# Onboarding data changes — age gate (SAF-38) + DAC7 collection

**DESIGN for review — do NOT build until Neil has seen the form.** One change to the onboarding
data flow bundling the **18+ age gate** and the **DAC7 fields** (they touch the same forms).
Rendered mockup shown in chat alongside this doc.

## The principle that keeps it light
**Do not pile compliance onto signup.** Signup gets **one** new field (DOB, for the age gate).
Everything DAC7 — address, TIN, tax residence — goes at **go-live**, gated with SAF-01 identity
verification, **after** the model has built their profile and been approved. That's the most
committed, most motivated moment (they're about to go live and earn), and it's a one-time gate.
Signup stays a 60-second job; the heavy data lands where the model has already decided to be here.

## Signup form — AFTER (adds exactly one field)
| Field | Status | Notes |
|---|---|---|
| Email, First name, Last name | existing | |
| Display name | existing | "First L." prefill |
| Password | existing | |
| Phone | existing (optional) | |
| **Date of birth** | **NEW — required** | Real **date input** + **18+ validator** (parsed DOB ≤ today − 18y); blocks signup with a clear message. Stored in `protectedData.date_of_birth`. |
| I'm a model / client | existing | |

**Build note:** add DOB as a **first-class coded field in `SignupForm.js`** (date input + validator),
not as a Console free-text custom field — the existing `date_of_birth` user field is `shortText`,
which can't enforce a real date or an age rule. Keep the storage key `date_of_birth`. This is the
"make it a real date + required + validated" fix from the safety scope, done in code.

## Go-live step — REVISED: Stripe collects the tax data, we build no tax fields

**Verified 2026-08-09 (Stripe docs + Sharetribe DAC7 guide):** Stripe's **Platform tax reporting
for Connect** covers the **UK** (and DAC7/MRDP). With the **`tax_reporting` additional
verification** enabled on connected accounts, **Stripe collects, validates and verifies the
seller's tax information — including the TIN (NI number / UTR), legal name, home address, DOB —
during Connect onboarding**, generates the UK XML report, and produces seller statements. **We
never collect or store the NI/UTR ourselves.** (Answers #2a.)

Stripe Connect onboarding **already** collects legal name, home address and DOB for KYC. So the
old plan — our form asking for those, then handing to Stripe to ask again — was pure duplication.
**Fix (answers #2b): don't build the tax fields at all.** The go-live step is just:

1. **Verify your identity (SAF-01)** — ID provider flow (Stripe Identity is the obvious fit;
   Onfido / Persona alternatives). Confirms 18+ again and underpins the "verified" claim.
2. **Connect payout + tax (Stripe, with `tax_reporting`)** — one Stripe Connect onboarding that
   collects payout details **and** the DAC7 identity/tax data in a single pass. We **read back**
   only what we need (name, address are on the Stripe account object); DOB/TIN stay with Stripe.

That's it — no hand-built "payment & tax" form. **The go-live form got shorter and our GDPR
surface shrank to ~nothing** (we hold no NI number, no TIN, no ID document). Stripe's enforcement
option — block payouts until a verified TIN is on file — maps exactly onto our go-live payout gate.

## How heavy does it feel now?
- **Signup:** +1 field (DOB). Unchanged in feel.
- **Go-live:** ID verify + one Stripe Connect flow (which the model does once anyway to get paid).
  **We add zero form fields of our own.** Nothing is asked twice.

## Storage / sensitivity — now minimal
- **DOB at signup** → our `protectedData.date_of_birth`, for the age gate only (needed *before*
  the model ever reaches Stripe). Private, never public.
- **TIN, tax address, tax DOB, ID documents** → held by **Stripe**, not us. We store none of the
  highest-risk personal data. Big GDPR win.

## Caveats to confirm (flag, not guess)
- Stripe's platform tax reporting is in **preview / early access** — must request access; confirm
  UK availability is production-ready on our timeline.
- Stripe **generates** the UK report; the **platform remains the responsible filer** and liable
  for accuracy — confirm the exact submit-to-HMRC step with the accountant (Stripe is a tool, not
  a tax advisor — their own disclaimer).
- Confirm the `tax_reporting` verification's data set fully satisfies UK MRDP for our seller
  profile (individuals + the occasional model-as-company).

## Build order once approved
1. **Signup DOB field + 18+ validator** (code, `SignupForm.js` + `en.json`). Independent of Stripe
   — build now (approved).
2. **Enable Stripe `tax_reporting`** on connected accounts + request preview access (config/
   integration, not a form) — wire into the go-live gate (depends on the RT-01/02/08 go-live build).
3. **SAF-01 ID provider** (Stripe Identity likely — keeps it one vendor). Provider decision.
