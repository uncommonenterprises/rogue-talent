# Compliance & legal — open items for launch

**9 August 2026.** Four areas Neil asked to have scoped, not drafted/decided. **I am not a lawyer
or accountant** — where a specific is load-bearing I flag it for professional confirmation rather
than guess. The actionable output in §1 (what to collect from models *now*) is the one that can't
be retrofitted, so it's first.

---

## 1. DAC7 / UK platform reporting — what to COLLECT from models now

**Why it's urgent:** the UK adopted the OECD Model Reporting Rules for Digital Platforms (the
Platform Operators Due Diligence & Reporting Regulations, in force from Jan 2024; platforms report
to HMRC annually). A platform that facilitates payment to "sellers" for services **must collect and
verify specified seller information** and report it. Models are sellers here. **You cannot easily
retrofit this** — going back to 200 onboarded models to ask for their National Insurance number is
far harder than collecting it at onboarding. So the collection has to go into the model onboarding
form **now**, even though the *reporting submission* is a later, accountant-led job.

**What must be collected from each model (individual seller) — confident items:**
- **Full legal name** (we have first/last as the account name; confirm it's their *legal* name, not
  a professional/display name — the display name is separate).
- **Primary residence address** — **NOT currently collected.** Models have a *city* (listing
  location) only. This is a new onboarding field.
- **Date of birth** — collected today but **free-text, optional, not at signup**; DAC7 needs it
  reliable. Ties to the SAF-38 age gate — fix once, use for both.
- **Tax Identification Number (TIN)** — for a UK individual this is the **National Insurance number**
  (and/or **UTR** if self-employed). **NOT currently collected.** This is the single most important
  new field, and it's **sensitive PII** (storage/retention care).
- **Country of tax residence** (assume UK for v1, but capture it).
- **VAT registration number** — a `vat_number` user field exists; relevant if the model is
  VAT-registered (uncommon, but capture when present).

**For models operating as a company/entity** (some photographers/agencies-of-one might):
- Legal entity name, registered business address, company registration number, VAT number, and the
  entity's TIN. (The existing `company_name`/`vat_number` fields lean client-side; a model-as-entity
  path may be an edge case for v1 — flag.)

**✅ UPDATE 2026-08-09 — Stripe collects this, not us.** Verified that Stripe's **Platform tax
reporting for Connect** (`tax_reporting` verification) covers the **UK/DAC7** and **collects +
validates the TIN, legal name, address, DOB during Connect onboarding**, generates the UK report,
and can block payout until a verified TIN is on file. **So we build no tax fields and store no
NI/UTR** — a big GDPR win (see `onboarding-data-changes-design.md`). The **only** field we add to
our own onboarding is **DOB at signup** (for the 18+ age gate — needed before the model reaches
Stripe). Caveats: Stripe's product is in **preview** (request access); the **platform stays the
responsible filer** (accountant confirms the submit-to-HMRC step). The field list below is what
**Stripe** collects — kept for reference, not our build: residence address, TIN (NI/UTR), DOB,
legal name, tax-residence, VAT.

**⚠️ Flag for the accountant (do not guess):** the exact **verification standard** required (do we
just collect, or must we validate the TIN?); **retention period** for the records; **de-minimis
exemptions** (there's a threshold below which a seller needn't be reported — may exempt very
low-volume models, but you must still have the data to know); the treatment of **non-UK models**;
and whether **collection can wait until first payout** vs. must be at onboarding. Do **not** design
the reporting submission — that's the accountant's.

## 2. VAT on the 15% booking fee — the question for an accountant

Do not decide — this is an accountant question and it **affects the headline "one flat 15% fee"
claim.** Frame it as:

