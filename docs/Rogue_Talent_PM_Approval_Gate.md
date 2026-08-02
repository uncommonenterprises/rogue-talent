# Rogue Talent — PM Agent Approval Gate

**Addendum to `Rogue_Talent_Agent_Autonomy_Setup.md`**
Prepared 1 August 2026

Supersedes "Part 2, Step 3 — Close the loop" in the main guide. The loop is the same; it now has a stop in the middle that only Neil can release.

---

## The principle

The PM agent **proposes**. Neil **decides**. Claude Code **implements approved items only**.

The agent never edits product code, never approves its own findings, and never touches an approval status. Those three rules are what make the gate real rather than decorative — an agent that can write to `src/` is not gated no matter what the instructions say.

---

## The flow

1. PM agent runs a journey against the Railway dev site using a seeded test account.
2. It writes numbered proposals to `ux-reports/proposals/<journey>-<date>.md`, each with `Status: PENDING`, plus screenshots to `ux-reports/screenshots/`.
3. Neil reviews and edits each status to `APPROVED`, `REJECTED` or `DEFERRED`, adding a note where useful.
4. Claude Code picks up only the `APPROVED` items, implements one commit per proposal ID, and stamps the proposal with the commit SHA.
5. Railway auto-deploys; the PM agent re-runs the journey on a fresh account and confirms or re-reports.

Nothing reaches `src/` without step 3.

---

## Proposal format

Machine-readable enough for Claude Code to filter reliably, human-readable enough to review over coffee. One file per journey run.

```markdown
# UX Review — Model Onboarding — 2026-08-04
Agent run: pm-2026-08-04-0930 | Test account: hi+testmodel07@... | Build: a3f9c21

## RT-20260804-03 — Measurements requested before any explanation of why
Journey:   model-onboarding
Screen:    Create your profile → "Your profile" step (measurements block)
Severity:  friction
Evidence:  screenshots/model-onboarding-your-profile.png
User view: "Why does a booking site need my hip measurement before I've
           even seen what a client brief looks like? Feels invasive."
Proposal:  Add a one-line rationale above the measurements block —
           "Clients filter by these. You control who sees your profile."
           Move shoe_size_uk and eye_colour to an optional 'Add more detail'
           accordion to cut the visible field count.
Touches:   src/config/configListing.js (these are LISTING fields — order/optional),
           src/translations/en.json, EditListingDetailsPanel / EditListingDetailsForm
Effort:    M
Impact:    Est. highest drop-off step in the wizard
---
Status: PENDING
Note:
```

`Status` and `Note` are the only two lines Neil writes. Everything above the `---` is the agent's; everything below is his.

Statuses: **APPROVED** (implement now), **REJECTED** (never — with a note so the agent learns the boundary), **DEFERRED** (right idea, wrong time — moves to `ux-reports/backlog.md`).

---

## The rules Claude Code must follow

Add to `CLAUDE.md`:

```markdown
## UX proposal approval gate — non-negotiable

- Implement a UX proposal ONLY if its Status line reads exactly `APPROVED`.
  PENDING, DEFERRED, REJECTED and anything unrecognised mean do nothing.
- NEVER write, edit or reformat a `Status:` or `Note:` line. Those belong
  to Neil alone. If you think a status is wrong, say so — don't change it.
- NEVER implement a proposal that does not exist in a proposals file.
  No "while I was in there" changes.
- One commit per proposal ID. Put the ID in the commit message
  (`RT-20260804-03: add rationale to measurements block`) so any single
  approved change can be reverted on its own.
- After implementing, append `Implemented: <sha> <date>` below the Note
  line and move the file to `ux-reports/done/` once every item is resolved.
- If an approved proposal is ambiguous, ask before interpreting. An
  approval covers the change as written, not your extension of it.

## PM agent boundaries

- The product-manager agent writes to `ux-reports/**` and nowhere else.
- It has no Edit tool and no git access. It cannot open a PR.
- It tests `ndstealth1-test` / the Railway dev URL only. Never live.
```

---

## Updated subagent definition

`.claude/agents/product-manager.md` — note the tool list and the closing constraints:

```markdown
---
name: product-manager
description: Walks Rogue Talent user journeys as a test user and proposes UX changes for Neil's approval. Never implements.
tools: mcp__playwright__*, Read, Grep, Glob, Write
---

You are the product manager for Rogue Talent, a two-sided marketplace for
models and the clients who book them.

Test against https://rogue-talent-production.up.railway.app using the
credentials in .test-accounts.json. Never touch the live marketplace.

For each journey you are asked to test:
1. Complete it end to end as a real user would, screenshotting every screen
   to ux-reports/screenshots/.
2. Judge each step against the rubric below.
3. Write proposals to ux-reports/proposals/<journey>-<date>.md in the
   house format, every one with `Status: PENDING`.

Rubric — score each step 1-5 and justify:
- Clarity: does the user know what is being asked and why?
- Effort: field count, typing burden, decisions required
- Trust: for models, does this feel safe? For clients, does this feel credible?
- Brand: does the copy sound like Rogue Talent — fashion-led, direct, a bit
  rebellious — or like generic marketplace boilerplate?
- Dead ends: errors, broken links, confusing back-navigation, lost progress

Every proposal states the exact screen, what a real user would think,
severity (blocker / friction / polish), a specific proposed change, the
files it likely touches, and an effort estimate. No vague observations —
"the copy could be warmer" is not a proposal; a rewritten line is.

Hard constraints:
- You propose. You never implement. You have no write access outside
  ux-reports/ and you must not request any.
- You never set, edit or suggest edits to a Status or Note line. Every
  proposal you write is PENDING. Approval is Neil's alone.
- Maximum 10 proposals per run, ranked by estimated impact on completion
  rate. Anything below the cut goes to ux-reports/backlog.md — say in your
  summary how many you cut, so nothing looks like full coverage when it isn't.
- If you find a blocker (a journey that cannot be completed at all), say so
  at the top of the report in one line before anything else.
```

---

## Making the gate enforceable, not just instructed

Instructions are the first layer. Two cheap additions make it structural:

**Tool restriction.** The `tools:` frontmatter above omits Edit and Bash, so the PM agent physically cannot modify source or run git. This is the single most important line in the file.

**A PreToolUse hook.** In `.claude/settings.json`, block writes outside `ux-reports/` and block any edit that would touch a `Status:` line, for any agent:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{ "type": "command", "command": ".claude/hooks/guard-approval-gate.sh" }]
    }]
  }
}
```

The script exits non-zero — which blocks the call — if the target path is a proposals file and the diff touches a `Status:` or `Note:` line. Fifteen lines of bash, and it means a confused agent cannot approve its own work even if it decides the instruction doesn't apply.

**Git as the audit trail.** Commit the proposals files. `git log ux-reports/` then shows exactly what was proposed, what you approved, when, and which commit implemented it — for free, with no extra tooling.

---

## How you'll actually review

Three options, in order of how little friction they involve:

**Edit the markdown.** Open the proposals file, change ten `PENDING`s, save, tell Claude Code to go. Fastest once you're used to it, and the file is the source of truth.

**Approve in conversation.** Paste or point me at the report here, say "approve 1, 3 and 7, reject 4 — too invasive, defer the rest", and I'll set the statuses and notes for you. Useful when you're reviewing on your phone.

**HTML digest.** Have the agent also render `ux-reports/review/<date>.html` with the screenshots inline, so you can read the case for each proposal properly before deciding. Approval still happens in the markdown — the HTML is a reading view, not a control surface.

The 10-proposal cap matters here. The gate only works if reviewing is a fifteen-minute job you'll actually do, rather than a forty-item backlog you start rubber-stamping.

---

## Relaxing it later

Keep the gate fully closed until you've reviewed maybe fifty proposals and have a feel for the agent's judgement. Then loosen by category rather than all at once — the natural first step is to auto-approve `polish`-severity changes that touch only `en.json`, since copy is reversible in one commit and the worst case is a sentence you don't like. Keep `friction` and `blocker` gated, and keep anything touching the transaction process, pricing, safety flows or the Stripe path gated permanently regardless of severity. Those aren't UX opinions; they're places where a plausible-sounding change can cost real money or real trust.

Write the relaxation into `CLAUDE.md` as an explicit allow-list when you get there, so the gate stays a rule rather than becoming a habit.
