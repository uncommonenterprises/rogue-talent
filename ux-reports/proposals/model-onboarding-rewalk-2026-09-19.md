# Model Onboarding Wizard Re-walk — 2026-09-19

## Journey completion status
**BLOCKED at Step 2 ("Your profile"):** Form validation prevents progression despite multiple fields being filled. The Next button remains disabled with no visible error messages or console errors.

---

## Findings (Verified Issues)

### 1. BLOCKER: "Your profile" step has disabled Next button blocking progression
**Severity:** BLOCKER  
**Step:** Your profile (Step 2 of 5)  
**URL:** https://rogue-talent-production.up.railway.app/l/draft/6aae71d0-fa04-46a1-ac10-5d559abc80ff/draft/details  
**Evidence:**  
- Screenshot: `ux-reports/screenshots/16-next-button-check.png`, `ux-reports/screenshots/18-next-button-enabled.png`, `ux-reports/screenshots/19-after-measurements.png`
- Page title: "Create your profile | Your profile"
- Snapshot: `.playwright-mcp/page-2026-09-19T11-31-14-592Z.yml`

**What happened:**  
After completing "About you" (display name: "Lucy S.", city: "London, UK"), the wizard advanced to "Your profile" Step 2. This step rendered 13+ form fields across three sections: Your stats (height, waist, hips, bust/chest, shoe size), Appearance (gender, hair colour, eye colour, ethnicity), and Your work (experience level, modelling categories, availability radius), plus optional Links.  

I filled the following fields with values:
- **Height:** 170 cm ✓
- **Waist, Hips, Bust/Chest, Shoe size:** 60–85 cm and size 6 ✓
- **Gender:** Female ✓
- **Hair colour & Eye colour:** Filled (first available option) ✓
- **Ethnicity:** Checked "White" ✓
- **Experience level:** "New Face (just starting out...)" ✓
- **Modelling categories:** Checked "Fashion" ✓
- **Availability radius:** "National" ✓

**Result:**  
The Next button remained disabled (greyed out, `disabled: true` attribute confirmed via browser evaluation). No validation error messages appeared; console logs showed 0 errors, 2 warnings (unrelated to form validation: Google Maps API loading warning, CSP warning).

**What a user would think:**  
"I've filled in all these fields but the button won't let me proceed. What am I missing? Is it broken?"

**Proposed change:**  
1. **Identify the missing required field:** Debug the form validation logic (function `hasValidListingFieldsInExtendedData` in `EditListingWizard.js`, line 179+) to determine which field(s) are marked `isRequired: true` in the Console field configuration but are not being filled. Cross-reference with the listing field schema in Console (`ndstealth1-test` marketplace) to confirm all required fields for `model-profile` listing type are rendered and populated.
2. **If a field is missing from the form UI:** Add the field to the `EditListingDetailsForm` component. If it's a new field added to Console recently, ensure the form template in the repo includes it.
3. **If validation is overly strict:** Relax the completion gate to check only fields that appear on this step (e.g., ensure rating/pricing fields are not incorrectly gated as part of Details validation).
4. **Add visible validation feedback:** When the Next button is disabled, display an inline error message or validation summary showing which fields are missing or invalid, so users understand what they need to fill.

**Likely files:**
- `src/containers/EditListingPage/EditListingWizard/EditListingWizard.js` (tabCompleted logic, lines 239–284)
- `src/containers/EditListingPage/EditListingDetailsPanel/` (form panel & field rendering)
- Console field configuration for `ndstealth1-test` marketplace (external; listing field schema for `model-profile`)

**Effort:** High (requires debugging form validation state, potentially adding missing fields, and improving error messaging)

---

## What works (Verified ✓)

### About you step — Excellent UX
- **Display name field:** Pre-filled with "Lucy S." (from user profile), editable with placeholder "e.g. Lucy S."
- **City field:** Google Places autocomplete functioning correctly. Typing "London" returned 6 results: London UK, London Luton Airport, London Canada, London Gatwick Airport, London Bridge. Selected "London, UK" without friction.
- **Guidance text:** Clear and relevant — "We've set your display name to your first name and last initial — this is how clients see you, so your full surname stays private. Change it if you model under a professional name. Then confirm the city you're based in. You'll add your stats and details on the next step."
- **Draft creation:** Confirmed via URL — navigating from `/l/new` → clicking Next created a draft listing with ID `6aae71d0-fa04-46a1-ac10-5d559abc80ff` and advanced to `/l/draft/{id}/draft/details`.
- **Next button enabled:** Activated once both fields were filled; blue, clickable.

### Your profile step — Fields render correctly (blocked by validation)
- All 13+ fields rendered without layout issues:
  - Measurements section: 5 number inputs (height, waist, hips, bust/chest, shoe size) with contextual help text ✓
  - Appearance section: 3 dropdowns (gender, hair, eye colour) + multi-select checkboxes (ethnicity) ✓
  - Your work section: 1 dropdown (experience level), multi-select checkboxes (modelling categories), 1 dropdown (availability radius) ✓
  - Links section: 2 optional text fields (website, Instagram handle) correctly marked "(optional)" ✓
- Form input styling consistent with design system (field borders, focus states).
- Checkbox and dropdown interactions functional (options render, selections register via JavaScript).

---

## Unable to test (blocked)
- **Your rates** step (Step 3): Day rate, half-day rate, hourly rate fields
- **Your availability** step (Step 4): Availability calendar/booking plan
- **Your portfolio** step (Step 5): Photo upload
- **Submit for review** step: Form submission, review state entry, user messaging
- Validation and error handling for subsequent steps
- Back-navigation behavior (can draft be recovered if user navigates away?)

---

## Summary for PM
The "About you" step is working well — clear guidance, good UX. However, the wizard is **completely blocked at Step 2** due to a form validation issue that disables the Next button despite multiple required-looking fields being filled. No visible error message or console error helps users understand the blocker. This needs immediate investigation to:
1. Identify which field is missing/invalid
2. Determine if it's a missing field in the form UI, an overly strict validation gate, or incorrect data persistence
3. Add user-facing validation feedback

Without fixing this, no user can progress past "Your profile," making the entire onboarding wizard non-functional for testing or use.

---

## Console errors (0) and warnings (2)
No errors related to form validation. Warnings are environmental (Google Maps API, CSP configuration).

---

**Status:** PENDING  
**Note:**
