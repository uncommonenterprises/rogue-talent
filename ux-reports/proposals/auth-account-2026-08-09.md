# UX Review — Auth & account basics — 2026-08-09
Agent run: pm-2026-08-09-1440 | Test account: hi+rt-client-01@uncommonenterprises.co.uk (+ role checks vs rt-model-03) | Build: abcfcb69d (repo HEAD; live deploy sha not verified this run)

Journey completes: login, logout, password-reset request, and Account/Contact-details editing are
all wired and reachable in code; the topbar is role-aware (providers see "Requests", customers see
"My bookings"). No blocker. Findings are brand voice on the returning-user front door and a
terminology contradiction in the profile menu.

> Run note — no live screenshots this run. Browser / computer-use MCP tools were not loaded
> (ToolSearch disabled; `mcp__claude-in-chrome__*` and `mcp__computer-use__*` returned "No such
> tool available"). Findings are grounded in exact shipping copy/logic; `Evidence:` cites
> file:line. One item (RT-...-16) needs a Console value confirmed — flagged as verify. Recommend
> a re-run with browser access to attach visual evidence before Neil sets statuses.

## RT-20260809-13 — Login page is generic Sharetribe boilerplate — the returning-user front door has no brand
Journey:   auth-account
Screen:    Log in (`/login`)
Severity:  friction
Evidence:  src/translations/en.json:637-646 (LoginForm.emailLabel "Email", emailPlaceholder "jane.doe@example.com", passwordPlaceholder "Enter your password…", logIn "Log in")
User view: "Every marketing page screamed 'go rogue' — then I log back in through a form that could belong to any SaaS. 'jane.doe@example.com'. It's fine, but it's nobody's brand."
Proposal:  Give the log-in its own voice — it's the screen returning models and clients see most. Add a branded heading/subhead ("Welcome back" / "Back to it.") and fashion-flavoured placeholders (email "you@studio.com"; keep the password placeholder). Mirrors the already-backlogged signup brand-voice item so the two auth screens match. Copy-only; no logic change.
Touches:   src/translations/en.json (LoginForm.* / AuthenticationPage login heading keys), src/containers/AuthenticationPage/LoginForm/LoginForm.js if a heading is added
Effort:    S
Impact:    Med — highest-frequency auth surface; cheap brand consistency win for every returning user.
---
Status: PENDING
Note:

## RT-20260809-14 — Profile menu still says "Your listings" — contradicts the shipped "profile, not listings" decision
Journey:   auth-account
Screen:    Topbar avatar → profile dropdown (models)
Severity:  friction
Evidence:  src/containers/TopbarContainer/Topbar/TopbarDesktop/TopbarDesktop.js:84 → en.json:1232 ("TopbarDesktop.yourListingsLink": "Your listings"); mobile equivalent en.json:1243 ("TopbarMobileMenu.yourListingsLink": "Your listings")
User view: "I have one profile, but the menu says 'Your listings' — plural. Did I accidentally create several? Which one do clients see?"
Proposal:  A model has exactly one profile — the whole terminology system was moved to "Create your profile" / "My profile" (CLAUDE.md, en.json changes). This dropdown was missed. Change `TopbarDesktop.yourListingsLink` and `TopbarMobileMenu.yourListingsLink` from "Your listings" to "Your profile". Purely a string change; the target (ManageListingsPage) is unchanged.
Touches:   src/translations/en.json (TopbarDesktop.yourListingsLink, TopbarMobileMenu.yourListingsLink)
Effort:    S
Impact:    Med — removes a "why do I have multiple listings?" confusion and closes a gap in the terminology decision the rest of the app already honours.
---
Status: PENDING
Note:

## RT-20260809-15 — Email-verification nag close button is a shouty all-caps "LATER"
Journey:   auth-account
Screen:    Post-signup / re-login email-verification banner
Severity:  polish
Evidence:  src/translations/en.json:31 ("AuthenticationPage.verifyEmailClose": "LATER")
User view: "The dismiss option is 'LATER' in shouting caps next to warm sentence-case copy — jarring, and it reads more like an ultimatum than a friendly skip."
Proposal:  Sentence-case and soften to match the surrounding tone (and the model-specific "Set up your profile now — verify later" line already added at :34): change to "Later" or "Do this later". One-word polish on a screen every new user hits.
Touches:   src/translations/en.json (AuthenticationPage.verifyEmailClose)
Effort:    S
Impact:    Low — small tonal consistency fix on a high-traffic screen.
---
Status: PENDING
Note:

## RT-20260809-16 — Verify that clients don't see "Create your profile" / "Your listings" in the topbar
Journey:   auth-account
Screen:    Topbar (logged-in client, rt-client-01)
Severity:  friction
Evidence:  src/util/userHelpers.js:216-229 (showCreateListingLinkForUser → `accountLinksVisibility.postListings` from the user-type Console config) gates both the create-profile link and the "Your listings" profile-menu item (TopbarDesktop.js:193, :77).
User view: "I'm a brand here to book models — why is the app inviting me to 'Create your profile' and showing me 'Your listings'? I don't post anything."
Proposal:  Confirm the `client` user type has `accountLinksVisibility.postListings = false` in Sharetribe Console. If it's true/unset, a client sees provider-only nav (create profile + your listings), which is confusing and off-model for the demand side. If false, no change needed — this is a verify-in-Console item. Flagged because I could not read the Console value from code this run.
Touches:   Sharetribe Console (user-type `client` → accountLinksVisibility.postListings); no repo change if already false
Effort:    S
Impact:    Med if misconfigured (client sees supply-side nav); zero if already correct — hence a verify item.
---
Status: PENDING
Note:

## RT-20260809-17 — Contact-details field copy is inconsistent (trailing period, generic placeholders)
Journey:   auth-account
Screen:    Account settings → Contact details
Severity:  polish
Evidence:  src/translations/en.json:135 ("ContactDetailsForm.phonePlaceholder": "Enter your phone number.") ends in a full stop while sibling placeholders end in an ellipsis (e.g. passwordPlaceholder ":129 "Enter your current password…").
User view: "Tiny thing — one placeholder ends in a period, the others in '…'. Looks unproofed."
Proposal:  Normalise placeholder punctuation to the app's ellipsis convention: "Enter your phone number…". Trivially cheap consistency pass on the settings form.
Touches:   src/translations/en.json (ContactDetailsForm.phonePlaceholder)
Effort:    S
Impact:    Low — proofing polish on the account settings form.
---
Status: PENDING
Note:

## RT-20260809-18 — Password-recovery copy is on-brand — keep it, and mirror it on login
Journey:   auth-account
Screen:    Forgot password (`/recover-password`)
Severity:  polish
Evidence:  src/translations/en.json:834 ("…Hmm. We didn't find an account with that email address…"), :846 ("No worries! Please enter the email address you used…"), :837 ("Suddenly remembered your password? {loginLink}")
User view: "This flow actually sounds like a person wrote it — warm and human."
Proposal:  Not a defect — a positive to preserve and propagate. The recovery flow already has the voice the login screen (RT-20260809-13) lacks; use its register ("No worries!", "Suddenly remembered your password?") as the reference when brand-voicing login so the two don't clash. No change to recovery itself; logged so it isn't "improved" into blandness later.
Touches:   (reference only) src/translations/en.json PasswordRecovery* — no edit proposed
Effort:    S
Impact:    Low — preserves an existing brand win and anchors the login rewrite.
---
Status: PENDING
Note:
