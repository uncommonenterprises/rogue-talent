# Tester F - model sign-up feedback (04/11/2026)

Source: first-time model tester (family friend of Neil), emailed findings with 5 screenshots, forwarded
by Neil 04/11/2026. Screenshots are kept out of this PUBLIC repo (they show the tester's face). Stripe
verification not yet done; feedback on that and on client sign-up to follow.

Status: **PLAN - awaiting Neil's sign-off. No development until approved.**

Headline: "The setup flow is really smooth and I like it."

## Findings, PM analysis and proposed work

| # | Finding | What is actually happening (PM check) | Proposed fix | Batch |
| --- | --- | --- | --- | --- |
| F1 | Field error text overlaps the help text (phone and desktop) | Bug. Validation message and helper line render in the same spot on every custom field | Error sits under the help text; friendlier wording ("That looks small for centimetres - hips are usually 70 to 130 cm") | 1 |
| F2 | "Change default availability" pop-up looks broken | Bug. Modal content has no inner padding, heading oversized, Cancel cut off; full-screen on phone with text flush to the edge | Restyle to the design system; check every other confirm pop-up (decline, withdraw) for the same fault | 1 |
| F3 | Unclear what "profile" vs "listing" vs "account" are | Model-facing screens still say "listing" (e.g. "Your listings", "You have 1 listing"), and there are two "profiles": the public model profile and Sharetribe's "Profile settings" (bio + profile picture) | One rule: **Profile** = what clients see; **Account** = private settings. Remove "listing" from every model-facing screen and email | 2 |
| F4 | Bio only found via the phone menu; can't see where it shows | Confirmed. The bio lives in Profile settings and is shown nowhere since the B03 profile rebuild (B03 assumed there was no bio field) | Add a short "About you" text to the profile wizard and show it on the profile page; reviewer checklist covers contact details in it | 2 |
| F5 | Can't choose the cover photo; first upload becomes cover. Cover photo is separate from "profile photo" | Confirmed. Cover = first image; profile picture is a separate upload in Profile settings | "Make cover" option (or drag to reorder); for models, use the cover photo as their profile picture so there is one photo concept; hide Profile settings for models | 2 |
| F6 | First-time male model: expected to know hips/bust? | All measurements required; minimums (40/50) are the only guidance; cm only | Hips optional; label "Chest / bust"; short "how to measure" guide; option to enter in inches (stored as cm) | 3 (decision) |
| F7 (PARKED 07/11 - travel review) | Would like to state transport options (drive/car, public transport, need collecting) | Not captured anywhere | New profile field "Getting to shoots" (multi-select), shown on the profile. Sits alongside the open travel-fees decision (Q5) | 4 (decision) |
| F8 | Show the availability calendar below the rates on the profile (desktop) | Availability is only visible after clicking "Select dates" | Read-only availability calendar in the booking panel; clicking a date starts the booking. Designer mock first | 5 (design) |
