# End-to-end run-through - 01/11/2026 (test.roguetalent.co)

First full walk of the new sign-up + account-status journey with cutover Stage B live.
Neil walked a model on his phone; the PM walked a model and a client on desktop in parallel
(test accounts in the gitignored `.test-accounts.json`: Ava C. = model, Ben C. / Northside Test Studio = client).

## What worked end to end
- Model: choose path, sign-up (18+ tick, no phone/DOB), check inbox, email link (now points at test.roguetalent.co),
  verified banner + dismiss, 4-step wizard (sections, ethnicity multi-select, 13 category pills, rates with
  travel range + notice, 3-photo minimum + Cover badge), Review & submit with email gate, Pending screen.
- Neil approved Ava in Console (`reviewDecision`) -> Approved screen immediately -> decision email
  "Your profile is approved. Verify with Stripe to go live" sent from no-reply@roguetalent.co.
- Client: sign-up, verify email -> lands on Your business details with banner, business details (address search,
  phone, industry), Pending screen with tracker, Stripe Identity (test "verification success") -> webhook +
  restricted-key DOB 18+ check -> identity verified within seconds (also proves the rolled secret key),
  Pending tracker shows step 3 done, Neil approved -> Verified "You're ready to book" -> search -> model page ->
  price breakdown correct (2 days x GBP 300 + 15% = GBP 690) -> checkout loads (client gate lets an approved,
  ID-verified client through). Stopped before payment.
- Unverified model (Ava, no Stripe) correctly NOT in search.

## Findings
| # | Where | Finding | Severity |
|---|---|---|---|
| 1 | Email verification link (model with a draft) | Lands on a BLANK new "About you" (`/l/draft/0000.../new/profile`) instead of the model's existing draft. Looks like their work vanished; risk of a duplicate profile. Same redirect when a logged-in model visits /signup/*. | Must fix |
| 2 | Top nav after submitting | Still "Create your profile" for a model who already has one (risk of a second profile). Should be "Your profile". | Should fix |
| 3 | Review & submit | Accuracy tick box misaligned with its label. | Should fix |
| 4 | About you city search | Suggests airports/stations, not just cities (restrict to cities). | Should fix |
| 5 | /verify-identity (old SAF-03 page) | Says "You can now book models" right after ID check even when the client is not yet approved. | Should fix |
| 6 | /verify-identity | Old styling (grey oversized heading), 2+ em dashes, three different time claims. Bring into the new design. | Should fix |
| 7 | GitHub scheduled jobs | No scheduled run in the first ~70 min after enabling (GitHub start-up delay). Triggered once manually; recheck later. | Watch |
| 8 | Stripe Connect webhook | "Requires setup": Stripe wants Connect platform onboarding done in its separate onboarding sandbox. Fallback: reconcile on page visit. Resolve before launch. | Launch checklist |
| 9 | Sharetribe emails | Sent from noreply+ndstealth1-test@mysharetribe-test.com as "[TEST MODE]". Expected on test; live needs a roguetalent.co sender. "Welcome" email copy has exclamation marks. | Launch checklist |
| 10 | Model profile page (not yet redesigned) | Location map blank (grey box); "About the listing author" template wording. | Should fix (next design stage) |
| 11 | Booking calendar / checkout (not yet redesigned) | Big solid-blue calendar; checkout has template leftovers: "Helsinki" / "00100" placeholders, "Apt #", "State", "Location of the listing", "listing owner", "Write description..." placeholders, "Hello Marcus B! You should know that...", em dash in the fee note. Needs the booking/checkout redesign stage. | Should fix (next design stage) |
| 12 | Client pending screen | "takes a couple of minutes" (unbacked timing). | Nice to have |
| 13 | Check your inbox | Long email address breaks awkwardly across lines. | Nice to have |
| 14 | Your profile | Number spin arrows on focus: a desktop-browser artefact only, not shown on iPhones. | Ignore |
| 15 | Footer | "Create your profile" shown to clients; social icons still Sharetribe's (already on runbook). | Nice to have |
| 16 | Account status page | Blank / "Loading your account status" for several seconds on each visit. | Nice to have |
| 17 | Test data | "Anais P." live with no photo (predates the 3-photo rule); "Jane F." uses what looks like a real celebrity photo. Clean test data before any demo; never seed real people's images. | Housekeeping |

## iPhone SE (375 x 667) walk - 01/11/2026
Fresh model "Mia C." (verified email FIRST, then built the profile) + client "Ben C." logged in on the same screen size.
Worked well: slim auth header + form first, role cards, check inbox, verified banner, "Step X of 4" bar, single-column
profile form, ethnicity dropdown + pills (good tap targets), rates, 2-column portfolio grid, review screen, Pending
tracker, logged-in homepage nav, sticky "price / Book now" bar, full-screen booking panel, calendar, price breakdown.
Verify-first route lands correctly on About you (finding 1 only happens when a draft already exists).

| # | Where (SE) | Finding | Severity |
|---|---|---|---|
| M1 | About you, city field | Suggestions open below the bottom of the screen (keyboard would hide them entirely on a real phone). Scroll the field up on focus. | Should fix |
| M2 | App top bar (logged in) | Logo oversized vs the marketing header; status badge jammed against the right edge, no margin. | Should fix |
| M3 | Mobile menu (old template) | "Your listings" wording; big "Create your profile" button for a model who already has one; no link to account status. | Should fix |
| M4 | Logged-in homepage (mobile) | No account menu: can't reach status, settings or log out from the homepage. | Should fix |
| M5 | Search results | One model card per screen (photo fills the viewport); slow to browse/compare. Consider 2-up grid or shorter cards on phones. | Should fix (search design) |
| M6 | Checkout | ~4.5 screens; payment + billing (US/Finnish template fields) before the shoot details; needs reordering + trimming in the checkout redesign. | Should fix (next design stage) |
| M7 | All tick boxes (sign-up, review) | Box sits above its label text: shared component alignment bug (same as #3). | Should fix |
| M8 | Portfolio upload copy | "Drag photos here, or click to upload" on a phone; should be "Tap to add photos" on touch screens. | Nice to have |
| M9 | Verify-email link | Old template interstitial ("We will need to send you email notifications...") flashes before redirect. | Nice to have |
| M10 | Log in (mobile) | "Don't have an account? Sign up" and "New here? Create an account" duplicate each other. | Nice to have |
| M11 | Homepage (logged out) | Two cobalt buttons visible at once (header "Join" + hero "Create your account"). | Nice to have |
| M12 | Model page | 8 "recoverable" hydration errors in the console (server vs browser render mismatch); "Book now" grey until loaded; name shown twice in the booking panel. | Nice to have (dev check) |

## Not covered by the PM (needs Neil)
- Stripe Connect onboarding for a model (bank/ID test details) -> model goes Verified + appears in search.
- Payment at checkout (Stripe test card) -> booking request -> model accepts within 48h.
- Decline path (set `reviewDecision: declined` + private note) -> Not approved screen + email -> resubmit.
- Neil's phone walk-through notes (model).
