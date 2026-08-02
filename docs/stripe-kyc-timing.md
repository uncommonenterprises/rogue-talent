# Stripe Connect KYC — when do we ask a model for payout details?

**Status:** DECISION RECORDED — not yet implemented. This documents the decision on
proposal **RT-20260802-01** and what it would take to build. Do not implement without a
separate go-ahead.

**Decided:** 2026-08-02 (Neil). **Option chosen: 3 — move Stripe KYC out of profile
onboarding and to the point of taking a first booking.**

---

## The decision

A model must **not** be forced through Stripe Connect identity/bank verification just to
submit their profile for review. Onboarding (create profile → submit → get reviewed →
appear on the platform) happens with **no Stripe step**. Payout onboarding is deferred to
the moment it actually matters for money changing hands — around the model's **first
booking**.

Rationale: today a fully-completed profile silently fails to go live because "Submit for
review" opens a mandatory Stripe KYC/bank modal instead of submitting (RT-20260802-01).
A model who has not been booked by anyone is being asked for bank details and ID up front,
and if they defer, the profile just stays a draft. That is the single highest-drop-off
point in onboarding.

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

## The constraint that shapes "at first booking"

"At the point of **accepting** a booking" is the intent, but the payment architecture means
the real trigger is slightly earlier — **before a client can pay**, not at acceptance:

- In `default-booking` (`ext/transaction-processes/default-booking/process.edn`) the
  customer's card is charged at **request** time:
  `:transition/request-payment → :action/stripe-create-payment-intent`, then
  `:transition/confirm-payment`. The provider's `:transition/accept` only
  **captures** an already-authorised payment (`stripe-capture-payment-intent`); payout to
  the model happens later still, at `:transition/complete → stripe-create-payout`.
- Creating that PaymentIntent needs the **provider's connected Stripe account to already
  exist** as the transfer destination. The template already enforces this on the client
  side: a client cannot check out against a model with no payout account —
  `CheckoutPage.providerStripeAccountMissingError` ("This listing is currently unavailable
  because the listing author hasn't added their payout details yet")
  (`src/translations/en.json:86`), and `CheckoutPage.destinationAccountNotCompleteStripeError`
  (`:74`).

**Therefore:** a model can be reviewed, published, and discoverable with no Stripe account,
but **cannot actually be booked** until they complete payout onboarding. The honest shape of
"KYC at first booking" is: *profile is live and searchable without Stripe; Stripe is required
to open/accept bookings.* You cannot literally let a client pay and only then ask the model
to onboard — the payment would fail at request time.

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

## What it would take to build (deferred)

1. **Decouple publish from payout.** Make `model-profile` not require payout details at
   publish so `handlePublishListing` submits regardless of `stripeConnected` — either by
   changing the listing-type config that feeds `requirePayoutDetails`, or by editing
   `handlePublishListing` to always call `onPublishListingDraft(id)` and surface payout as a
   non-blocking follow-up. (This is the core of RT-20260802-01.)
2. **Keep the booking-time gate as-is.** Leave the CheckoutPage / listing-page payout guards
   in place — they already produce the "not bookable until payout is set" behaviour we want.
   The model appears in search; the profile page shows the owner an "add payout details to
   start accepting orders" prompt.
3. **Prompt the model at the right moment.** Because payment is collected at request time,
   the model must onboard **before** a client can complete a booking. Options, in rising
   effort:
   - **a. Persistent nudge (lowest effort):** dashboard/topbar banner + the existing
     owner-listing warning: "Add payout details to start accepting bookings." The profile is
     live; bookings are simply closed until payout is done. No new backend.
   - **b. Interest signal (medium):** let a client register interest / "request to book" on a
     not-yet-bookable model, which notifies the model to complete payout so the booking can
     proceed. Needs a lightweight pre-payment intent/waitlist concept (not in stock
     `default-booking`) plus a notification.
   - **c. Full deferral (highest):** rework the money flow so a client can express a booking
     without an immediate charge, then charge once the model onboards. This is a custom
     transaction-process change and is almost certainly more than this is worth — flagged
     only for completeness.
   Recommended: **(a)** now, consider **(b)** later. (a) fully delivers the decision — no
   Stripe during onboarding — with the smallest surface area.
4. **Post-submit "what happens next" copy** (RT-20260802-02) so the model understands the
   profile is in review and that payout comes later, before bookings open.
5. **Files likely touched:** `EditListingWizard.js` (publish gate), the `model-profile`
   listing-type config, `EditListingPage.js`, `src/translations/en.json` (payout-modal +
   new banner/next-step keys), and possibly a dashboard banner component.

## Interaction with other decisions

- **Listing approval (RT-20260802-08):** with listing approval ON, the lifecycle becomes
  *draft → submit → `pendingApproval` (operator review) → `published` (live, searchable) →
  bookable once payout is set*. Two independent gates now sit between "done building" and
  "earning": operator review, and payout-before-booking. Keep them conceptually separate in
  the UX so a model always knows which one they're waiting on.

## Open questions for whoever implements

- Do we want a hard "bookings closed" state surfaced to clients (e.g. a badge on the card),
  or just the silent unavailability at checkout? A visible "not taking bookings yet" is
  kinder to clients but exposes that a model is unfinished.
- Should completing payout be nudged by email as part of the approval emails (see
  `docs/` notes on listing-approval emails), i.e. bundle "you're approved — add payout to
  start taking bookings" into the approval message?
