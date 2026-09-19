# Q3 make-or-break test — steps (payout-deferral feasibility)

**Goal:** produce one model in the state *Stripe identity done, NO bank added*
(`charges_enabled: true` / `payouts_enabled: false`), then confirm whether a client can still book
them. If the booking succeeds → the whole deferred-payout plan is real. If Sharetribe blocks it →
we stop and rethink. Test marketplace only, Stripe **test mode**, no real money.

We'll use **Marcus B.** (`rt-model-02`) — he's the furthest-along test model and has **no Stripe yet**,
so he's a clean slate for identity-only onboarding. He was just taken through the full profile and is
currently **pending approval**.

## Neil's part (~5 min)

### 1. Approve Marcus's listing (Console — operator)
- Sharetribe Console → **Manage → Listings** → find **"Marcus B."** (status: pending approval) → **Approve**.
- This makes his profile live/bookable (also exercises the RT-08 approval path).

### 2. Onboard Marcus through Stripe **identity only** (as the model)
- On the test site, log in as Marcus: `hi+rt-model-02@uncommonenterprises.co.uk` / `Roguetalenttest1!`
- Go to **Account → Payout details** (or click the "Add payout details" prompt on his listing).
- Start Stripe onboarding: **Individual**, country **United Kingdom (GBP)**.
- Complete the **identity** steps with Stripe **test** values:
  - Name: anything. DOB: use **01 / 01 / 1901** (Stripe test DOB that auto-verifies identity).
  - Address: any UK address. Phone: any. Email: prefilled is fine.
  - If asked for an ID/verification doc in test mode, use Stripe's **"use test document"** option.
- **At the bank-account / "external account" step:**
  - If Stripe offers **"Skip"** / **"Do this later"** → take it.
  - If it *forces* a sort code + account number to continue → **stop there and just close the tab.**
    Do **not** enter a bank. (Closing after identity still leaves the account charge-capable.)
- Tell me: **done**, and whether the flow **let you skip the bank** or you **had to stop/close**.

## Then my part (no action from you)
3. I log in as Marcus and read the Stripe status on the Payout-details page — confirm
   **charges enabled / payouts NOT enabled** (the identity-only state we need). If the flow forced a
   bank in (payouts enabled), I'll flag it and we find another way to reach the state.
4. I log in as a client (Priya) and attempt a **test-mode booking** of Marcus's now-live listing,
   watching whether Sharetribe's checkout **initiates the payment** or returns
   `provider-stripe-account-missing` / a payout-required error.
5. I report the result — that's the make-or-break answer, and it gates all deferred-payout build.

## Decisions already made (2026-09-19)
- **Direction:** pursue the deferred-payout variant (Neil greenlit).
- **90-day risk:** accepted — build reminders (day 30/60/75) + explicit copy that funds are refunded
  to the client after 90 days if no bank is added. (Keep the frictionless go-live.)
- Full analysis: `docs/spikes/payout-deferral-feasibility.md`.
