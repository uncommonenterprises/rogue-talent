# Safety & verification claims audit — public copy vs v1 reality (2026-09-20, Day 2)

Why: the scope doc warns that advertising safety measures we don't perform "is the sort of thing
that ends companies in this sector." With the onboarding model finalised (Stripe identity now
required for models) and the safety scope decided, I audited every public safety/verification claim
against what v1 actually delivers. Several claims are **false or contradictory today** — launch-blockers.

## 🔴 Launch-blockers (false / contradictory claims)

1. **Client/business identity verification is claimed everywhere but NOT built.**
   - Safety page: "Every user — model **and client alike** — goes through identity verification before
     they can book or be booked. If you're on the platform, you're verified."
   - FAQ: "All users must pass identity verification before they can book or be booked" + "During
     sign-up, you'll be asked to provide a valid photo ID."
   - Landing (code): GeneralLandingPage "Models **and businesses** are verified"; ModelsLandingPage
     "**Verified businesses only** — Every business is verified before they can book."
   - **Reality:** MODELS are now identity-verified (Stripe identity required before go-live ✅).
     CLIENTS/BUSINESSES are **only email-verified** — no photo-ID check exists. **SAF-03 (client photo
     ID) is decided IN v1 but is NOT built.** Also the *mechanism* claim is wrong: models verify via
     Stripe before go-live, not "photo ID at sign-up"; clients not at all.
   - **Decision for Neil (see below):** build client verification for v1, or launch models-verified +
     honest client copy and add it later. This gates whether the copy is false or just early.

2. **FAQ "How do payments work?" still describes the OLD 10% + 5% fee model** — "model's rate plus
   the 5% service fee… minus the 10% platform fee." Contradicts the SAME page's correct "15% only /
   keep 100%" answer. (= Round-2 fix **R2-1**, flagged 2026-09-19, still live.) Pure error → Console fix.

3. **Booking-disclosure over-claim (nudity / people present / usage rights).**
   - Safety: "full disclosure: shoot type, location, **who will be present**, usage rights, and
     **whether nudity is involved**." FAQ: "Shoots involving nudity must be disclosed upfront."
   - **Reality:** SAF-10 was deliberately **REDUCED** to shoot type / location / description / address
     (+ private-residence flag). There is **no** "people present", "nudity", or "usage rights" field at
     booking. → de-claim (fix copy to match what's actually collected) OR (not recommended) re-expand SAF-10.

4. **Contracts / e-signed releases claimed, not built.**
   - ClientsLandingPage: "Verified profiles, **e-signed releases** and secure payment."
   - GeneralLandingPage: "Every booking generates a **contract with configurable image usage rights**
     — duration, channels, territory — agreed by both sides before the shoot."
   - **Reality:** no contract-generation or e-signature feature exists, and it's not in the safety
     scope. → **Decision for Neil:** is a contract/usage-rights/release feature in v1, or de-claim?

## 🟠 Also broken (Console, Neil — some already flagged in Round-2)
- **Bouncing safety/support inboxes:** Safety page `safety@roguetalent.`**com** and FAQ
  `support@roguetalent.`**com** — should be `.co` (R2-3, still live). A safety inbox that bounces is serious.
- Terms §4 leftover "(less the platform fee)" (R2-2, if still present — re-verify).

## ✅ Accurate (no change)
- Fee: "How much does it cost?" = 15% / keep 100% ✅. Cancellation = 2-tier ✅. Escrow/held-until-complete ✅.
  Identity clarifier ("not a background check") ✅. 999 / "not a monitored emergency service" line ✅.
- Shoot disclosure of type/location/description/address IS collected ✅ (just not the over-claimed extras).

## Fix ownership
- **Console pages** (Safety, FAQ, Terms — Content → Pages): items 1 (client-verif wording), 2 (payments
  10%+5%), 3 (nudity/disclosure), 🟠 emails. → **Neil** (these need his Console access; several already
  queued and not yet done — worth doing in one pass).
- **Code pages** (landing): items 1 (businesses-verified), 4 (e-signed releases / contracts). → PM/Developer,
  but the wording depends on Neil's decisions below (don't de-claim a feature he intends to build).

## Decisions this forces (for Neil — with PM recommendation)
- **A. Client verification for v1?** Options: (i) **launch models-verified only + make client copy
  honest** ("models are identity-verified; businesses are checked"), add client ID post-launch —
  *fastest to £1, PM recommendation*; (ii) build **SAF-03 client photo-ID now** (needs a mechanism:
  clients have no Stripe Connect, so Stripe **Identity** standalone or a manual operator ID-review at
  launch volume) — more work, delays launch. Either way the current "clients are verified" copy is
  false **until** resolved.
- **B. Contracts / e-signed releases in v1?** (i) de-claim for v1 (PM recommendation — not in scope,
  keeps launch lean); (ii) build it (sizeable). 
- Until A/B are decided, the specific copy edits can't be finalised without risking de-claiming
  something intended. The pure errors (payments 10%+5%, bouncing emails, nudity over-claim) should be
  fixed regardless.
