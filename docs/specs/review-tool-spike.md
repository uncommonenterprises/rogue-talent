# Review tool - feasibility spike (Developer, 04/11/2026)

Status: **SPIKE / findings only.** No code, no commits to `src/` or `server/`, no marketplace writes.
Origin: Neil approved an in-site review tool on 04/11/2026 (`docs/team-decision-log.md:117`).
Reads: the repo at `86fcd867c`, the Sharetribe Integration API reference, Sharetribe docs and help
centre, and the Stripe API reference. Everything below targets `ndstealth1-test` only.

---

## 0. Headline answers (for the PM)

1. **Reviewers:** use operator-only user **metadata** `roles: ["reviewer"]` for reviewers, and an
   **env var allow-list** (`REVIEW_ADMIN_USER_IDS`) for admins (Neil to start). No third user type.
   Reviewer accounts are dedicated staff accounts of type `client` that are never approved as a
   client. A small in-site Team page is worth building (stage 3), but Console is a fine stopgap.
2. **Transaction rights: yes, the server can grant and revoke them.** The Integration API has
   `POST /users/update_permissions` with `initiateTransactions: "permission/allow" | "permission/deny"`,
   and our installed SDK (1.14.0) supports it. **Recommendation: keep the Console restriction ON** and
   have the server grant it on client approval. The claim that the server gates alone are enough is
   **not true**: enquiries go straight from the browser to Sharetribe and never reach our gates (see §2.3).
3. **Queue:** scan via the Integration API (models: `listings/query` in pendingApproval/closed/published
   with the author included; clients: `users/query?pub_userType=client`), filter in memory for "no
   decision". A server-written `metadata.reviewQueuedAt` stamp gives a tamper-proof "oldest first".
   A handful of API calls at launch volume.
4. **The sign-up email Neil saw is not sent by our code.** No server path emails anyone on sign-up or
   profile submission, and Sharetribe has no built-in operator email. Most likely it was the test
   model's own Sharetribe email (VerifyEmail / UserJoined) landing in Neil's inbox via a `hi+...`
   plus-address, or a Zapier zap. Neil can confirm in 10 seconds from the email's To/From (§4.1).
   Reviewer emails: a new sweep folded into the existing 10-minute cron, one batched email per run,
   sent to every user with the reviewer role (optional shared-inbox override).
5. **Writing decisions:** one `users/update_profile` call writes the decision, audit fields and the
   decline note together. Top-level merge means other metadata keys are untouched. The decision email
   job keeps working unchanged.
6. **Pending profiles:** the server fetches them via Integration API `listings/show` (any state, images
   included) and returns a trimmed copy; the page renders it read-only with the same section components
   the public profile uses. Clients get an account/business card instead.
7. **Two existing safety gaps found** while checking the gates (not caused by this build, but they
   decide the transaction-rights answer and must reach the PM now): the "book after an enquiry" path
   skips every server booking gate (§2.4), and the client gate lets through any account whose
   `userType` is not exactly `client` (§2.5).
8. **Build:** 3 stages, roughly M + M + S/M. Safety-critical: goes on the human developer review list.

---

## 1. Reviewer permissions

### 1.1 Where can a role safely live?
Sharetribe's extended data rules decide this (https://www.sharetribe.com/docs/references/extended-data/):

- Public / protected / private data are **writable by the user themselves**: "Authenticated users are
  able to modify their own public, protected and private extended data"
  (https://www.sharetribe.com/docs/concepts/extended-data/user-extended-data/). **A role kept there could
  be self-granted. Ruled out.**
- Metadata: "Metadata is writable by marketplace operators and can be read via all API endpoints
  returning the corresponding resource." So it is **tamper-proof but publicly readable** (the
  Marketplace API reference describes `profile.metadata` as "User's public metadata").

So the only per-user, tamper-proof store Sharetribe gives us is metadata, and it is public. The
existing Gate A already relies on this (`server/api-util/reviewDecision.js:11-13`).

### 1.2 Options compared

