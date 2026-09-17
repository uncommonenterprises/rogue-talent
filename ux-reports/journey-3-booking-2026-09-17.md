# Journey 3 UX Report: Client Discovery & Booking
**Date:** 2026-09-17  
**Tester:** UX Tester  
**Status:** BLOCKED — Date picker prevents booking completion  

## Journey Summary
This journey attempted to walk a complete client booking flow on Rogue Talent: discover a model via search, view their profile, select dates, proceed through payment, and confirm the transaction. **The journey could not be completed due to a critical blocker in the date selection/booking form.**

## Route
- Login as client: `hi+rt-client-01@uncommonenterprises.co.uk`
- Search `/s` → find model → select dates → checkout → payment

## Findings

### 1. Discovery: Search Results Render Correctly (POLISH FRICTION)
**URL:** `/s`  
**What I found:**  
Three models displayed: Anais P. (£150/day), Jane F. (£500/day), Lucykins (£500/day). All show portrait photos (or "No image" placeholder), verified badges where applicable, name, rate, and "View" CTAs. Layout is clean and matches design system talent cards.

**What users think:**  
Listing cards are scannable; rate is prominent; verified badges build trust.

**Severity:** Polish  
**Proposed change:** No action needed (cards are well-designed).  
**Note:** Jane F.'s listing photo failed to load visibly in search results, showing only "Jane F." link text; confirm image URLs and alt-text resilience.

---

### 2. Listing Page: Full Profile Renders; Booking Panel Present (BLOCKER)
**URL:** `/l/jane-f/6a5a9465-b1b9-40c8-9c10-06bde2083906`  
**What I found:**  
- Profile shows: photo, measurements (Height 180cm, Waist 50cm, Bust 80cm, Shoe size 5), hair/eye colour, experience level, availability radius, categories (Fashion, Commercial, Editorial, Lifestyle, Swimwear, Parts), half-day/hourly rates, travel costs (Charged), minimum 48-hour notice.
- Booking panel on the right: Start/End date textboxes (placeholders: "Thu 17 Sept" / "Fri 18 Sept"), calendar date picker, "Request to book" button, "You won't be charged yet" reassurance copy.
- Day rate displayed prominently: £500.00/day.

**What users think:**  
Profile is comprehensive and trustworthy. Booking panel is accessible and initial copy reassures the user they won't be charged yet.

