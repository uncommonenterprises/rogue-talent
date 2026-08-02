# Rogue Talent — Removing Neil from the Loop

**Setup guide for autonomous Console configuration + an AI product-manager agent**
Prepared 1 August 2026

---

## The problem, restated

Two things force manual intervention today:

1. **Console-only configuration.** Claude Code can't reach `console.sharetribe.com`, so listing fields, user fields, transaction settings and content pages all bottleneck on Neil.
2. **UX judgement.** Someone has to sign up as a test model, walk the onboarding, notice that step 3 is confusing, and tell Claude Code what to change.

Neither is actually a hard wall. Roughly **80% of Console work can be moved off the Console entirely** — into code, the CLI, or the Integration API — and the residual 20% can be browser-driven. The PM role is a solved problem once test accounts can be created and verified without a human.

---

## Part 1 — Console configuration without the Console

There is **no public write API for Sharetribe Console's no-code settings**. Sharetribe's own MCP server is documentation search only — read-only, no Console writes. So the strategy is not "find the API"; it's "stop needing the Console".

Work through these four tiers in order. Anything you can push up a tier gets faster, more reliable and version-controlled.

### Tier 1 — Move config into code (biggest single unlock)

The Web Template already supports **local configuration** that can override or merge with the hosted Console config. The merge logic lives in `src/util/configHelpers.js`, and the local defaults live in `src/config/configListing.js`, `configUser.js`, `configBranding.js`, `configLayout.js`, `configSearch.js`, `configDefault.js`.

By default hosted (Console) config wins. The real merge functions (verified in `configHelpers.js`, Aug 2026) are the top-level `mergeConfig` (line ~1718) which calls `mergeListingConfig`, `mergeUserConfig`, `mergeSearchConfig`, `mergeBranding` and `mergeLayouts`. The relevant toggle is `mergeDefaultTypesAndFieldsForDebugging(isDebugging)` (line ~1360), currently called with `false` inside **both** `mergeListingConfig` and `mergeUserConfig`. Flip these (and adjust the merge helpers) so local config takes precedence.

What this moves out of the Console and into Git:

- Listing types and **listing fields** — this is where the model attributes actually live. In Phase 3 the ~14 public model-attribute fields (gender, measurements, hair/eye colour, ethnicity, experience level, `modelling_categories`, `half_day_rate`, `hourly_rate`, `travel_fee_policy`, `min_booking_notice`, etc.) were moved from user fields to **listing fields** on the `model-profile` type. Port these into `src/config/configListing.js`. _(Note: `shoot_types` was deleted — `modelling_categories` replaced it. `min_booking_notice` now lives on the "Your availability" step.)_
- **User fields** — now only a couple remain: `date_of_birth` (private) and `id_verified` (metadata badge). Client-side user fields (the client `userType`) also live here. These go in `src/config/configUser.js`.
- Search filters and their order/presentation (listing-field-driven — `configListing.js`)
- Branding, colours, layout variants
- Field labels, help text, enum option ordering, validation

The practical effect: "add a field to model onboarding" stops being a Console task and becomes a pull request Claude Code can write, deploy to Railway and self-verify. In practice that field is a **listing field** rendered by the EditListing wizard ("Your profile" step), not a user field on ProfileSettings. Given the onboarding-wizard work is Phase 2's biggest item, this is where the acceleration comes from.

**Caveats, honestly.** Extended data still needs a **search schema** registered before it's filterable — that's a CLI job, see Tier 2. Console will keep showing its own hosted field definitions, so Console and code can drift; treat code as the source of truth and only re-sync Console before going live. And a few things genuinely can't move: commission rates, access-control toggles, Stripe keys, social login credentials, transaction-process *selection* per listing type.

### Tier 2 — Sharetribe CLI

Install and authenticate with a personal API key from Console → Advanced → API keys. Once Claude Code has this key it owns a real slice of the platform:

- **Transaction processes** — list, pull, edit, push new versions, alias them. This covers the whole booking flow, cancellation windows, the three-tier refund policy, and any safety check-in transitions you add later.
- **Transactional email templates** — pull, edit, preview, push.
- **Search schemas** — `flex-cli search set-schema` to make extended data filterable/sortable. Required for Tier 1 fields to actually work in search.
- **Events** — query the marketplace event log, which doubles as a debugging and verification tool.

```bash
npm install -g flex-cli
flex-cli login          # paste API key
flex-cli process list -m ndstealth1-test
```

Put the API key in `.env` (never committed) and add a `CLAUDE.md` note telling Claude Code it may run `flex-cli` against the **test** marketplace only.

### Tier 3 — Integration API

