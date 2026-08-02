# Submit → Review → Go-live — the model profile lifecycle

**Status:** SPEC for review. Merges proposals **RT-20260802-01** (submit decoupled from
Stripe), **RT-20260802-02** (post-submit confirmation), and **RT-20260802-08** (listing
approval on). These are **one piece of work**, not three — implement as a single coherent
change once Neil has read this spec. Do not implement before then.

Companion doc: `docs/stripe-kyc-timing.md` (the Stripe-at-first-booking decision + payment
constraint) — this spec references it rather than repeating the detail.

---

## 1. The lifecycle we're building

```
create profile ─▶ submit ─▶ pendingApproval ─▶ published ─▶ bookable
   (draft)        │           (operator          (live &      (once payout
                  │            review)            searchable,   details added)
                  │                               NOT yet
              no Stripe                           bookable)
              step here                                │
                                                       └─ first booking ⇒ Stripe KYC
```

Two gates now sit between "done building" and "earning", and they are **independent** — the
model must always know which one they're waiting on:

1. **Operator review** (listing approval) — between *submit* and *live/searchable*.
2. **Payout onboarding** (Stripe) — between *live* and *actually bookable*, triggered at
   the first booking (see `docs/stripe-kyc-timing.md`).

Today neither works as intended: "Submit for review" opens a Stripe modal instead of
submitting, and there is no review gate at all (fresh models go straight to active).

---

## 2. Part A — Submit decoupled from Stripe (RT-01, decouple route)

**Decision:** the decouple route, not the cosmetic "just retitle the button" fallback.
Stripe KYC leaves onboarding entirely and moves to first-booking acceptance.

- **Change:** in `handlePublishListing`
  (`src/containers/EditListingPage/EditListingWizard/EditListingWizard.js:481-508`), stop
  gating `onPublishListingDraft(id)` on `stripeConnected`. The profile submits regardless of
  payout status. Cleanest implementation: make the `model-profile` listing type not require
  payout details at publish (the flag feeding `requirePayoutDetails`,
  `src/util/configHelpers.js:1100`); fall back to editing `handlePublishListing` directly if
  the config route isn't available.
- **What replaces the gate:** payout becomes a non-blocking task surfaced later (owner
  listing-page warning + a nudge), required only to open bookings. The template already has
  the "not bookable until payout" UI — see `docs/stripe-kyc-timing.md` §"What's already
  built".
- **Do NOT remove** the client-side checkout guard (`CheckoutPage.providerStripeAccountMissingError`).
  It's what makes "live but not bookable until payout" safe — a client can never pay into a
  model with no Stripe account.

## 3. Part B — Listing approval on submit (RT-08)

**The exact Console setting** (on `ndstealth1-test`; this is a Console change, not repo):

