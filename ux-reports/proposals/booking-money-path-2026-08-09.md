# UX Review — Booking request (money-path) — 2026-08-09
Agent run: pm-2026-08-09-1420 | Test account: hi+rt-client-01@uncommonenterprises.co.uk | Build: abcfcb69d (repo HEAD; live deploy sha not verified this run)

Likely blocker (per seeded-data constraint): a client can pick dates and see the price + 15%-fee breakdown on the profile, but **checkout dead-ends at the Stripe payout guard** — the seeded model has no Stripe payout connected, so the speculative transaction fails with `providerStripeAccountMissingError` and the money-path cannot complete. Reported as RT-20260809-07 (and the dead-end copy is the fix regardless of whether payout is later connected). Everything up to payment (date calendar, "Booking breakdown", 15% fee line) is reachable.

> Run note — no live screenshots this run. Browser / computer-use MCP tools were not loaded
> (ToolSearch disabled; `mcp__claude-in-chrome__*` and `mcp__computer-use__*` returned "No such
> tool available"). Findings are grounded in the exact shipping copy/logic; `Evidence:` cites
> file:line. Recommend a re-run with browser access to attach visual evidence and to confirm
> whether rt-model-03's payout is connected before Neil sets statuses.

## RT-20260809-07 — Checkout dead-ends at the payout guard with an off-brand "contact support" message
Journey:   booking-money-path
Screen:    CheckoutPage (`/l/:id/checkout`) → speculative-transaction error
Severity:  blocker
Evidence:  src/containers/CheckoutPage/ErrorMessages.js:88-91 → en.json:88 ("CheckoutPage.providerStripeAccountMissingError": "This listing is currently unavailable because the listing author hasn't added their payout details yet. Please contact support.")
User view: "I picked my dates, saw the price, hit Request to book — and now a red error says the listing is 'unavailable' and to 'contact support'. Is the model real? Is the site broken? There's no support link and no way forward. I'm gone."
Proposal:  Two parts. (1) Product: models with no payout should not be bookable-looking in the first place — surface "not yet accepting bookings" on the profile/card and hide/disable the booking CTA there, so the client never reaches a dead checkout (this is the completion-rate lever). (2) Copy, immediately: rewrite the message to stop blaming a faceless "listing author", drop "contact support" as the only exit, and give a way back — e.g. "This model isn't set up to take bookings just yet. {browseLink}" with `{browseLink}` = "Browse other models" routing to `/s`. Replace "listing author" with the model's display name if available.
Touches:   src/translations/en.json (CheckoutPage.providerStripeAccountMissingError), src/containers/CheckoutPage/ErrorMessages.js (add browse link), src/containers/ListingPage/* + ListingCard (gate the booking CTA on payout-connected)
Effort:    L (product gate) / S (copy-only interim)
Impact:    Highest on this journey — this is where a ready-to-pay client hits a wall and leaves; even the copy-only interim converts a dead end into a redirect.
---
Status: PENDING
Note:

## RT-20260809-08 — CTA says "Book now" but it's a request the model must accept
Journey:   booking-money-path
Screen:    Model profile → OrderPanel primary CTA
Severity:  friction
Evidence:  src/components/OrderPanel/OrderPanel.js:590-591 → en.json:785 ("OrderPanel.ctaButtonMessageBooking": "Book now"). The form's own submit is "Request to book" (en.json:45, BookingDatesForm.requestToBook) and the live process is request→provider-accept (default-booking).
User view: "The button said 'Book now' so I thought she was booked. Then the next screen calls it a 'request' and later I get told she has to accept. Which is it? If she can say no, don't tell me it's booked."
Proposal:  Align the promise with the mechanic. Change `OrderPanel.ctaButtonMessageBooking` from "Book now" to "Request to book" (matches the form submit and the accept-based process). "Book now" implies instant confirmation the process can't deliver and erodes trust at the money moment.
Touches:   src/translations/en.json (OrderPanel.ctaButtonMessageBooking)
Effort:    S
Impact:    Med-high — sets the correct expectation before payment; prevents the "I thought I'd booked" confusion and post-request support pings.
---
Status: PENDING
Note:

## RT-20260809-09 — The 15% fee is unlabelled and unexplained at the exact moment it matters
Journey:   booking-money-path
Screen:    Booking breakdown (profile estimate + checkout) → customer fee line
Severity:  friction
Evidence:  src/components/OrderBreakdown/LineItemCustomerCommissionMaybe.js:54-57 → en.json:771 ("OrderBreakdown.commission": "{marketplaceName} fee *") + en.json:772 ("commissionFeeNote": "* The fee helps us run this platform and provide the best possible service to you!")
User view: "There's a 'Rogue Talent fee' added on with an asterisk that says it 'helps us run the platform and provide the best service' — generic filler. How much is it, why am I paying it, and is the model getting a cut too?"
Proposal:  This is the money screen — the place to make the fee feel fair and land the core wedge. Name the number and the promise. Rewrite `commissionFeeNote` to: "* A flat 15% booking fee. Your model keeps 100% of their rate — no agency markup." (Optionally show "(15%)" inline in the label so the amount is legible next to the figure.) This turns an unexplained add-on into the brand's differentiator at the decision point.
Touches:   src/translations/en.json (OrderBreakdown.commission, OrderBreakdown.commissionFeeNote)
Effort:    S
Impact:    High — reframes the fee from surprise-cost to fairness signal and reinforces "model keeps 100%" precisely where price sensitivity peaks.
---
Status: PENDING
Note:

## RT-20260809-10 — "You won't be charged yet" without saying when you will be
Journey:   booking-money-path
Screen:    OrderPanel fine print under the submit button
Severity:  friction
Evidence:  src/components/OrderPanel/SubmitFinePrint/SubmitFinePrint.js:27 → en.json:795 ("OrderPanel.youWontBeChargedInfo": "You won't be charged yet")
User view: "'You won't be charged yet.' Yet — so when? When she accepts? Right away? I'm about to enter a card; I want to know exactly what triggers the charge."
Proposal:  Complete the sentence with the actual trigger. Rewrite to: "You won't be charged until {name/your model} accepts. If they decline or don't respond, nothing is taken." (Match the real accept window/behaviour of the live default-booking process.) A one-line expectation here removes the biggest pre-payment hesitation on a request-to-book flow.
Touches:   src/translations/en.json (OrderPanel.youWontBeChargedInfo), src/components/OrderPanel/SubmitFinePrint/SubmitFinePrint.js
Effort:    S
Impact:    Med — reduces card-entry hesitation and "when am I charged?" support contacts.
---
Status: PENDING
Note:

## RT-20260809-11 — Cancellation policy is invisible at the point of paying
Journey:   booking-money-path
Screen:    CheckoutPage / OrderPanel — before card entry
Severity:  friction
Evidence:  No cancellation/refund terms rendered in the booking flow (SubmitFinePrint.js shows only "won't be charged"); the three-tier policy lives only in FAQ/terms per docs/ux-journeys.md §4 and the booking-process design commits.
User view: "I'm committing money for a shoot date. What happens if the shoot falls through — do I get it back? There's nothing here about cancellation before I pay."
Proposal:  Surface the cancellation terms where the money decision is made, not buried in FAQ. Add one line + link near the submit fine print: "Free cancellation up to 72h before the shoot. See {cancellationPolicyLink}." Even while the three-tier logic isn't yet enforced in the transaction process (known gap), showing the policy the marketplace intends to honour builds trust at checkout and sets expectations. Coordinate wording with whatever the process will actually enforce so copy and money never diverge.
Touches:   src/translations/en.json (new OrderPanel cancellation key), src/components/OrderPanel/SubmitFinePrint/SubmitFinePrint.js (render link)
Effort:    S
Impact:    Med — cancellation clarity is a top trust driver on high-value bookings; its absence at checkout is a silent hesitation.
---
Status: PENDING
Note:

## RT-20260809-12 — "Booking start / Booking end" reads oddly for a day-rate shoot
Journey:   booking-money-path
Screen:    Booking breakdown — booking date rows
Severity:  polish
Evidence:  src/translations/en.json:44 ("BookingDatesForm.priceBreakdownTitle": "Booking breakdown"), :768-769 ("OrderBreakdown.bookingStart": "Booking start" / "bookingEnd": "Booking end")
User view: "'Booking start' / 'Booking end' — I'm booking shoot days, not a hotel stay. Minor, but it reads like a rental template."
Proposal:  Light relabel to the domain: "Booking breakdown" → "Your booking"; "Booking start/end" → "Shoot dates" (or "First day"/"Last day"). Cosmetic, but it's the difference between feeling built-for-fashion and feeling like a generic rentals fork. Ranked last on this journey.
Touches:   src/translations/en.json (BookingDatesForm.priceBreakdownTitle, OrderBreakdown.bookingStart, OrderBreakdown.bookingEnd)
Effort:    S
Impact:    Low — brand polish on the breakdown; no completion effect.
---
Status: PENDING
Note:
