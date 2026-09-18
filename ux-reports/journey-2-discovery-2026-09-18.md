# Journey 2 — Client Discovery & Search
**Date:** 2026-09-18  
**Tester:** Priya Shah (rt-client-01)  
**Status:** COMPLETED — Discovery is fundamentally sound; 4 issues to address (1 blocker, 2 high-friction, 1 polish).

## Summary
The client discovery experience is navigable and functional. Entry points work, search returns results with comprehensive filters, talent cards display key information, and listing pages render full profiles with booking CTAs. However, there is one critical data issue (verified model missing portfolio photo), one accessibility bug (aria-labels), and console errors present throughout.

---

## Findings

### 1. BLOCKER — Missing portfolio photo on verified model listing
**Screen:** Search results card (Anais P.) → Listing page `/l/anais-p/6a6f3fd4-65e4-43e7-b4e9-31643124d66c`  
**What happened:** Anais P. (rt-model-03, verified, professional-level model) displays "No image" in both the search card and the listing hero section. Jane F. and Lucykins both have photos. This is either a data seeding issue or a display/image-fetch bug for this specific model.  
**What a user would think:** "Something's broken here — this verified model should have portfolio photos, and it looks incomplete/unprofessional."  
**Severity:** Blocker — verified models without images damage credibility, especially on the first touchpoint (search card).  
**Proposed change:** Investigate why Anais P.'s portfolio photos are not rendering. Verify that photos were uploaded to the listing during seeding, and confirm the image URL generation/CDN fetch is working for all models.  
**Likely files:** `src/components/ListingCard/`, `src/containers/ListingPage/`, Sharetribe image/asset pipeline (may be seeding issue).  
**Effort estimate:** 1–2h investigation; fix depends on root cause.

**Status:** PENDING  
**Note:**

---

### 2. HIGH — Talent card aria-label renders as `[object Object]`
**Screen:** Search results `/s`  
**What happened:** The snapshot shows card links with aria-label text like `"Anais P., ,[object Object], ,[object Object]"`. This suggests the card's aria-label is being constructed from an object that isn't being serialized to a string.  
**What a user would think:** If using a screen reader, the model's name and key attributes would be unreadable (replaced with "[object Object]" noise). Sighted users see nothing wrong.  
**Severity:** High — accessibility violation; breaks screen-reader navigation.  
**Proposed change:** Check `ListingCard` component (likely `src/components/ListingCard/` or search-results wrapper) where the link aria-label is built. Ensure location, rate, or tags are stringified (not passed as objects) when constructing the label.  
**Likely files:** `src/components/ListingCard/ListingCard.js`, `src/containers/SearchPage/` (card wrapper).  
**Effort estimate:** 0.5–1h.

**Status:** PENDING  
**Note:**

---

### 3. HIGH — Console errors throughout search and listing pages
**Screen:** Search results `/s`, all listing pages (`/l/anais-p/...`, `/l/jane-f/...`, `/l/lucykins/...`)  
**What happened:** Every page shows 8 "recoverable-error" console errors logged to Sentry. The errors are generic Sentry messages and don't expose the underlying issue in the console snapshot. The page continues to function (hence "recoverable"), but the errors indicate unhandled exceptions or API failures.  
**What a user would think:** Nothing visible, but error logging suggests data-fetching or component failures that may not be gracefully handled in all cases.  
**Severity:** High — suggests systematic error handling that should be surfaced or fixed.  
**Proposed change:** Check browser console in detail (beyond the snapshot) to identify which component/API call is triggering the recoverable errors. Likely candidates: user profile fetch, listing image CDN fetch, or filter/search API. Reproduce in dev, log full stack trace, and fix the root cause.  
**Likely files:** Redux actions (data fetching), Sharetribe SDK calls, image CDN error handling.  
**Effort estimate:** 1–3h investigation; fix depends on root cause.

**Status:** PENDING  
**Note:**

---

### 4. FRICTION — No alternative sort options visible (only "Newest")
**Screen:** Search results `/s`, sort dropdown  
**What happened:** The search results page shows a "Sort by" button with only "Newest" visible as an option. It's unclear whether other sorts (price, rating, relevance) are available or not.  
**What a user would think:** "Can I sort by price? Rating? That would help me find the right model faster, but I don't see the option."  
**Severity:** Friction — limits discovery workflow but not a blocker; results are visible without sorting.  
**Proposed change:** If other sort options exist in Sharetribe, expose them in the dropdown (price ascending/descending, rating, relevance). If only "Newest" is configured, consider adding "Price: Low to High" and "Price: High to Low" as Sharetribe filter values. Clarify the expected sort options and ensure they're wired in the search component.  
**Likely files:** `src/containers/SearchPage/`, `src/containers/SearchPage/SearchFilters/SearchFiltersDesktop.js` (sort button), Sharetribe listing API query params.  
**Effort estimate:** 1–2h.

**Status:** PENDING  
**Note:**

---

### 5. POLISH — Talent cards in search lack location/meta eyebrow
**Screen:** Search results `/s`, talent card component  
**What happened:** The search cards show name + rate + "View" button, but do NOT display location or attribute tags (e.g., "Editorial", "Fashion", height range). By contrast, the design-system spec (rt-talent component) includes a location eyebrow and category tags below the name.  
**What a user would think:** "I can see the name and price, but not where they're based or what they specialize in—I have to click through to compare."  
**Severity:** Polish — discovery is usable, but filtering by attributes requires opening each card.  
**Proposed change:** Compare the current search-card layout to the design-system `rt-talent` spec. Add location (city + country) and modelling-category tags below the model name to match the spec and enable at-a-glance filtering.  
**Likely files:** `src/components/ListingCard/ListingCard.js`, `src/components/ListingCard/ListingCard.module.css`, `design-system/components.css` (rt-talent spec).  
**Effort estimate:** 1–2h.

**Status:** PENDING  
**Note:**

---

## What works well
- **Entry points:** Landing page → "Browse talent" and "Discover" nav link both navigate to `/s` correctly.
- **Search results:** Returns 3 seeded models; page loads and displays all three.
- **Filters:** Comprehensive filter set (Gender, Height, Hair/Eye colour, Ethnicity, Experience, Categories, Availability radius, Rates, Price, Keywords, Travel costs, Booking notice); at least Gender filter tested and confirmed functional.
- **Listing pages:** All three models' profiles open correctly. Attributes, measurements, rates, categories, location button, About section, and booking date picker all render.
- **Photo gallery** (Jane F., Lucykins): Photo carousel with thumbnail navigation works correctly.
- **Verified badge:** Displays correctly on Anais P. card and profile.
- **Booking CTA:** "Request to book" button and date pickers present on all profiles.

---

## Not tested
- Location/radius filter (no city/postcode input field found in sidebar; may require map interaction).
- Pagination (only 3 results, unclear if pagination is needed or how it behaves).
- Keywords filter (not activated).
- Full photo gallery interaction (e.g., swipe, keyboard navigation on Jane F./Lucykins; only confirmed buttons exist).
- Sort option click-through (button visible, unclear if dropdown opens).
- Empty-state search (did not create a query that returns 0 results).
- Logged-out discovery (all testing done while logged in as Priya Shah).

---

## Conclusion
Discovery is **fundamentally sound** and ready for user testing, with one critical data issue and one accessibility bug blocking full greenlight. The missing portfolio photo on a verified model is a trust/credibility issue that must be resolved before any client user testing. Console errors should be investigated to confirm they're benign. Friction/polish items (sort options, location in cards) can ship as follow-ups.
