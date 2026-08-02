#!/usr/bin/env bash
#
# Approval-gate guard — PreToolUse hook for Write | Edit | MultiEdit.
#
# The gate separates WHO DECIDES from WHO TYPES:
#   • Neil DECIDES every Status (APPROVED / REJECTED / DEFERRED). Always.
#   • The main Claude Code agent MAY TYPE a Status line into a proposal file, but
#     only as a faithful transcription of an explicit instruction Neil gave in the
#     same conversation, and it must record provenance in the Note line. (That
#     transcription discipline is instructed in CLAUDE.md; it is a trust rule, not
#     something a hook can verify.)
#   • The product-manager subagent may NEVER set or change a Status/Note. It is
#     Write-only (no Edit/Bash/git, by its frontmatter), so its ONLY way to touch
#     a Status/Note is to Write a whole proposal file — and this hook blocks any
#     Write that introduces a non-PENDING Status or a non-empty Note. That, plus
#     its tool restrictions, fully contains it.
#
# Net effect (what the user asked for):
#   - Edit/MultiEdit of Status/Note lines: ALLOWED — only the main agent has Edit,
#     and that is the transcription path.
#   - Write that sets a non-PENDING Status or non-empty Note: BLOCKED — this is the
#     product-manager agent's only possible route to a Status/Note, so it is the
#     one that must stay shut. (The main agent doesn't need Write for approvals.)
#   - If a subagent identity is detectable and is product-manager, block outright.
#
# Contract: Claude Code sends the tool call as JSON on stdin. Exit 2 blocks the
# call and feeds stderr back to the model; exit 0 allows it.
#
set -euo pipefail

payload="$(cat)"

python3 - "$payload" <<'PY'
import json, sys, re, os

try:
    data = json.loads(sys.argv[1])
except Exception:
    sys.exit(0)  # unparseable → fail open, never wedge unrelated tool calls

tool = data.get("tool_name", "")
ti = data.get("tool_input", {}) or {}

def governed(p):
    p = (p or "").replace("\\", "/")
    return "ux-reports/" in p and p.endswith(".md")

# Best-effort: is the caller the product-manager subagent? Only trust specific
# env var names so file *content* mentioning "product-manager" can never
# false-positive and block the main agent.
def is_pm_agent():
    for k in ("CLAUDE_AGENT", "CLAUDE_AGENT_NAME", "CLAUDE_AGENT_TYPE",
              "CLAUDE_SUBAGENT", "CLAUDE_SUBAGENT_NAME", "CLAUDE_AGENT_ID"):
        if (os.environ.get(k) or "").strip().lower() == "product-manager":
            return True
    return False

STATUS_VAL = re.compile(r'(?im)^\s*Status\s*:(.*)$')
NOTE_VAL   = re.compile(r'(?im)^\s*Note\s*:(.*)$')
STATUS_NOTE = re.compile(r'(?im)^\s*(Status|Note)\s*:')

def block(msg):
    sys.stderr.write("APPROVAL-GATE BLOCKED: " + msg + "\n")
    sys.exit(2)

p = ti.get("file_path", "") or ""
if not governed(p):
    sys.exit(0)

pm = is_pm_agent()

# A detected product-manager agent may never touch Status/Note by any route.
if pm:
    if tool in ("Edit", "MultiEdit"):
        edits = ti.get("edits", [{"old_string": ti.get("old_string", ""),
                                   "new_string": ti.get("new_string", "")}])
        for e in edits:
            if STATUS_NOTE.search(e.get("old_string", "") or "") or \
               STATUS_NOTE.search(e.get("new_string", "") or ""):
                block("the product-manager agent may not edit a Status/Note line. "
                      "Every proposal it writes is PENDING; approval is Neil's.")
    # fall through to the Write check below too

# Write: block any content that sets a non-PENDING Status or a non-empty Note.
# This is the product-manager agent's only possible route to an approval (it is
# Write-only), so it stays shut for everyone; the main agent uses Edit instead.
if tool == "Write":
    content = ti.get("content", "") or ""
    for m in STATUS_VAL.finditer(content):
        val = m.group(1).strip()
        if val != "PENDING":
            block(f"a Write set `Status: {val or '(empty)'}` in a proposal file. "
                  "Proposals may only be *written* with Status: PENDING; set an "
                  "approval with a targeted Edit (main agent, with a provenance Note).")
    for m in NOTE_VAL.finditer(content):
        if m.group(1).strip():
            block("a Write populated a `Note:` line in a proposal file. Write "
                  "proposals with an empty Note; set notes via a targeted Edit.")

# Edit/MultiEdit by the main agent (Status/Note transcription) is allowed.
sys.exit(0)
PY
