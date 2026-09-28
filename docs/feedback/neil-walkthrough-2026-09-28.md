# Neil's walkthrough feedback - 28/09/2026

Running log of Neil's first-hand run-through of the test site. Each item gets an ID, a triage type,
and a status. Source of truth for what we fix from this pass.

Types: **Bug** (broken), **Copy** (wording), **Design** (visual), **UX** (flow/friction),
**Feature** (new capability), **Question** (needs a decision).

Status: **Open** -> **Agreed** (fix approach confirmed) -> **Fixed** (merged + verified live) |
**Parked** (deliberately deferred) | **No change** (discussed, keeping as is).

---

## Journey 1 - Model onboarding

| ID | Where | Feedback | Type | Plan | Status |
|---|---|---|---|---|---|
| RT-FB-01 | Sign up / log in page | Looks very basic; the background image makes no sense. | Design | Fern photo is the Sharetribe default login background (Console branding asset; code fallback is a sample image). Page only shows a "User type" dropdown until a role is picked, leaving a big empty gap; generic template copy. Proposal: redesign as a split layout (branded ink panel with headline + value prop, no stock photo; form on the right) with the role picker as two cards ("I'm a model" / "I'm booking talent"). Batch into one ux-designer brief covering all onboarding screens. | Open |
| RT-FB-02 | Sign up form, password field | "Use at least 8 characters" hint overlaps the password input. | Bug | Stock `.passwordHint { margin-top: -12px }` pulled the hint into the taller design-system input. Set to `+6px` (matches the DOB hint) + DS muted colour. Checked other password forms: no other instances. | Fixed (awaiting deploy) |
