# Spike: "Identity now, bank later" — Stripe onboarding split UX

**Type:** research-only spike (no code changed, nothing committed, no marketplace/Stripe writes)
**Author:** Developer agent · **Date:** 2026-09-19
**Question:** Feasibility of deferred payout is already proven (see
`docs/spikes/payout-deferral-feasibility.md` — EMPIRICAL RESULT). This spike answers the *UX
mechanics*: how do we make **bank details a clean, deliberate, deferrable step** instead of the
current dead-end where finishing identity dumps the model on a required bank page with no exit but
"close the window"?

---

## TL;DR

- **A clean skippable-bank UX is achievable, but NOT with our current Stripe-hosted onboarding as
  wired.** For a GB individual, the bank account (`external_account`) is a `currently_due`
  requirement, and our account link is created with `collectionOptions.fields: 'currently_due'`
  (`src/ducks/stripeConnectAccount.duck.js:156`), so Stripe's hosted flow *always* includes the bank
  step. The only requirement-filtering features that could remove it (`external_account_collection:
  false`, requirement `exclude`/`only`) are **embedded-component-only** and are **not exposed by
  Sharetribe's `stripeAccountLinks.create`** — we can't reach them through the hosted flow.
- **Two ways to a deliberate split, and I recommend combining them:** (b) **embedded Account
  onboarding** component with `external_account_collection` disabled for the *identity* step (removes
  the bank page entirely, fully our UX), plus (c) **our own in-app "Add your bank" form** for the
  *bank-later* step (Stripe.js bank-account token → `sdk.stripeAccount.update({ bankAccountToken })`,
  which Sharetribe supports). Both keep destination charges + the 15% fee untouched.
- **One cheap test could unlock a much lower-effort interim:** Stripe docs say hosted onboarding shows
  a **"Save for later"** link that returns the user to us "at any point in the flow." If that link is
  actually present and functional on the bank step (Neil didn't see one), we can ship an interim with
  **zero new Stripe infra** — hosted identity → Save for later → our own bank form later. Verify on
  `ndstealth1-test` before betting on it; treat as unconfirmed until then.
- **Escalations:** embedded components require calling Stripe's API directly with the marketplace's
  Stripe **platform secret key** from our Express server (Sharetribe does not proxy Account Sessions)
  — a new server-side secret + a partial bypass of Sharetribe's Stripe layer. That is an
  architecture + secret-hygiene decision for the PM/Neil, and this whole area is a safety-critical
  payments flow needing human dev review before real users.

**File:** `docs/spikes/onboarding-split-ux.md`

---

## Q1 — Current integration: confirming the pain point

**How a model is sent into Stripe today (traced):**

1. In-app form collects only **account type + country** — no bank field. `CreateStripeAccountFields`
   renders account-type radios + a country select and two hidden prefill fields; there is no
   sort-code/account-number input anywhere in the create path
   (`src/components/StripeConnectAccountForm/StripeConnectAccountForm.js:80-129`). The "update" branch
   only *displays* a saved bank's last 4 digits read-only — again no entry field
   (`.../StripeConnectAccountForm.js:133-166`).
2. On submit, we tokenize the *account* (not a bank) and create a **Custom** connected account via
   Sharetribe's Marketplace API requesting `['card_payments','transfers']`
   (`src/ducks/stripeConnectAccount.duck.js:31,38-52`). No bank token is created here.
3. To collect everything else — identity, address, DOB, TOS **and the bank** — we redirect the model
   to **Stripe-hosted onboarding** via an account link. `StripePayoutPage` calls
   `onGetStripeConnectAccountLink('custom_account_verification')` and does
   `window.location.href = url` (`src/containers/StripePayoutPage/StripePayoutPage.js:72-78,176,244-248`).
4. The account link is created by the duck with:
   ```
   collectionOptions: { fields: 'currently_due', future_requirements: 'include' }
   ```
   (`src/ducks/stripeConnectAccount.duck.js:150-159`).

**Is there genuinely no way to finish after identity without hitting a required bank step?**
For a **GB individual**, `external_account` (the bank) is a **`currently_due`** requirement — this is
proven empirically in the prior spike (the account came back with
`requirements.currently_due: ["external_account"]` after identity;
`docs/spikes/payout-deferral-feasibility.md` EMPIRICAL RESULT, and the requirements-API table Q2).
Because we pass `collection_options.fields = currently_due`, Stripe's hosted form is *built to collect
exactly the currently-due set*, which includes the bank. Stripe's docs describe the hosted form as
rendering "dynamically based on the capabilities, country, and business type" and collecting the
`currently_due` requirements — there is no per-field opt-out in the hosted flow itself
(https://docs.stripe.com/connect/hosted-onboarding).

So **Neil's experience is correct for the current wiring**: identity → bank page → the only exit is
closing the window. There is one documented nuance (a "Save for later" control — see Q2) that we have
*not* verified appears on the bank step; Neil didn't see it, so treat "close the window" as the
effective behaviour today.

## Q2 — Can Stripe *hosted* onboarding defer the bank?

**What `collection_options.fields` actually controls.** It picks *how much* is collected, not *which
specific fields* are skipped:
- `currently_due` = incremental onboarding (collect only what's due now).
- `eventually_due` = up-front onboarding (collect everything, including future needs).
> "Up-front onboarding collects the `eventually_due` requirements for the account, while incremental
> onboarding only collects the `currently_due` requirements. You can control this behavior using the
> `collection_options.fields` parameter." — https://docs.stripe.com/connect/hosted-onboarding

**The wrinkle, resolved:** switching to `eventually_due` makes it *worse* (still includes the bank,
plus more). And `currently_due` **already includes the bank** for GB individuals (Q1). So neither
value of `fields` removes the bank step. There is **no documented hosted-onboarding configuration that
collects identity and returns without the bank** when `external_account` is currently_due.

**The features that *could* remove the bank are embedded-only:**
- **`external_account_collection: false`** — "Use the `external_account_collection` feature to control
  whether the component collects external account information. This parameter is enabled by default,
  and only platforms responsible for collecting updated information … (including Custom accounts) can
  disable it." — https://docs.stripe.com/connect/supported-embedded-components/account-onboarding
- **Requirement restrictions** (`exclude: ['external_account']` / `only: [...]`) — but "These
  restrictions **only apply within embedded components**. They don't affect accounts using other types
  of dashboards." (same page).

**Does Sharetribe's `stripeAccountLinks.create` expose `collection_options`?** Yes, but *only*
`fields` and `future_requirements` — that's exactly what the duck passes
(`src/ducks/stripeConnectAccount.duck.js:155-158`). Sharetribe's account-link endpoint does **not**
expose `external_account_collection` or requirement restrictions (those live on **Account Sessions /
embedded components**, which Sharetribe's Marketplace API does not offer). So through Sharetribe's
hosted flow we are limited to `currently_due`/`eventually_due` — neither of which drops the bank.
(Sharetribe API reference: `stripe_account_links/create` accepts `type`, `successURL`, `failureURL`,
`collectionOptions{fields, future_requirements}`; https://www.sharetribe.com/api-reference/marketplace.html.)

**The one hosted escape hatch — "Save for later" (UNVERIFIED on the bank step):**
> "Stripe redirects the connected account back to this URL when they complete the onboarding flow **or
> click Save for later at any point in the flow.** It doesn't mean that all information has been
> collected…" — https://docs.stripe.com/connect/hosted-onboarding

If "Save for later" is genuinely rendered *on the external_account step* and lets the model leave
charge-ready, that's an out. But (a) Neil saw no such control, and (b) the docs don't guarantee it on
the final currently_due step. **This is the single cheapest thing to test on `ndstealth1-test`** and it
gates whether the low-effort interim (Q4-a) is viable.

## Q3 — Can we re-enter onboarding later for the BANK ONLY?

Yes, three ways, cleanest last:

1. **Hosted `account_onboarding` again (Sharetribe `custom_account_verification`).** Once identity is
   done, `external_account` is the *only* outstanding `currently_due` item (empirically true), so a
   fresh account link with `fields: 'currently_due'` lands the model on essentially the bank step +
   summary. This is what `StripePayoutPage`'s `verificationNeeded` box already does
   (`src/containers/StripePayoutPage/StripePayoutPage.js:240-249`) — it's reasonably clean *for the
   bank-later step specifically*, because by then the bank is all that's left.
2. **Hosted `account_update` (Sharetribe `custom_account_update`).** Shows all populated fields for
   editing (`StripePayoutPage.js:250-259`). Works but is "edit everything," less focused than #1.
3. **Embedded `only: ['external_account']`.** "This option scopes collection to the set of specified
   requirements that are also outstanding … If all of the specified requirements have been provided,
   the account onboarding component exits immediately." — i.e. lands *exactly* on the bank, then exits.
   Cleanest, but embedded-only.
4. **Our own in-app bank form (Q4-c).** Fully our UX; no redirect. See Q4-c.

## Q4 — Alternative integrations & trade-offs

### (a) Tweak the hosted flow — **does not solve identity-without-bank**
Per Q2, `collection_options.fields` can't drop the bank, and the fields that can are not exposed by
Sharetribe's account links. The *only* hosted lever is the unverified "Save for later."
- **Skip-bank UX cleanliness:** poor. Depends on a Stripe-owned link we can't style, place, or
  relabel, and that Neil didn't notice. Not a deliberate CTA.
- **Effort:** **S** (config/UI copy only, if "Save for later" works).
- **Risk:** low code risk, high UX risk (dead-end if the link isn't there). **Gate on the Q2 test.**
- Verdict: acceptable **interim** only if the Save-for-later test passes; not the launch answer.

### (b) Stripe **embedded** Account onboarding component — **clean identity-only**
Render Stripe's `account-onboarding` embedded component with bank collection disabled:
`external_account_collection: false` (and/or `collectionOptions.requirements.exclude:
['external_account']`). It "always collects `currently_due` requirements" minus what we exclude, so the
model completes identity/address/DOB/TOS and the component exits — **no bank page**
(https://docs.stripe.com/connect/supported-embedded-components/account-onboarding). On exit we read
`charges_enabled`/`payouts_enabled` to confirm charge-ready.
- **Compatibility with our Custom accounts:** supported. Custom accounts are
  `controller.requirement_collection = application`, which is exactly the case that may disable
  `external_account_collection` and set `disable_stripe_user_authentication` (same doc).
- **The catch — we must call Stripe directly.** Embedded components need an **Account Session**
  (`POST /v1/account_sessions`), which **Sharetribe's Marketplace API does not provide**. We'd create
  the session from **our Express server using the marketplace's Stripe platform secret key** (the same
  Stripe account already connected to Sharetribe), for the connected-account ID Sharetribe created,
  then mount ConnectJS on the client. That means introducing a Stripe **secret key** into our server
  env (new secret-hygiene surface) and partially bypassing Sharetribe's Stripe layer.
- **Skip-bank UX cleanliness:** excellent — the bank simply never appears; our page frames it.
- **Effort:** **M–L** (new server endpoint + secret, ConnectJS integration, new component; replaces the
  redirect for the identity step).
- **Risk:** medium — mixed ownership of the Stripe account (Sharetribe creates it, we session it),
  new secret, and we own more of a KYC surface. Needs the escalation in Q's below.

### (c) Our own in-app "Add your bank" form — **clean bank-later, low infra**
The upstream template historically collected the external account inline as a **bank-account token**;
Sharetribe still supports it: `sdk.stripeAccount.update({ bankAccountToken })` (the duck's
`updateStripeAccount` is explicitly "used for updating the bank account token,"
`src/ducks/stripeConnectAccount.duck.js:80-88`, though today it only re-requests capabilities). We'd
add a small form (sort code + account number) that calls `stripe.createToken('bank_account', …)` with
the **publishable** key client-side, then dispatch an update with the resulting `bankAccountToken`.
- **PCI/compliance:** bank sort code + account number are **not card data**, so the strict card-data
  PCI-DSS scope doesn't apply; and Stripe.js tokenizes client-side so the numbers **never touch our
  server**. Low compliance burden. (Still a personal-data / payments surface → human review per
  charter.)
- **Skip-bank UX cleanliness:** excellent for the *bank-later* step — fully our page, our copy, our
  timing. Does **not** by itself solve the *identity* step (that still needs hosted or embedded).
- **Effort:** **S–M** (one form + wire the existing update thunk to actually pass `bankAccountToken`;
  no new secret — uses the publishable key we already ship).
- **Risk:** low. This is the recommended bank-later mechanism.

**Summary matrix**

| Option | Solves identity-without-bank? | Solves bank-later? | Skip-bank UX | Effort | New secret? |
| --- | --- | --- | --- | --- | --- |
| (a) hosted + "Save for later" | Only if the link works (untested) | via hosted re-entry | poor | S | no |
| (b) embedded onboarding, bank off | **yes, cleanly** | via embedded `only:external_account` | excellent | M–L | **yes (Stripe secret)** |
| (c) own in-app bank form | no (bank step only) | **yes, cleanly** | excellent (bank step) | S–M | no |

## Q5 — Recommended UX flow (exact screens)

**Recommended integration:** **(b) embedded onboarding with bank collection disabled for identity +
(c) our own bank form for bank-later.** This gives a fully deliberate, styleable split with no Stripe
dead-end page. If the Q2 "Save for later" test passes and we want to ship sooner, an **interim** can
use **(a) hosted identity + (c) our bank form** with no new secret — same screens below, just a hosted
redirect instead of the embedded component at Screen 2.

1. **Approval → "You're approved" screen.** After admin approval, the model lands on a profile/dashboard
   state that says they're approved and shows a single primary CTA: **"Verify your identity to go
   live."** Copy intent: identity is quick (~2 min) and is all that's needed to be bookable; bank comes
   later. (Submit-for-review is already decoupled from payout — RT-01,
   `src/containers/EditListingPage/EditListingWizard/EditListingWizard.js`.)
   *Assumes:* no Stripe step yet.

2. **Identity step.** Model taps the CTA →
   - *Recommended (b):* embedded Account onboarding component renders in our page with
     `external_account_collection: false`; model completes identity/address/DOB/TOS; component exits
     with `charges_enabled: true`, `payouts_enabled: false`. **No bank page ever shown.**
   - *Interim (a):* redirect to hosted onboarding (`currently_due`); instruct the model to click
     **"Save for later"** when the bank page appears. (Only if the Q2 test confirms that link exits
     charge-ready — otherwise do not ship this variant.)
   CTA copy intent: "Verify identity" / on return, a success toast "You're verified and bookable."

3. **"You're live & bookable — add bank later" state.** Detect `charges_enabled && !payouts_enabled`
   (data already available: `StripePayoutPage` reads `requirements`/flags,
   `src/containers/StripePayoutPage/StripePayoutPage.js:140-144`). Show a positive status card:
   profile is discoverable and bookable; a **secondary, non-blocking** CTA **"Add your bank to get
   paid"** with reassurance that they can do it anytime before they have earnings to withdraw. Nothing
   here blocks going live.
   *Assumes:* (b) or (a) completed; no bank yet.

4. **"Funds waiting — add your bank to get paid" state.** Once the model has held earnings
   (`payouts_enabled` still false but a pending/available balance exists), promote the bank CTA to
   primary and surface the held amount. Copy intent: "£X is waiting — add your bank to pay it out,"
   plus the 90-day backstop warning (funds refunded to the client after 90 days if no bank is added —
   see prior spike Q5). This is the incentive mechanic Neil described.
   *Assumes:* balance read (small addition) + reminder cadence (day 30/60/75 per prior spike).

5. **Adding the bank.** Model taps "Add your bank" →
   - *Recommended (c):* our own in-app form (sort code + account number) → Stripe.js bank token →
     `sdk.stripeAccount.update({ bankAccountToken })`. On success → `payouts_enabled: true`, held funds
     scheduled for payout. Fully our UX, no redirect.
   - *Alternative:* embedded `only: ['external_account']` (lands exactly on bank) or hosted re-entry
     (Q3 #1). Use only if we prefer not to own the bank form.
   CTA copy intent: "Save bank details" → success "You're all set — payouts enabled."

**No fund-flow changes anywhere:** destination charges + 15% application fee stay exactly as today; the
model's cut accrues in *their own* connected-account balance (prior spike Q4-A). This is UX/state work,
not a transaction-process change.

## Open questions / risks

- **[Test — cheap, do first]** Does hosted onboarding show a working **"Save for later"** on the
  `external_account` step that returns the model **charge-ready** (`charges_enabled:true`,
  `payouts_enabled:false`)? This gates whether the low-effort interim (a) is viable. Test on
  `ndstealth1-test`.
- **[Test]** For the embedded path (b): confirm `external_account_collection: false` on our Custom
  accounts yields a completed identity + `charges_enabled:true` and no bank prompt, and that
  `disable_stripe_user_authentication` behaves (only allowed for `requirement_collection = application`,
  which Custom accounts are). Needs an Account Session created with the platform key.
- **[Escalation — PM/Neil, architecture + secret hygiene]** Embedded components require the
  marketplace's **Stripe platform secret key** in our Express env and a direct
  `account_sessions/create` call, partially bypassing Sharetribe's Stripe layer. Decision needed on
  whether to introduce that secret (`.env`/Railway only, never committed) and own more of the KYC
  surface, vs. staying fully inside Sharetribe with option (a)+(c).
- **[Escalation — Neil]** This is money-movement + public-facing behaviour → needs approval before
  anything ships (charter).
- **[Human dev review]** Booking/payments + identity verification + personal-data handling are all
  safety-critical per charter. Flag for human developer review before real users are onboarded — do
  not quietly ship.
- **[Carry-over from prior spike]** 90-day refund-to-client backstop, reminder policy, and the
  lawyer's money-transmission/T&Cs review still stand (`docs/spikes/payout-deferral-feasibility.md`).

## Sources

- https://docs.stripe.com/api/account_links/create
- https://docs.stripe.com/connect/hosted-onboarding
- https://docs.stripe.com/connect/supported-embedded-components/account-onboarding
- https://docs.stripe.com/api/account_sessions/create
- https://docs.stripe.com/connect/account-capabilities
- https://www.sharetribe.com/api-reference/marketplace.html
- Prior spike: `docs/spikes/payout-deferral-feasibility.md`
- Repo: `src/ducks/stripeConnectAccount.duck.js`, `src/containers/StripePayoutPage/StripePayoutPage.js`,
  `src/components/StripeConnectAccountForm/StripeConnectAccountForm.js`, `src/util/stripeConnect.js`,
  `src/util/userHelpers.js`, `src/config/configListing.js`,
  `src/containers/EditListingPage/EditListingWizard/EditListingWizard.js`
</content>
</invoke>