**Severity:** Blocker (prevents booking completion)  
**Problem:** Calendar date picker has a critical UX/technical issue (see Finding #3).  
**Proposed change:** Fix the date picker to reliably accept date selections (see #3).

---

### 3. Booking Form: Date Picker Broken (BLOCKER)
**URL:** `/l/jane-f/...` (booking panel on listing page)  
**What I found:**  
- Attempted to book Sept 21–22, 2026 (1 day) for Jane F. (£500/day).
- Filled start/end date textboxes by typing "21 September 2026" and "22 September 2026" directly. Clicked "Request to book" → error: "Select an available date".
- Clicked on the start date field to open the calendar picker. Calendar rendered showing September 2026. Dates 1–17 marked "not available" (disabled buttons), dates 18–30 marked "Choose [date]" (enabled buttons).
- Attempted to click calendar buttons (e.g., "Choose 21 September") via Playwright. Clicks either did not register or did not populate the form field, leaving error state "The start date is not valid".
- On a second model (Lucykins, £500/day), the same sequence occurred; calendar showed fewer available dates (only 21, 22, 28, 29 were enabled) yet produced the same validation error after "Request to book" was clicked.

**What users think:**  
"I can see dates are available, but I can't book them. The form isn't responding to my clicks. Is the site broken?"

**Severity:** Blocker  
**Why it blocks the journey:**  
1. Typing dates directly into textboxes fails validation (error: "Select an available date").
2. Clicking calendar date buttons does not populate the form fields.
3. Unable to proceed past this step to reach checkout, payment, or confirmation.

**Proposed change:**  
- **Investigate the calendar picker's event handlers** — ensure calendar button clicks properly populate the start/end date fields and trigger validation/state updates. Check if Playwright clicks are registered by the calendar component (may be a React/event delegation issue).
- **Improve date input validation** — clarify what date formats are accepted; consider allowing text input with format hints (e.g., "DD Mon YYYY" matching the placeholder) or use a native HTML `<input type="date">` as a fallback.
- **Error messaging** — if validation fails, specify what's wrong: "Please select an available date from the calendar" (not just "Select an available date").
- **Test with a date-picker testing library** (e.g., Playwright's `locator.fill()` for date inputs, or inspect event listeners to ensure React state updates fire).

**Likely files:**  
- `src/containers/ListingPage/` (or equivalent booking form component)  
- Calendar component (likely `react-dates` or similar; check `package.json`)  
- Form validation logic (check for date range, minimum notice, availability constraints)

**Effort estimate:** Medium (2–3 days: debug event handlers, add test coverage, improve UX copy)

---

### 4. Minimum Booking Notice Not Clear at Point of Selection (FRICTION)
**URL:** `/l/jane-f/...`  
**What I found:**  
Jane F.'s profile shows "Minimum booking notice: 48 hours" in the Details section, but this constraint is not shown in or near the booking panel. When I attempted to book Sept 21–22 (4 days from today, Sept 17), the form gave a generic error rather than explaining the rule.

**What users think:**  
"I don't know why certain dates aren't available. The rule is hidden in the details section, not obvious when I'm trying to book."

**Severity:** Friction  
**Proposed change:**  
- Display minimum booking notice near the date picker or in a tooltip: e.g., "Must book at least 48 hours in advance."
- Show a visual indicator (e.g., greyed-out dates or a note) for dates that fall within the notice period.
- If a user selects an invalid date range, error message should say: "Please book at least 48 hours in advance. Next available date: [date]."

**Likely files:**  
- Booking form component  
- `en.json` (copy)

**Effort estimate:** Low (1–2 days: add copy, compute next valid date, update form UI)

---

### 5. Model Availability Varies Widely; rt-model-03 Not Clearly Identified (FRICTION)
**URL:** `/s` and individual listing pages  
**What I found:**  
- Lucykins: only 4 available dates in September (21, 22, 28, 29).
- Jane F.: 13 available dates in September (18–30).
- Anais P.: not tested due to blocker in other models.

**What users think:**  
"These models have very different availability. How do I find someone available when I need them? And which one is rt-model-03 with Stripe enabled?"

**Note:** The task stated rt-model-03 has Stripe payouts enabled. None of the three search results were obviously labelled as rt-model-03. Unclear if Stripe enablement is a visible property or if a specific model was intended.

**Severity:** Friction (not a blocker)  
**Proposed change:**  
- Consider adding an "Available" or "Next available: [date]" label to search cards for quick scanning.
- If Stripe enablement is a buyer-facing feature, consider a badge (e.g., "Instant payment" or similar) on models who support it.

**Likelihood / files:**  
- Search card component (`ListingCard.js`)  
- `en.json`

**Effort estimate:** Low (1 day: add metadata field, update copy & card template)

---

### 6. Console Errors Present (POLISH)
**URL:** All listing pages  
**What I found:**  
Multiple "recoverable-error" messages logged to the browser console (8 errors across page loads). Errors appear to be Sentry error logging and did not appear to block rendering or interaction, but indicate unhandled exceptions or API errors.

**What users think:**  
Not visible to end users in normal conditions, but errors may indicate missing data, failed requests, or silent failures.

**Severity:** Polish  
**Proposed change:**  
Review console errors; check Sentry dashboard for details. Likely candidates: missing user metadata, failed geolocation queries, or missing listing image URLs.

---

## Blocker Summary
**This journey cannot be completed.** The date picker in the booking panel does not accept date selections via text input or calendar button clicks. After multiple attempts on two different models, the form consistently fails with "Select an available date" or "The start date is not valid" errors. Without resolving this, clients cannot proceed to checkout, payment, or booking confirmation.

**Recommendation:** Fix the calendar date picker (Finding #3) before Journey 3 can be tested end-to-end.

---

## Files to Review
1. Booking form component (likely `src/containers/ListingPage/`)
2. Calendar date picker component (inspect `package.json` for library; likely `react-dates` or similar)
3. Form validation logic and error messaging
4. `src/translations/en.json` (copy for error messages and field labels)
5. Search result card template (`ListingCard.js` or similar)

---

## Next Steps
- [ ] Debug calendar date picker event handlers and state updates
- [ ] Test date input with native HTML5 date input as a fallback
- [ ] Improve error messaging for booking validation failures
- [ ] Add minimum booking notice guidance near date picker
- [ ] Confirm which of the three search models is rt-model-03 (the one with Stripe enabled)
- [ ] Retry Journey 3 after blocker is fixed

---

**Status:** PENDING  
**Note:**
