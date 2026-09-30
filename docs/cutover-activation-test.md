# Cutover activation checklist — TEST first (2026-09-24, Day 6)

Neil decided (D1+D2) to launch with **both** dormant systems live: **client-ID verification (SAF-03)**
and the **account-status lifecycle**. Both are built + fail-safe; this activates them. Do it ALL on
`ndstealth1-test` first, verify, pass the human review, then repeat on live (`live-launch-runbook.md`).

Legend: **[N]** = Neil (marketplace/Stripe/Railway writes). **[PM]** = I verify. Secrets → Railway/.env
only, never chat.

> **PROGRESS (2026-09-24 EOD):** Stage 0 ✅ (Integration creds added to Railway). Stage A IN PROGRESS —
> Stripe Identity enabled, but **blocked on Stripe's required "Verify your identity" (account-owner)
> step — Neil needs his passport**. RESUME HERE tomorrow: complete "Get verified" → enable Synthetic
> Identity Protection → grab the secret key + register the Identity webhook → add the 3 Railway vars →
> PM verifies. Then Stages B/C/D.
>
> **UPDATE 29/09 (Day 8):** Neil completed Stripe's "Verify your identity" (Identity application +
> business details + account-owner verification all ticked). Stage A resumes at: Synthetic Identity
> Protection -> TEST-mode secret key + restricted key + Identity webhook -> Railway vars -> PM verifies.
>
> **UPDATE 29/09 later:** Stage A PROVISIONED on test. Synthetic Identity Protection already on; branding
> already applied; STRIPE_SECRET_KEY, STRIPE_IDENTITY_RESTRICTED_KEY, STRIPE_IDENTITY_WEBHOOK_SECRET,
> REACT_APP_IDENTITY_VERIFICATION_ENABLED on the Rogue Talent Railway service (first added to the
> CreatorOS project by mistake, then moved; removed from CreatorOS). PM-verified from outside: webhook
> rejects unsigned calls (400 = secret loaded); create-identity-session passes its config check (secret
> key loaded). Remaining: logged-in end-to-end test as a test client (Neil drives, PM guides).
> Housekeeping: roll the sandbox sk_test key (it appeared in a screenshot), delete the unused old
> "Restricted key".

---

## Stage 0 — Shared foundation
- **[N] Integration API creds on Railway** — `SHARETRIBE_INTEGRATION_CLIENT_ID` + `_SECRET`
  (Console → Advanced → Applications → Integration API; create one if none). These power the reconcile,
  the booking gate, the nudge sweep, the client-ID write-back, SAF-14 and SAF-29's durable record.
  **Check first — these may already be set** (SAF-14/SAF-29 needed them). If present, Stage 0 is done.
- Postmark (`POSTMARK_SERVER_TOKEN`) — already live ✅.

## Stage A — Client-ID verification (SAF-03)
- **[N] Stripe Dashboard (TEST mode):** enable **Identity**; register a webhook at
  `https://rogue-talent-production.up.railway.app/api/stripe-identity-webhook` for events
  `identity.verification_session.verified`, `.requires_input`, `.redacted`.
- **[N] Stripe Dashboard (TEST): create a RESTRICTED key** with only Identity "Verification Results" and "Recent Detailed Verification Results" = Read (Stripe only releases the verified date of birth to a restricted key). Add to Railway as `STRIPE_IDENTITY_RESTRICTED_KEY`. **Without it no client can become verified** (the 18+ check fails closed - RT-FB-03, merged 28/09).
- **[N] Railway env vars:** `STRIPE_SECRET_KEY` (`sk_test_…`), `STRIPE_IDENTITY_WEBHOOK_SECRET`
  (`whsec_…`), `REACT_APP_IDENTITY_VERIFICATION_ENABLED=true`. Redeploy.
- **[PM] Verify:** the `/verify-identity` page runs; a client can't book until verified; the boolean
  writes back (Stripe test-mode document flow — no real ID). The booking gate flips from fail-open to
  active.

## Stage B — Account-status lifecycle cutover
- **[N] Stripe Dashboard (TEST):** register a **Connect `account.updated`** webhook at
  `https://rogue-talent-production.up.railway.app/api/stripe-connect-webhook`; put its signing secret in
  Railway as `STRIPE_CONNECT_WEBHOOK_SECRET`.
- **[PM] Before the flag: confirm the model 18+ data exists.** Log in as a test model with completed Stripe and check (presence only, never read the value) that `stripeAccountData.individual.dob` + `individual.verification.status` come through Sharetribe. If yes, merge branch `rt-fb-03-verified-id-age-check` commit `74e480c9a` (model 18+ gate). When merging, also call `sendSafeguardingAlert` (server/api-util/safeguardingAlert.js) on the model under-18 path, with userType 'model' and source 'Stripe Connect (model KYC)', so model flags email safety@ like client flags do. If no, don't merge it; fetch the Connect account directly from Stripe instead (follow-up).
- **[N] Console → Build → General → Access control:** turn **listing-approval ON** (so a submitted model
  profile lands in `pendingApproval` / hidden, and the reconcile publishes it only when Verified).
