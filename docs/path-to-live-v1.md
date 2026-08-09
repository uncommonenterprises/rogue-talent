# Rogue Talent — Path to Live v1

**Supersedes `path-to-first-ten-models.md`**
9 August 2026

---

## The revised goal

A fully functioning platform, live, before any model sees it. Model onboarding then becomes a refinement round with real supply rather than a proposition test. Nothing comes off the critical path.

That's the right call for this market — modelling is small and reputation-led, and a professional shown something broken tells fifteen people. But it means v1 is considerably larger than the current thread implies, and the plan needs to reflect the whole of it rather than the part that's in flight.

---

## The thing nobody has mentioned

**There is no live marketplace.** Everything built so far — user types, listing fields, the transaction process, access control, email templates, branding, content pages — exists only in `ndstealth1-test`. Sharetribe gives you a test environment and a live environment, and they are separate marketplaces with separate configuration.

Going live is not a switch. It means reproducing every Console setting in the live environment, pushing the transaction process there, connecting a live Stripe account with real business verification, and re-testing the lot. Done by hand it's a day of clicking and an excellent way to introduce silent differences between what you tested and what your users get.

This is also the argument that Tier 1 — moving configuration into code — has stopped being an efficiency play and become a correctness one. Config that lives in Git can be applied identically to both environments and diffed when they drift. Config that lives in two Consoles cannot. It was deferred as the biggest and least urgent piece of work; it is now neither.

**Recommendation:** do the config-as-code work before the live environment exists, not after. Building live by hand and then trying to bring it under control afterwards is the harder order.

---

## Three questions only you can answer

The plan's shape depends on these, and I can't infer them.

**How much of the six-layer safety framework is in v1?** It's your stated core differentiator — identity and business verification, mandatory shoot-detail disclosure, model boundary controls, real-time check-in, bilateral reviews with private model-to-model notes, tiered enforcement. As far as I can tell almost none of it is built. Some layers are launch-critical because you'd be making claims you can't honour: if the marketing says models are identity-verified, verification has to exist. Others could honestly be described as coming soon. Which are which is your call, but it needs making now, because check-in and bilateral reviews are each substantial builds.

**Does v1 need client verification?** Your original design had clients verified before they can book. Nothing has been built and nothing has been tested. For a safety-first marketplace it's hard to argue models should be identity-checked and the people booking them shouldn't.

**What's the ops model on day one?** A live marketplace generates work that can't wait: approving profiles, answering a model whose payout failed, adjudicating a no-show dispute inside the two-day payout window. Right now that's all you, and the dispute path you just specced assumes an operator who notices in time. Worth deciding what response times you're promising before the terms say anything about them.

---

## The workstreams

Five, with the dependencies that matter.

**1. Model lifecycle.** Finish RT-01/02/08 (submit → review → go-live with the payout gate). The three emails, decline included now that real models will be declined. RT-05 orphan drafts. Console items: RT-09 placeholders, RT-11 required flags off for measurements, Listing approval on.

**2. Booking engine.** The `booking-v2` build — `transactionProcessBooking.js`, the cancel and dispute UI with the refund preview, email templates, the alias push, and the two behavioural checks that need a live test transaction. Then the accept-window reminders and the provider-cancel reliability counter with safety routing.

**3. The client side.** Substantially unexamined. Client signup and verification, search and discovery quality, the booking request flow, client-facing emails. PM Journeys 2, 3 and 6 cover most of it and none have been run. Expect this to generate as much work as the model side did — the first journey produced twelve proposals on ground you'd already walked yourself.

**4. Safety framework.** Scope to be decided per the question above. Whatever's in v1 needs building; whatever isn't needs removing from the marketing copy.

**5. Launch infrastructure.** Config as code, then the live marketplace built from it. Live Stripe with business verification. `roguetalent.co` pointed at the app. A transactional email provider with domain authentication — worth flagging that emails 1 and 3 need somewhere to send from, and an unauthenticated domain lands in spam, which for an approval email is fatal. Terms, privacy and FAQ accurate and consistent. Error monitoring. The repo migration to private.

---

## Sequencing

The dependencies dictate more of this than preference does.

**Phase 1 — finish what's in flight.** Model lifecycle and the booking engine build. Both are specced, both are on the critical path, and the booking engine's behavioural checks need seeded test data that already exists.

**Phase 2 — decide and build safety scope, and open the client side.** Run PM Journeys 2, 3 and 6 early in this phase rather than late: they'll surface work you need to know about before you're planning a launch date, and finding out what's wrong with client discovery after you've committed to a date is the expensive order.

**Phase 3 — config as code, then live infrastructure.** Config first so live is built from it rather than beside it. Then live Stripe, domain, email provider, monitoring.

**Phase 4 — legal, copy and a full pass.** Terms and privacy true. Marketing claims matched to what exists. Every journey re-run against the live environment, not just test.

**Then the models.**

The honest read on timing: Phase 1 is a week or two. Phase 2 is the unknown, and its size depends entirely on your safety-scope answer. Phases 3 and 4 are a week between them if config-as-code has gone well and considerably more if it hasn't.

---

## The one risk worth naming

Building to a fully-functioning v1 before any outside contact is a legitimate strategy, but it has a known failure mode: the longer the build runs without external input, the more of it gets built on assumptions nobody has checked. You've already seen a version of this in miniature — walking the onboarding journey found twelve things that reading the code hadn't, on a flow you designed yourself.

You don't have to compromise the strategy to hedge it. Talking to five models about what they'd want, without showing them anything, costs you nothing and could reshape Phase 2's scope while it's still cheap. That's a conversation, not a beta, and it doesn't put a half-built product in front of the people whose opinion you need most.
