# UX Review — Client Discovery & Search (Journey 2) — 2026-09-20
Agent run: ux-tester-2026-09-20 | Test env: https://rogue-talent-production.up.railway.app (ndstealth1-test)
Accounts used: logged-out visitor, rt-client-01 (Priya Shah)

**Journey completion: COMPLETED.** Browsed logged-out and as rt-client-01, applied
filters, opened result cards and two listing detail pages. Journey is walkable
end-to-end, but the filter sidebar — the primary discovery tool on `/s` — does
not work (see RT-20260920-01), and the model surfaced for booking has no
portfolio photos (RT-20260920-02).

6 findings below (max 10, ranked by impact). Nothing cut to backlog.

---

## RT-20260920-01 — Sidebar attribute filters (checkboxes) do not filter search results at all
Journey:   client-discovery
Screen:    `/s` search page, left filter sidebar (Gender, Hair colour, Eye colour,
           Ethnicity, Experience level, Modelling categories, Availability radius,
           Travel costs, Minimum booking notice)
Severity:  blocker
Evidence:  screenshots/j2-04-gender-filter-clicked.png (Female box visibly ticked,
           "4 results" unchanged), screenshots/j2-06-checkbox-filters-broken.png.
           Verified three independent ways, twice each:
           1. Network: after checking "Female" and separately "New Face"
              (Experience level), the resulting `GET
              https://flex-api.sharetribe.com/v1/api/listings/query...` request
              carries no `pub_gender` / `pub_experience_level` param at all —
              identical query string to the unfiltered load (requests #45 vs
              #55/#56/#57 in the network log).
           2. DOM: `document.getElementById('SearchFiltersDesktop.gender-
              checkbox-group.female').checked` stayed `false` after (a) a
              `browser_click` on the label ref, (b) a direct native
              `page.mouse.click` on the visible SVG checkbox's screen
              coordinates, and (c) a Playwright `force` click — all real clicks,
              not JS value-sets.
           3. Control test: the Keywords text filter and the Price range filter
              on the SAME sidebar, filled the same way, worked correctly and
              updated the URL (`?keywords=Anais` → 1 result; `?price=0%2C200` →
              1 result). This isolates the fault to the checkbox-group
              ("SelectMultipleFilter") filters specifically — it is not a
              general search-page or testing-method problem.
User view: A client ticks "Female" expecting the four cards to narrow to just
           the women — the box visibly ticks, "4 results" never changes, and
           Marcus B. (Male) stays on screen. They'd conclude search is broken
           and either keep manually scanning irrelevant cards or leave.
Proposal:  Debug why the `SelectMultipleFilter` checkbox-group filters aren't
           writing their value into the search query params on change (likely a
           wiring/prop-mapping issue between `FieldCheckboxGroup`'s onChange and
           the `SearchFiltersDesktop`/`SearchPage` URL-search-param updater —
           compare against how the working Price/Keywords filters wire their
           `onSubmit`). Fix once, re-test all nine affected filters together
           since they likely share the same component.
Touches:   src/containers/SearchPage/SearchFiltersDesktop (or equivalent
           filter-panel component), src/containers/SearchPage/SearchPage.shared.js
           (query-param construction), FieldCheckboxGroup / SelectMultipleFilter
Effort:    M
Impact:    This is the primary way a client is meant to narrow 4+ models by
           gender/look/experience/category — with 9 of ~12 filters silently
           inert, discovery degrades to "read every card."
---
Status: APPROVED
Note: APPROVED by Neil via decision-card 2026-09-20 — "Approve all defects" + "Approve all three [polish]". Implemented: 5ea803139 2026-09-20 (deploy-verify pending).

## RT-20260920-02 — Anais P., the platform's verified/fully-set-up example model, has zero portfolio photos
Journey:   client-discovery
Screen:    `/s` result card for Anais P. and her listing page
           `/l/anais-p/6a6f3fd4-65e4-43e7-b4e9-31643124d66c`
Severity:  friction (high — this exact listing is the one flagged for the
           money-path booking journey, see booking-request-2026-09-20.md)
Evidence:  screenshots/j2-03-search-loggedout.png (card shows "NO IMAGE"),
           screenshots/j2-07-anais-profile-noimage.png (full profile hero also
           "No image", no portfolio gallery at all). Snapshot text: `generic:
           No image` in both the search-result listitem and the listing-page
           hero. Test-account record confirms this is "Published, approved,
           id_verified" (.test-accounts.json, rt-model-03) — i.e. the intended
           reference model, not a half-finished draft.
User view: "This model is 'Verified' and charges £150/day but I can't see a
           single photo of her. Why would I book someone sight-unseen?" — for a
           modelling marketplace, a photo-less profile undermines the entire
           premise of the product.
Proposal:  Not a code fix — a content/seed-data gap. Add at least 3–4 portfolio
           images to the rt-model-03 (Anais P.) test listing so the reference
           account used in demos, screenshots and the booking-journey test
           actually demonstrates the product working. (If the "No image"
           placeholder itself needs work — e.g. making it less prominent/more
           reassuring for real users who haven't uploaded yet — that's a
           separate, lower-priority design item.)
Touches:   Test data only — Sharetribe Console / seed script
           (scripts/ops/seed-test-users.js or manual image upload to rt-model-03)
Effort:    S
Impact:    Directly undermines trust in the flagship "fully set up" demo
           account; also visible on the checkout page during booking.
---
Status: PENDING
Note: PENDING — not a code fix: seed/content gap (add portfolio photos to rt-model-03). Neil's task.

## RT-20260920-03 — Homepage "Featured talent" cards are non-interactive placeholder content, not real listings
Journey:   client-discovery
Screen:    `/` homepage, "Featured talent" section (Mara Voss, Jonah Reid, Aïcha
           Ndiaye, Lena Kaur)
Severity:  friction
Evidence:  screenshots/j2-01-landing-loggedout.png,
           screenshots/j2-10-featured-talent-non-interactive.png. DOM check:
           walking the ancestor chain from the "Mara Voss" text node up 5 levels
           returns only `DIV, DIV, DIV, DIV, DIV` — no `<a href>` anywhere, so
           the card is not a link. None of these four names appear in the real
           `/s` search results, which return only Anais P., Marcus B., Jane F.
           and Lucykins.
User view: A visitor sees four polished, "✓ Verified" model cards with premium
           day rates (£1,200, £850, €1,600, €1,100) right on the homepage,
           clicks one expecting a profile, and nothing happens — no
           navigation, no cursor change, no feedback. They may not even
           register it's decorative and just think the site is unresponsive.
Proposal:  Either (a) wire "Featured talent" to a real, live query against
           actual published listings (even if that means showing all 4 real
           ones today), or (b) if kept as static/marketing content until there's
           real inventory, make the cards visibly non-clickable (no hover
           affordance) and label the section clearly as illustrative, or (c)
           link each card through to `/s` like the section's own "View all →"
           link already does.
Touches:   src/containers/LandingPage (featured-talent section component),
           marketplace homepage data source
Effort:    S–M (S if just adding real query; M if building an editorial-content
           system for curated featured picks)
Impact:    First impression of marketplace scale/quality; currently promises
           inventory that isn't there.
---
Status: APPROVED
Note: APPROVED by Neil via decision-card 2026-09-20 — "Approve all defects" + "Approve all three [polish]".

## RT-20260920-04 — Footer shows unset Sharetribe boilerplate and links to Sharetribe's own social accounts, not Rogue Talent's
Journey:   client-discovery (cross-cutting — same footer on every page)
Screen:    Global footer, every page (`/`, `/s`, listing pages, checkout, etc.)
Severity:  friction (brand/trust)
Evidence:  screenshots/j2-01-landing-loggedout.png, j2-03-search-loggedout.png,
           j2-07-anais-profile-noimage.png. Snapshot text on every page: `In
           Console, go to Content → Footer to add your slogan here.` Footer
           social links point to `https://www.facebook.com/Sharetribe/`,
           `https://twitter.com/sharetribe`, `https://www.youtube.com/@Sharetribe`
           — Sharetribe's own accounts, not Rogue Talent's.
User view: A client scrolling to the footer for trust signals (About, contact,
           social proof) instead finds an unfinished CMS placeholder and links
           that, if clicked, take them to a totally unrelated company's social
           media. Reads as "this site isn't finished" / reduces credibility
           right when a client might be checking legitimacy before paying.
Proposal:  Set the real footer tagline and Rogue Talent's own social URLs (or
           remove the social icon row entirely if Rogue has no social presence
           yet) in Sharetribe Console → Content → Footer.
Touches:   Sharetribe Console content config only (no code); if social links
           are hardcoded in the repo rather than Console-driven, check
           src/config or footer.json content asset.
Effort:    S
Impact:    Low effort, cross-page, first-impression/trust fix.
---
Status: PENDING
Note: PENDING — Neil's Console task (Content → Footer: tagline + social links).

## RT-20260920-05 — Footer link still says "Post a new listing" instead of "Create your profile"
Journey:   client-discovery (cross-cutting — footer, every page)
Screen:    Global footer, "general" nav column
Severity:  polish
Evidence:  screenshots/j2-01-landing-loggedout.png. Snapshot: `link "Post a new
           listing" /url: /l/new` in the footer nav, on every page checked
           (home, search, listing, checkout, order confirmation, inbox).
User view: Minor, but inconsistent with the rest of the product — CLAUDE.md
           already documents this terminology change ("Post a new listing" →
           "Create your profile") as done for nav/topbar/manage; the footer was
           evidently missed, so a model or client sees two different names for
           the same action depending on where they look.
Proposal:  Update the footer nav label from "Post a new listing" to "Create
           your profile" to match the topbar link and en.json convention
           already used elsewhere.
Touches:   src/translations/en.json (footer nav key) or Console footer content
           config, whichever currently drives this specific link
