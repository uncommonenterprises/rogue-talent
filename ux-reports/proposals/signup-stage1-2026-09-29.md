# UX Review — Sign-up redesign, Stage 1 (account screens) — 2026-09-29
Agent run: ux-tester-2026-09-29 | Test env: https://rogue-talent-production.up.railway.app (ndstealth1-test)
Compared against: docs/design/signup-journey/01-choose-path.html, 02-signup-model.html,
03-signup-client.html, 06-login.html, 07-forgot-reset-password.html (+ journey.css)
Sizes tested: desktop 1280x800, phone 375x812
No accounts created, no logins, no forms submitted (hard limit respected — fields were
typed into and checkboxes clicked to verify real-UI behaviour only, never submit).

**Journey completion: COMPLETED.** All five in-scope screens (01, 02, 03, 06, 07) render
and match the approved mockups closely at both sizes. No blockers. Before writing this
up I cross-checked `docs/team-decision-log.md` (2026-09-29, Day 8 entries) for
already-known/accepted deviations from the mockups — two things I initially flagged
(company registration number still on the client sign-up form, and "Company/Agency
name" showing "(optional)" instead of required) turned out to be **already tracked,
accepted deviations** due to ship in Stage 3, so they are NOT re-reported below to avoid
duplicate work. Only new, unreported issues are listed.

3 findings below (max 10, ranked by impact). Nothing cut to backlog.

---

## RT-20260929-01 — Company registration number field on client sign-up shows a generic "Write description…" placeholder
Journey:   signup-stage1
Screen:    `/signup/client` (screen 03), the "Company registration number (optional)"
           field, both desktop 1280x800 and phone 375x812
Severity:  should fix
Evidence:  screenshots/03-signup-client-desktop.png and
           screenshots/03-signup-client-phone.png. Accessibility snapshot at
           `/signup/client`:
           ```
           - generic [ref=f6e41]:
             - generic [ref=f6e42]: Company registration number (optional)
             - paragraph [ref=f6e43]: Your company's registration number so we can
               verify your business (e.g. Companies House number).
             - textbox "Company registration number (optional)" [ref=f6e44]:
               - /placeholder: Write description…
           ```
User view: A client filling in their Companies House number sees a field whose
           helper text correctly says "e.g. Companies House number" but whose grey
           placeholder text inside the box reads "Write description…" — a leftover
           generic long-text placeholder that has nothing to do with a registration
           number. It reads as an unfinished/templated field on a screen that is
           otherwise polished, and undermines trust on the one screen that's meant
           to reassure a business client the platform is credible.
Proposal:  Set a field-appropriate placeholder (e.g. "e.g. 12345678") on the
           `company_registration_number` Console user field, or override the
           placeholder in code if the field component doesn't take one from
           Console. Low effort either way. Note: per the team decision log
           (2026-09-29, Day 8), this field is due to move off this screen entirely
           in Stage 3 — if Stage 3 lands imminently, fixing the placeholder here is
           still worth doing since Stage 1 is live now and the timing of Stage 3
           isn't fixed.
Touches:   Sharetribe Console (client user field `company_registration_number`) or
           src/containers/AuthenticationPage (client sign-up form field rendering)
Effort:    S
Impact:    Small but visible trust/polish issue on the client sign-up form, which is
           the first thing a paying client sees.

---
Status: PENDING
Note:

---

## RT-20260929-02 — "Continue with Google" button is absent from all three account forms
Journey:   signup-stage1
Screen:    `/signup/model` (02), `/signup/client` (03), `/login` (06) — desktop and
           phone, all three
Severity:  should fix (pending confirmation — may be intentional for this test env)
Evidence:  Accessibility snapshots of all three pages show no social-login button or
           "or" divider at all — the form starts directly at the first field/heading.
           E.g. `/login` snapshot: the "Log in" heading is immediately followed by
           the Email field, no "Continue with Google" button and no divider present
           anywhere in the tree. Screenshots: 02-signup-model-desktop.png,
           03-signup-client-desktop.png, 06-login-desktop.png — none show a Google
           button, whereas all three approved mockups (02, 03, 06) show a
           "Continue with Google" outline button above an "or" divider, directly
           under the heading.
User view: Not user-facing harm by itself (the email/password path works fine), but
           it's a full missing feature versus the approved design — a returning
           user who expects "Sign in with Google" (or a new user who prefers it)
           has no way to use it, and the decision log (2026-09-29, Day 8, item 103)
           confirms Google sign-up is an active feature elsewhere ("18+ tick box
           also on the Google sign-up confirm step") — so it's expected to exist,
           just not rendering here.
Proposal:  Confirm with the PM/developer whether Google OAuth credentials are
           configured for this Railway test environment. If they are meant to be
           configured and are missing, that's a config/env gap to fix (the button
           renders conditionally on a client ID being present in most Sharetribe
           Web Template setups). If Google sign-in is deliberately disabled on
           this test env for another reason, no code change is needed — just
           confirm so this isn't mistaken for a build regression.
Touches:   Likely environment config (Google OAuth client ID/secret on Railway) or
           src/containers/AuthenticationPage (social login button conditional
           rendering) — needs a developer check, not a guess.
Effort:    S (config) or M (if a real code regression)
Impact:    Medium — a full advertised feature (from the approved mockups) is not
           reachable on any of the three account screens today.

---
Status: PENDING
Note:

---

## RT-20260929-03 — Homepage hero copy uses an em dash, inconsistent with the new account screens' hyphen style
Journey:   signup-stage1 (homepage checked as part of this run's "logged-out state"
           check)
Screen:    `/` homepage hero, logged out, desktop and phone
Severity:  nice to have
Evidence:  screenshots/00-homepage-loggedout-desktop.png. Hero paragraph reads: "The
           marketplace where models and the businesses that book them work together
           directly — no agents, no middlemen, no cut." — that is an em dash
           (—), not a hyphen. By contrast every panel line on the redesigned
           account screens uses a plain hyphen with spaces, e.g. screen 02's "get
           paid direct - no agent taking a cut" and screen 03's "one flat fee,
           nothing hidden" pattern. This is pre-existing homepage copy, not part of
           the Stage 1 rebuild, but it's inconsistent with the "no em dashes" style
           now established on the account screens and was in scope for this run's
           logged-out homepage check.
User view: Not something a user would consciously notice, but it's a small brand-
           consistency inconsistency between the marketing homepage and the new
           account screens.
Proposal:  Replace the em dash with a hyphen to match the account screens' style:
           "...work together directly - no agents, no middlemen, no cut."
Touches:   src/translations/en.json (homepage hero copy key) or
           src/containers/LandingPage section component, whichever holds this string
Effort:    S
Impact:    Cosmetic only; bundle with any other homepage copy pass rather than a
           standalone deploy.

---
Status: PENDING
Note:
