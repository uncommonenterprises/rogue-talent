# booking-v2 — custom booking process (DESIGN, not yet live)

The custom `default-booking` version from `docs/booking-process-design.md`: 48h accept
window + two-tier cancellation + dispute/no-show path. **Not yet pushed to the real
`default-booking` alias** — do not `flex-cli process push` over the live process without
Neil's go.

**Status (2026-08-06):** the state machine **validated** — pushed to a throwaway process
`booking-v2-validation` on `ndstealth1-test` via `flex-cli process create` and it was
accepted (34 transitions, 18 states, all `:at` expressions valid). Structural gate ✅.

**Still needed before it's the real process:**
- Email templates: the `templates/` dir + new dispute/cancel templates (the notifications
  here reference stock templates repointed to `auto-payout`, plus new ones to author).
- App-side wiring (`transactionProcessBooking.js`, TransactionPage cancel/dispute UI +
  reason picker, alias) — see design doc §6.
- Behavioural checks (§7 items 2–3) need a live test transaction.

**Cleanup:** the throwaway `booking-v2-validation` process is left on `ndstealth1-test`
(flex-cli has no delete; remove it in Console → Build → Transaction processes if desired —
harmless, no transactions use it).