Effort:    XS
Impact:    Small but free consistency fix while already touching footer
           content (RT-20260920-04).
---
Status: APPROVED
Note: APPROVED by Neil via decision-card 2026-09-20 — "Approve all defects" + "Approve all three [polish]".

## RT-20260920-06 — React "recoverable-error" hydration errors on listing pages when signed in as a client
Journey:   client-discovery
Screen:    Any listing detail page (e.g. `/l/anais-p/...`) when viewed while
           logged in (reproduced with both rt-client-01 and rt-client-02)
Severity:  polish
Evidence:  Console log shows 8 errors on page load, e.g.: `[ERROR] Error code:
           recoverable-error data: {componentStack: Object}` — this exact
           message appeared 4 times per page load. Reproduced on two separate
           occasions with two different logged-in accounts (Priya, then Tom),
           both times on the same listing URL; the same page loaded
           logged-out shows 0 errors.
User view: Invisible to the user — the page still renders correctly — but it's
           a real, reproducible signal of a server/client render mismatch
           specific to the authenticated view of a listing page.
Proposal:  Investigate the React 18 SSR hydration mismatch on ListingPage when
           `currentUser` is present (likely something conditionally rendered
           differently server-side vs. client-side based on auth state, e.g.
           the booking panel or "Contact" button). Not user-visible today, but
           worth a developer look before it manifests as a visible glitch.
Touches:   src/containers/ListingPage/ (SSR-sensitive conditional rendering
           based on currentUser)
Effort:    S (investigation) – M (fix, depending on cause)
Impact:    Currently cosmetic/console-only; flagged so it doesn't become a
           visible bug later.
---
Status: APPROVED
Note: APPROVED by Neil via decision-card 2026-09-20 — "Approve all defects" + "Approve all three [polish]".
