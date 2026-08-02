# Stripe Connect KYC — when do we ask a model for payout details?

**Status:** DECISION RECORDED — not yet implemented. This documents the decision on
proposal **RT-20260802-01** and what it would take to build. Do not implement without a
separate go-ahead.

**Decided:** 2026-08-02 (Neil); **REVISED 2026-08-02 (Neil)** after verifying the booking
payment flow. **Stripe KYC moves out of profile onboarding to immediately AFTER operator
approval and BEFORE the profile goes live** — the "you're accepted, add your payout details
to go live" step.

> **Why revised (supersedes the earlier "at first booking" option).** Verifying
> `default-booking` confirmed the crux: a client's card is **authorised at booking-request
> time**, and creating that authorisation **requires the model's connected Stripe account to
> already exist** (it's a destination charge; the app already blocks checkout otherwise). So
> Stripe genuinely cannot wait until a booking arrives — a payout-less model would be
> **searchable but unbookable**, and a client who tried to book would hit a dead end. Asking
> for payout at go-live (right after we tell the model they're in) removes that dead end
> entirely and asks for bank details at the most motivated moment.

---

## The decision

The onboarding sequence is now:

```
build profile → submit for review → operator approves → "you're in — add payout to go live"
             → model completes Stripe → LIVE (searchable AND bookable)
```

- **Submit needs no Stripe.** Create profile → submit for review happens with no payout step
  (this is still the RT-20260802-01 decouple: "Submit for review" must not open the payout
  modal).
- **Payout is required to go live, not to submit.** After we approve the model, they add
  payout details as the final gate before publication. A model is never *searchable* until
  payout is set, so a client never sees a model they cannot book.
- **No searchable-but-unbookable window.** This is the key difference from the earlier plan.

Rationale: today a fully-completed profile silently fails to go live because "Submit for
review" opens a mandatory Stripe KYC/bank modal instead of submitting (RT-20260802-01). We
still remove that up-front wall — but instead of deferring payout to an ambiguous "first
booking," we ask for it at the concrete, motivating moment the model has just been approved,
and we make it the last thing between them and being live and bookable.

---

## Current behaviour (what's there today)

- **Publish is gated on payout details.** `handlePublishListing`
  (`src/containers/EditListingPage/EditListingWizard/EditListingWizard.js:481-508`)
  only calls `onPublishListingDraft(id)` when
  `!isPayoutDetailsRequired || (stripeConnected && !stripeRequirementsMissing)`.
  Otherwise it sets `showPayoutDetails: true` and opens the payout modal instead of
  submitting. `isPayoutDetailsRequired` comes from
  `requirePayoutDetails(listingTypeConfig)` (`src/util/configHelpers.js:1100`), driven by
  the `model-profile` listing-type config.
- **Modal copy:** `EditListingWizard.payoutModalTitleOneMoreThing` /
  `payoutModalTitlePayoutPreferences` = "One more thing: Payout preferences"
  (`src/translations/en.json:417-418`).
- **Net effect:** submit ⇒ payout modal ⇒ (if abandoned) listing never leaves `draft`.

## The booking payment flow (verified against `default-booking` v1, 2026-08-02)

Pulled and read the live process. The four facts that drive the timing:

1. **Request → provider accept/decline is already the stock shape.** `request-payment`
   (customer) → `pending-payment`; `confirm-payment` (customer) → `preauthorized`; then the
   provider's `accept` → `accepted`, or `decline` → `declined`. The provider gets a
   `booking-new-request` notification on `confirm-payment`. No custom process needed for the
   request/accept model itself.
2. **The card is authorised (held), not charged, until acceptance.** `stripe-create-payment-intent`
   (request) + `stripe-confirm-payment-intent` (confirm) put the payment in `preauthorized`
   — a **manual-capture hold**. `accept` runs `stripe-capture-payment-intent` (the only point
   money is actually taken). `decline`/`expire` run `calculate-full-refund` +
   `stripe-refund-payment` (release the hold). Payout to the model is later still, at
   `complete → stripe-create-payout`.
3. **Creating the authorisation requires the model's connected Stripe account to already
   exist** — it's a destination charge to the provider's account, so the account must be
   present at request time. The app already enforces this: checkout against a payout-less
   model is blocked by `CheckoutPage.providerStripeAccountMissingError` (en.json:86) and
   `destinationAccountNotCompleteStripeError` (:74). **This is the crux — Stripe cannot wait
   until acceptance.**
4. **Provider response window:** `:transition/expire` fires at
   `min( preauthorized + P6D, booking-start + P1D, booking-end )` — so **up to 6 days** by
   default, capped tighter for near-term shoots. The ceiling is set by Stripe: an uncaptured
   card authorisation is released after **~7 days**, so the window must stay under that. P6D
   is the stock safety margin; a 48-hour target is comfortably inside it (see the merged
   spec's response-window section).

**Therefore:** a model must have Stripe connected **before any client can authorise a
booking**. Deferring payout to "first booking" would leave a searchable-but-unbookable model
and a client dead end. Asking for payout at **go-live, right after approval** is the earliest
point that (a) isn't an up-front onboarding wall and (b) still guarantees every searchable
model is bookable.

## What's already built (no work needed)

- **Owner-facing "not bookable yet" state.** When a model owns a listing but has no payout
  details, the listing page shows `ListingPage.payoutDetailsWarning` ("This listing is not
  available for booking. You have not added your payout details yet.") + `payoutDetailsWarningLink`
  ("Add your payout details") (`src/containers/ListingPage/ListingPage.shared.js:216-222`,
  `en.json:620-621`), and `ListingPage.addPayoutDetailsMessage` ("Please add your payout
  details to start accepting orders.") (`en.json:601-602`).
- **Client-facing guard.** Checkout against a payout-less model is already blocked with a
  clear message (see constraint above). No client can pay into a void.
- **Account Settings → Payout details** tab already exists
  (`LayoutWrapperAccountSettingsSideNav.paymentsTabTitle`, `en.json:581`) as a home for the
  deferred Stripe onboarding.

## What it would take to build

1. **Decouple SUBMIT from payout (RT-01).** "Submit for review" must send the profile to
   review (→ `pendingApproval`) **without** opening the payout modal — change the
   `model-profile` config feeding `requirePayoutDetails`
   (`src/util/configHelpers.js:1100`), or `handlePublishListing`
   (`EditListingWizard.js:481-508`), so submit never gates on `stripeConnected`.
2. **Add the payout gate at GO-LIVE, after approval.** New requirement: a listing becomes
   `published`/searchable only when **both** (a) an operator has approved it and (b) the
   model has completed Stripe payout. Sharetribe's native listing-approval **publishes
   immediately on approve**, which would skip (b). Recommended mechanism:
   - Operator approval is recorded as a **signal** (listing metadata `reviewApproved: true`
     + the "you're in — add payout to go live" email), **not** an immediate publish.
   - The model completes Stripe onboarding; the app then publishes the listing — a go-live
     action **gated on `reviewApproved && payoutPresent`**.
   > **DECISION FLAG:** confirm this mechanism vs. the alternative — native approve = publish,
   > then hide payout-less models from search until Stripe is done. The recommended one keeps
   > the listing genuinely unpublished until payout, which is cleaner but more custom.
3. **Keep the CheckoutPage / listing payout guards as a backstop.** With the go-live gate,
   they should never fire for a searchable model — but leave them as defense in depth so a
   client can never pay into a payout-less model even if a listing slips through.
4. **Post-approval "you're in — add payout to go live" screen** (this replaces the earlier
   "persistent nudge for a live-but-unbookable model" — there is **no** live-but-unbookable
   state now). Plus the post-submit "in review" copy (RT-02).
5. **Files likely touched:** `EditListingWizard.js` (submit no longer gates on payout), the
   go-live publish gate (`EditListingPage.js`/`EditListingWizard.js` + a payout check), the
   approval → email → payout wiring (merged-spec Part E events), `src/translations/en.json`
   (payout-modal + go-live + review keys).

## Interaction with other decisions

- **Listing approval (RT-20260802-08):** with listing approval ON, the lifecycle is
  *draft → submit → `pendingApproval` (operator review) → **approved (signal, not yet live)**
  → **add payout** → `published` (live, searchable AND bookable)*. Payout is now a gate
  **before** go-live, not after — so there is a single "not yet live" journey with two
  sequential gates (review, then payout), and **no** searchable-but-unbookable window.
- **Booking response window (48h):** see the merged spec — the request→accept model is stock,
  but a 48-hour window with reminders needs a **custom `default-booking` version** (change
  `:transition/expire` P6D → PT48H) plus reminder infra.

## Open question for whoever implements

- Confirm the go-live mechanism in step 2 (metadata-signal + payout-gated publish vs.
  approve-then-hide). This is the one real design fork.