| Setting (Console → Build → General → Access control) | Set to | Why |
|---|---|---|
| **Listing approval** | **ON** | New profiles enter `pendingApproval` on submit; hidden until an operator approves |
| **Approve users who want to join** | **OFF** | Models sign up and build freely — no join gate (this is what's wrongly implied ON in CLAUDE.md today) |

These two are independent features under the same Console page. Turning listing-approval ON
and user-approval OFF is coherent and is exactly the "build freely, review the listing"
behaviour Neil wants.

**Operator actions when a profile is pending:**
- Console: open the listing → **Approve** button → state becomes `published`.
- Or Integration API: `integrationSdk.listings.approve({ id }, { expand: true })`.
- **No native reject exists** — Sharetribe only offers Approve or delete, with no reason
  field. The "declined with reasons" path (Part E) is therefore custom.

**Already built in this repo (no code needed for the in-app pending UX):**
- `LISTING_STATE_PENDING_APPROVAL` (`src/util/types.js:209`).
- Post-submit redirect to the pending-approval listing variant
  (`EditListingPage.js:202-226`).
- Owner "under review" banner — `ListingPage.ownListingPendingApproval` = "Your profile is
  under review." (`en.json:619`).
- Manage-listings overlay — `ManageListingCard.pendingApproval` = "Your profile is under
  review and not visible to clients yet." (`en.json:689`).

(Note: the `NoAccessPage` posting-rights / `userPendingApproval` strings are for the
*user*-approval gate, which stays OFF — they won't fire. Don't confuse them with listing
approval.)

## 4. Part C — Post-submit confirmation screen (RT-02)

Once Part A lands (submit actually completes) and Part B is on (state = `pendingApproval`),
the model needs an explicit "what happens next" moment instead of a box silently closing.

- **Where:** after a successful submit, route to a confirmation screen or inline banner
  (the pending-approval redirect at `EditListingPage.js:202-226` is the natural anchor).
- **Copy (brand-voiced, honest about both gates):**
  > **You're in review.**
  > Your profile's with the Rogue team — we check every model before they go live, usually
  > within one working day. We'll email you the moment you're approved. You can still tweak
  > your rates and calendar while you wait. (Payout details come later — you'll add them to
  > start taking bookings.)
- **New en.json keys:** `EditListingWizard.submittedForReview*` (heading + body).

## 5. Part D — Stripe at first booking

Full detail in `docs/stripe-kyc-timing.md`. Recap of the constraint that shapes it:

- `default-booking` charges the client at **request** time
  (`:transition/request-payment → stripe-create-payment-intent`), which needs the model's
  connected Stripe account to already exist. So "at acceptance" is really **"before a client
  can pay"** — the model is live and searchable without Stripe but cannot be booked until
  payout is set.
- **Chosen approach (lowest-effort, delivers the decision):** publish without the payout
  gate (Part A) + a persistent "add payout details to start accepting bookings" nudge (the
  owner listing-page warning already exists; add a dashboard/topbar banner). A richer
  "client registered interest ⇒ notify the model to onboard" flow is a possible later step,
  not part of this change.

## 6. Part E — The three emails

| Email | Native? | Mechanism |
|---|---|---|
| **1. Submitted / under review** | ❌ Build | Integration API events (`listing/updated` → state `pendingApproval`) → external mailer (SendGrid/Postmark/Mailgun) or a Zapier "new event" recipe |
| **2. Approved / now live** | ✅ Native | Built-in **`ListingApproved`** email — fires automatically once Listing approval is ON. Just edit the copy in Console → Build → Content → Email texts. Bundle the "add payout to start taking bookings" nudge into this copy. |
| **3. Declined + reason** | ❌ Build (hardest) | No native reject ⇒ no native email **and** nowhere to capture a reason. Invent it: operator writes the reason into a listing **metadata field** (e.g. `rejectionReason`) via `integrationSdk.listings.update`; an events listener detects that write and emails the model the reason + what to fix. |

**Why 1 and 3 can't be transaction-process notifications:** listing approval is not a
transaction, so transaction-process `notifications` never fire for it. Listing state changes
surface only as marketplace **events** (`listing/created`, `listing/updated`). Both custom
emails hang off that events feed.

**The decline path matters as much as approval.** A model who spent 40 minutes and gets
silence (or a deletion with no explanation) is the worst outcome. The reason-capture step is
required, not optional — budget for it.

## 7. Console checklist (Neil / operator)

- [ ] Build → General → Access control → **Listing approval = ON**
- [ ] Build → General → Access control → **Approve users who want to join = OFF**
- [ ] Build → Content → Email texts → customise **ListingApproved** copy (+ payout nudge)
- [ ] Decide email provider / Zapier for emails #1 and #3 (out of Console)

## 8. Implementation plan (one change, after spec sign-off)

Land as a single coherent change (the three proposals are merged), with commits tagged by
the originating IDs so they remain traceable:

1. Decouple publish from Stripe (Part A) — `RT-20260802-01`.
2. Post-submit confirmation screen + copy (Part C) — `RT-20260802-02`.
3. Payout nudge banner for live-but-not-bookable models (Part D).
4. (Console + emails are operator/infra tasks, tracked here but done outside the repo.)

Part B's in-app UX needs no code (already built); it's the Console toggle plus the emails.

## 9. Out of scope / deferred

- Custom "client registered interest before payout" pre-booking flow (Part D richer option).
- Reworking the money flow so a client can book before the model onboards (not worth it).
- Operator-facing approval UI in the app (approval stays in Console / Integration API).
