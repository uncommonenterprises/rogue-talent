# UX Review — Model Onboarding — 2026-08-04
Agent run: pm-2026-08-04-0930 (SAMPLE) | Test account: hi+testmodel07@… | Build: a3f9c21

> This is a sample proposal file that ships with the scaffolding so the gate has
> something to demonstrate against. Real runs overwrite this pattern. Leave the
> Status/Note lines to Neil — a hook blocks any agent that tries to change them.

## RT-20260804-03 — Measurements requested before any explanation of why
Journey:   model-onboarding
Screen:    Create your profile → "Your profile" step (measurements block)
Severity:  friction
Evidence:  screenshots/model-onboarding-your-profile.png
User view: "Why does a booking site need my hip measurement before I've even
           seen what a client brief looks like? Feels invasive."
Proposal:  Add a one-line rationale above the measurements block — "Clients
           filter by these. You control who sees your profile." Move
           shoe_size_uk and eye_colour into an optional 'Add more detail'
           accordion to cut the visible field count.
Touches:   src/config/configListing.js, src/translations/en.json,
           EditListingDetailsPanel / EditListingDetailsForm
Effort:    M
Impact:    Est. highest drop-off step in the wizard
---
Status: PENDING
Note:
