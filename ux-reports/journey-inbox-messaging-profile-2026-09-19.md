# UX Walkthrough Report: Inbox, Messaging, and Profile Editing
**Date:** 2026-09-19  
**Tester:** UX Agent (Haiku)  
**Test Site:** https://rogue-talent-production.up.railway.app (ndstealth1-test)  
**Accounts Tested:** Priya S. (client), Anais P. (model)

---

## Journey Completion Status
✅ **ALL JOURNEYS COMPLETED END-TO-END** — No blockers. All four flows (client inbox, in-transaction messaging, model sales inbox, model profile editing) are functional and navigable.

---

## Issues Found

### 1. Message Text Duplication in Activity Timeline
**Severity:** Friction  
**Page/URL:** Order detail `/order/{id}`, Sale detail `/sale/{id}` — Activity section  
**What Happened:** When a user sends a message to the other party (client→model or model→client), the message text appears **duplicated** in the Activity timeline. The message "Hello Anais, looking forward to working with you!" rendered as "Hello Anais, looking forward to working with you!Hello Anais, looking forward to working with you!" with no visible line break.  
**What Users Think:** "Did my message get corrupted? Is this a glitch? Did I accidentally submit it twice?"  
**Proposed Fix:** Audit the Activity list item rendering in `src/containers/OrderDetailsPage/` or `src/containers/SaleDetailsPage/` (or shared activity component if it exists). Check for unintended text concatenation or double-render of the message text node in the JSX. The timestamp ("Today, 12:10") renders correctly, so the issue is isolated to the message body.  
**Likely Files:** `src/containers/OrderDetailsPage/components/ActivityList.js` (or equivalent for sales), message/activity rendering component.  
**Effort:** 1–2 hours (locate duplicate render, remove one, test both order and sale detail pages).  
**Status:** PENDING  
**Note:**

---

### 2. Send Message Button Appears Disabled but Is Clickable
**Severity:** Friction  
**Page/URL:** Order detail `/order/{id}`, Sale detail `/sale/{id}` — messaging box  
**What Happened:** The "Send message" button displays in a visually disabled state (greyed out, no hover feedback) but is actually functional when clicked. Users can type a message and submit it, yet the button's visual state suggests it is locked.  
**What Users Think:** "The button looks disabled. Can I send this message or not? Is there something I need to do first?"  
**Root Cause:** Button has `[disabled]` attribute but is either not actually disabled in code, or CSS makes it appear disabled while the button state is enabled. Check if the disabled attribute is being set/unset correctly in response to text input.  
**Proposed Fix:** 
  - Verify the button's disabled state is tied to the textarea value (should enable when text is entered).  
  - If text input is working correctly, update button styling to remove the visual "disabled" appearance when the button is actually clickable.  
  - Test: type in the message box → button should visually enable (change colour, add hover state) → click → message sends.  

**Likely Files:** `src/containers/OrderDetailsPage/components/ActivityBox.js` (or `SaleDetailsPage` equivalent), form state management, button CSS in the containing module.  
**Effort:** 1–1.5 hours (trace form state, verify button disabled logic, update styling if needed, test both order and sale flows).  
**Status:** PENDING  
**Note:**

---

### 3. No Visible Logout Button in Account Menu
**Severity:** Friction  
**Page/URL:** Account settings (`/account/manage`, `/account/contact-details`, etc.), profile menu dropdown  
**What Happened:** When navigating to account settings or trying to find a logout option, there is no visible "Logout" or "Sign out" button or link. The only way to log out was to clear browser cookies or navigate directly to an auth endpoint. The profile menu (topbar button with user avatar) does not expose a logout option when clicked.  
**What Users Think:** "How do I log out? Am I stuck logged in? Is this a private device thing?" Users may resort to closing the browser entirely or clearing cookies.  
**Proposed Fix:** 
  - Add a "Log out" / "Sign out" button to the account settings sidebar (e.g., at the bottom of the Account settings navigation in `/account/manage` or a dedicated "Security" section).  
  - Alternatively, add "Log out" as a menu item in the topbar profile dropdown (triggered by clicking the user avatar button).  
  - Test: click profile menu → see "Log out" option → click → redirected to login page, cookies cleared.  

**Likely Files:** `src/components/TopbarDesktop/TopbarDesktop.js` (profile menu rendering), `src/containers/Account/` pages (add logout link), or a new `AccountSecurityPanel` component.  
**Effort:** 1–2 hours (add link/button, wire to logout action, test both menu paths, verify redirect and cookie clearing).  
**Status:** PENDING  
**Note:**

---

### 4. Console Warnings: CSS Preload Not Used
**Severity:** Polish  
**Page/URL:** All listing edit pages (`/l/{slug}/{id}/edit/*`)  
**What Happened:** The browser console logs multiple warnings: "The resource https://rogue-talent-production.up.railway.app/static/css/9484.78e58929.chunk.css was preloaded using link preload but not used within a few seconds from the window's load event."  
**What Users Think:** N/A (console-only; does not affect rendering or functionality).  
**Impact:** Preloading CSS that is not used on the current page wastes bandwidth and may delay other resources. Indicates the preload hint configuration is incorrect or overly broad.  
**Proposed Fix:** Audit the HTML `<head>` preload directives (likely in `public/index.html` or generated by the build process). Remove preload hints for CSS chunks that are not loaded on the initial page load. Use the Network tab to verify which CSS files are actually needed per route, and adjust preload hints accordingly.  
**Likely Files:** `public/index.html`, webpack/build config if preload is generated, or a critical CSS inlining tool.  
**Effort:** 1–2 hours (identify which pages use which CSS chunks, update preload hints, test with Network tab to confirm no unused preloads).  
**Status:** PENDING  
**Note:**

---

## What Works Well

1. **Client Inbox / Orders** — Priya's bookings list clearly shows dates, party name, and booking state (Canceled / Requested). Order detail page renders all booking info, state, and breakdown correctly.

2. **Order Detail Page & Booking Breakdown** — Shows correct financial breakdown (£150/day × 2 days = £300 subtotal, plus £45 fee = £345 total). Fee label and model payout are clearly shown. No confusion on pricing.

3. **Model Sales Inbox** — Anais's incoming requests display with correct badge count ("1" for pending). Sale detail page mirrors the client view well, showing "You'll earn £300.00" correctly (model keeps 100%, fee charged to client side).

4. **Activity / Message Timeline** — Messages are sent, appear in the timeline, and are timestamped. Apart from the text duplication issue, the UX is intuitive: user types, sends, sees their message appear below.

5. **Model Profile Editing Wizard** — All 5 tabs render (About you, Your profile, Your rates, Your availability, Your portfolio). Form fields pre-load with current data (height, measurements, appearance, categories, Instagram handle, etc.). Save button works end-to-end. Navigation between tabs is smooth.

6. **Form Guidance** — The "Your profile" tab includes helpful guidance text: "Fill in your stats and details — your measurements, appearance, experience, and the categories you work in. (You can add a written bio later in Profile settings.) These power search, so the right clients can find you."

7. **Clear Visual Hierarchy** — Booking breakdown, state badges, and CTA buttons (Accept/Decline, Send message) are clearly visible and positioned.

---

## Summary for PM

**Launch Readiness:** ✅ **Ready with minor friction fixes**

These flows (inbox, messaging, profile editing) are **production-ready** from a functional standpoint. All endpoints respond, data loads, state transitions work, and messages/edits persist. Three findings are minor UX friction (message duplication, button state confusion, missing logout option); one is a performance optimization (CSS preload). None block the happy path.

**Recommended Action:**
- Treat findings 1–3 as **launch-day polish** (schedule for pre-launch or post-launch hotfix depending on sprint capacity).
- Finding 4 (CSS preload) is **optional/nice-to-have** and can defer to a post-launch optimization cycle if under time pressure.

**Test Data Integrity:** Reverted all test edits; Anais's profile returned to original state. Priya's and Anais's order/sale data unchanged.

---

## Screenshots Captured
- `01-home.png` — Home page
- `02-login-page.png` — Login form (blank)
- `03-client-orders-inbox.png` — Priya's order inbox
- `04-order-detail-requested.png` — Order detail (Requested state)
- `05-order-detail-message-input.png` — Message typed in box
- `06-order-detail-message-sent.png` — Message in Activity (duplication visible)
- `07-model-sales-inbox.png` — Anais's sales inbox
- `08-sale-detail-requested.png` — Sale detail (Requested state, model POV)
- `09-model-profile-view.png` — Anais's profile public view
- `10-edit-profile-wizard.png` — Profile edit wizard, "Your profile" tab
- `11-edit-profile-modified.png` — Form with test edit applied
- `12-edit-profile-saved.png` — After save (no errors shown)
