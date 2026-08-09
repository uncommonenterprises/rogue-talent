# Safety Framework — v1 Scope Decision Sheet

**Source:** `Rogue_Talent_Transfer_Pack.md` §Safety Framework (6 Layers) + §Technical Implementation
**Purpose:** record the v1 disposition of each element. **✅ DECIDED by Neil, 2026-08-09** — see
"DECISIONS" below. The layer catalogue (from line "## The reframe…" down) is the reference; the
DECISIONS section is authoritative where they differ.
9 August 2026

---

## The reframe that saves the most scope

There is a difference between **the promise** and **the automation of the promise**.

At launch you will be running tens of bookings a month, not thousands. Several of the most expensive elements here — the check-in escalation service, risk scoring, automatic enforcement triggers, the admin dashboard — are machinery for doing at scale something you could do by hand, with identical results for the model. A model who gets a check-in text from you personally is not less safe than one who gets it from a Node service. She is arguably safer.

So the useful question per element is not "can we afford to build it" but **"can we deliver this promise manually at launch volume, honestly, without the model noticing a difference?"** Where the answer is yes, the automation is a scaling problem, not a v1 problem.

Where the answer is no — anything the model interacts with directly, anything you'd advertise, anything legally load-bearing — it has to be in v1.

---

## ✅ DECISIONS — v1 disposition (Neil, 2026-08-09)

**Approach:** ship the minimum that genuinely honours "safety is a priority", then extend with
real model feedback. Distinguish the promise from the automation of the promise — at launch
volume the operator runs things by hand. No safety theatre.

