# Console copy corrections — paste-ready (2026-09-22, Day 4)

For Neil to apply in Sharetribe Console → **Content → Pages** (Safety, FAQ, Terms). These are the
hosted CMS pages (`/p/safety`, `/p/faq`, `/p/terms-of-service`) — code can't edit them, so this is a
copy/paste job. Current wording pulled live from the Railway test site 2026-09-22.

Two buckets:
- **A — Fix now:** pure errors / contradictions, wrong regardless of launch sequencing.
- **B — Verification wording:** accurate to our model, but the "clients are verified" half is only true
  once **client-ID verification is live** (Stripe Identity provisioned). Safe to paste on the test site
  now; at real go-live it's gated on client-ID being active (see `docs/live-launch-runbook.md` §10 gate).

---

## BUCKET A — fix now

### A1. FAQ — "How do payments work?" (remove the old 10% + 5% model)
The main answer is right, but two leftover sentences from the **old** fee model still contradict it.

**Remove these two sentences entirely:**
> "…the full amount (model's rate plus the 5% service fee) is collected and held in escrow."
> "…the model's earnings (minus the 10% platform fee) are released to their connected bank account."

**Replace the payments answer with this clean version:**
> Models keep 100% of their day rate — Rogue Talent charges models nothing. Clients pay a single 15%
> booking fee on top of the model's rate. When you book, the full amount (the model's rate plus the 15%
> booking fee) is collected and held securely in escrow by our payment processor, Stripe. When the shoot
> is marked complete, the model's full rate is released to their connected bank account, usually the next
> working day and always within five working days.

### A2. Terms of Service — §4 Bookings and Payments (remove "less the platform fee")
The section says "no fee is charged to models" but then contradicts itself.

**Find:**
> "…the model's earnings (less the platform fee) are released."

**Replace with:**
> "…the model's full rate is released."

### A3. Safety page — booking disclosure (de-claim fields we don't collect)
We collect shoot **type, location, and description** at booking — not a structured "who will be present",
"usage rights", or "nudity" field (SAF-10 was intentionally scoped to those three + address).

**Find:**
> Models receive complete information before accepting work: "shoot type, location, who will be present,
> usage rights, and whether nudity is involved."

**Replace with:**
> Models receive the shoot details before accepting any work — the shoot type, location, and a description
> of the work — and are free to decline any booking for any reason.

### A4. FAQ — nudity disclosure claim (de-claim; no structured nudity field)
**Find:**
> "Shoots involving nudity must be disclosed upfront in the booking request."

**Replace with:**
> Clients describe the shoot — type, location, and a description of the work — in the booking request, and
> models can decline any booking that isn't right for them.

*(If you'd rather actively require nudity to be disclosed, that's a product change — re-adding a structured
"nudity" field to the booking flow, not just copy. Flag it and I'll scope it. Default here is to de-claim.)*

### A5. Emails — .com → .co (both pages)
- **Safety page:** `safety@roguetalent.com` → **`safety@roguetalent.co`**
- **FAQ:** `support@roguetalent.com` → **`support@roguetalent.co`**
*(A bouncing safety inbox is the most serious of these — worth doing first. Also confirm both aliases
exist and are monitored in Google Workspace.)*

---

## BUCKET B — verification wording (accurate to our model; gate the client half at go-live)

Our actual model (now decided): **models** are identity-verified via Stripe (identity + bank) during
onboarding; **clients** are identity-verified via Stripe Identity **and** their business is checked
against Companies House at approval; **all** accounts pass manual review. The current copy over-specifies
a "photo ID at sign-up" mechanism that isn't how it works.

### B1. FAQ — identity verification
**Find:**
> "During sign-up, you'll be asked to provide a valid photo ID. Our team reviews submissions and approves
> accounts that meet our verification standards."

**Replace with:**
> Every account is identity-verified and reviewed by our team before it goes live. Models verify their
> identity (and their payout details) as part of setting up their profile; clients verify their identity,
> and we check their business, before they can book. We review every account to keep quality and trust high.

### B2. Safety page — identity verification (keep it strong, fix the mechanism)
**Find:**
> "Every user on Rogue Talent — model and client alike — goes through identity verification before they
> can book or be booked." This process uses government-issued photo ID but is explicitly not a background
> check or employment screening.

**Replace with:**
> Every user on Rogue Talent — model and client alike — is identity-verified before they can book or be
> booked, and every account is reviewed by our team. Verification uses government-issued photo ID (and, for
> clients, a check of their business). It is not a background check or employment screening.

### B3. Terms §2 — already fine
> "All users must complete identity verification before they can transact on the Platform." — accurate to
> the model; no change needed.

**⚠️ Go-live gate for Bucket B:** the "clients verify their identity / businesses are checked" claims are
only true once **client-ID verification (Stripe Identity) is live** and the manual Companies House check is
in the approval process. Fine to paste on the **test** site now; before **real** launch, confirm client-ID
is active (runbook §10) so these claims are honest on day one.

---

## Not a Console change (tracked elsewhere)
- Terms/Privacy full legal review, cookie/consent banner → lawyer (separate).
- The landing-page (code) contracts copy was already corrected 2026-09-21 (single standard licence).