| Option | Add / remove a reviewer | Tamper-proof | Private | Verdict |
|---|---|---|---|---|
| A. Metadata `roles: ["reviewer"]` | Console metadata edit, or an admin Team page (server writes) | Yes (operator-only write) | No: anyone who knows the user id can read it | **Use for reviewers** |
| B. Env var list of user ids | Railway edit + redeploy (~5 min), Railway access needed | Yes | Yes | **Use for admins only** (rarely changes) |
| C. privateData / protectedData flag | - | **No, user can self-grant** | - | Never |
| D. Own datastore | - | Yes | Yes | We have none; out of scope |

**Recommendation (hybrid):**
- **Admins** = `REVIEW_ADMIN_USER_IDS` (comma-separated Sharetribe user UUIDs, Railway env only; not
  secret, but keeping it out of the public repo avoids naming staff accounts). This is the bootstrap:
  Neil creates his staff account, reads its UUID from Console, sets the var. Because admin cannot be
  granted through the website at all, a compromised reviewer account cannot escalate itself.
- **Reviewers** = `metadata.roles` contains `"reviewer"`. Admins add/remove via the Team page; the
  documented Console fallback is `{"roles": ["reviewer"]}`. Removing the role takes effect on the
  reviewer's very next request (no caching; see 1.4).
- Admins can do everything a reviewer can, plus the Team page.

