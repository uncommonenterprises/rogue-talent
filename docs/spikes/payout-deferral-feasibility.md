# Spike: Deferred-payout onboarding feasibility

**Type:** research-only spike (no code changed, nothing committed, no marketplace/Stripe writes)
**Author:** Developer agent · **Date:** 2026-09-19
**Question:** Can a model be **bookable and take payment** with only PARTIAL Stripe onboarding
(identity done → charges/transfers active) while **bank details are deferred**
(`payouts_enabled: false`), with earned funds safely held until they finish — WITHOUT Rogue Talent
ever holding client money ourselves?

---

## TL;DR verdict — FEASIBLE, WITH CAVEATS

On the **Stripe** side the variant is real and clean: for a UK (GBP) Custom connected account, the
bank account (`external_account`) gates **only the `payouts` capability** — it does **not** gate
`card_payments` or `transfers`. Identity verification alone flips `charges_enabled`/transfers to
active, so a destination charge succeeds, and the model's cut lands in **their own** Stripe
connected-account balance (Stripe holds it, not us — so no money-transmitter exposure). This is
proven directly against Stripe's requirements API (see Q2). Neil's "funds are waiting, so they're
incentivised to add a bank" model maps exactly onto Stripe's pending/available balance.

**Three caveats that make this a "with-caveats", not a clean "yes":**
1. **Sharetribe is the real gate, and its docs assert the opposite of Stripe's API.** Sharetribe's
   help docs say "Stripe requires that payout details are added in order to process payment card
   charges" and a listing "cannot be booked … without the provider's Custom Connect account
   information." That is stricter than Stripe's actual GB requirement model. Whether Sharetribe's
   `stripe-create-payment-intent` action *technically* rejects a provider whose account is
   charge-capable but has no bank account is **unverified** and must be tested empirically on
   `ndstealth1-test` before we commit to building. This is the make-or-break unknown.
2. **Hard 90-day timeout.** Stripe holds funds in a connected account for a max of **90 days**
   (non-US). If the model never adds a bank account, after 90 days Stripe **refunds the customer** —
   even though the shoot already happened. That is a real financial/trust risk, not a nuisance.
3. **This touches money movement and is safety/compliance-adjacent** — it needs Neil's sign-off and,
   for the money-transmission question, a lawyer's eye before anything ships. Flagged per charter.

---

## Q1 — Stripe destination-charge mechanics

**What must be true of the connected (destination) account at charge time?** The `transfers`
capability must be **active**; `payouts_enabled` is **not** required. With a destination charge the
charge is created on the *platform* account and funds are then moved to the connected account:

> "You can transfer funds to connected accounts that have the `transfers` capability… When you use
> the `transfers` capability, your platform, not the connected account, processes charges."
> — https://docs.stripe.com/connect/account-capabilities (Transfers)

> "With the above code, the full charge amount (10.00 USD) is added to the connected account's
> **pending balance**… The `transfer_data[amount]` becomes available on the connected account's
> normal transfer schedule." — https://docs.stripe.com/connect/destination-charges

