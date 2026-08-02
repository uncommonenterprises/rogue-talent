# ux-reports/

The approval gate lives here. The `product-manager` subagent writes; Neil
decides; Claude Code implements approved items only.

## Flow
1. The PM agent walks a journey on the Railway **test** site and writes numbered
   proposals to `proposals/<journey>-<date>.md`, each `Status: PENDING`, with
   screenshots in `screenshots/`.
2. Neil edits each `Status:` line by hand → `APPROVED`, `REJECTED`, or
   `DEFERRED`, adding a `Note:` where useful.
3. Claude Code implements only `APPROVED` items — one commit per proposal ID —
   and appends `Implemented: <sha> <date>` below the note.
4. Once every item in a file is resolved, the file moves to `done/`.

## Folders
- `proposals/` — active proposal files awaiting or mid-implementation.
- `screenshots/` — evidence captured during a run.
- `done/` — fully-resolved proposal files (audit trail; kept in git).
- `backlog.md` — proposals cut by the 10-per-run cap, or `DEFERRED` items.

## The one hard rule
`Status:` and `Note:` lines belong to Neil. No agent — not the PM subagent, not
the main Claude Code agent — may write or change them. This is enforced by
`.claude/hooks/guard-approval-gate.sh` (a PreToolUse hook), not just by
instruction. Neil's own manual edits in his editor are not tool calls, so the
hook never gets in his way.