**Is the Team page worth it?** Yes, as stage 3, because it moves "add a reviewer" off Neil and out
of Console (charter: reduce Neil's operational load). It is small: list reviewers, "add by email",
remove. Caveat: `users/query` has no email filter (its parameters are only `createdAtStart`,
`createdAtEnd`, `meta_*`, `priv_*`, `prot_*`, `pub_*`, `sort`;
https://www.sharetribe.com/api-reference/integration.html#query-users), so "add by email" is a server
scan of users matched in memory. Fine at launch volume. Until stage 3 ships, Console is the fallback.

### 1.3 What user type should a reviewer account be?
**Do not add a third user type.** Reasons, with evidence:
- It **would appear on the sign-up page**: the sign-up form builds its choices from
  `config.user.userTypes` (`src/containers/AuthenticationPage/AuthenticationPage.js:280`), which comes
  from the Console user types (`config/assets/user-types.json`, currently `model` and `client`).
- It would **fall through our gates**: the client booking gate only gates `userType === 'client'` and
  lets any other non-empty type through (`server/api-util/clientIdentityGate.js:122-124`); the decision
  email job skips anyone who is not model/client (`server/api-util/decisionEmails.js:104-107`). A
  third type is an untested path through safety code.

**Recommended:** reviewers sign up normally as **`client`**, on a dedicated staff account (e.g. a
`@roguetalent.co` address), and are **never approved as a client** (no `reviewDecision`, no
transaction rights). That makes the account inert as a buyer: the client gate refuses it
(`clientIdentityGate.js:128-135`) and Sharetribe refuses `transactions/initiate` with 403 while
transaction rights are denied. `client` rather than `model` because a model account is pushed into
building a public listing (post-sign-up redirect to `/l/new`) and has posting rights; a client has no
public listing at all. Small UX follow-up: the client "business details" redirects
(`src/util/clientBusinessDetails.js:45-46`) should skip role holders, and the sign-up form will ask for
a company name (required, `src/config/configUser.js:54-70`): staff enter "Rogue Talent".

### 1.4 Does a reviewer role on a real client account create risk?
Yes. Recommend a rule, enforced by the Team page server code, that **roles are only granted to staff
accounts that have no review decision and no transactions**:
- **Self-approval / conflict of interest:** a reviewer approving their own account, a colleague's
  business, or a competitor. The decision endpoint must refuse `targetUserId === reviewerUserId`.
- **Off-platform contact:** reviewers see personal data (emails, phone, business address, portfolio)
  that a client account could then use to contact models directly, bypassing fees and safety.
- **Blast radius:** a compromised everyday client login would also hold review powers and data access.
- **Public flag:** `roles` in metadata is readable by anyone holding the user id. On a staff account
  that never transacts, the id is not discoverable; on an active client account it is shown to every
  model they message.

### 1.5 Every check server-side
Each review endpoint resolves the caller from the request's own session token
(`getSdk(req, res).currentUser.show()`, the pattern in `server/api/resubmit-for-review.js`), then
checks `metadata.roles` (tamper-proof) or the admin env list, **on every request**. No user id is
accepted from the browser for "who am I". The frontend may hide links for non-reviewers, but that is
cosmetic. Non-reviewers get 404 (not 403) so the tool's existence is not advertised. Additional
checks: caller not banned; caller is not the target; state-changing calls are POST only, require the
transit/JSON content type and an `Origin` matching `REACT_APP_MARKETPLACE_ROOT_URL` (CSRF belt and
braces; the existing endpoints rely on content type alone).

---

## 2. Transaction rights

### 2.1 Can the server grant/revoke them? Yes.
Integration API reference, "Update permissions"
(https://www.sharetribe.com/api-reference/integration.html#update-permissions):

> `POST /v1/integration_api/users/update_permissions`
> body: `"id"`, `"postListings": "permission/allow"`, `"initiateTransactions": "permission/deny"`
> SDK: `integrationSdk.users.updatePermissions({ id, ... })`

and from the user resource docs: "For each permission the possible values are `"permission/allow"`
and `"permission/deny"`." and "initiateTransactions - User's permission to initiate transactions. If the
permission is denied for the user, the endpoint `POST /transactions/initiate` responds with 403."
Also: "The permissions attribute reflects the user's provisional permissions, which may be modified by
other factors such as global settings. The user's final permissions ... can be obtained via the
effectivePermissionSet relationship." The changelog dates the endpoint: "2024-10-08 ... New
Integration API endpoint `/users/update_permissions`"
(https://www.sharetribe.com/api-reference/changelog.html).

Our dependency supports it: `sharetribe-flex-integration-sdk` 1.14.0 (`package.json:57`) defines
`users/update_permissions` (`node_modules/sharetribe-flex-integration-sdk/src/integration_sdk.js:155-160`).
The review page can show the current state via `users/show` with `include: ['effectivePermissionSet']`.

### 2.2 Recommendation: keep the Console restriction ON; the server grants on approval
Order the two writes so that a partial failure always leaves the safer state:
- **Approve client:** write `reviewDecision: approved` first, then `initiateTransactions: allow`. If the
  second call fails, the client is approved but still cannot book: show "approved, booking rights not
  granted - retry" with a retry button.
- **Decline (or change approved to declined):** revoke `initiateTransactions: deny` first, then write
  the decision.
- **Models:** no permission change (they never initiate).

Side effect to handle: Sharetribe's built-in **UserPermissionsChanged** email is sent "after a user's
access control permission gets updated" to "users whose permission gets updated", and is listed as one
that can be disabled ("Console > Advanced > Email notifications", "clicking the 3 dots and Disable")
(https://www.sharetribe.com/help/en/articles/10067899-built-in-email-notifications). With the server
granting rights, a client would get that email AND our approval email. **Neil action (Console):
disable "User permissions changed"** once the tool is live. Not yet verified whether an Integration
API permission change triggers it (the help text does not distinguish Console vs API); check on test.

### 2.3 "The server gates already require reviewDecision === 'approved'" - checked, only partly true
True for the **direct booking request** path:
- `transition/request-payment` is privileged (`ext/transaction-processes/booking-v2/process.edn:7-15`,
  `:privileged? true`), so it can only go through our `/api/initiate-privileged`, which runs the client
  gate (`server/api/initiate-privileged.js:93-96`). With the flag on, the client gate refuses anyone
  without `reviewDecision === 'approved'` (`server/api-util/clientIdentityGate.js:98-135`), and the
  provider gate does the same for the model (`server/api-util/providerVerifiedGate.js:136-146`).

**Not true for enquiries:**
- `transition/inquire` is an initial customer transition with **no privileged action**
  (`process.edn:3-6`), and the web app starts it **straight from the browser to the Marketplace API**
  (`src/containers/ListingPage/ListingPage.duck.js:246-252`, `sdk.transactions.initiate`). Our server
  never sees it. The only thing stopping an unapproved, unverified client from opening an enquiry and
  messaging a model is Sharetribe's `initiateTransactions` permission, i.e. the Console restriction.

So **turning the restriction off would let any signed-up client message any visible model before we
have reviewed them.** That is a user-safety regression. Keep it on.

### 2.4 EXISTING GAP (flag to PM now): "book after an enquiry" skips every server gate
- After an enquiry, the checkout uses `transition/request-payment-after-inquiry`
  (`src/containers/CheckoutPage/CheckoutPageTransactionHelpers.js:226-237`), which is privileged
  (`process.edn:16-25`) and is sent to **`/api/transition-privileged`**
  (`src/containers/CheckoutPage/CheckoutPage.duck.js:72-74`).
- `server/api/transition-privileged.js` imports only line items, negotiation helpers and the SDK
  (`:1-18`): **no client gate (Gate A + SAF-03 ID + 18+), no provider-Verified gate, no SAF-14
  residence boundary.**
- Effect today: any client who **has** transaction rights (granted at approval, before they finish
  Stripe Identity) can enquire, then pay, and skip the identity check and the residence boundary.
  The Console restriction does not help here, because by then they hold the permission.
- This is outside the review-tool scope, but it is safety-critical and affects the same decision.
  Suggested fix (separate task, needs PM/Neil sign-off as a safety change): run the same three gates in
  `transition-privileged.js` when the transition is `request-payment-after-inquiry`, or remove the
  enquiry path from the model-profile listing type. Add to `docs/pre-launch-human-review.md`.

### 2.5 EXISTING GAP (verify on test): the client gate trusts a user-writable `userType`
`clientIdentityGate.js:122-124` returns "allowed" for any account whose `publicData.userType` is set and
is not `client`. `publicData` is user-writable (§1.1). I could not find Sharetribe documentation saying
`userType` is protected from self-edits. If it is not, a client could rewrite their own `userType` and
skip Gate A + SAF-03 on `initiate-privileged`. Today the Console transaction-rights restriction stops an
unapproved client reaching that point; an approved-but-unverified client is not stopped. **Test on
`ndstealth1-test` with a throwaway client** (a self-update via the Marketplace API; it is a marketplace
write, so it needs PM go-ahead, which is why I did not run it). Safer code either way: gate on "is not
a model" rather than "is a client", and treat unknown types as clients.

---

## 3. Listing pending submissions (the queue)

### 3.1 What "submitted, no decision yet" means in our data
- **Model:** their `model-profile` listing is past draft. The frontend treats `pendingApproval` and
  `published` as submitted (`src/util/accountStatus.js:140-165`); decision = `metadata.reviewDecision`.
- **Client:** `privateData.businessDetailsSubmittedAt` is set (`src/util/clientBusinessDetails.js:22`,
  `:31-35`), written by the client on screen 18
  (`src/containers/BusinessDetailsPage/BusinessDetailsPage.helpers.js:196`).
- **Declined then resubmitted:** both resubmit paths (model status page; client business details)
  call `POST /api/resubmit-for-review`, which clears `reviewDecision`, `reviewDecisionEmailed` and
  `rejectionReason` (`server/api-util/resubmitForReview.js:60-67`). So a resubmission simply reappears
  as "no decision" with no special handling.

### 3.2 Queries
- **Models:** `integrationSdk.listings.query({ pub_listingType: 'model-profile', states:
  'pendingApproval,closed,published', include: ['author'], perPage: 100 })`, paged. `listingType` is an
  indexed public enum (`config/assets/SEARCH-SCHEMA.snapshot.txt`), and `states` is "List of one or more
  states to filter the results by" (Integration API, Query listings). Keep rows whose author has no
  decision and is not banned/deleted. `closed` is needed because a model who was published, then
  declined (the reconcile closes the listing, `server/api-util/modelVisibility.js:238-252`), then
  resubmitted, has a closed listing. `published` + no decision should not exist with the flag on; show
  it flagged as an anomaly rather than hide it.
- **Clients:** `integrationSdk.users.query({ pub_userType: 'client', perPage: 100 })`, paged
  (`userType` is indexed: `SEARCH-SCHEMA.snapshot.txt`, `userProfile public userType enum`). Keep rows
  with `businessDetailsSubmittedAt` set, no decision, not banned/deleted, no staff role. The Integration
  API returns `privateData` (example response in the Show user section).
- **Why not filter on metadata in the query?** `meta_*` filters only work "when extended data schema is
  defined for the attribute", and the documented semantics have no "key is missing" filter. Adding a
  schema is a `flex-cli search set` marketplace write (Neil). Later optimisation, if volume grows: have
  the server write `metadata.reviewStatus: 'pending'` and register an enum schema, then query
  `meta_reviewStatus=pending` directly.

### 3.3 Oldest first
Neither record carries a trustworthy "submitted at": models have no timestamp for the draft to
pendingApproval move, and the client's `businessDetailsSubmittedAt` is user-writable. Recommend a
**server stamp `metadata.reviewQueuedAt`**, written by the reviewer-notification sweep (§4.2) the first
time it sees an item, and cleared by the resubmit endpoint (one extra `null` key in
`buildResubmitUpdate`) so a resubmission is re-stamped and re-notified. Sort ascending by
`reviewQueuedAt`; fall back to `businessDetailsSubmittedAt` / listing `createdAt` for anything not yet
stamped (at most 10 minutes old).

The events feed is not a substitute: "Sharetribe maintains a history of all marketplace events for 90
days in live marketplaces and for 7 days in dev and test" (Integration API, Query events).

### 3.4 Pagination and rate limits
- Page size: "The default page size is 100." With filters, a page cap applies only "when the total
  number of users that match the query criteria exceeds 10,000" (`paginationLimit` in `meta`); partition
  by `createdAtStart`/`createdAtEnd` if we ever get there. The existing sweep also bounds itself at 100
  pages (`decisionEmails.js:64`).
- Rate limits (Integration API, Rate limits): dev and test, "All query endpoints (GET) ... 1 request per
  second (60 requests per minute) on average" and "All command endpoints (POST) ... 1 request per 2
  seconds (30 requests per minute) on average", per client IP, with burst allowance; all environments:
  "Concurrent requests limited to 10". Rejections return 429. The per-IP rate rows are dev/test only.
- Budget: a queue load at 1,000 users is about 10-20 GETs. All our Integration calls (decision sweep,
  nudge, booking gates, reconcile, this tool) share one Railway IP and bucket, so: run sequentially,
  never in parallel; cache the queue for ~30 seconds; on 429 show "busy, retry" and never partially
  write.

---

## 4. The sign-up email and the reviewer email

### 4.1 What sent the email Neil received
- **Not our server.** The only code that sends mail is `decisionEmails.js:382` (to the user, on a
  decision), `verifyNudge.js:428` (to approved-unverified users), `safeguardingAlert.js:63` (under-18
  flag, to `safety@`), and `server/api/safety-report.js:124` (safety report, to `safety@`). Nothing
  fires on sign-up or on profile submission.
- **Not a Sharetribe operator email.** The built-in list is VerifyEmail, UserJoined, NewMessage,
  VerifyChangedEmail, EmailChanged, ResetPassword, PasswordChanged, ListingApproved, UserApproved,
  UserPermissionsChanged, all sent to the user concerned, none to the operator
  (https://www.sharetribe.com/help/en/articles/10067899-built-in-email-notifications). Sharetribe's own
  answer for operator alerts is Zapier
  (https://www.sharetribe.com/help/en/articles/8904975-zapier-tutorial-email-notifications-for-admins-for-listings-pending-approval).
- **Most likely:** the test model signed up with a plus-address of Neil's inbox (team convention,
  e.g. `hi+testmodel01@...`, `docs/Rogue_Talent_Agent_Autonomy_Setup.md:111`), so Sharetribe's
  **VerifyEmail / UserJoined** email to the model landed with Neil. Second possibility: a Zapier zap
  (the autonomy doc says Zapier credentials exist, `:62`). **To confirm (Neil, 10 seconds):** if the
  email's To is a `hi+...` address and it is "Verify your email" / "Welcome", it was the model's own
  email; if it came from Zapier, the zap should be switched off once the reviewer email exists.

### 4.2 Recommended reviewer email
- **Mechanism:** a new sweep, `runReviewQueueNotifications`, called from the existing protected
  `POST /api/cron/review-decision-emails` endpoint (same `CRON_SECRET`, same 10-minute cron-job.org job,
  so no new job for Neil; `server/apiRouter.js:93`). It finds submitted, undecided, not-yet-stamped
  items (§3.2), sends **one batched email per run** ("2 new model profiles and 1 new client to review"),
  then stamps `metadata.reviewQueuedAt` on each. Send-then-stamp, like the decision job; a stamp failure
  means at most one repeat notification, logged.
- **Deep link:** `${REACT_APP_MARKETPLACE_ROOT_URL}/review/<userId>` per item plus a link to `/review`.
  The route is `auth: true`, so a logged-out reviewer is sent to log in and returned. The link carries
  no token and only opens a page; nothing is written until a logged-in reviewer presses a button (§5).
- **Content:** no personal data in the email beyond the account type and display name (the link
  needs a login to show anything). Plain text, `no-reply@` via Postmark (`mailer.js:46`).
- **Recipients - recommendation: every user holding the reviewer role**, resolved from the same user
  scan, with an optional `REVIEW_NOTIFY_EMAIL` env override for a shared inbox. One place to manage
  (removing the role also stops the emails), which matches "easy to add and remove". Trade-off: with
  several reviewers everyone gets every alert; if that becomes noisy, switch to a shared inbox via the
  env var with no code change.
- **Dependency:** the Postmark server was in Test / pending-approval mode, which only delivers
  on-domain (`docs/team-decision-log.md:85`). Reviewers on non-`roguetalent.co` addresses need Postmark
  approval first.

---

## 5. Writing the decision

### 5.1 Merge semantics (why other keys are safe)
Integration API, Update user profile: "The given `publicData` object is merged with the existing user
`publicData` on the top level (i.e. non-deep merge). Nested values are set as given. Top-level keys
that have value `null` are removed", and the same for `protectedData`, `privateData` and `metadata`
(each up to 50KB). So a write naming only our keys leaves `reviewDecisionEmailed`, `identity_verified`,
`age_verified_18plus`, `age_check_failed`, `age_checked_at` (`stripeIdentity.js:91-96`) and `id_verified`
untouched. The resubmit write already relies on this (`resubmitForReview.js:60-67`).

### 5.2 The payload (one call, built by a pure, unit-tested function)
```
users.updateProfile({
  id: targetUserId,
  metadata: {
    reviewDecision: 'approved' | 'declined',
    reviewedAt: <ISO now>,
    reviewedBy: <reviewer user UUID>,
    reviewLog: [...previous, { decision, at, by }].slice(-20)
  },
  privateData: { rejectionReason: <trimmed note, max 1000 chars> | null }   // null on approve
})
```
- Decision and note in **one** call removes today's ordering hazard ("Add the note BEFORE the
  decision", `docs/cutover-activation-test.md:89-90`).
- Note length: the email job already truncates at 1000 (`decisionEmails.js:65`, `:118-125`); cap the
  form at 1000 too.
- `reviewLog` keeps decisions only, **never the note**, because metadata is public.
- **Audit is public too.** `reviewedBy` is a UUID; it only becomes a name if someone looks the
  account up. Staff accounts should use a generic display name (e.g. "Rogue Talent team") so a
  declined user cannot find out who declined them. If Neil wants it stronger, store an HMAC of the
  reviewer id instead (needs one more env secret). The real "who" for admins is resolved server-side
  (Integration API returns the reviewer's email).
- `privateData` is user-writable, so the subject can edit or delete `rejectionReason` after the
  decision; acceptable (it only affects what they see themselves). Do not put audit data there.

### 5.3 Safety rules for the decision endpoint (`POST /api/review/decision`)
1. Caller resolved from their own token; must hold the role; must not be the target.
2. Body: `{ userId, decision: 'approved'|'declined', reason?, expected: { decision, reviewQueuedAt } }`.
   The server **re-reads the target** via `users.show` immediately before writing and returns 409 if it
   no longer matches what the reviewer saw (someone else decided, or the user resubmitted). This
   narrows, but cannot close, the race: there is no compare-and-set on user profiles.
3. Only the two exact values are ever written (mirrors `getReviewDecision`, `reviewDecision.js:53-58`).
4. Target must be a model or client, not banned, not deleted, and actually submitted.
5. Then the follow-on writes, in the safe order of §2.2 (clients: permissions; models: on a decline,
   call `reconcileModelListingVisibility({ userId, verified: false, reason: 'review-declined' })` so a
   published profile is hidden at once, `modelVisibility.js:271`).
6. Structured server log line per decision (`review-decision-applied`, ids only).
7. GET never writes; the page has no auto-submit.

### 5.4 Does the decision email job keep working unchanged? Yes.
It decides purely on `reviewDecision` vs `reviewDecisionEmailed` (`decisionEmails.js:91-112`) and only
writes `reviewDecisionEmailed` (+ `privateData.lastVerifyNudgeAt` on approvals) (`:266-281`). The new
keys are disjoint. Changing a decision (approved to declined) still triggers the new email, as today.
The user still gets the email within ~10 minutes; the review page should say so. I recommend not
sending the email inline from the decision endpoint in v1: the sweep's overlap guard (`:286`) only
covers sweeps, so an inline send could double-send.

### 5.5 Model approval and visibility
Approving a model does not publish them by itself: the reconcile publishes when approved AND Stripe
complete. Triggers today are the model's own page load (`server/api/reconcile-own-listing.js:67-95`)
and the Connect webhook. The approval email links to `/account-status`, which pings the reconcile on
load, so an already-verified model goes live when they open it. Optional (stage 2b): read the
connected account from Stripe (`GET /v1/accounts/{id}`, "Retrieves the details of an account",
https://docs.stripe.com/api/accounts/retrieve) with the existing platform key and reconcile
immediately. That makes the review tool able to publish a profile, so it belongs on the review list.

---

## 6. Showing a pending profile

- **Marketplace API cannot do it:** a `pendingApproval`/`closed` listing is only visible to its author
  (own listings). The **Integration API can:** `listings.show({ id, include: ['images', 'author'],
  'fields.image': [...variants] })` works in any state; the reference shows image variants requested
  with `include=images&fields.image=variants...` and "Always use the returned URL exactly as returned by
  the API". Listing relationships include `author` and `images` (Integration API, listing relationships).
  Finding the listing: `listings.query({ authorId })` (already used, `modelVisibility.js:174-175`).
- **Server builds an allow-listed copy** (never the raw resources: Integration responses include the
  user's email, privateData and protectedData, and listing privateData). Model page gets: title,
  description, public listing fields (attributes, categories, rates), city, images (variants), the
  model's display name/avatar/bio, plus a review panel: account status, Stripe status as booleans only
  (`charges_enabled`, `payouts_enabled`, details submitted; never forward the rest of the Stripe
  account, which holds personal data), email verified, sign-up date, queued date, decision log.
- **Rendering:** a new `ReviewProfilePage` composes the same presentational sections the public
  profile uses (gallery, description, `CustomListingFields`, rates, location) read-only, with no order
  panel, so it matches "as a client sees it" without touching `ListingPage`. Data loads through a page
  duck `loadData` calling `GET /api/review/user/:id` via `src/util/api.js`. The route is `auth: true`, so
  SSR skips its `loadData` (`server/dataLoader.js:46`) and it runs in the browser, the same as
  `AccountStatusPage` (`src/routing/routeConfiguration.js:470-478`). Add `noindex`.
- **Clients (no listing):** show the public profile card (what a model would see: display name,
  avatar, bio) plus a business card for the check: company name and registration number (public),
  a Companies House search link built from the number, business type (protected), business address and
  phone (private) (`BusinessDetailsPage.helpers.js:10-15`), email verified, identity verified and the
  18+ flags (`metadata.identity_verified`, `age_verified_18plus`, `age_check_failed`), current
  transaction-rights state (`effectivePermissionSet`), sign-up and submission dates, decision log.

---

## 7. Risks and the human developer review list

Add a row "Review tool" to `docs/pre-launch-human-review.md` covering:
1. **Authorisation:** every review endpoint re-checks the role from the caller's own token on every
   request; admin only from the env list; no self-review; non-reviewers get 404; GET never writes;
   CSRF (Origin + content-type) on POSTs.
2. **Decision write:** exact values only; one call for decision + note; re-read/409 check; nothing
   else in metadata touched (test pins the payload).
3. **Write ordering** for transaction rights (approve: decision then allow; decline: deny then
   decision) and the retry path when the second call fails.
4. **Visibility side effects:** decline hides a published model at once; optional Stripe-read
   reconcile on approve can publish a profile.
5. **Personal data:** allow-listed DTOs only; Stripe data reduced to booleans; no PII in reviewer
   emails or logs; reviewers see private business data (GDPR: staff access should be covered by the
   privacy notice and a staff confidentiality agreement - lawyer item).
6. **Public metadata:** `roles`, `reviewedBy`, `reviewLog` are publicly readable; staff display-name
   convention; never put the note in metadata.
7. **Reviewer account hygiene:** dedicated staff accounts only; the Team page refuses to grant roles
   to an approved/transacting account; removing a role is immediate. Console "log in as" a reviewer
   account would let an operator act as that reviewer and be logged as them: decide whether the
   endpoint should refuse login-as sessions.
8. **Rate limits:** sequential calls, 429 handling, no partial writes.
9. **Pre-existing gaps found here (fix before real users, separate tasks):** §2.4 the enquiry booking
   path skips all server gates; §2.5 the client gate trusts a user-writable `userType`; minor: a model
   resubmitting with a `closed` listing shows as Draft to themselves, because `closed` is not in
   `MODEL_SUBMITTED_LISTING_STATES` (`src/util/accountStatus.js:141`).

---

## 8. Build plan

All behind the existing `REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED` flag plus the Integration creds;
fail-safe when unconfigured (endpoints 404/503, no crash), like the existing modules.

**Stage 1 - read-only tool (M).** Roles, queue and review page; no writes.
- `server/api-util/reviewerRoles.js` (+ test): `getRoles`, `isReviewer`, `isAdmin`
  (`REVIEW_ADMIN_USER_IDS`), `resolveReviewer(req, res)`.
- `server/api-util/reviewQueue.js` (+ test): model/client scans, filters, ordering.
- `server/api-util/reviewProfile.js` (+ test): allow-listed DTO builders.
- `server/api/review-queue.js`, `server/api/review-profile.js`; routes in `server/apiRouter.js`.
- `src/containers/ReviewQueuePage/` (page, duck, CSS), `src/containers/ReviewProfilePage/` (page,
  duck, CSS, `ReviewPanel`); `src/routing/routeConfiguration.js`, `src/containers/pageDataLoadingAPI.js`,
  `src/containers/reducers.js`, `src/util/api.js`, `src/translations/en.json`; reviewer link in the
  user menu (display only).

**Stage 2 - decisions (M, safety-critical).**
- `server/api-util/reviewDecisionWrite.js` (+ test): pure payload builder, re-read/409, write ordering,
  permissions, decline reconcile, audit log.
- `server/api/review-decision.js`; route.
- `ReviewDecisionForm` (React Final Form: Approve / Decline + required-on-decline reason, checklist).
- `server/api-util/reviewDecision.js`: constants for the new keys.
- Optional 2b: `server/api-util/stripeConnectStatus.js` (+ test) for Stripe status booleans and
  approve-time reconcile.
- Docs: replace the Console steps in `docs/cutover-activation-test.md:84-96`; add the review-list row.

**Stage 3 - notifications and team (S/M).**
- `server/api-util/reviewNotifications.js` (+ test); call it from `server/api/review-decision-emails.js`.
- `server/api-util/resubmitForReview.js`: also clear `reviewQueuedAt` (update its test).
- `src/containers/ReviewTeamPage/` + `server/api/review-team.js` (admin only: list / add by email /
  remove).

**Neil actions (none needed for stage 1 to be built):** set `REVIEW_ADMIN_USER_IDS` on Railway (his
staff account UUID); create staff reviewer accounts; keep the Console transaction-rights restriction ON;
disable the "User permissions changed" built-in email after stage 2 is live; Postmark approval if any
reviewer uses an external address; switch off any Zapier sign-up zap once stage 3 replaces it.
Optional later: a `flex-cli search set` metadata schema if volume ever makes the scan slow.

**Not touched:** transaction processes (no `ext/` change is needed for any of this). The §2.4 fix may
need one if the chosen fix is removing the enquiry transition; that would need Neil's approval and a
backend push.
