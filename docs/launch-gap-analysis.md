# Rogue Talent — launch gap analysis (honest sizing)

**9 August 2026.** Companion to `docs/path-to-live-v1.md`. This is the blunt version: what a
live launch actually requires, measured against what exists in the repo and `ndstealth1-test`
**today**, not against what's in flight. Sizing leans **pessimistic on purpose** — the brief was
"a number that's too big rather than a plan that quietly grows."

## The headline

What's in flight (model lifecycle + booking engine) is roughly **20–30% of v1 by effort**. The
long poles are **not** the things being actively built — they're the **safety framework** (near
zero built, and it's the stated differentiator), the **client side** (never run), and **live
infrastructure + legal** (not started). Two of those are gated on **your decisions** and
**external parties** (Stripe verification, a legal review, model conversations), so they cannot
be compressed by building faster.

**Rough shape:** if Phase 1 is ~2 weeks, a realistic end-to-end to a defensible live launch is
**8–16+ weeks**, and the spread is almost entirely the safety-scope decision and the client
side. Anyone quoting less is pricing the part in flight, not the whole.

Legend for "state": **Built** (exists + at least test-exercised) · **Scaffolded** (framework
present, off/unconfigured) · **Documented** (specced, no code) · **Neither** (not started).

---

## 1. The live marketplace & config-as-code

**Everything built is in `ndstealth1-test`.** The live marketplace is a separate Sharetribe
environment with separate config. Standing it up splits into three buckets:

**a) Code-managed already (scriptable, low risk):**
- **Transaction process(es)** — `flex-cli process push` to the live env. `booking-v2` and any
  future version deploy identically to both. ✅ This is the one part already "as code".
- **Email templates** — flex-cli, same story.

**b) App-level config — *becomes* code with the Tier 1 work (this is the argument to do it now):**
- Listing types, the **18 listing fields**, user types, user fields, categories, search config,
  branding defaults, content/landing. Today these live as **Console hosted assets** and the app
  reads them at runtime (the `mergeXxxConfig` path in `configHelpers.js`). Ported into
  `src/config/*.js` with the merge toggles flipped, they're in Git and apply identically to both
  environments. **This is why config-as-code is now a correctness play, not efficiency — I agree
  with the plan doc.** Caveat: the exact list of what cleanly ports vs. what the app still pulls
  from Console needs a short Tier-1 spike to confirm; don't assume 100%.

**c) Account-level config — Console-only, by hand, per environment, NOT scriptable:**
- **Access control** (user approval off / listing approval on), **Stripe Connect** (live keys +
  platform business verification), **social login** credentials, the **commission/transaction-
  size** asset, custom domains, and the branding *asset* (which overrides code). No API writes
  these. This is the irreducible manual core.

**How long by hand:** the plan doc's "a day of clicking" is right for the *mechanical* part and
optimistic for the *correct* part — the failure mode is silent drift between what you tested and
what users get (a required flag off, a placeholder unset, a commission mismatch). Budget **1–2
days to reproduce + half a day to diff-verify**, and that verification is only tractable if (b)
is in code.

**Verdict:** do config-as-code **before** live exists (Phase 3, but the Tier-1 spike can start
sooner). It does **not** make "stand up live" a script — bucket (c) is always manual — but it
shrinks the hand-built, drift-prone surface from "everything" to "the account settings."

## 2. Safety framework — built vs documented vs neither

**Blunt answer: almost nothing is built, and nothing is even specced.** There is **no safety/
verification/trust doc in `docs/`**, and the only code touching any of it is the passive
`id_verified` **badge** (operator-set metadata, rendered on cards/profile). Against your six
stated layers:

| Layer | State | Reality |
|---|---|---|
| Identity + business verification | **Neither** | Only a badge an operator sets by hand. No capture flow, no ID provider (Stripe Identity / Onfido / Persona), no client-side business verification at all. |
| Mandatory shoot-detail disclosure | **Partial/Built-ish** | `shoot_description` + `shoot_type` exist as transaction fields (customer-supplied at checkout). Closest thing to "done" — but not reviewed as a safety control. |
| Model boundary controls | **Neither** | Nothing. No concept in code. |
| Real-time check-in | **Neither** | Substantial build — needs scheduling, notifications, a live state, an escalation path. Genuinely a feature in its own right. |
| Bilateral reviews + private model-to-model notes | **Partial** | The transaction process has **bilateral reviews** (stock). The **private model-to-model notes** — the actual safety signal — are custom and unbuilt. |
| Tiered enforcement | **Neither** | The provider-cancel reliability counter + safety routing (just designed in booking-v2) is the *first brick*; suspension tiers, appeals, ops tooling — none of it. |

**The launch-critical cut is a marketing-honesty problem, not a nice-to-have.** Any layer the
copy *claims* (e.g. "every model is identity-verified") must exist at launch or the copy is
false — a trust and arguably legal problem. Any layer you can honestly label "coming soon" can
follow. **This single decision is the largest driver of the timeline** and only you can make it.
Two of the layers (check-in, private-notes/enforcement) are each a multi-week build; identity
verification is a provider integration + a review workflow. **Recommendation: write the safety
spec next** (it doesn't exist), because you can't scope Phase 2 or fix the marketing copy
without it.

## 3. Client side

**Substantially unexamined — PM Journeys 2 (discovery), 3 (booking money-path) and 6 (marketing)
have never run.** What exists:

- **Built (stock/adapted, untested for our flow):** search + discovery (the `rt-talent`
  `ListingCard`, filters wired in Phase 3), the `ListingPage`, `CheckoutPage` + `OrderPanel`
  (stock booking UI). These *exist* but have not been walked end-to-end as a client, and the
  first model-side journey turned up **12 proposals on a flow you'd designed yourself** — expect
  the client side to generate at least as much.
- **Untested:** the whole booking money-path (Journey 3) — dates → 15% breakdown → Stripe test
  → request. It's stock code but has never been run against our config.
- **Missing / a decision:** **client verification.** Your original design had clients verified
  before booking; **nothing is built, nothing tested.** For a safety-first marketplace, models
  ID-checked and bookers not is hard to defend. This is both a Phase-2 build and a safety-scope
  decision (§2).

**Sizing:** treat the client side as **comparable to the model side that just consumed weeks** —
discovery quality, the booking flow, client emails, and verification. It is the most
*underestimated* workstream because so little of it has been looked at.

## 4. Live Stripe, transactional email, error monitoring

- **Live Stripe Connect:** currently **test keys only**. Going live needs a **real platform
  business entity verified with Stripe** (company details, bank, representative ID) — an
  external process with its own lead time — plus swapping keys in the live env and re-testing
  the whole money-path with real (small) charges. **Decision:** which legal entity is the
  platform, and is it ready for Stripe's KYB?
- **Transactional email + domain auth:** there is **no email-provider wiring** (`.env-template`
  has none). Sharetribe sends its *built-in* emails, but the custom **emails 1 (under-review)
  and 3 (declined-with-reason)** — and any booking-v2 dispute mail — need a provider
  (SendGrid/Postmark/Mailgun) **and SPF/DKIM/DMARC on `roguetalent.co`**. The plan doc's point is
  correct and worth sharpening: **an unauthenticated approval email lands in spam, which for a
  "you're approved, add payout" mail is fatal** — the model never sees it and never goes live.
  **Decisions:** provider, sending domain, who owns DNS.
- **Error monitoring:** **Sentry is scaffolded but off** (`server/log.js` + `src/index.js`, gated
  on `REACT_APP_SENTRY_DSN`). Low effort: a Sentry account + DSN + verify client and server
  capture. **Decision:** Sentry vs alternative; but this is hours, not weeks.
- **Domain:** `roguetalent.co` is a **parked page** — needs pointing at the app (+ the email DNS
  above).

## 5. What you're not seeing (the uncomfortable list)

These are largely **legal/compliance/ops**, they gate a *public* launch, and none are in the
current plan:

- **Under-18 / safeguarding.** DOB is collected (private field) but there is **no age gate and no
  under-18 handling.** A modelling marketplace attracts minors; UK child-performance rules
  (licensing, chaperones, restricted hours) are a serious legal surface. Decision at minimum:
  **is v1 18+ only?** (Simplest defensible answer — but it must be enforced, not just stated.)
- **UK platform tax reporting (DAC7 / "Model Reporting Rules for Digital Platforms").** A platform
  facilitating payments to sellers (models) has **HMRC reporting obligations** on seller income.
  Not built, not scoped. Needs an accountant's read.
- **VAT on the 15% fee.** If the platform entity is or becomes VAT-registered, the booking fee likely
  carries VAT implications. The transaction line-items don't model it. Accountant question.
- **Terms, Privacy, cookie consent, GDPR.** Terms/Privacy are **Console-hosted placeholders**;
  they must be real, accurate to the two-tier cancellation (see the launch-blocker), and cover
  data rights, image rights, and the model↔client relationship. Cookie consent / DPA / a
  data-processing stance for storing ID documents (if verification lands) are all live-gating.
- **Content moderation** of portfolios (nudity/explicit boundaries, someone else's photos) — a
  policy + a takedown mechanism. Nothing exists.
- **Payments edge cases** already implied by booking-v2 but not built: failed payouts (a model's
  Stripe breaks), SCA/3DS declines at request, chargebacks/disputes from the card side (distinct
  from our in-app dispute path).
- **Ops model + response-time promises.** Your dispute path assumes an operator who acts inside a
  2-day window; approvals, payout failures and disputes are all **you** on day one. Terms should
  not promise response times the ops model can't hold. Decision: what do you promise?
- **Accessibility & the "professional shown something broken" bar** — the very audience-quality
  point in the plan doc argues for a real cross-device/QA pass, not just journey runs.

---

## Sizing table (deliberately not optimistic)

| Workstream | State | Rough size | What drives / gates it |
|---|---|---|---|
| Model lifecycle (RT-01/02/08, RT-05, Console) | Documented, part-built | **M** (~1 wk) | Specced; needs Listing-approval + emails |
| Booking engine (booking-v2 build) | Designed + EDN-validated | **M–L** (1–2 wks) | Templates, UI, alias, live-tx checks |
| **Safety framework** | **Neither / spec missing** | **XL, unknown** | **Your scope decision** — could be weeks or months |
| Client side (Journeys 2/3/6 + verification) | Stock, untested | **L** (weeks) | Never run; verification is a decision too |
| Config-as-code (Tier 1) | Not started | **M** (~1 wk) + spike | Correctness gate for live; some Console-only remains |
| Live infra (Stripe KYB, email+DNS, domain, Sentry, monitoring) | Scaffolded/none | **M** (~1 wk build) **+ external lead time** | Stripe verification + DNS not in your control |
| Legal/compliance (age, tax, terms, moderation, GDPR) | Neither | **L, external-gated** | Needs accountant + legal review |
| Repo → private migration | Checklist written | **S** | Sequenced after secret rotation |

**Critical path to launch is not the booking engine.** It's: **safety-scope decision → build the
launch-critical safety layers + client verification → client-side work → live infra with real
Stripe/email → legal/terms true → full re-test on live.** The booking engine and model lifecycle
are necessary but they're the *shortest* poles.

## The one thing I'd push back on

The plan is sound, but "fully functioning before anyone sees it" + "safety framework scope TBD"
+ "client side never run" means **the two biggest unknowns are both still unopened.** The cheap
hedge in the plan doc — talk to five models, show them nothing — is the right instinct; I'd add:
**write the safety spec and run PM Journeys 2/3/6 this week.** Both are cheap, both attack the
largest unknowns, and both can happen while the booking engine (fully specced) gets built. Do not
let the specced work crowd out scoping the unspecced work — that's exactly how a build "quietly
grows."