- **[N] Railway env vars:** `REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED=true`, and `CRON_SECRET`
  (`openssl rand -hex 32`) for the verify-nudge endpoint. Redeploy.
- **[N] Schedule the nudge cron:** a daily `POST` to `/api/cron/verify-nudge` with header
  `X-Cron-Secret: <CRON_SECRET>` (Railway scheduled job or external). Test first with `?dryRun=true`.
- **[N] Console → Access control: keep "approve users who want to join" OFF** (amendment 30/09: Gate A is the
  operator-set metadata `reviewDecision`, not the user state; turning user approval on would block models
  from building profiles). Requires the review-decision build (branch `feature/gate-a-review-decision`)
  to be merged first.
- **[N] Before the flag: approve the existing test accounts you still want to use.** With the flag on,
  every server gate requires `reviewDecision: "approved"`, so any account without it reads as Pending: it
  can't book, can't be booked, and a published model profile is hidden on the next reconcile. Set
  `{"reviewDecision": "approved"}` (see the operator steps below) on each test model and client that should
  keep working. The first decision-email run will then email those accounts "approved" (fine on test; run
  it with `?dryRun=true` first to see the count).
- **[N] Schedule the decision-email cron** (same `CRON_SECRET`): **every 10 minutes**, a `POST` to
  `https://rogue-talent-production.up.railway.app/api/cron/review-decision-emails` with header
  `X-Cron-Secret: <CRON_SECRET>`. Test first with `?dryRun=true` (it reports how many approved / declined
  emails are owed and sends nothing). It stays dormant (`configured: false`) until the flag, the Integration
  creds, Postmark and `CRON_SECRET` are all set.

### Operator steps: approving or declining an account (Console, after the flag is on)
Console → Users → open the user → edit the user's **extended data**:
- **Approve:** Metadata → `{"reviewDecision": "approved"}`.
- **Decline:** first (optional) add the note the user will see, under **Private data** →
  `{"rejectionReason": "Two portfolio photos are blurry. Please replace them."}`; then Metadata →
  `{"reviewDecision": "declined"}`. Add the note BEFORE the decision: the email job runs every 10 minutes and
  quotes whatever note is there when it sends.
- Values are exact and lower case (`approved` / `declined`); anything else counts as no decision. Leave
  `reviewDecisionEmailed` alone (the email job manages it). Keep other existing metadata keys as they are.
- The user gets the matching email within about 10 minutes, once. Changing the decision sends the new email.
- A declined user resubmits themselves (model: "Resubmit for approval" on their status page; client:
  submitting their business details again). That clears the decision and the note, and they show as Pending.
- To remove a bad actor, use **Ban** (Suspended) as before; that is separate from a review decline.

- **[PM] Verify end-to-end:** model submits without Stripe → lands hidden (pendingApproval); operator
  sets metadata `{"reviewDecision": "approved"}` on the user → shows **Approved** + approval email sent
  (once; a second cron run sends nothing);
  decline with `"declined"` + private note → "Not approved" screen shows the note, the decline email quotes it;
  resubmit returns to Pending; model completes Stripe → reconcile **publishes** the listing →
  **Verified** + discoverable/bookable; a non-Verified model is not in search + booking is refused;
  **an active, Stripe-verified model with no decision stays hidden and can't be booked; an identity-verified
  client with no decision can't book** (checkout says the account needs to be approved);
  verify-nudge dry-run classifies Approved-unverified accounts correctly (only accounts with
  `reviewDecision: "approved"`); decision-email dry-run counts match what was set.

## Stage C — Copy + gates that depend on the above
- **[N] Console copy — Bucket B (verification wording):** now that client-ID is live, apply the held
  Bucket B lines from `docs/console-copy-corrections-2026-09-22.md` (the "clients are identity-verified"
  wording is now true).
- **[N] Console — `ListingApproved` email:** it now fires (listing-approval on) — the terminology tweak
  is already in; confirm it reads right on the first real approval.

## Stage D — Human review (GATE, before real users)
- Human dev review of the safety-critical flows per `docs/pre-launch-human-review.md` — especially the
  reconcile/visibility engine, the provider-Verified booking gate, and the client-ID webhook. This gates
  **live**, not the test verification — but do it before onboarding real models.

---

## Notes
- Everything is fail-safe: if a cred is missing the feature stays inactive (no crash), so partial
  provisioning won't break the test site — it just won't activate until complete.
- Residual-risk #1 (Connect webhook acct→model mapping) is already fixed (durable `publicData.stripeAccountId`
  stamp) — see the step-2 spec.
- Order matters in Stage B: listing-approval ON + reconcile creds must both be in place before the flag,
  or a submitted profile could sit hidden with nothing to publish it. Approve the test accounts you still
  need (metadata `reviewDecision`) before the flag too. Flag last.
