# 3pm brief — Day 2 (2026-09-20)

One page, ordered by leverage. Each item = the decision/action + my recommendation. Full detail in
`docs/team-decision-log.md` and the linked docs.

## 🔴 Do these FIRST — they have external lead time and gate the first £1
(from `docs/live-launch-runbook.md`) — starting them today compresses the launch more than any build:
1. **Stripe live account + business verification (KYB).** Start the live Stripe application + KYB now
   — it's an external review measured in days. Nothing charges real money until it clears.
2. **Domain `roguetalent.co`** — confirm DNS control + decide the live host (it's a parked page today).
3. **Transactional email provider + domain auth (SPF/DKIM/DMARC)** — pick one (SendGrid/SES/Postmark)
   and start DNS auth. Approval/booking emails land in spam without it.
4. **Confirm Stripe `tax_reporting` (DAC7) preview access status** — you requested it Day 1; chase if
   not granted (fallback build triggers ~4 weeks pre-launch if not).

## 🟡 Decisions I need from you (with my recommendation)
5. **Client verification for v1** (SAF-03 is decided-in-scope but NOT built; Safety/FAQ/landing copy
   already claims clients/businesses are ID-verified — currently FALSE). **Rec:** launch
   models-verified (true now via Stripe) + make client copy honest ("businesses are checked"), add
   client ID post-launch. Alt: build client ID now (Stripe Identity or manual review) — delays £1.
6. **Contracts / e-signed image-usage-rights in v1?** (landing pages claim "e-signed releases" +
   "contract with configurable usage rights" — no such feature, not in scope.) **Rec:** de-claim for
   v1 (remove the copy); revisit post-launch. Usage-rights licensing is a real modelling need, so
   flag if you want it in v1 (sizeable build).
7. **Safety-scope sequencing for fastest £1.** SAF-29 (reporting) + honest copy + client-verif are
   launch-blocking; **Rec:** treat SAF-11/13/14/17/25 as decided-v1 that can fast-follow the first
   bookings if they're not ready in time (not cut — sequenced).

## 🟢 Console / manual tasks (only you can do — batch in one Console pass)
8. **FAQ "How do payments work?"** still shows the OLD 10%+5% model — contradicts the 15%-only answer
   on the same page. Fix (R2-1). **Launch-blocker.**
9. **Safety/FAQ over-claims:** remove "who will be present / nudity / usage rights" disclosure claims
   (SAF-10 was reduced — those fields don't exist); fix the client-ID wording per #5.
10. **Bouncing inboxes:** `safety@roguetalent.`**com** and `support@roguetalent.`**com** → `.co` (R2-3).
11. **Footer** (Content → Footer): set tagline + Rogue's social links; change "Post a new listing" →
    "Create your profile".
12. **Add real portfolio photos to Anais** (rt-model-03) — the reference model shows "No image".
13. **Activate booking emails:** run `flex-cli process push` for booking-v2 (templates verified
    complete), then paste the output and I'll give you the exact `update-alias` command. Only turn
    **Listing approval ON** after the approval/under-review emails exist.
14. **Standing security queue:** rotate the leaked Sharetribe secret `882a…`; restrict the Maps key by
    referrer; GitHub secret-scanning toggles.

## ✅ Shipped/verified by me today (Day 2) — no action needed
- Onboarding/payout model finalised (Stripe required before go-live; RT-01 reverted) + copy fixed.
- Client journeys 2 & 3 walked → search-filter blocker fixed + verified live; homepage Featured-talent
  wired to real listings; no-transaction-rights CTA; fee note "keeps 100%"; client order title.
  ("2 days" = correct inclusive-date behaviour; "UK postcode" = test-card artifact — both non-bugs.)
- Config-as-code merged/verified; booking-v2 email templates verified complete.

## 🔧 In flight (I'll review + deploy-verify, then merge — for your awareness)
- **SAF-29** safety reporting flow (launch-critical) — building.
- **SAF-13/14** model private-residence boundary toggle + silent filter — building.
- Next after SAF-29 merges: SAF-11 advisory, SAF-17 shoot summary, SAF-25 review dimension.

## Professional input (start the engagement; not blocking today)
- **Lawyer:** Terms + Privacy/GDPR + cookie policy + content-moderation policy (needs #5–#7 answered
  to be accurate). Cookie-consent banner is a queued build (pairs with the cookie policy).
- **Accountant:** VAT agent-vs-principal (gates the "flat 15%" claim) + DAC7 filing responsibility.
