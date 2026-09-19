# Copy fixes — organized by WHERE each one is edited (2026-09-18)

From the copy audit (`ux-reports/copy-audit-2026-09-18.md`). **Important:** the pages split into two
groups — some are edited in **Sharetribe Console** (your job), some are **hand-coded in the app**
(my/Developer job). Verified against the routing in `src/routing/routeConfiguration.js`.

- **Console pages** (render Content → Pages assets): `/terms-of-service`, `/p/faq`, `/p/safety`,
  `/p/about`, `/privacy-policy`.
- **Code pages** (hand-coded React components): `/` (home), `/p/for-business`, `/p/for-models`.

⚠️ Terms of Service is legal text — the plain-language drafts below match the decided v1 policy, but
have a lawyer review Terms before go-live (`docs/compliance-open-items.md` §3).

---

# PART 1 — YOUR Console edits
In Sharetribe **Console → Content → Pages**, open the named page and find the block containing the
quoted "current" text, then replace it. The live URL is given so you can see the page you're editing.

## 1a. Terms of Service  ·  Console page: **"Terms of service"**  ·  live: `/terms-of-service`
**🔴 LAUNCH-BLOCKER — Cancellation section (currently three-tier).** Find the block that says
*"…more than 72 hours before the shoot receive a full refund… 24–72 hours… 50%… less than 24 hours…
charged in full"* and replace it with:
> If you cancel a confirmed booking **48 hours or more before the shoot start time**, you receive a
> **full refund** of everything you paid (the model's rate and the booking fee). If you cancel
> **less than 48 hours before the shoot start time**, the booking is **non-refundable** and the
> model is paid in full. If the **model** cancels a confirmed booking, you receive a **full refund**
> regardless of timing.

**Fee section (currently the old model).** Find *"Rogue Talent charges a 10% platform fee to models
and a 5% service fee to clients."* and replace with:
> Rogue Talent charges the client a booking fee of **15% of the model's rate**. Models keep **100%**
> of their rate; **no fee is charged to models**.

## 1b. FAQ  ·  Console page: **"FAQ"**  ·  live: `/p/faq`
**🔴 LAUNCH-BLOCKER — "Can I cancel a booking?"** Replace the three-tier answer with:
> Yes. If you cancel **48 hours or more before the shoot**, you get a full refund. If you cancel
> **less than 48 hours before the shoot**, the booking is non-refundable and the model is still
> paid. If a model cancels, you're always fully refunded.

**"How much does it cost to use Rogue Talent?"** Replace the "10% + 5%" answer with:
> Models keep **100%** of their day rate — Rogue Talent charges models nothing. Clients pay a single
> **15% booking fee** on top of the model's rate. There are no sign-up fees, subscriptions, or
> hidden charges for either side.

**Identity-verification question** — add this sentence to the answer:
> Identity verification confirms who someone is using government-issued photo ID. **It is not a
> background check or employment-vetting service.**

## 1c. Safety  ·  Console page: **"Safety"**  ·  live: `/p/safety`
**Add the missing emergency line** (put it near the top / in the intro):
> Rogue Talent is **not a monitored emergency service**. If you are in immediate danger, call **999**.

**In the "Identity verification" section, add:**
> Identity verification confirms who someone is using government-issued photo ID. It is not a
> background check or employment-vetting service.

## 1d. About  ·  Console page: **"About"**  ·  live: `/p/about`  ·  (LOW priority)
Change *"Every model on Rogue Talent is identity-verified."* → keep, but ensure surrounding copy
doesn't imply vetting/background checks. Optional tidy-up, not a blocker.

---

# PART 2 — MY code edits (no action needed from you)
These three pages are hand-coded React components, so I'll make the changes (or hand them to the
Developer). Listed here only so you know they're covered. **Fee copy on these pages is already
correct (15% / keep 100%) — no change needed there.** The fixes are payout wording + "verified"
precision.

| Page | Live URL | Component (my edit) | Fix |
|---|---|---|---|
| Home | `/` | `GeneralLandingPage.js` | "Funds release… the moment…" → *"usually the next working day, always within five working days"*; tighten "Verified models"/"everyone is checked" |
| For business | `/p/for-business` | `ClientsLandingPage.js` | "funds release… only once you confirm…" → canonical payout line; "verified" precision |
| For models | `/p/for-models` | `ModelsLandingPage.js` | "paid the moment the client confirms…" → canonical payout line; "verified" precision |

Canonical payout wording to use everywhere: **"usually the next working day, always within five
working days."**

---

## Summary
- **You (Console):** Terms (cancellation + fee), FAQ (cancellation + fee + identity), Safety (999 +
  identity clarifier), About (low-pri). The two 🔴 launch-blockers (cancellation) are both yours.
- **Me (code):** Home, For business, For models — payout wording + "verified" precision. Say the
  word and I'll start these now (small, low-risk text changes in the marketing components).

---

# ROUND 2 — remaining copy issues found in verification (2026-09-19, Day 1)
The Round 1 fixes landed (cancellation 2-tier on Terms+FAQ ✅, "How much does it cost?" fee ✅,
identity clarifier ✅, the 999 safety line ✅). But PM verification of the live pages found three
issues the original audit missed or the edits left behind. All are **Console → Content → Pages**
edits (yours).

## R2-1. FAQ "How do payments work?" — STILL the old 10%+5% model (HIGH — contradicts 15%-only)
Console page **"FAQ"** (`/p/faq`). The audit only caught "How much does it cost?"; this second
answer still describes the old split. Current:
> "…the full amount (model's rate plus the 5% service fee) is collected and held in escrow. Once the
> shoot is marked as complete, the model's earnings (minus the 10% platform fee) are released…"
Replace with:
> Payments are processed securely through Stripe. When a client books a model, the full amount — the
> model's rate plus a 15% booking fee — is collected and held securely until the shoot is complete.
> The model then receives **100% of their rate** (Rogue Talent charges the model nothing), usually
> the next working day and always within five working days.

## R2-2. Terms §4 — leftover "(less the platform fee)" contradicts "no fee to models" (MEDIUM)
Console page **"Terms of service"** (`/terms-of-service`), §4. The correct 15%/keep-100% sentence was
added, but the same paragraph still says:
> "Upon completion of the booking, the model's earnings **(less the platform fee)** are released."
Remove the parenthetical so it's consistent — e.g.:
> Upon completion of the booking, the model's earnings are released to the model.

## R2-3. Wrong email domain (.com → .co) on Safety + FAQ (MEDIUM — addresses bounce)
- Safety page (`/p/safety`): `safety@roguetalent.com` → **`safety@roguetalent.co`** (the monitored inbox you created).
- FAQ (`/p/faq`, "What if something goes wrong"): `support@roguetalent.com` → a real `.co` inbox — **confirm which** (e.g. `support@roguetalent.co` if it exists, else route to `safety@roguetalent.co` / `hi@roguetalent.co`).

## R2-4 (LOW, optional). Payout wording on FAQ/Terms
Both describe payout as "released once the shoot is complete" rather than the canonical "usually the
next working day, always within five working days." R2-1 already fixes the FAQ instance; optionally
align the Terms §4 wording too.
