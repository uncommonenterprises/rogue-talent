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
create profile ─▶ submit ─▶ pendingApproval ─▶ approved ─▶ add payout ─▶ LIVE
   (draft)          │         (operator         (signal:    (Stripe       (searchable
              no Stripe        review)           "you're     Connect)       AND bookable)
              step here                           in")
```

Two gates sit between "done building" and "live", and they are **sequential** — the model
always knows which one they're waiting on:

1. **Operator review** (listing approval) — between *submit* and *approved*.
2. **Payout onboarding** (Stripe) — between *approved* and *live*, asked at the moment we
   tell the model they're in (see `docs/stripe-kyc-timing.md`).

**Crucially, payout comes BEFORE go-live, not after** — because a booking authorises the
client's card at request time and that needs the model's Stripe account to already exist
(verified — see Part D). So every searchable model is bookable; there is **no**
searchable-but-unbookable window and no client dead end.

Today neither gate works as intended: "Submit for review" opens a Stripe modal instead of
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

## 5. Part D — Stripe at go-live (after approval, before live)

Full detail + verification in `docs/stripe-kyc-timing.md`. The shape:

- `default-booking` **authorises** (holds) the client's card at request time
  (`stripe-create-payment-intent` + `stripe-confirm-payment-intent`) and **captures** only on
  provider `accept`. Creating that authorisation needs the model's connected Stripe account
  to already exist. So Stripe cannot wait for a booking — a payout-less model is unbookable.
- **Decision (revised):** payout is the **last gate before go-live**, asked right after
  operator approval ("you're in — add payout to go live"). No searchable-but-unbookable
  window; every model a client can see, they can book.
- **Build:** submit stops gating on payout (Part A); operator approval becomes a signal
  (metadata + email), not an instant publish; the model completes Stripe; the app then
  publishes, **gated on `reviewApproved && payoutPresent`**. Keep the CheckoutPage guard as a
  backstop. **DECIDED (Neil, 2026-08-02):** this mechanism, not approve-then-hide — one source
  of truth for "live". (See `stripe-kyc-timing.md` "What it would take to build".)

## 5b. Part D2 — Booking = request → accept/decline, within 48 hours

This is the booking model the marketplace promises: a client picks a model + dates, it goes
to the model as a **request** they accept or decline before anything is confirmed — direct
and fast, unlike the agency round-trip. Verified against `default-booking` v1:

- **Stock already does request → provider accept/decline → capture.** `request-payment` →
  `pending-payment` → `confirm-payment` → `preauthorized` (card **held, not charged**) →
  provider `accept` (capture) or `decline` (release). The provider is notified on
  `confirm-payment` (`booking-new-request`). No custom process needed for the *shape*.
- **Response window needs a custom process version.** Stock `:transition/expire` fires at
  `min(preauthorized + P6D, booking-start + P1D, booking-end)` — up to **6 days**. To promise
  **48 hours**, change `:transition/expire` to `min(preauthorized + PT48H, booking-start)`
  and push a new `default-booking` version via flex-cli. 48h is well under Stripe's ~7-day
  authorisation-hold ceiling, so the hold never lapses first.

**Target: resolve within 48 hours — or before the shoot date, whichever is sooner** (accept /
decline / auto-release), with reminders. What each party sees:

| Moment | Client sees | Model sees |
|---|---|---|
| Request sent (`preauthorized`) | "Request sent — [Model] has **48 hours (or until your shoot date, if that's sooner)** to respond. Your card is **authorised, not charged** — you're only charged if they accept." | "New booking request — [dates, amount]. Respond within **48h (or before the shoot, if sooner)**: **Accept** / **Decline**." |
| Reminders (e.g. 24h, 40h left) | (optional) "Still waiting on [Model]." | "⏳ N hours left to respond to [Client]'s request." |
| **Accept** | "Confirmed! Charged £X." (`booking-accepted-request`) | "You accepted — £X will pay out after the shoot." |
| **Decline** | "[Model] can't take this one — **no charge**, your hold is released. Here are similar models." (`booking-declined-request`) | Request closed. |
| **Expiry (no response in 48h)** | "[Model] didn't respond in time — **no charge**, hold released. Try another model." (`booking-expired-request`) | Missed request (feeds a future responsiveness signal). |

- **Build the 48h window FIRST; reminders are a fast-follow (decided).** The `expire` is what
  makes the claim true; reminders (24h + 40h) only lift accept rates. Do NOT let the custom,
  events-based scheduled-job reminder infra block the process change — ship the window, add
  reminders after.
- **Reminders** aren't a stock feature (notifications fire on transitions, not on a timer):
  an events API / scheduled job querying `preauthorized` transactions, emailing at 24h and 40h.
- **Note for the client:** the hold ties up the authorised amount on their card until the
  request resolves. Copy must say "authorised, not charged" so it's never a surprise.
- **The public claim must be EXACTLY true.** Because `expire = min(preauthorized + 48h,
  booking-start)`, a client requesting a shoot 12h out does **not** get 48 hours. Any
  marketing or UI copy must read **"within 48 hours, or before the shoot date if sooner"** —
  never a bare "48 hours". The `expire` still guarantees resolution (accept / decline /
  auto-release, no charge) even if the model goes silent, so the claim holds.

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

1. Decouple **submit** from Stripe (Part A) — `RT-20260802-01`.
2. Post-submit "in review" confirmation screen + copy (Part C) — `RT-20260802-02`.
3. **Go-live payout gate** (Part D): approval-as-signal + payout-gated publish + the
   "you're in — add payout to go live" screen. (Confirm the DECISION FLAG mechanism first.)
4. (Console + emails are operator/infra tasks, tracked here but done outside the repo.)

**Separate workstream — the 48h booking window (Part D2).** A custom `default-booking` version
(`:transition/expire` → `min(preauthorized + 48h, booking-start)`) pushed via flex-cli.
**Reminders (24h/40h) are a fast-follow, not a blocker** — ship the window first (the expire
is what makes the claim true), add the events-based reminder job after. Sequence after go-live
(needs live, bookable models to test). Design this **together with the cancellation/refund
custom process** (`docs/cancellation-process-spec.md`) — **one** process version, not two.
**Consequence:** the OPEN commercial questions in `cancellation-process-spec.md` now block the
booking process work and move up the priority list.

Part B's in-app UX needs no code (already built); it's the Console toggle plus the emails.

## 9. Out of scope / deferred

- Custom "client registered interest before payout" pre-booking flow (Part D richer option).
- Reworking the money flow so a client can book before the model onboards (not worth it).
- Operator-facing approval UI in the app (approval stays in Console / Integration API).