**Can a balance accrue while `payouts_enabled` is false?** Yes. `charges_enabled` and
`payouts_enabled` are independent flags on the account object
(https://docs.stripe.com/connect/account-capabilities — "The values for `payouts_enabled` and
`charges_enabled` indicate whether payouts and charges are enabled for the account"). Funds sit in
the connected account's `pending`→`available` balance and simply cannot be paid out until a payout
method exists:

> "All Stripe accounts can have balances in two states: `pending`… and `available`… Available funds
> can be paid out to a bank account or debit card." — https://docs.stripe.com/connect/account-balances

The transfer itself only needs the `transfers` capability active — the eventual **payout to bank**
is the step that needs payouts enabled. Confirmed by Stripe's "skipped transfers" rule: a transfer
is only skipped if the account *loses the transfers capability or is closed*, not if it lacks a bank
account (https://docs.stripe.com/connect/destination-charges — "Skipped transfers due to account
status").

## Q2 — Onboarding split (which account type, and what gates what)

**Account type:** this repo uses **Custom** connected accounts created through Sharetribe's
Marketplace API, requesting `card_payments` + `transfers`
(`src/ducks/stripeConnectAccount.duck.js:31,42` — `requestedCapabilities = ['card_payments','transfers']`,
`sdk.stripeAccount.create(...)`). Verification is completed via **Stripe-hosted onboarding** through
account links (`src/ducks/stripeConnectAccount.duck.js:150` `sdk.stripeAccountLinks.create`,
invoked with type `custom_account_verification` at `src/containers/StripePayoutPage/StripePayoutPage.js:176`).
Notably the in-app create form collects only **account type + country** — no inline bank field
(`src/components/StripeConnectAccountForm/StripeConnectAccountForm.js:80-129`); everything else,
including the bank account, is collected on the Stripe-hosted page.

**Can onboarding be split so identity enables charges and bank is added later?** Yes — and Stripe's
own requirements API proves the split for our exact case (GB / individual / Custom /
`card_payments`+`transfers`). Queried live via
`https://docs.stripe.com/_endpoint/get-requirements-for-setups`
(`platformCountry=GB, accountCountry=GB, dashboardType=none, tosType=full, legalEntityType=individual`):

| Requirement field | Capability it limits |
| --- | --- |
| `business_profile.mcc` | card_payments |
| `business_profile.url` | card_payments, transfers |
| `individual.first_name` / `last_name` | card_payments, transfers |
| `individual.address.line1` / `postal_code` / `city` | card_payments, transfers |
| `individual.dob.day` / `month` / `year` | card_payments, transfers |
| `individual.phone` | card_payments, transfers |
| `individual.email` | card_payments |
| `tos_acceptance.ip` / `date` | account |
| **`external_account` (bank account)** | **payouts (only)** |

The `external_account` entry returns `capability_limits: [{ capability_type: "payouts" }]`,
`can_receive_payouts_and_settle_charges: true`, and `no_consequence: true`. **So the bank account
gates only payouts; identity + address + DOB + TOS gate charges/transfers.** A model who finishes
identity verification is `charges_enabled: true` / transfers active / `payouts_enabled: false` —
exactly the state Neil wants.

## Q3 — The Sharetribe layer (this is the real gate)

Stripe would allow it; the open question is whether **Sharetribe** does.

- **Client-side (this repo):** the checkout guard keys off whether a connected account *exists*, not
  whether a bank is present. `stripeConnected` is a Sharetribe user attribute set once
  `sdk.stripeAccount.create` succeeds (i.e. after identity onboarding, before bank). The
  ListingPage warning is own-listing-only advisory
  (`src/containers/ListingPage/ListingPage.shared.js:216` — `!currentUser?.attributes?.stripeConnected`).
  The hard checkout backstop is `ERROR_CODE_MISSING_STRIPE_ACCOUNT`
  (`src/containers/CheckoutPage/ErrorMessages.js:88`, `src/util/errors.js:130`), which fires when the
  provider has **no** connected account — not specifically when they lack a bank. Submit-for-review
  is already decoupled from payout onboarding (`src/containers/EditListingPage/EditListingWizard/EditListingWizard.js:483-493`,
  "RT-01"), so the profile can already go live pending approval without Stripe.
- **Server-side (Sharetribe engine):** the `stripe-create-payment-intent` transaction action builds
  the destination charge. If it only requires a charge-capable connected account, deferred payout
  works out of the box. **But** Sharetribe's own docs assert a stricter rule:
  > "Stripe requires that payout details are added in order to process payment card charges."
  > — https://www.sharetribe.com/help/en/articles/8857191-how-adding-payout-details-works-with-stripe
  > "a listing cannot be booked or purchased if the provider has not onboarded to Stripe, because the
  > charge cannot be created in Stripe without the provider's Custom Connect account information."
  > — https://www.sharetribe.com/docs/concepts/payments/providers-and-customers-on-stripe-platform/

  This is **stricter than Stripe's actual GB requirement model** (Q2). It may reflect the historical
  template (which collected the bank inline) rather than a hard technical block in the current
  engine. **We cannot resolve this from docs — it must be tested on `ndstealth1-test`** (create a
  model, complete identity-only Stripe onboarding, confirm `charges_enabled:true`/`payouts_enabled:false`,
  then attempt a test-mode booking and see whether `initiateSpeculative`/`initiate` succeeds or
  returns `transaction-provider-stripe-account-missing`). That single experiment is the gate on the
  whole idea.

There is already a config hook for the *listing-side* half of this: `payoutDetails` on the listing
type (`requirePayoutDetails`, `src/util/configHelpers.js:1100`; currently `payoutDetails: true` at
`src/config/configListing.js:624`) plus `accountLinksVisibility.payoutDetails` per user type
(`src/util/userHelpers.js:239`). These control whether we *require/prompt* payout details — they do
not by themselves change whether Sharetribe's charge succeeds.

## Q4 — Where do held funds sit? (the money-transmitter question)

Two architectures; only one is compatible with our current destination-charge setup, and it is the
safe one:

- **(A) Stripe holds in the model's own connected-account balance** — this is what destination
  charges do today. On charge, "the full charge amount is added to the **connected account's**
  pending balance" (https://docs.stripe.com/connect/destination-charges). Rogue Talent's platform
  balance only ever holds the 15% application fee. We never custody the model's money — Stripe does,
  in an account legally belonging to the model. **This is the version Neil described and it is the
  achievable one.** Regulatory flag (not legal advice): this keeps us out of the classic
  money-transmitter / payment-institution framing because we don't receive, hold, or pay out client
  funds — Stripe is the regulated party. A lawyer should still confirm the marketplace/agent
  characterisation and that our T&Cs describe the flow correctly.
- **(B) Rogue Talent holds funds ourselves** (e.g. separate charges/transfers into *our* balance,
  transferring to the model only once they add a bank) — Stripe supports this
  (https://docs.stripe.com/connect/account-balances "Holding funds"), but it means client money sits
  in **our** balance for potentially weeks. Regulatory flag (not legal advice): holding third-party
  funds is exactly what raises **UK money-transmission / e-money / safeguarding** questions (FCA
  payment-services perimeter). **Avoid.** It also requires re-architecting away from destination
  charges — a transaction-process change needing Neil + Sharetribe-backend work.

Recommendation: stay on (A). It is both less work and the lower-risk regulatory posture.

## Q5 — Timeout / fund-holding risk

Stripe does **not** hold undeliverable balances forever. For compliance, held funds are capped by
country:

> "For compliance reasons, we can hold funds in reserve for a period of time… Thailand 10 days;
> United States 2 years; **All other countries 90 days**."
> — https://docs.stripe.com/connect/account-balances (Holding funds)

For a UK model, that's **90 days**. Practical outcome if the model never adds a bank account within
90 days of a completed booking: Stripe releases to a bank if one exists, and **if none exists,
refunds the customer** (widely documented Stripe behaviour, e.g.
https://whitelance.co/kb/holding-funds-in-stripe — "if they don't have an available bank account,
Stripe will process a refund to the Customer"). So the "incentive" model has a hard backstop: the
model doesn't just wait indefinitely — they *lose the earnings and the client is refunded* after 90
days, despite the service being delivered. Any deferred-payout UX must chase the model well before
day 90 and make the consequence explicit.

Related edge cases already true today regardless of this spike: for destination charges refunds and
disputes are debited from the **platform** balance
(https://docs.stripe.com/connect/destination-charges — "Issue refunds", "Handle disputes"), so we
carry chargeback exposure and should keep `debit_negative_balances` / reserve behaviour in mind.

---

## Recommended implementation shape (only if the Q3 test passes)

Prereq gate: **run the empirical `ndstealth1-test` booking test in Q3 first.** If Sharetribe's
`initiate` rejects a charge-capable-but-bankless provider, stop — the rest is moot and we'd be into a
transaction-process redesign (needs Neil + Sharetribe backend).

If it passes, the change is small and mostly UX/state, not fund-flow:

1. **Approval → go-live no longer waits on payout.** Already largely done (RT-01). Confirm an
   approved model with an identity-verified-only Stripe account is discoverable and bookable; remove
   any remaining copy that implies "add bank to be bookable."
2. **Onboarding split in the wizard/account UI.** Send the model to Stripe-hosted onboarding to
   complete *identity* (enables charges); treat the **bank account** as a separate, deferrable step.
   We already fetch `stripeAccountData` incl. `requirements` and Stripe's `charges_enabled`/
   `payouts_enabled` flags (`src/containers/StripePayoutPage/StripePayoutPage.js:56,140-144`), so the
   UI can distinguish "charge-ready" from "payout-ready" without new plumbing.
3. **"Funds waiting" surface.** Read the connected account's balance / `payouts_enabled:false` and
   show the model held-earnings + a "add your bank to get paid" CTA (the incentive Neil wants). Data
   already available via the Stripe account fetch; balance may need a small read.
4. **90-day safety net.** Automated reminders at, say, day 30/60/75, plus explicit copy that funds
   are refunded to the client after 90 days if no bank is added. This is required, not optional.
5. **No fund-flow changes.** Keep destination charges and the 15% application fee exactly as-is.
   Do **not** move to holding funds ourselves (Q4-B).

Config levers already present: `payoutDetails` listing-type flag
(`src/config/configListing.js:624`) and `accountLinksVisibility.payoutDetails`
(`src/util/userHelpers.js:239`) to control prompting.

## Open questions for Neil / a lawyer

- **[Neil + test]** Does Sharetribe's `stripe-create-payment-intent` actually accept a
  charge-capable/no-bank provider? (empirical test on `ndstealth1-test` — the make-or-break item).
- **[Neil]** Are we comfortable with the 90-day refund-to-client backstop and the trust hit if a
  model ghosts after a completed shoot? What's the reminder/enforcement policy?
- **[Neil, charter escalation]** This is money-movement + public-facing behaviour change → needs his
  approval; a transaction-process change (only if we ever went to Q4-B) additionally needs the
  Sharetribe backend updated.
- **[Lawyer]** Confirm the (A) model keeps us outside UK money-transmission/e-money/safeguarding
  scope, and that customer/provider T&Cs correctly describe "Stripe holds your funds until you add a
  bank; refunded after 90 days." (Not legal advice — flagging the question.)
- **[Human dev review]** Booking + payments is a safety-critical flow per charter — human review
  before real users are onboarded.

## Sources
- https://docs.stripe.com/connect/destination-charges
- https://docs.stripe.com/connect/account-capabilities
- https://docs.stripe.com/connect/account-balances
- https://docs.stripe.com/connect/pausing-payments-or-payouts-on-connected-accounts
- https://docs.stripe.com/connect/required-verification-information (queried via `_endpoint/get-requirements-for-setups`, GB/individual/none/full/card_payments+transfers)
- https://www.sharetribe.com/docs/concepts/payments/providers-and-customers-on-stripe-platform/
- https://www.sharetribe.com/help/en/articles/8857191-how-adding-payout-details-works-with-stripe
- https://whitelance.co/kb/holding-funds-in-stripe
- Repo: `src/ducks/stripeConnectAccount.duck.js`, `src/containers/StripePayoutPage/StripePayoutPage.js`,
  `src/containers/ListingPage/ListingPage.shared.js`, `src/containers/CheckoutPage/ErrorMessages.js`,
  `src/util/errors.js`, `src/util/configHelpers.js`, `src/util/userHelpers.js`,
  `src/config/configListing.js`, `src/components/StripeConnectAccountForm/StripeConnectAccountForm.js`,
  `src/containers/EditListingPage/EditListingWizard/EditListingWizard.js`
</content>
</invoke>
