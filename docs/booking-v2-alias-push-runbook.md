# booking-v2 → `default-booking` alias push runbook

Ordered steps to publish `ext/transaction-processes/booking-v2` as a new version of the stock
`default-booking` process on the **TEST** marketplace (`ndstealth1-test`) and point the alias so
model-profile listings use it.

- **Marketplace: `ndstealth1-test` only.** There is no live env; do not target one.
- **Approved by Neil** (booking-v2 over the `default-booking` alias, test env).
- Steps are tagged **[NEIL]** (writes to the marketplace via flex-cli — Neil runs these; they are
  money/transaction-process changes) or **[DEV]** (repo/config, already done or safe for the
  developer).
- Flags marked **CONFIRM** are the best-known form; verify the exact value before running.

---

## 0. Preconditions (state of the repo) — [DEV] DONE

- `ext/transaction-processes/booking-v2/process.edn` — 35 transitions / 18 states (+ implicit
  `state/initial`). Validated locally (see step 1).
- `ext/transaction-processes/booking-v2/templates/` — **assembled** (11 stock templates copied
  from `default-booking/templates/`). Every `:template` referenced in `process.edn` has a matching
  directory. Coverage: 11/11, 0 missing.
- Client-side graph (`src/transactions/transactionProcessBooking.js`) already describes the
  booking-v2 state machine.
- Runtime alias wiring (`src/transactions/transaction.js`) uses `default-booking/release-1`.
  See the **Alias & graph.id** note at the bottom — the recommended push keeps `release-1`.

---

## 1. Re-validate the EDN + templates — [DEV] (no marketplace write)

Local describe. Parses the EDN, resolves all `:at` expressions, and prints the full
state/transition table. **No marketplace write, no version created** — safe for the developer to run
any time:

```
cd ext/transaction-processes
flex-cli process --path booking-v2
```

