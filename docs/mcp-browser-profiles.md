# Browser MCP profiles — isolated (PM) vs persistent (Console): don't let them collide

We drive browsers from agents for two very different jobs, and they need
**opposite** profile settings. Keeping them as separate MCP servers avoids one
breaking the other.

## PM runs → ISOLATED (clean every time)
The `product-manager` agent walks *fresh-user* journeys (e.g. a brand-new model
signup). Any carried-over cookies or logged-in state would contaminate the test —
a "fresh signup" that inherits a previous run's session is not a fresh signup.

Server (this is the one wired for the PM agent, tools `mcp__playwright__*`):
```
claude mcp add playwright -- npx @playwright/mcp@latest --isolated
```
`--isolated` keeps the browser profile in memory and wipes it when the session
ends, so run N+1 never inherits run N's state. Without it, Playwright MCP defaults
to a **persistent** on-disk profile and successive runs share cookies/login.

## Console / ops automation → PERSISTENT (stays logged in)
Later, an agent that drives the Sharetribe **Console** UI wants the *opposite*: a
persistent profile so it stays logged in across steps and runs, rather than
re-authenticating every time (and re-doing any 2FA).

When we add that, use a **separate** server with a **different name** and NO
`--isolated`, e.g.:
```
claude mcp add playwright-console -- npx @playwright/mcp@latest --user-data-dir <path>
```

## The collision to avoid
Do NOT reuse one server for both. If the Console automation flips the shared
`playwright` server to persistent, the next PM run is no longer clean and its
"fresh signup" findings become invalid; if a PM run wipes a shared persistent
profile, the Console agent gets logged out mid-task. Two jobs, two servers, two
profile modes — keep them separate.

## Restart note
Adding or changing an MCP server requires a **Claude Code restart** — servers are
initialised at startup, not hot-loaded. Verify with `/mcp` after restarting.
