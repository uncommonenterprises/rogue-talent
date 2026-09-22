# Account status — Step 2: onboarding rewire + visibility enforcement (SPEC, needs Neil decision)

Status: DRAFT SPEC — **needs Neil's decision on the approach before build** (safety-critical: it
decides who is discoverable/bookable). Builds on the APPROVED `account-status-lifecycle.md`.
Owner: PM. Origin: lifecycle spec §11 items 4 + 7, and the Developer's step-1 flow report.

## 1. Goal
Deliver the two flow changes the lifecycle spec calls for:
- **Drop "Stripe before submit" (RT-01):** a model can submit their profile for review (Gate A,
  quality) **without** having done Stripe. Verification (Gate B) comes after.
- **Enforce "visible/bookable only when Verified":** an approved-but-unverified account must be
  **Approved** (hidden), then become **Verified** (visible) once Stripe/identity is done.

## 2. Why this is not just "remove the publish modal"
Current state (confirmed in code):
- The Stripe gate is a modal in `EditListingWizard.handlePublishListing` (~L481–511): publish is
  blocked until Stripe is connected with no `past_due`/`currently_due`. That's RT-01.
- **User-approval is ON** (signup → `pending-approval` → operator sets `active`).
- **Listing-approval is OFF** today (a planned Neil task) → a completed wizard listing would publish
  straight to `published` (visible).
- Booking has an **implicit** provider check: destination charges require the provider's
  `charges_enabled`, so a Stripe-incomplete model's booking would fail at payment (bad UX, but not a
  silent safety hole). **Search/visibility has no such check** — a Stripe-incomplete model would just
  appear.

**The hard part:** Sharetribe listing states are `draft → pendingApproval → published → closed`.
There is **no native state for "quality-approved but hidden pending verification."** A listing is
either `pendingApproval` (hidden, not-yet-reviewed) or `published` (visible). So the moment an
operator approves a listing it becomes visible — which breaks "hidden until Verified." Today RT-01
hides this problem by making Stripe a prerequisite to ever publishing. Once we drop RT-01, we must add
an explicit visibility mechanism.

## 3. Recommended design
**Gate A = user-approval for both types** (keeps the lifecycle helper's single source of truth,
matches spec §10). The operator reviews a model's **portfolio quality** by looking at their
`pendingApproval` profile, and approves the **user** (`pending-approval → active`). Clients: same
mechanism, reviewing business/Companies House.

**Listing visibility is driven by the computed Verified state, not by manual listing approval:**
- Turn **listing-approval ON** so a submitted model profile sits in `pendingApproval` (hidden) rather
  than auto-publishing.
- The model's **"Submit for approval"** publishes the draft → it lands in `pendingApproval` (hidden).
  No Stripe required. This is the Gate-A submission signal (`submitted(model)` from step 1).
- A server-side **reconcile function** publishes the listing (`pendingApproval → published`) **only
  when the account is Verified** (user `active` **and** Stripe `charges_enabled && payouts_enabled`).
  If verification later lapses, it reverts the listing to hidden (`closed`/`pendingApproval`) — the
  live "drops out of Verified" guarantee (lifecycle §4). The operator does **not** manually publish
  listings in Console; the reconcile fn owns publish state.
- **Reconcile triggers:** (a) a Stripe **Connect `account.updated` webhook** (new — we have the
  Identity webhook pattern to copy); (b) operator approval (detected on the model's next
  authenticated session, or a light periodic sweep, since Console approval has no webhook); (c) the
  model returning from Stripe onboarding.
- **Booking gate:** add an explicit "provider is Verified" check in `initiate-privileged` (alongside
  the existing SAF-03/14 gates) so a booking of a non-Verified model fails cleanly with a clear
  message, not an opaque Stripe charge error.

This preserves native listing semantics (`published` ⟺ Verified ⟺ visible & bookable), gives the
Approved-hidden window + email nudge, and keeps one source of truth (the computed status).

## 4. Alternative (if the reconcile automation feels too heavy for v1)
**Search-filter flag:** publish listings early but carry `publicData.isVerified`, kept in sync by the
same triggers; search filters on it and the booking gate checks it. Similar build to §3 (still needs
the Stripe webhook + sync), and it leaks a `published` listing that's filtered-out (messier). §3 is
cleaner; noting B only for completeness.

## 5. Decisions for Neil
1. **Approve the §3 approach?** — Gate A = user-approval (operator reviews model quality via the
   pending profile, approves the user); listing visibility owned by a reconcile function that
   publishes only when Verified; listing-approval turned ON to keep submissions hidden.
2. **Operator workflow change:** operators approve the **user**, and do **not** manually publish
   listings (the system does). OK? (I'll write the ops note.)
3. This needs a **Stripe Connect `account.updated` webhook** + a reconcile function — confirm you're
   OK adding that (same secret-in-server posture as the Identity webhook, already accepted).

## 6. Build breakdown (after decision)
1. `handlePublishListing`: drop the Stripe modal gate; "Submit for approval" publishes draft →
   `pendingApproval` regardless of Stripe. Re-word the CTA to "Submit for approval".
2. Turn listing-approval ON (Console — Neil; bundle with the other Console tasks).
3. Reconcile function + `account.updated` webhook + triggers (server; Integration API to set listing
   state). **Safety-critical → human review pre-go-live.**
4. Explicit provider-Verified check in `initiate-privileged`.
5. Enforcement audit (lifecycle §11.7): confirm no non-Verified model is discoverable or bookable via
   any path; confirm the live-lapse regression works.

## 7. Not in step 2 (separate steps)
- Client company-registration-number field (step 3).
- Approved→verify email nudge sequence (step 4).
- Retire old VerifiedBadge (step 5).
- Fix the ProfileSettingsPage `submitted(model)` display gap (surface status where the listing is
  loaded, or load it) — small follow-up, can ride with step 1's placement.