You already have credentials wired up for Zapier. Point a Node script folder at the same API and Claude Code gains operator-level control over marketplace *data*:

- Query, update and **approve users** (`pendingApproval` → `active`)
- **Verify email addresses** — this is the key that unlocks Part 2
- Update user permissions (post listings / initiate transactions)
- Create, update, approve, close and open listings; upload images
- Create and delete availability exceptions
- Transition transactions through the process; update metadata

Note the two gaps: the Integration API **cannot create users** and **cannot initiate transactions** — both must start via the Marketplace API. That's fine, and Part 2 works around it.

Build a small `scripts/ops/` directory with one script per repeated operation (`seed-test-users.js`, `approve-pending.js`, `reset-test-data.js`) so Claude Code composes rather than improvises.

### Tier 4 — Browser automation for the residue

Whatever is left — commission, access control, Stripe settings, some content pages, social login — gets done by an agent driving the Console UI.

**Update (Aug 2026):** the three **landing pages are already hand-coded React**, not Console. The General homepage (`/`), Models (`/p/for-models`) and Clients (`/p/for-business`) live in `src/containers/LandingPageMarketing/` — pixel-matched to the design, fully in Git, editable by pull request. So they're out of Tier 4 entirely. What's still Console for content: the **footer** and any remaining CMS pages.

Add **Playwright MCP** to Claude Code:

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

Also add Sharetribe's docs MCP so the agent stops guessing at API shapes:

```bash
claude mcp add --transport http sharetribe-docs https://sharetribe.mcp.kapa.ai
```

**Handling the Console login.** Console uses email + password, plus an emailed verification code on any new browser and at least every 30 days. So:

- Run Playwright with a **persistent browser profile** (`--user-data-dir`) so the session and the "remembered device" survive between runs. Do the first login manually in that profile; the agent inherits it.
- For the ~monthly re-verification, either accept one manual code paste, or let the agent read the code from the mailbox — you already have Gmail connected, and `hi@uncommonenterprises.co.uk` receives the code.
- Consider asking Sharetribe support whether you can invite a **second Console admin user** on a dedicated address (e.g. `agent@roguetalent.co`). Separate credentials for the agent is better hygiene than sharing yours, and it gives you an audit trail. This isn't documented publicly — worth a support ticket.

**Be realistic about this tier.** It's unofficial, it breaks when Sharetribe ships UI changes, and it's the one part of the stack that needs a human glance now and then. Keep it for the residue, and keep pushing work up into Tiers 1–3.

---

## Part 2 — The AI product manager

This is the more valuable half, and it's fully achievable.

### Step 1 — Self-service test accounts

The blocker on autonomous UX testing is that signup needs email verification and (because approval-to-join is on) operator approval. Both are scriptable:

1. Create the account via the **Marketplace API** — `sdk.currentUser.create()` with a plus-addressed email (`hi+testmodel01@uncommonenterprises.co.uk`) and a known password.
2. **Verify the email** via the Integration API's verify-email endpoint.
3. **Approve the user** via the Integration API.
4. Grant posting/transaction permissions if needed.

Write this as `scripts/ops/seed-test-users.js`, producing a pool of fresh accounts on demand — a few models at different stages (brand new, profile half-built, published, approved) and a couple of clients. Write the credentials to a gitignored `.test-accounts.json` the PM agent reads.

The agent now has its own logins. It never asks you for one.

For read-only inspection of an *existing* user's view, Console's **Login as user** is an alternative — in Test environments the operator gets full access rights — but the token lasts 30 minutes and the flow is Console-initiated, so purpose-made test accounts are the better foundation.

### Step 2 — Define the PM as a Claude Code subagent

Create `.claude/agents/product-manager.md` in the repo. This gives you a persona Claude Code can dispatch on demand, with its own instructions and its own tools (Playwright + read-only repo access):

```markdown
---
name: product-manager
description: Walks Rogue Talent user journeys as a real test user and reports UX defects
tools: mcp__playwright__*, Read, Grep, Glob, Write
---

You are the product manager for Rogue Talent, a two-sided marketplace
for models and the clients who book them.

Test against https://rogue-talent-production.up.railway.app using the
credentials in .test-accounts.json. Never touch the live marketplace.

For each journey you are asked to test:
1. Complete it end to end as the user would, screenshotting every screen.
2. Judge each step against the rubric below.
3. Write findings to ux-reports/<journey>-<date>.md.

Rubric — score each step 1-5 and justify:
- Clarity: does the user know what is being asked and why?
- Effort: field count, typing burden, decisions required
- Trust: for models, does this feel safe? For clients, does this feel credible?
- Brand: does the copy sound like Rogue Talent — fashion-led, direct,
  a bit rebellious — or like generic marketplace boilerplate?
- Dead ends: errors, broken links, confusing back-navigation, lost progress

Report format: for every issue give the exact screen, what a real user
would think, severity (blocker / friction / polish), and a specific
proposed fix — copy rewrite, field removal, reordering, whatever.
Rank by impact on completion rate. No vague observations.
```