Expect: a States table and a Transitions table listing **35 transitions** and **18 states**
(the describe output also prints `state/initial`, so you'll see 19 rows in the States table).
If it prints an error instead of the tables, stop — the EDN or a template is malformed.

Optional stronger gate (**[NEIL]**, writes a throwaway process — only if you want a server-side
validation beyond the local describe): push to a throwaway process name, which validates against the
API without touching `default-booking`:

```
flex-cli process create --process booking-v2-validation2 --path booking-v2 --marketplace ndstealth1-test
```

(`booking-v2-validation` from the 2026-08-06 run already exists; use a fresh name. flex-cli has no
process delete — a throwaway process is harmless, remove in Console → Build → Transaction processes
if desired.)

---

## 2. Push booking-v2 as a new version of `default-booking` — [NEIL] (marketplace write)

This creates a **new version** of the existing `default-booking` process. It does **not** move any
alias by itself.

```
flex-cli process push --process default-booking --path booking-v2 --marketplace ndstealth1-test
```

- `--process default-booking` — target the existing stock process (must already exist; it does).
- `--path booking-v2` — the directory containing `process.edn` + `templates/`.
- Note the **version number** flex-cli prints on success (e.g. `version 2`). You need it in step 3.
  If you miss it, list versions:

```
flex-cli process list --process default-booking --marketplace ndstealth1-test
```

---

## 3. Point the alias at the new version — [NEIL] (marketplace write)

**Recommended: update the existing `release-1` alias** to the version from step 2. Because every
model-profile listing stores `default-booking/release-1` and `transaction.js` resolves against
`release-1`, this makes all existing + future listings adopt booking-v2 with **no Console change and
no listing migration**.

```
flex-cli process update-alias --process default-booking --alias release-1 --version N --marketplace ndstealth1-test
```

- `--version N` → replace `N` with the version number from step 2. **CONFIRM.**
- `--alias release-1` — the alias model-profile listings already use. **CONFIRM** it is currently
  `release-1` for this marketplace (step 4).

> Do **not** use `create-alias release-2` for this rollout. See the **Alias & graph.id** note — a
> new `release-2` alias would strand existing `release-1` listings, require a Console listing-type
> repoint, and require a `transaction.js` code change (config validation rejects an alias not listed
> in `transaction.js`).

---

## 4. Console step — [NEIL] confirm, likely no change needed

- Listings reference the process by the **alias string** stored in their `publicData`
  (`transactionProcessAlias`), which is a mutable pointer. Updating what `release-1` points at
  (step 3) changes behaviour for every listing on that alias **automatically** — the model-profile
  listing type does **not** need repointing.
- **CONFIRM** the model-profile listing type's transaction process alias is
  `default-booking/release-1` (Console → Build → Listing types → model-profile, or infer from
  `flex-cli process list`). If for any reason it is set to a different alias, update the alias name
  in step 3 to match (and mirror it in `src/transactions/transaction.js`).

---

## 5. Post-push verification checklist — [NEIL]/[DEV]

Marketplace/config:
- `flex-cli process list --process default-booking --marketplace ndstealth1-test` — the new version
  exists and `release-1` points at it.
- The 11 notification templates are attached to the new version (no "template missing" warning on
  push).

App/UI walk (needs the running dev site — https://rogue-talent-production.up.railway.app, the TEST
env). **Playwright is currently down**, so this is a manual walk for now; automate once it's back:
1. Client books a model-profile listing → provider gets the `booking-new-request` email; tx enters
   `preauthorized`.
2. Provider accepts → tx → `accepted`; client gets `booking-accepted-request`.
3. Cancel UI shows the correct options per the two-tier window (≥48h vs `<48h`) — see the booking-v2
   cancel UI (`TransactionPage`). Safety-reason cancels must **not** be persisted (per prior
   decision).
4. Dispute entry point appears in the completed/payout window (customer `transition/dispute`).
5. Check-out / line items / 15% customer fee unchanged.

> **Safety-critical flow — flag for human developer review before real users.** Booking, payments,
> cancellation, and the dispute path are money/user-safety flows. This runbook covers the process
> push only; the end-to-end behavioural checks (steps 2–5 above) and the notification gaps (below)
> need human review before onboarding real users.

---

## 6. Rollback — [NEIL] (marketplace write)

The alias is a pointer; rollback = repoint it at the previous version. Nothing is destroyed by the
push (old versions persist).

1. Find the prior version number:
   ```
   flex-cli process list --process default-booking --marketplace ndstealth1-test
   ```
2. Repoint `release-1` back to it (`M` = the pre-push version, typically `1`):
   ```
   flex-cli process update-alias --process default-booking --alias release-1 --version M --marketplace ndstealth1-test
   ```

In-flight transactions already created against the new version keep their process; only new
transitions/new transactions follow the alias. Rolling back mid-flight can leave transactions on a
version whose transitions differ — prefer resolving in-flight test transactions first, or accept
they may be stuck (test data, low risk).

---

## Alias & graph.id — the one thing to get right

- **Runtime alias resolution does NOT use `graph.id`.** A listing stores
  `transactionProcessAlias` (e.g. `default-booking/release-1`); the client validates that against
  the aliases in `src/transactions/transaction.js` (`configHelpers.js` line ~1036). The
  `graph.id` string in `transactionProcessBooking.js` is **descriptive only**.
- `src/transactions/transaction.js` → `default-booking/release-1` (the real runtime alias).
- `src/transactions/transactionProcessBooking.js` line 119 → `id: 'default-booking/release-2'`
  (**descriptive string, not load-bearing**).
- **Recommended push keeps the alias `release-1`.** So the resulting alias is `release-1`, which
  does **NOT** match the `release-2` string in `graph.id`. This does not break anything (the string
  isn't used for resolution), but it is misleading. **Recommended follow-up [DEV]:** change
  `graph.id` in `transactionProcessBooking.js` from `default-booking/release-2` to
  `default-booking/release-1` so the code is self-consistent. (Not required for the push to work.)