- **Is the platform entity VAT-registered, or will it cross the threshold (~£90k turnover)?**
- **Agent vs principal — the pivotal question.** Is Rogue Talent an **agent** (only the 15% fee is
  RT's turnover; the model's rate flows through to the model) or a **principal** (the *whole booking
  value* is RT's turnover)? This changes the VAT treatment *and* whether the "model keeps 100%"
  framing is even the right description of the money flow. Almost certainly you want **agent** —
  confirm it holds.
- **Is the 15% fee a VATable supply of services by RT to the client?** If yes, and RT is
  VAT-registered, the client's fee likely carries VAT.

**What changes on the pricing page under each answer:**
- **Not VAT-registered (below threshold):** "one flat 15% fee" stands as-is. Simplest.
- **VAT-registered, fee is VAT-able, VAT added on top:** the client effectively pays **15% + VAT**
  (≈18% at 20% VAT). The copy can't say a flat "15%" without "+ VAT" — a material change to the
  headline claim.
- **VAT-registered, fee treated as VAT-inclusive:** client still sees "15%", but RT keeps ~12.5%
  and remits the rest — revenue impact, copy unchanged.
- In all cases the **model** still keeps 100% of *their* rate (the VAT question is about the
  *client's fee*, not the model's pay) — but confirm the agent/principal answer doesn't disturb
  that.

## 3. Terms, Privacy, GDPR, moderation — what's needed (not drafted)

- **Terms of Service** — must be accurate to: the **two-tier cancellation** (the current
  launch-blocker: terms still describe three-tier), the **agent-vs-principal** stance (§2), **18+
  only**, the **dispute process** + the **2-day operator window** it assumes, the **enforcement/ban
  policy with the right to respond** (SAF-34), and the **safety policies** (SAF-29/31/32).
- **Privacy Policy (GDPR)** — lawful bases; the full data inventory incl. **sensitive items** (ID
  documents, DOB, **TIN/NI number**, home address); **processors** (Stripe, the ID-verification
  provider, the email provider, Railway/hosting, Google Maps, Sentry) each needing a **DPA**;
  retention (incl. the DAC7 records); data-subject rights; international transfers.
- **ID-document handling** — decide the architecture: ideally the **ID provider holds the documents**
  (e.g. Stripe Identity) and RT stores only the **result** (verified y/n + minimal data), to avoid
  holding special-category-adjacent documents. This is a design decision with legal weight.
- **Cookie consent + cookie policy** — the app has none surfaced; needed for a UK/EU public launch.
- **Content moderation policy + mechanism** — portfolio image rules (nudity boundaries, **image
  ownership/rights** — is this the model's own photo?), a **takedown** path, and who reviews. Nothing
  exists.
- **Safeguarding / age** — records evidencing the 18+ enforcement (age gate + SAF-01).

## 4. Ops response times — the promises the product's mechanics silently make

You run this as one person; these are the SLAs the *mechanics* assume. Decide which you can honour,
then make the copy/terms match (or change the mechanic):

| Silent promise | Where it comes from | Hard or soft? |
|---|---|---|
| **Act on a no-show/dispute within 2 days** | booking-v2 pays out at `booking-end + P2D`; if you don't act in that window, payout auto-fires and the dispute is lost | **HARD — product-enforced.** Miss it and the money's gone. |
| **Approve a profile ~1 working day** | listing-approval ON → models sit in `pendingApproval`; the submit→review copy says "usually within one working day" | **Soft but promised in copy.** If you can't hold it, change the copy. |
| **Triage a safety report fast (SAF-30 proposed 4h/12h)** | SAF-29/31: "credible report → immediate suspension" implies prompt human triage | **Undecided SLA** — this is the SAF-30 flag. A safety promise you can't keep is the worst kind. Decide the real number. |
| **Help a model whose payout failed** | Stripe payouts can fail; nothing notices automatically in v1 | **Implied support SLA** — needs at least a monitoring habit. |

### DECIDED SLAs (Neil, 2026-08-09) — what a one-person op will hold

| Promise | Committed SLA | Product support needed |
|---|---|---|
| **Dispute window** | **Standing daily ops check, every working day** | ⚠️ The 2-day (`P2D`) auto-payout is **UNSAFE for a weekday-only check** — see below. Widen to `P5D`. |
| **Profile approval** | **1 working day** | ✅ Already matches — the submit→review copy says "usually within one working day". Keep it accurate. |
| **Safety triage** | **Same working day, weekdays only** — NOT 4h, NOT 24/7 | Copy must state plainly this is **not a monitored emergency service**; anyone in immediate danger → **999**. |

**Widening the dispute window (answer to "tell me what to widen it to"):** with `auto-payout` at
`booking-end + P2D` and checks only on **working days**, a Friday-evening shoot pays out **Sunday**
— before Monday's check. The window has to be at least as long as the **longest run of
consecutive non-working days + 1**. A bank-holiday long weekend (Sat/Sun/Mon) after a Friday
shoot-end pushes the next working-day check to **Tuesday**. So:
- `P2D` → misses every weekend. Unsafe.
- `P4D` → safe for a normal weekend, **not** a bank-holiday Monday.
- **`P5D` → recommended.** Safe through a bank-holiday long weekend to the Tuesday check.

**Cost of `P5D`:** the model waits ~5 days after the shoot for payout (vs 2). That's the price of a
weekday-only dispute check that never misses. **Confirm `P2D → P5D`** and I'll change the
`auto-payout` and `payout-cancelled-charged` timepoints in the booking-v2 process +
`booking-process-design.md`.

**Copy flags — anywhere the product/copy implies faster safety response than same-working-day:**
- The catalogue **SAF-30** figure (4h business / 12h off-hours) is **overridden** — do not use it
  anywhere.
- The **safety reporting flow** copy, the **Safety page**, and the **SAF-17 shareable-summary**
  copy must all carry the **"not a monitored emergency service — in immediate danger, call 999"**
  line, and must not imply real-time monitoring.
- The **copy audit** (queued) must catch any "we monitor / 24-7 / immediate" phrasing on public
  pages and flag it against these SLAs.

---

### Payout timing — a model promise (wedge), not just an ops number (research 2026-08-09)

Neil's right: this is a marketing wedge (agencies pay 30–90 days), so pick the number to market,
then set the timepoint to match — not the reverse.

- **Comparables:** Airbnb ~24h after check-in (but holds a new host's *first* payout 30 days);
  Thumbtack 3–4 business days; Fiverr 7–14 days (7 for top sellers); Upwork 5 days fixed / 10 days
  hourly; **modelling agencies 30–90 days.** ⇒ **"next working day after your shoot" is
  best-in-class** here and a hard wedge.
- **Can the process fire "next working day"?** **No** — Sharetribe `:at` supports fixed
  periods/timepoints only (no business-day calculus). A pure auto-payout can only be a fixed
  interval.
- **Earliest *safe fixed* interval with a weekday-only ops check:** the window must clear the
  longest non-working gap. `P2D` misses every weekend (Fri shoot → Sun payout). **`P4D`** is the
  earliest comfortably safe for a normal weekend (Fri → Tue, after Monday's check); **`P5D`** is
  needed to survive a bank-holiday long weekend. So fixed-auto ⇒ you market "within ~4–5 days".
- **Better — decouple speed from the window (recommended):** have the **operator's daily check
  RELEASE payout** for clean bookings (`operator-complete` from `completed`), with **auto-payout as
  a `P5D` backstop** for anything ops didn't reach. Then the **model is paid the *next working day*
  after the shoot** in the normal case (the punchy wedge), with a safe guaranteed fallback. Cost:
  the operator releases each payout (fine at launch volume; automate later).
- **Decision for Neil (not changed yet):** market **(a)** "paid the next working day" via
  operator-release + `P5D` backstop (recommended — fastest, a bit more ops touch), or **(b)** a
  fixed "within N days" via `P4D`/`P5D` auto (simpler, slower). Then I set the timepoint(s) to match.

## Priority order of these
1. **DAC7 collection fields** — blocks the shape of model onboarding; retrofit-hostile. Get the
   accountant read soon and add the fields before onboarding real models.
2. **Ops SLAs** — cheap to decide, and they gate what the terms/copy can say.
3. **VAT question** — gates the pricing-page claim; accountant.
4. **Terms/Privacy/GDPR/moderation** — the big drafting job; needs 1–3 answered first so they're
   accurate, not redrafted.
