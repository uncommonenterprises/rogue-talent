# Withdraw request (Q9): process push runbook

Ordered steps to publish the client "withdraw request" transition as a new version of the
`default-booking` process on the **TEST** marketplace (`ndstealth1-test`), and point the alias at it.

- **Marketplace: `ndstealth1-test` only.** There is no live environment; do not target one.
- **Decision:** Neil, chat 01/11/2026, open question 9: "add a client withdraw request before the
  model replies: yes (process change, before launch)". The build is approved; **the push is Neil's
  to run**, because it is a transaction-process (money) change.
- Steps are tagged **[NEIL]** (writes to the marketplace via flex-cli: Neil runs these) or **[DEV]**
  (repo only, already done).
- Flags marked **CONFIRM** are the best-known value; check before running.
- Same style as `docs/booking-v2-alias-push-runbook.md`, which published booking-v2 itself.

---

## What changes

One new transition and one new state in `ext/transaction-processes/booking-v2/process.edn`:

| | |
| --- | --- |
| Transition | `transition/customer-withdraw` |
| Who | the client (`actor.role/customer`) |
| From, to | `state/preauthorized` (Requested) to `state/withdrawn` (new, an end state) |
| Money | `calculate-full-refund` + `stripe-refund-payment`: the card hold is released in full, nothing is charged. Same actions as `decline` and `expire`. |
| Calendar | `decline-booking`: the pending booking is released, so the dates stay open. |
| Email | `notification/booking-withdrawn-request-to-provider`, new template `booking-withdrawn-request` (the model is told the request ended and the client wasn't charged). |

Nothing else in the process changes. Counts after the change: **36 transitions, 19 states**
(`flex-cli` also lists `state/initial`, so the States table shows 20 rows).

The app side is already in the repo and is **safe to deploy before the push**: the "Withdraw request"
button only appears when the API lists `transition/customer-withdraw` as a possible next step for
that booking, so it stays hidden until steps 3 and 4 are done.

---

## 1. Validate the EDN and templates locally - [DEV] DONE (no marketplace write)

```
cd ext/transaction-processes
flex-cli process --path booking-v2
```

Result on 01/11/2026: States table with 20 rows (19 + `state/initial`), Transitions table with
36 rows including `transition/customer-withdraw  state/preauthorized  state/withdrawn  Customer`,
and the new notification listed against template `booking-withdrawn-request`. No errors.

Every `:template` in `process.edn` has a matching folder in `booking-v2/templates/` (20 templates,
0 missing).

---

## 2. Optional stronger check - [NEIL] (writes a throwaway process)

Validates the process against the API without touching `default-booking`. Only if you want more
than the local check:

```
flex-cli process create --process booking-v2-withdraw-validation --path booking-v2 --marketplace ndstealth1-test
```

flex-cli has no delete; the throwaway process is harmless (no listing uses it). Remove it in
Console > Build > Transaction processes if you like.

---

## 3. Push a new version of `default-booking` - [NEIL] (marketplace write)

Before pushing, note the version `release-1` points at today, for rollback:

```
flex-cli process list --process default-booking --marketplace ndstealth1-test
```

**CONFIRM:** `release-1` should point at **version 3** (booking-v2 as pushed earlier). Write the
number down; it is `M` in the rollback step.

Then push:

```
flex-cli process push --process default-booking --path booking-v2 --marketplace ndstealth1-test
```

This creates a new version only. It does not move any alias by itself, so nothing changes for
users yet. Note the version number it prints (**expected 4, CONFIRM**). That is `N` below.

---

## 4. Point the alias at the new version - [NEIL] (marketplace write)

```
flex-cli process update-alias --process default-booking --alias release-1 --version N --marketplace ndstealth1-test
```

- Replace `N` with the version from step 3. **CONFIRM.**
- Keep the alias `release-1`. Every model profile listing and `src/transactions/transaction.js`
  use it, so no Console change and no code change is needed.

---

## 5. Email wording - [NEIL] optional, Console

The new email works as soon as the version is live: it carries its own English wording as the
fallback for each line. If you want to edit the wording without a push, add these keys in Console >
Build > Content > Email texts:

- `BookingWithdrawnRequest.Subject`
- `BookingWithdrawnRequest.Title`
- `BookingWithdrawnRequest.ContentForDaily` (also `ContentForHourly`, `ContentForNightly`)
- `BookingWithdrawnRequest.ButtonCta`

---

## 6. Check it works - [NEIL] (test marketplace, test card)

Only bookings **created after step 4** can be withdrawn. A booking keeps the process version it was
created on, so existing test requests will not show the button.

1. As the test client (Ben), send a new request to a test model with the Stripe test card.
2. On the request page ("Request sent to ..."), "Withdraw request" now shows under the actions.
   Choose it, read the confirmation ("Withdraw this request?"), and confirm.
3. The page now shows **Cancelled** with "You withdrew this request. Not charged."
4. Stripe test dashboard: the payment for that booking shows as cancelled (the hold released),
   not captured and not refunded after capture.
5. The model gets the "A booking request was withdrawn" email. Their booking requests list shows the
   row as **Cancelled** with "Withdrawn by the client. Not charged."
6. The model's calendar for those dates is open again (try requesting the same dates).
7. Regression: a new request can still be accepted and declined by the model, and still expires on
   its own if nobody replies.

---

## 7. Rollback - [NEIL] (marketplace write)

The alias is a pointer; nothing is deleted by the push.

```
flex-cli process update-alias --process default-booking --alias release-1 --version M --marketplace ndstealth1-test
```

`M` is the version you noted in step 3 (expected 3). Bookings already created on version `N` stay
on it (test data, low risk). The app copes either way: with the old version the withdraw button
simply doesn't appear.

---

> **Money flow: flag for human developer review before real users.** Withdraw releases a card
> hold. It uses the same Stripe actions as decline and expiry, but the end-to-end check (step 6,
> point 4 in particular) has to be done on the test marketplace before launch.
