# UX Review — Booking Request, client → model (Journey 3) — 2026-09-20
Agent run: ux-tester-2026-09-20 | Test env: https://rogue-talent-production.up.railway.app (ndstealth1-test)
Model booked: Anais P. (rt-model-03, £150/day, payouts enabled) | Dates: 27–28 Sept 2026

**The persona specified for this run, rt-client-02 (Tom), cannot complete this
journey at all — see RT-20260920-07.** To still validate the checkout/payment
path end-to-end, the walkthrough was completed with rt-client-01 (Priya Shah)
instead, and a real test-mode booking request was submitted successfully
(order `6aaf9985-4e68-4fa6-9f4d-e54b3e4b0d02`).

5 findings below (max 10, ranked by impact). Nothing cut to backlog.

**What worked well (not a proposal, for the record):** the 15%-customer-fee
breakdown was calculated correctly at every step (£300 subtotal → £45 fee →
£345 total, no provider commission shown); "you won't be charged yet" /
"your card will only be charged when [model] accepts" messaging appears
consistently pre-checkout, at checkout, and in the post-submit confirmation;
the Stripe test card (4242 4242 4242 4242) completed and the transaction
reached "Requested" state visible in the client's own `/inbox/orders`.

---

## RT-20260920-07 — rt-client-02 (Tom), the account specified for this journey, has no transaction rights and cannot book at all
Journey:   booking-request
Screen:    `/l/anais-p/.../` → clicking "Request to book" while logged in as
           rt-client-02
Severity:  blocker
Evidence:  screenshots/j3-04-no-transaction-rights-tom.png. Clicking "Request
           to book" (with valid dates 27–28 Sept selected) redirected to
           `https://rogue-talent-production.up.railway.app/no-transaction-rights`,
           page heading: "You don't have transaction rights", body text: "To
           start a transaction, you need to receive transaction rights from
           the Rogue Talent team." Re-verified: logged out, logged back in as
           rt-client-02 fresh, repeated the exact same date selection and
           click — same redirect both times. The identical flow with
           rt-client-01 (Priya) on the same listing/dates worked and reached
           `/checkout` normally.
User view: A prospective client who has already signed up, been through
           whatever "approved: true" gate exists per .test-accounts.json, and
           found a model they want to book, hits a full dead end with no
           explanation of what to do next or who "the Rogue Talent team" is or
           how to contact them.
Proposal:  This is account-configuration, not a code bug (Priya, an equivalent
           seeded client, works fine) — but it means the specific account this
           journey's spec names (rt-client-02 / Tom) is currently unusable for
           its intended purpose. Grant rt-client-02 the same transacting
           permission set rt-client-01 has (Sharetribe Console → Manage users,
           or whatever admin action grants "transact" rights), so future
           journey runs and any real onboarding flow this mirrors don't hit
           the same wall. Separately: the dead-end page itself gives a client
           no path forward (no contact link, no "request access" CTA) — worth
           a follow-up look at what a REAL client would see here if their
           account genuinely lacked rights (e.g. mid-review), since right now
           it's a hard stop with no next step.
Touches:   Test data/account config (Sharetribe Console) for rt-client-02;
           separately, src/containers/NoTransactionRightsPage (add a
           contact/next-step CTA) if this is a state real users can hit
Effort:    XS (grant rights) + S (improve the dead-end page's CTA, optional)
Impact:    Blocks this exact seeded test persona from the entire money path;
           if real client accounts can reach this same state (e.g. pending
           admin approval), the page currently offers zero recovery path.
---
Status: APPROVED
Note: APPROVED by Neil via decision-card 2026-09-20 — "Approve all defects" + "Approve all three [polish]". (Dead-end CTA / 'verify your email' nudge approved as polish; granting rt-client-02 transaction rights = Neil's test-data action.) Implemented: 1c38357c1 2026-09-20 (deploy-verify pending) — NoAccessPage(initiate-transactions) now shows a verify-your-email hint + Account settings link.

## RT-20260920-08 — Stripe card element's ZIP field only accepts digits, so a UK client cannot enter their real postcode
Journey:   booking-request
Screen:    `/l/anais-p/.../checkout` → Payment card details (Stripe Elements
           card field)
Severity:  friction (money-path)
Evidence:  screenshots/j3-07-checkout-payment-section.png. Verified directly
           inside the Stripe iframe (`iframe[title="Secure card payment input
           frame"]`), not via any outer field: clicking the element's own
           "ZIP" sub-field and typing a real UK postcode character-by-character
           (`E1 6QL`, using Playwright's `pressSequentially` — i.e. genuine
           simulated keystrokes, not a bulk value-set) resulted in a stored
           value of `16` — every letter and the space were silently dropped,
           leaving only the digits. Typing a 5-digit numeric value (`12345`)
           into the same field was accepted and is what made "Confirm booking
           request" become enabled — confirming this field is required for
           checkout to proceed at all.
User view: A real UK client — the entire target market for this GBP,
           UK-cities marketplace — cannot enter their actual postcode in a
           required payment field. They'd either be confused why their
           postcode "won't type," or learn to fudge it with digits-only
           (defeating the point of postcode collection, and potentially
           causing card-network AVS mismatches once real (non-test) cards are
           used).
Proposal:  Check the Stripe Elements card-field configuration for a hardcoded
           or default `postal code` validation locked to a numeric-only /
           US-ZIP pattern; either configure it for UK postcode format (Stripe
           Elements supports country-aware postal formatting) or, since a
           separate "Postal code" field already exists in the outer Billing
           details section of the same form, consider disabling Stripe's
           built-in postal collection (`hidePostalCode: true` or the
           CardElement equivalent) and relying solely on the outer billing
           address field, which DID accept "E1 6QL" correctly.
Touches:   src/containers/CheckoutPage (Stripe Elements / CardElement
           initialization options — wherever `hidePostalCode` or postal
           validation is configured)
Effort:    S (likely a single config flag once the right Stripe Elements
           options object is located)
Impact:    Every UK client hits this on every real booking; currently
           papered over by the fact test-mode Stripe doesn't hard-block on
           AVS mismatch, but it's a data-integrity/trust issue and a
           frustrating moment right before paying.
---
Status: PENDING
Note: PENDING — PM verdict 2026-09-20: TEST-CARD ARTIFACT, not a bug. Stock unmodified CardElement; postal follows the card's country, and test card 4242 = US (numeric). A real UK card gets UK-postcode validation. Confirm with a real UK card at live-Stripe testing; no code change unless it reproduces there.

## RT-20260920-09 — "27 Sept → 28 Sept" date range reads as 1 day but bills as "2 days" with no explanation
Journey:   booking-request
Screen:    Listing page date picker and checkout "Booking breakdown"
Severity:  friction
Evidence:  screenshots/j3-02-dates-selected.png, j3-03-booking-breakdown.png.
           Snapshot text: "Booking start: Sunday 27 Sept" / "Booking end:
           Monday 28 Sept" directly above a breakdown line reading "£150.00 x
           2 days — £300.00".
User view: Selecting a single from/to date pair (27th as start, 28th as end)
           reads, to anyone used to hotel-style date pickers, as "one night /
           one day of work." Seeing it billed as 2 full days (£300 instead of
           the ~£150 they may have expected) right before payment is a
           legitimate place for a client to feel surprised or wonder if
           something's wrong — even though the underlying logic (booking the
           model for both the 27th and the 28th as full working days) is a
           reasonable and possibly intentional design for a day-rate booking
           product.
Proposal:  Add a one-line inline clarification near the date picker or the
           breakdown, e.g. "Selecting 27–28 Sept books Anais for both full
           days (2 days)." — so the day-count is explained before the client
           reaches checkout, not just shown as a line-item after the fact.
Touches:   src/containers/ListingPage (date-picker/booking panel component),
           src/translations/en.json
Effort:    XS–S
Impact:    Reduces a plausible source of checkout hesitation/abandonment at
           the exact moment a client is about to enter card details.
---
Status: APPROVED
Note: APPROVED by Neil via decision-card 2026-09-20 — "Approve all defects" + "Approve all three [polish]". DISPOSITION 2026-09-20: NOT a bug (Developer-confirmed) — Sharetribe inclusive end-date; 27→28 = 2 full days = correct pricing. Clarification note added near date picker. Implemented: dd63b7d77 2026-09-20 (deploy-verify pending).

## RT-20260920-10 — Booking-fee footnote is generic boilerplate; misses the chance to state the model keeps 100%
Journey:   booking-request
Screen:    Checkout "Booking breakdown" panel, fee line footnote
Severity:  polish
Evidence:  screenshots/j3-08-checkout-ready-to-submit.png. Snapshot text:
           "Rogue Talent fee *" ... "* The fee helps us run this platform and
           provide the best possible service to you!"
User view: Not misleading, just a missed opportunity — CLAUDE.md documents
           "keep 100% / one flat 15% fee" as the core brand wedge Rogue wants
           understood, and this is the literal moment a client sees the fee
           deducted from their total. The current copy is generic
           marketplace boilerplate that could belong to any platform.
Proposal:  Replace the footnote with something specific to the model, e.g.
           "* Anais keeps 100% of her £300 day rate — this fee is what funds
           Rogue Talent, with no cut taken from her side." Reinforces the
           brand promise at the point of payment.
Touches:   src/translations/en.json (booking breakdown fee explanation string)
Effort:    XS
Impact:    Free brand-reinforcement copy change at a high-attention moment.
---
Status: APPROVED
Note: APPROVED by Neil via decision-card 2026-09-20 — "Approve all defects" + "Approve all three [polish]". Implemented: 1ad5c2321 2026-09-20 (deploy-verify pending) — OrderBreakdown fee note now states model keeps 100%.

## RT-20260920-11 — Client's own successful-booking page is titled "Sale details" in the browser tab
Journey:   booking-request
Screen:    Post-submit confirmation page,
           `/order/6aaf9985-4e68-4fa6-9f4d-e54b3e4b0d02`
Severity:  polish
Evidence:  Browser tab / page title captured directly: "Sale details: Anais
           P. | Your booking request was successful!" — the on-page heading
           itself correctly reads "Your booking request was successful!"; only
           the `<title>` uses "Sale details," which is Sharetribe's
           provider-side ("this is a sale to me") terminology, surfacing in
           the customer's own tab title.
User view: Very minor — most clients never look at the tab title — but it's
           an inconsistency: the page content is warm and client-facing, the
           tab title is internal marketplace jargon.
Proposal:  Update the page-title template for the customer-facing order view
           to use client-appropriate language (e.g. "Booking request:
           [Model name]"), independent of the provider-facing title used on
           the equivalent page in the model's inbox.
Touches:   src/containers/TransactionPage (page title / `<Page title>` logic,
           likely branches on customer vs. provider role already)
Effort:    XS
Impact:    Negligible on its own; bundled here since it's free once someone's
           in that file for other reasons.
---
Status: APPROVED
Note: APPROVED by Neil via decision-card 2026-09-20 — "Approve all defects" + "Approve all three [polish]". Implemented: 0778e70dd 2026-09-20 (deploy-verify pending) — customer order view uses client-facing browser title.
