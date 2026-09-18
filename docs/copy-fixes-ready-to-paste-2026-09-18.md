# Copy fixes — ready to paste (Console CMS) — 2026-09-18

From the copy audit (`ux-reports/copy-audit-2026-09-18.md`). **Every page below is Console-hosted
CMS (Content → Pages), so these are Neil's Console edits — not code.** Current wording is quoted;
paste the replacement. Two-tier + fee semantics verified against `docs/booking-process-design.md`
and `docs/cancellation-process-spec.md`.

⚠️ **Legal-review flag:** the Terms of Service items are legal text. The plain-language drafts below
match the decided v1 policy, but Terms should get a lawyer's eye before go-live
(`docs/compliance-open-items.md` §3 already flags this). The FAQ/marketing drafts are safe to paste.

---

## 1. Cancellation policy — LAUNCH-BLOCKER (Terms §5 + FAQ)
Current copy describes a **three-tier** policy; v1 is **two-tier**. Fix both places identically.

**Terms of Service → §5 "Cancellations and refunds" — REPLACE the three-tier text with:**
> If you cancel a confirmed booking **48 hours or more before the shoot start time**, you receive a
> **full refund** of everything you paid (the model's rate and the booking fee). If you cancel
> **less than 48 hours before the shoot start time**, the booking is **non-refundable** and the
> model is paid in full. If the **model** cancels a confirmed booking, you receive a **full refund**
> regardless of timing.

**FAQ → "Can I cancel a booking?" — REPLACE with:**
> Yes. If you cancel **48 hours or more before the shoot**, you get a full refund. If you cancel
> **less than 48 hours before the shoot**, the booking is non-refundable and the model is still
> paid. If a model cancels, you're always fully refunded.

---

## 2. Payout timing — HIGH (3 marketing spots)
Canonical wording (use everywhere): **"usually the next working day, always within five working
days."** Remove "the moment" / "only once you confirm" (implies instant).

**HOME → "Escrow payments"** — replace *"Funds release to the model the moment the shoot is confirmed complete — no chasing invoices."* with:
> Once the shoot is complete, the model is paid — usually the next working day, and always within
> five working days. No chasing invoices.

**FOR-BUSINESS → "Escrow payments"** — replace *"Pay upfront into escrow; funds release to the model only once you confirm the shoot is complete."* with:
> You pay upfront; the model is paid after the shoot — usually the next working day, always within
> five working days.

**FOR-MODELS → "Paid on time, always"** — replace *"You're paid the moment the client confirms the shoot is done."* with:
> You're paid after the shoot — usually the next working day, and always within five working days.

---

## 3. Fee structure — HIGH (Terms §4 + FAQ) — STALE OLD MODEL
Terms/FAQ still describe the **old** commission (10% model + 5% client). v1 = **15% customer
booking fee only; model keeps 100%** (changed 2026-07-19). Update to match the marketing copy.

**Terms of Service → §4 "Bookings and payments"** — replace *"Rogue Talent charges a 10% platform fee to models and a 5% service fee to clients."* with:
> Rogue Talent charges the client a booking fee of **15% of the model's rate**. Models keep **100%**
> of their rate; **no fee is charged to models**.

**FAQ → "How much does it cost to use Rogue Talent?"** — replace the 10%+5% answer with:
> Models keep **100%** of their day rate — Rogue Talent charges models nothing. Clients pay a single
> **15% booking fee** on top of the model's rate. There are no sign-up fees, subscriptions, or
> hidden charges for either side.

---

## 4. "Verified" language — MEDIUM (Safety, FAQ, + marketing) + missing safety line
v1 identity verification (SAF-01) is photo-ID, **not** a background check. Don't over-claim.

**Add this clarifier to the Safety page's Identity Verification section AND the FAQ:**
> Identity verification confirms who someone is using government-issued photo ID. **It is not a
> background check or employment-vetting service.**

**Also add to the Safety page (this line is required and the audit found it missing):**
> Rogue Talent is **not a monitored emergency service**. If you are in immediate danger, call **999**.

**Marketing wording guidance (lower priority):** keep "identity-verified" (precise) rather than bare
"verified"/"checked" where it could read as vetting. Not a launch-blocker; can be a tidy-up pass.

---

## Suggested order for Neil
1. **#1 cancellation** (launch-blocker, legal — do first; flag for lawyer).
2. **#3 fee** (stale/contradictory — quick, high-value).
3. **#2 payout timing** (quick, 3 spots).
4. **#4 verified language + the 999 safety line** (the 999 line is worth doing now; the rest can be a tidy-up).
