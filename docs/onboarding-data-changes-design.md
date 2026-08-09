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

## Go-live data step — NEW (after approval; with SAF-01 + payout)
Shown once, when the approved model goes to make their profile live. Three grouped sections:

**1. Verify your identity (SAF-01)** — ID provider flow (Stripe Identity / Onfido / Persona, TBD).
Confirms 18+ a second time (belt & braces) and underpins the "verified" claim.

**2. Your details for payment & tax (DAC7)** — collected once, stored as **private data**, never public:
| Field | Notes |
|---|---|
| Legal name | prefilled from account; confirm it's their legal name (display name is separate) |
| Home address | line 1, line 2, town/city, postcode, country — **new** (we only had city before) |
| Country of tax residence | default United Kingdom |
| **National Insurance number _or_ UTR** (TIN) | **new, sensitive** — the one field that's retrofit-hostile |
| VAT number | optional; only if VAT-registered (`vat_number` field exists) |

**3. Payout (Stripe Connect)** — the existing payout onboarding, now positioned here as the last
go-live gate (per `stripe-kyc-timing.md`).

## How heavy does it feel?
- **Signup:** +1 field (DOB). Essentially unchanged.
- **Go-live:** a genuine one-time compliance step — ID + ~5 data fields + payout. Heavier, but at
  the right moment and only once. The DAC7 block is 5 fields, most prefilled or single-choice; the
  only "friction" field is the NI/UTR number, which is unavoidable and legally required.

## Storage / sensitivity
- DOB, address, TIN → **private/protected data** only. TIN (NI number) is especially sensitive —
  encrypted at rest via Sharetribe's protected data; never rendered publicly or to clients.
- ID documents themselves should be held by the **ID provider**, not us (store only the result) —
  see `compliance-open-items.md` §3.

## Open (accountant, per compliance §1)
Exact TIN verification standard, retention period, de-minimis exemption, non-UK model handling.
These affect *validation/retention*, not *which fields to collect* — so they don't block adding the
fields now. Reporting submission itself is out of scope (accountant-led).

## Build order once approved
1. Signup DOB field + 18+ validator (code, `SignupForm.js` + `en.json`).
2. Go-live data step: the DAC7 fields (private data) + wire into the go-live gate (depends on the
   RT-01/02/08 go-live build).
3. SAF-01 ID provider integration (separate, provider decision needed).
