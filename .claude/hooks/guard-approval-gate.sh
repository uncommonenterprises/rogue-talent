#!/usr/bin/env bash
#
# Approval-gate guard — PreToolUse hook for Write | Edit | MultiEdit.
#
# Enforces the one rule that makes the UX-proposal approval gate real rather
# than decorative: NO agent — the product-manager subagent OR the main Claude
# Code agent — may set, change, or reformat a `Status:` or `Note:` line in a
# proposal file under ux-reports/. Those two lines belong to Neil, who edits
# them by hand in his editor (a manual edit is not a tool call, so this hook
# never fires on it — only agent tool calls are gated).
#
# An agent MAY still create fresh proposal files, but only with `Status: PENDING`
# and empty `Note:` lines — never a pre-approved status.
#
# Contract: Claude Code sends the tool call as JSON on stdin. Exit 2 blocks the
# call and feeds stderr back to the model; exit 0 allows it.
#
set -euo pipefail

payload="$(cat)"

python3 - "$payload" <<'PY'
import json, sys, re

try:
    data = json.loads(sys.argv[1])
except Exception:
    # If we cannot parse, fail open — never wedge unrelated tool calls.
    sys.exit(0)

tool = data.get("tool_name", "")
ti = data.get("tool_input", {}) or {}

def path_of(d):
    return d.get("file_path") or d.get("notebook_path") or ""

# Only proposal files under ux-reports/ are governed.
def governed(p):
    p = (p or "").replace("\\", "/")
    return "ux-reports/" in p and p.endswith(".md")

STATUS_NOTE = re.compile(r'(?im)^\s*(Status|Note)\s*:')
STATUS_VAL  = re.compile(r'(?im)^\s*Status\s*:(.*)$')
NOTE_VAL    = re.compile(r'(?im)^\s*Note\s*:(.*)$')

def block(msg):
    sys.stderr.write("APPROVAL-GATE BLOCKED: " + msg + "\n")
    sys.exit(2)

def check_edit(old, new):
    # Touching a Status:/Note: line on either side of the edit is forbidden.
    if STATUS_NOTE.search(old or "") or STATUS_NOTE.search(new or ""):
        block(
            "an agent may not edit a `Status:` or `Note:` line in a proposal "
            "file. Approvals (APPROVED / REJECTED / DEFERRED) and notes are "
            "Neil's alone — he sets them by hand. If you think a status is "
            "wrong, say so in chat; do not change it."
        )

def check_write(content):
    for m in STATUS_VAL.finditer(content or ""):
        val = m.group(1).strip()
        if val != "PENDING":
            block(
                f"a Write set `Status: {val or '(empty)'}`. An agent may only "
                "create proposals with `Status: PENDING`; any other status is "
                "an approval decision, which is Neil's alone."
            )
    for m in NOTE_VAL.finditer(content or ""):
        if m.group(1).strip():
            block(
                "a Write populated a `Note:` line. Notes belong to Neil — "
                "leave every `Note:` line empty when writing proposals."
            )

p = path_of(ti)
if not governed(p):
    sys.exit(0)

if tool == "Edit":
    check_edit(ti.get("old_string", ""), ti.get("new_string", ""))
elif tool == "MultiEdit":
    for e in ti.get("edits", []) or []:
        check_edit(e.get("old_string", ""), e.get("new_string", ""))
elif tool == "Write":
    check_write(ti.get("content", ""))

sys.exit(0)
PY
