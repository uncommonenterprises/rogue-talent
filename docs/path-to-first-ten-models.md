# Rogue Talent — Path to the First Ten Models

**A prioritised plan for getting to a shareable MVP**
9 August 2026

---

## What we're actually building towards

Not a launch. A **feedback round**: ten real models sign up, build a profile, submit it, get approved, and see themselves live — then tell you what they think.

That distinction does most of the prioritisation work, because a model in a feedback round never touches the client side of the marketplace. She never gets booked, never gets paid, never cancels. So a large amount of what's currently in progress isn't on this path at all.

The reason to run this sooner rather than later is simple: the most expensive thing you can do is engineer a booking system for a product models don't want. Feedback is cheap now and gets more expensive with every week of build.

---

## What you do NOT need (the cut list)

Be ruthless here — this is where the time comes from.

**The booking transaction process.** The 48-hour accept window, the two-tier cancellation, the dispute path, the reliability flag. None of it is experienced by a model who isn't being booked. It's necessary before launch. It is not necessary before feedback.

**Stripe payout onboarding.** Asking ten models to hand over bank details and identity documents for a platform with zero clients is a big ask, and it will contaminate your feedback — you'll learn about their KYC anxiety instead of about your product. See the beta posture below.

**Client-side search and booking.** Models will ask "what does a client see?", so you want the client view *presentable*, but you don't need it working end to end.

**The decline email.** You're hand-picking ten models. You aren't going to decline any of them.

**RT-05 orphan drafts, the repo migration, the remaining PM journeys.** All worth doing. None blocking.

---

## The critical path

Seven things, roughly in order.

**1. Finish the submit → review → go-live change (RT-01/02/08).** This is the one piece of in-flight engineering that is genuinely on the path. Without it, submit doesn't work at all and no model can complete onboarding. It's already specced.

**2. Decide the beta Stripe posture.** The go-live mechanism gates publishing on `reviewApproved && payoutPresent`. For the beta, that second condition has to be switchable off — beta models should reach "approved and live" without payout details, and be told plainly that payout setup comes when bookings open. Build it as a flag, not a fork, so you flip it back on for launch.

**3. The two emails.** "You're in review" and "You're approved and live". The second is native — Console copy edit only. The first is custom off the events feed. Without these, a model submits and hears nothing, which is the single worst experience in the whole flow.

**4. Neil's Console queue.** Still outstanding: rotate the Sharetribe secret, restrict the Maps key, two GitHub toggles, RT-09 placeholders, RT-11 required-flags off for measurements, and the Listing approval toggle. RT-11 matters more than it looks — a model who can't complete the form because she doesn't know her exact hip measurement is a lost beta participant.

**5. Put it on the real domain.** Right now you'd be inviting professional models to `rogue-talent-production.up.railway.app`. That URL undercuts everything the brand is trying to say before they've read a word. Point `roguetalent.co` at Railway. It's an afternoon at most and it's the highest credibility-per-hour item on this list.

**6. Terms and privacy that are actually true.** You're about to collect real names, photographs and body measurements from real people. That needs a privacy policy that accurately describes what you do with it, and terms that don't describe a cancellation policy the product doesn't have. Not a legal review — just accurate, present, and consistent.

**7. Run PM Journeys 1, 5 and 7 again.** Journey 1 to verify the new submit flow end to end, Journey 5 for account basics, Journey 7 for the marketing pages — because a model's first impression is the landing page, not the wizard. Fix what comes back, then stop.

---

## What "ready" looks like

A model you've never met can, without your help: land on `roguetalent.co`, understand what it is and why it's different, sign up, complete a profile without hitting a dead end or an impossible field, submit it, receive an email confirming she's in review, receive a second email when you approve her, and see her live profile as a client would see it.

That's it. If she can do all of that, you have something worth showing.

---

## The beta Stripe posture, in more detail

Worth being explicit because it's the one place the beta deliberately diverges from the launch design.

Under the launch design, payout is the last gate before going live — the model is approved, then adds bank details, then appears. That's the right design for a live marketplace and you should keep it.

For the beta, flip a flag so approval alone publishes. Tell the models directly: *"You're live. We'll ask for payout details when we open bookings — no bank information needed today."* That sentence does two useful things. It removes the biggest friction from your feedback round, and it's itself a thing to get feedback on: watch whether anyone asks about payment terms unprompted. If nobody does, your commission story is landing. If everyone does, it isn't.

---

## Suggested sequence

| # | Work | Who | Rough |
|---|---|---|---|
| 1 | Finish RT-01/02/08 + the beta payout flag | Claude Code | 1–2 days |
| 2 | Console queue | Neil | 45 min |
| 3 | Emails 1 and 2 | Claude Code + Neil (copy) | Half a day |
| 4 | `roguetalent.co` pointed at Railway | Neil + Claude Code | An afternoon |
| 5 | Terms + privacy accurate and consistent | Neil (decisions), Claude Code (drafting) | Half a day |
| 6 | PM Journeys 1, 5, 7 + fixes | Claude Code + Neil review | 1 day |
| 7 | Invite ten models | Neil | — |

Call it a week of real work, less if the Console queue stops slipping.

Then the booking process, the cancellation tiers and the dispute path resume — informed by what ten real models told you, which is a considerably better position to build them from.

---

## A note on who to invite

Ten is the right number: enough for patterns, few enough to talk to each properly. Weight them towards the people whose objections you most fear — a model with agency representation who has no obvious reason to leave, and a new face with no portfolio who represents the hardest onboarding case. The enthusiastic friend-of-a-friend who signs up in four minutes teaches you the least.

And ask them to talk while they use it, rather than after. What people report about an experience and what they do during it are different things — which is the same reason the PM agent walks the journey instead of reading the code.
