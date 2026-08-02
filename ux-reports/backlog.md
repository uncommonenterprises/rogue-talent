# Backlog

Proposals cut by the 10-per-run cap, or items Neil marked DEFERRED, land here.

## Model onboarding — 2026-08-02 (cut from pm-20260802-1352, ranked below the top 10)

_Promoted into the run by Neil (2026-08-02): "all measurements required" → RT-20260802-11 (re-rated blocker); "{panelHeading}" tab-title bug → RT-20260802-12._


- **Signup form drops all brand voice.** Labels/placeholders are generic Sharetribe ("User type", "jane.doe@example.com", "Jane"/"Doe") while the landing page is all "go rogue / the model, disrupted". Give the signup a brand-led heading/subhead and fashion-flavoured placeholders. Severity: polish. Touches: SignupForm.js, en.json. Evidence: screenshots/02b-signup-model-form.png.
- **No Model-vs-Client explainer on the user-type dropdown.** The first choice ("Model" / "Client") has no one-line description of which is which. Add helper text, e.g. Model = "I get booked" / Client = "I book models". Severity: polish. Touches: SignupForm.js, en.json. Evidence: screenshots/02a-signup-usertype.png.
- **Footer still links "Post a new listing"** (→ /l/new) app-wide, contradicting the "Create your profile" terminology decision. Severity: polish. Touches: en.json (footer nav label) / Console footer content. Evidence: screenshots/14-your-listings-draft-state.png.
- **NoAccessPage (posting-rights) copy is generic boilerplate.** "You don't have posting rights / To post listings, you need to receive posting rights from the Rogue Talent team." Off-brand, says "post listings" not "create your profile", no timeframe, no CTA/way back. Only surfaces if the approval gate is turned on (RT-20260802-08). Severity: polish. Touches: NoAccessPage copy, en.json. Evidence: screenshots/05-noaccess-postingrights-copy.png.