| ID | Disposition | v1 note |
|---|---|---|
| SAF-01 | **IN** | Model ID verification **at GO-LIVE, not signup**. Reuses SAF-03 integration; makes SAF-38 enforceable. Provider TBD (Stripe Identity / Onfido / Persona). |
| SAF-02 | OUT | |
| SAF-03 | **IN** | Client photo-ID (primary account holder / booker). Same integration as SAF-01. |
| SAF-04 | **IN** | Client Companies House / business-registration check. `company_name`+`vat_number` fields exist. |
| SAF-05 | OUT | |
| SAF-06 | **IN** | Payment-method rules = the **Sole-trader rule** below. |
| SAF-07 | OUT | |
| SAF-08 | OUT | |
| SAF-09 | OUT | (highest-risk slice handled by the sole-trader residence restriction instead) |
| SAF-10 | **IN — REDUCED** | Capture **private-residence yes/no only**. NOT the people/nudity/alcohol set. |
| SAF-11 | **IN** | Automatic safety advisory when private-residence (off the SAF-10 flag). |
| SAF-12 | OUT | Risk scoring. |
| SAF-13 | **IN — MINIMAL** | One "I don't accept private-residence shoots" toggle in profile settings. |
| SAF-14 | **IN — MINIMAL** | Silent filter on the SAF-10 flag; client sees a **generic** unavailable message; boundary never revealed. One switch, not a boundary system. |
| SAF-15 | OUT | |
| SAF-16 | OUT | |
| SAF-17 | **IN — REVISED** | **Shareable shoot summary**, NOT stored emergency contacts and **no alerting**. One tap on a confirmed booking → complete summary (address, date, times, client's **verified legal name + registered company**) the model sends via **her own** apps. **We are not the channel; we never promise to contact anyone.** Day-before share prompt **bundled into the accept-window reminders fast-follow**. Copy must be precise: helps her tell someone where she'll be — **not monitoring, not an emergency service.** *Supersedes the catalogue SAF-17 (emergency contacts) and the share part of SAF-18.* |
| SAF-18 | **SUBSUMED into SAF-17** (Neil 2026-08-09) | No separate build. The day-before share prompt lives in the revised SAF-17 (bundled with the reminders fast-follow); the emergency-contacts basis is gone. |
| SAF-19/20/21/23 | OUT | Entire real-time check-in service. |
| SAF-22 | OUT | Panic button — **safety theatre** (a help alert nobody monitors = false confidence). |
| SAF-24 | **IN** | Two-sided reviews, **simultaneous reveal** (native `publish-reviews`). |
| SAF-25 | **IN** (Neil 2026-08-09) | Structured rating dimensions including a **"Safety & respect"** dimension on reviews. Complements SAF-24/29. |
| SAF-26 | **IN — MODIFIED** | Not deletable by the reviewed party; **operator can remove/hide an unfair review**. **Finding (verified 2026-08-09):** Sharetribe **cannot delete/unpublish** a published review anywhere; the operator **can EDIT** it (Console → Manage → Reviews). ⇒ implement as **operator edit-to-neutralise**, **native Console, no Integration API**. Write the removal policy; **log every removal to SAF-35.** |
| SAF-27/28 | OUT | Model-to-model private notes + pattern monitoring. |
| SAF-29 | **IN** | Safety reporting flow, **separate** from disputes. |
| SAF-30 | **DECIDED via ops SLA** (Neil 2026-08-09) | Triage = **same working day, weekdays only** — **NOT** 4h, **NOT** 24/7. Copy must state plainly this is **not a monitored emergency service** and direct anyone in immediate danger to **999**. See `docs/compliance-open-items.md` §4. |
| SAF-31 | **IN** | Credible report → **immediate temporary suspension** (operator action). |
| SAF-32 | **IN** | Tiered enforcement actions (manual to trigger — see SAF-33). |
| SAF-33 | OUT | Automatic enforcement triggers — enforcement is **manual** in v1. |
| SAF-34 | **IN** | Right to be told the reason + respond **before a permanent ban**. |
| SAF-35 | **IN** | Enforcement log (spreadsheet ok). Logs SAF-26 removals too. |
| SAF-36 | **IN** | Annual transparency report (year-two data; commit now). |
| SAF-37 | OUT | Full private-residence protocol. |
| SAF-38 | **IN** | **Under-18 absolute — 18+ only, no exceptions.** Enforced by a **signup age gate** (see below) AND SAF-01 at go-live. |
| SAF-39 | **MANUAL** | Ops dashboard = **Console + spreadsheet** at launch volume. Safety queue, enforcement log, reliability/safety routing all operator-run by hand for v1. |

### Sole-trader rule (full answer to SAF-06)
- **Limited companies:** must use a **company-linked payment method**.
- **Sole traders / self-employed photographers:** **identity verification (SAF-03)** + a payment
  method **whose name matches the verified identity**, **AND cannot book private-residence shoots
  until they have completed bookings with positive reviews.**
- Rationale (recorded): highest-risk client category, least institutional accountability → **more
  checks, not fewer**.

### Age gate (SAF-38) — correction to the brief + how to build it
DOB is **not currently collected at signup**: `date_of_birth` is a **private profile field**,
**free-text**, **optional**, **`displayInSignUp: false`**. So the gate needs three changes, not one:
1. Move DOB to signup (`displayInSignUp: true`) + **required** — Console user-field change.
2. Make it a **real date** (or strict date parsing) — free-text age checks are unsafe.
3. Add the **18+ validator** on the signup form (parsed DOB ≤ today − 18y), blocking signup.

Belt-and-braces with SAF-01 at go-live. Flagged because a collected-but-unenforced field is
exactly the miss you called out.

### The three previously-undecided IDs — now resolved (Neil 2026-08-09)
**SAF-18** → subsumed into SAF-17 (no separate build). **SAF-25** → IN ("Safety & respect" rating
dimension). **SAF-30** → same-working-day weekday triage, not 4h/24-7, with an explicit "not an
emergency service, call 999" line (see compliance §4).

---

## Layer 1 — Identity & Business Verification

| ID | Element | Effort | Note |
|---|---|---|---|
| SAF-01 | Model: government photo ID + selfie match + 18+ confirmation (Stripe Identity) | M | The headline claim. If marketing says verified, this must exist. |
| SAF-02 | Model: portfolio ownership declaration | S | A checkbox and an attestation line. |
| SAF-03 | Client: photo ID of primary account holder | M | Same integration as SAF-01. Verifying models but not clients is hard to defend. |
| SAF-04 | Client: Companies House / business registration check | S–M | Manual lookup is entirely viable at launch volume. |
| SAF-05 | Client: verifiable business presence (website / social / LinkedIn) | S | Manual review during approval. |
| SAF-06 | Client: company-linked payment method required | M | Stripe-side rule. |
| SAF-07 | "New to Rogue Talent" badge until 3 verified transactions | S | Cheap, and does real protective work. |
| SAF-08 | Search filter: verified track record only | S | Needs SAF-07's data. |
| SAF-09 | New clients (0 reviews) blocked from residence and nudity shoots | M | Depends on SAF-10's shoot data. High protective value. |

---

## Layer 2 — Mandatory Shoot Detail Disclosure

| ID | Element | Effort | Note |
|---|---|---|---|
| SAF-10 | Capture at booking: location + type, people present, model alone y/n, content and nudity level, alcohol on set, logistics | M | The input everything else depends on. Mostly form fields on the booking flow. |
| SAF-11 | Automatic safety advisory shown for private-residence shoots | S | Copy plus a conditional. |
| SAF-12 | Risk scoring engine (0–3 standard / 4–6 enhanced / 7+ admin review) | L | Automatable later; you can eyeball a handful of bookings a week. |

---

## Layer 3 — Model Boundary Controls

| ID | Element | Effort | Note |
|---|---|---|---|
| SAF-13 | Boundary settings page (`privateData.safety_boundaries`) | M | The model's own control panel. Directly experienced. |
| SAF-14 | Silent filtering — incompatible bookings blocked, client sees generic "not available", boundaries never revealed | M | The silence is the safety feature. Don't half-build this. |
| SAF-15 | Minimum client rating / review-count thresholds | S | Meaningless until reviews exist; ships with the plumbing. |
| SAF-16 | Model's blocked-clients list | S | |

---

## Layer 4 — Real-Time Check-In & Monitoring

| ID | Element | Effort | Note |
|---|---|---|---|
| SAF-17 | Emergency contacts captured (up to 3) | S | Trivially cheap, enormous value. Nothing else in Layer 4 works without it. |
| SAF-18 | 24h pre-shoot confirmation + one-tap share with contacts | M | |
| SAF-19 | Arrival check-in + escalation on no response | M | Manual-able at low volume. |
| SAF-20 | Interval status checks (2h standard / 1h high-risk / 30min residence) | L | Manual-able at low volume. |
| SAF-21 | Completion check-in + escalation sequence | M | Manual-able at low volume. |
| SAF-22 | Discreet "I need help" alert | M | The one element of Layer 4 I would not run manually — it must be reachable in the moment, from her phone, without her explaining herself. |
| SAF-23 | The check-in microservice (Node + job queue + Twilio) | XL | 2–3 weeks. This is the automation, not the promise. |

---

## Layer 5 — Reviews & Safety Reporting

| ID | Element | Effort | Note |
|---|---|---|---|
| SAF-24 | Two-sided reviews, simultaneous reveal (or at 14 days) | S | Largely native to Sharetribe. |
| SAF-25 | Structured rating dimensions including "Safety & respect" | S | |
| SAF-26 | Reviews not deletable by the reviewed party, only flaggable | S | Mostly policy plus native behaviour. |
| SAF-27 | Model-to-model private safety notes on client profiles | L | Powerful and distinctive — and worth nothing with ten models and no history. |
| SAF-28 | Pattern monitoring across safety notes | L | Needs SAF-27 and volume. |
| SAF-29 | Dedicated safety reporting flow, separate from disputes | M | You cannot launch an in-person marketplace with no way to report an incident. |
| SAF-30 | Triage SLA — 4h business hours / 12h off-hours, with alerting | S–M | The alerting is small; the commitment is the hard part. |
| SAF-31 | Single credible report → immediate temporary suspension | S | Native tools plus a written policy. |

---

## Layer 6 — Enforcement

| ID | Element | Effort | Note |
|---|---|---|---|
| SAF-32 | Tiered actions: warning, temporary suspension, permanent ban, law-enforcement referral | S | Native Sharetribe tools plus a documented policy. |
| SAF-33 | Automatic triggers (rating <3.0, 3+ notes, detail mismatch, help alert) | L | Manual at launch volume. |
| SAF-34 | Right to be told the reason and to respond before a permanent ban | S | Policy and a template. Matters legally as well as ethically. |
| SAF-35 | Enforcement log | S | Keep one from day one even if it's a spreadsheet. |
| SAF-36 | Annual safety transparency report | S | Year two. Nothing to report yet. |

---

## Additional protocols

| ID | Element | Effort | Note |
|---|---|---|---|
| SAF-37 | Private residence protocol — composite gate (3+ completed bookings, 4.0+ rating, full verification, 30-min check-ins, contacts pre-notified) | L | Depends on SAF-09, 10, 17, 20. The highest-risk scenario on the platform. Consider simply not allowing residence shoots in v1. |
| SAF-38 | Under-18 absolute policy — 18+ only, immediate deletion on discovery, transactions voided | S | **Non-negotiable. Must be in v1 in every case.** |
| SAF-39 | Ops safety dashboard (open reports, escalations, active check-in status) | L | Console plus a spreadsheet works at launch volume. |

---

## The blunt version

Three things drive whether an element belongs in v1.

**Does the model touch it directly?** Boundary controls, emergency contacts, the help alert, the reporting flow, verification badges — these are the product as she experiences it. They must be real.

**Would leaving it out make a marketing claim false?** Anything the site says about verification, vetting or check-ins has to exist, or the copy has to change. That's not a nicety; advertising safety measures you don't perform is the sort of thing that ends companies in this sector.

**Or is it purely machinery for scale?** Risk scoring, the check-in service, automatic enforcement, pattern detection, the dashboard. Real work, genuinely valuable at volume, and invisible to the first hundred bookings if you're doing it by hand.

The single biggest scope decision on this sheet is **SAF-23**. Two to three weeks of engineering to automate a check-in sequence you could run personally for the first hundred shoots — while learning what the escalation logic should actually be, which you currently don't know. Building it after you've done it manually fifty times will produce a better service than building it now.

The one I would not compromise on beyond SAF-38 is **SAF-22**. A model in trouble needs one tap, from her phone, without having to explain. There is no manual version of that.

---

## How to respond

For each ID: **IN** (v1), **OUT** (post-launch), or **MANUAL** (the promise is honoured in v1, run by you by hand; automation deferred). Anything marked OUT must also come out of the public-facing copy — flag those and they'll be listed for rewriting.