Adjust the tool names to whatever your Playwright MCP registers.

### Step 3 — Close the loop

> **Superseded — see `Rogue_Talent_PM_Approval_Gate.md`.** The loop below runs
> unattended; the approval-gate addendum inserts a mandatory Neil-approves step
> between the agent's proposals and any code change. Use the addendum's version.

The point is that the PM agent's output feeds back into development:

1. PM agent runs a journey, writes `ux-reports/model-onboarding-2026-08-01.md`.
2. Claude Code reads the report, implements the **approved** fixes, pushes to GitHub.
3. Railway auto-deploys.
4. PM agent re-runs the same journey on a fresh test account and confirms the fix or re-reports.

You review the report and the diff — you don't run the clicks. Journeys worth putting on this loop: model signup → profile creation → submitted for review; client signup → search → booking request; client verification; booking → payment → completion; cancellation at each of the three refund tiers; and the safety check-in flow when it's built.

Once it's stable, trigger it automatically — a GitHub Action on push to main running `claude -p "Run the model onboarding journey and report"` in headless mode, or a scheduled task that runs the full suite nightly and emails you the summary.

---

## Setup checklist

| # | Task | Where | Effort |
|---|---|---|---|
| 1 | Generate Sharetribe CLI API key; install `flex-cli`; store key in `.env` | Console → Advanced | 15 min |
| 2 | Add Playwright MCP and Sharetribe docs MCP to Claude Code | Terminal | 15 min |
| 3 | Create persistent Playwright browser profile; log into Console once by hand | Local | 20 min |
| 4 | Ask Sharetribe support about a second Console admin login for the agent | Email | 5 min |
| 5 | Flip `configHelpers.js` so local config takes precedence; port listing + user fields into `configListing.js` / `configUser.js` | Repo | 3–4 h |
| 6 | Build `scripts/ops/` — seed-test-users, approve-pending, reset-test-data | Repo | 2–3 h |
| 7 | Run seed script; generate the test account pool; gitignore `.test-accounts.json` | Repo | 30 min |
| 8 | Write `.claude/agents/product-manager.md` | Repo | 30 min |
| 9 | Add a `CLAUDE.md` section: test-marketplace-only rule, CLI permissions, where credentials live | Repo | 20 min |
| 10 | Dry-run the loop on model onboarding; review the report quality; tune the rubric | — | 1 h |

Roughly a day and a half of setup. It should pay back within the first week of Phase 2 work.

---

## Security — worth doing now

Two things need attention before you widen agent access:

**Rotate the exposed credentials. (Repo is PUBLIC — higher severity than the original note assumed.)** The Marketplace API **client secret** was committed in plaintext in `CLAUDE.md` and is therefore in the **public** git history (commit `8eda350f6`) — removing the line is not enough. Status (Aug 2026): the value has been redacted from `CLAUDE.md` (now a pointer) and moved to a gitignored `.env` + Railway, but it **must still be rotated in Console** because history is public and permanent. The **Google Maps API key** was also committed publicly — rotate and/or restrict it by HTTP referrer. Original note also mentioned a **GitHub PAT** in plaintext — not found in this repo (Aug 2026); confirm where it actually lives. Keep all notes pointing at *where* credentials live, never the values.

**Contain the blast radius.** An agent with Console access and Integration API credentials can modify every user and listing in the marketplace. Mitigations: a separate Sharetribe admin login for the agent; an explicit `CLAUDE.md` rule that only the **test** marketplace (`ndstealth1-test`) may be written to; the live marketplace's credentials kept out of the dev environment entirely; and no browser automation pointed at Live before launch. Set these boundaries now, while the only thing at risk is test data.

---

## What this doesn't solve

Being straight about the limits:

- Some Console settings will always need a human — Stripe live keys, domain setup, anything requiring identity or payment verification.
- Browser automation of Console is unofficial and will occasionally break on Sharetribe UI updates.
- The PM agent judges *usability*, not *desirability*. It won't tell you whether models actually want the product. That still needs real models — which is the argument for getting a small closed beta in front of ten real people sooner rather than later.
- Anything involving real Stripe KYC, real ID verification, or real payouts can't be fully agent-tested; test mode only goes so far.
