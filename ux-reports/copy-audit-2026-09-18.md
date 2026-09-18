# Copy Audit: Rogue Talent Test Site (2026-09-18)

## Summary
**LAUNCH-BLOCKERS: 1**  
**HIGH: 2**  
**MEDIUM: 1**  

Audit date: 2026-09-18  
Test site: https://rogue-talent-production.up.railway.app  
Authenticated as: Priya S (test client)

---

## Flagged Claims

### 1. Cancellation Policy: Three-Tier vs Decided Two-Tier
**Status: PENDING**  
**Note:**

**Severity:** LAUNCH-BLOCKER

**Claim (exact quote):**  
"Cancellations are subject to the following policy: cancellations made more than 72 hours before the shoot receive a full refund. Cancellations made 24–72 hours before the shoot are charged 50% of the booking fee. Cancellations made less than 24 hours before the shoot are charged in full."

**Pages/URLs:**
- `/terms-of-service` (Section 5: "Cancellations and refunds")
- `/p/faq` (Q: "Can I cancel a booking?")

**Yardstick violation:**  
v1 decision is a **two-tier** policy: full refund if cancelled ≥48 hours before / no refund if <48 hours. The copy describes a **three-tier** policy (>72h / 24–72h / <24h), which is a legal/consumer-rights mismatch. This must match the v1 decision exactly before launch.

**Proposed change:**  
Rewrite both sections to state: "Cancellations made 48 hours or more before the shoot receive a full refund. Cancellations made less than 48 hours before the shoot forfeit the booking fee." (Or match the exact wording Neil approved.)

**Likely files:**  
- Legal/CMS page (hosted in Sharetribe Console as `cms/terms-of-service` or similar — this is NOT in the repo).
- FAQ page (also likely Console-hosted CMS).

**Effort estimate:**  
Low (wording change only, no code).

---

### 2. Payout Timing: "Moment of Completion" vs Decided "Next Working Day"
**Status: PENDING**  
**Note:**

**Severity:** HIGH

**Claims (exact quotes):**
- HOME: "Funds release to the model the moment the shoot is confirmed complete — no chasing invoices."
- FOR-BUSINESS: "Pay upfront into escrow; funds release to the model only once you confirm the shoot is complete."
- FOR-MODELS: "You're paid the moment the client confirms the shoot is done."

**Pages/URLs:**
- `/` (section: "Escrow payments")
- `/p/for-business` (section: "Escrow payments")
- `/p/for-models` (section: "Paid on time, always")

**Yardstick violation:**  
v1 decision (canonical wording): "Usually the next working day, always within five working days." All three pages promise "the moment" or "only once", implying immediate release. This contradicts the decided 1–5 working day window.

**Proposed change:**  
Replace all three instances with: "Payment is processed via Stripe and released usually the next working day, always within five working days of shoot completion."

**Likely files:**  
- `/` — likely a CMS-hosted hero section (check Console for `cms/home` or landing-page template).
- `/p/for-business` and `/p/for-models` — also likely Console-hosted CMS pages.

**Effort estimate:**  
Low (wording change only).

---

### 3. Fee Structure Contradiction: "10% + 5%" (Terms/FAQ) vs "15% Flat to Client" (Marketing)
**Status: PENDING**  
**Note:**

**Severity:** HIGH

**Claims (exact quotes):**

**Terms of Service (Section 4 "Bookings and payments"):**  
"Rogue Talent charges a 10% platform fee to models and a 5% service fee to clients."

**FAQ (Q: "How much does it cost to use Rogue Talent?"):**  
"Models pay a 10% platform fee on completed bookings. Clients pay a 5% service fee. There are no sign-up fees, subscriptions, or hidden charges for either side."

**Marketing copy (HOME, FOR-BUSINESS, FOR-MODELS):**  
- HOME: "no agents, no middlemen, no cut"
- FOR-BUSINESS: "one flat 15% booking fee — no agency markup"
- FOR-MODELS: "Keep 100%... No commission. You keep 100% of your day rate — the business pays the platform fee."

**Yardstick violation:**  
v1 decision: "15% customer booking fee only; the model keeps 100% of their rate." The Terms/FAQ state a **different structure** (10% from model + 5% from client), which means the model does NOT keep 100%. This contradicts both the marketing copy and the v1 decision.

**Details:**  
The Terms/FAQ structure results in:
- Client pays: model rate + 5%
- Model receives: model rate × 0.9 (i.e., 10% deducted)
- Platform keeps: 15% total

But the marketing and v1 decision state:
- Client pays: model rate + 15%
- Model receives: model rate (100%, no deduction)
- Platform keeps: 15% total (all from client)

These are fundamentally different in who bears the cost. The model paying 10% contradicts "keep 100%."

**Proposed change:**  
1. If the v1 decision is correct (15% from client, model keeps 100%), update Terms and FAQ to match.
2. If the Terms/FAQ structure is correct (10% + 5%), update all marketing copy to explain clearly that the model's rate is reduced by 10%, not kept whole.
3. Clarify in all three places whether the fee is "platform fee to models" or "client booking fee", because the terminology is inconsistent.

**Likely files:**  
- `/terms-of-service` — Console-hosted CMS
- `/p/faq` — Console-hosted CMS
- `/`, `/p/for-business`, `/p/for-models` — likely Console-hosted CMS or marketing template

**Effort estimate:**  
Medium (requires clarifying the v1 fee decision, then updating multiple pages).

---

### 4. "Verified" Language May Imply Background Checks Rather Than ID Verification
**Status: PENDING**  
**Note:**

**Severity:** MEDIUM

**Claims (exact quotes):**
- HOME: "Verified models", "everyone is checked before they book"
- FOR-BUSINESS: "Book verified models. Directly.", "Every model checked.", "Verified profiles"
- FOR-MODELS: "Verified businesses only", "Every business is verified before they can book"
- ABOUT: "Every model on Rogue Talent is identity-verified."
- SAFETY: "Identity Verification — Every user on Rogue Talent — model and client alike — goes through identity verification before they can book or be booked. This isn't optional. If you're on the platform, you're verified."
- FAQ: "All users must pass identity verification before they can book or be booked."

**Pages/URLs:**
- `/` (multiple sections: stats, protection, for-models CTA)
- `/p/for-business` (hero, protection section)
- `/p/for-models` (hero, protection section, steps section)
- `/p/about` ("Built for trust" section)
- `/p/safety` (Identity Verification section)
- `/p/faq` (Q: "Who can join?", "How does identity verification work?")

**Yardstick violation:**  
v1's ID verification (SAF-01) is **not a background check**. The copy uses "verified", "checked", and "identity-verified" in ways that could lead users to believe the platform guarantees more safety vetting than it actually provides. The term "verified" is ambiguous and may be interpreted as "background-checked" or "vetted", which is not what v1 delivers.

**Proposed change:**  
1. Reserve "verified" for specific contexts (e.g., "identity verified" with the qualifier "photo ID on file").
2. Clarify in the SAFETY and FAQ pages that identity verification means "photo ID verification" or "government-issued ID check", not a background check or vetting service.
3. Consider replacing generic "verified" claims with "identity-verified" throughout to be more precise.
4. Add explicit language (e.g., in the Safety page or FAQ) that clarifies: "Identity verification is not a background check. Rogue Talent is not an employment vetting service."

**Likely files:**  
- `/`, `/p/for-business`, `/p/for-models` — Console-hosted or template CMS
- `/p/safety` — Console-hosted CMS
- `/p/faq` — Console-hosted CMS
- `/p/about` — Console-hosted CMS

**Effort estimate:**  
Medium (requires careful wording across multiple pages, plus possible FAQ addition).

---

## Notes

- **CMS vs. code:** All flagged pages appear to be **Console-hosted CMS content** (Content → Pages in Sharetribe Console), not code in the repo. This means changes are made in the Sharetribe Console UI, not via pull requests. Verify ownership/edit permissions.
- **Privacy Policy:** The `/privacy-policy` page contains only placeholder text and was not audited for copy claims.
- **Home page hero "How it works" anchor:** The home page links to `/#how` for the "How Rogue works" section, which is on the same page. No separate page to audit.
- **Logo/footer:** Footer contains placeholder text "In Console, go to Content → Footer to add your slogan here." This indicates the footer is editable in Console.

---

## Recommendation

**Immediate action required:** The cancellation policy (LAUNCH-BLOCKER #1) must be resolved before any go-live announcement. The fee structure (HIGH #3) should be clarified internally first so both marketing and legal copy align with the confirmed v1 decision.

The payout timing (HIGH #2) and "verified" language (MEDIUM #4) are also important but may be acceptable to launch with a plan to fix post-launch, depending on Neil's tolerance.
