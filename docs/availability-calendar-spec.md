# Availability calendar — specification

_Status: proposed (awaiting build). Owner: Rogue Talent. Last updated: 2026-07-14._

## 1. Objective

Replace the current weekly-plan availability step ("Your availability") with a
**full-month calendar** that lets a model manage when they can be booked with as
little friction as possible. The guiding decision (confirmed): **models are
available by default and block out the dates they are *not* free.**

Success looks like: a model can set up a bookable calendar in seconds, keep it
current without effort, and never accidentally look unbookable.

## 2. Core principle — "available by default"

- A newly-created profile is **bookable on every future date** with no action
  required. An empty calendar must never mean "unbookable."
- The model's job is the **exception**: block the dates they're away, already
  booked elsewhere, or otherwise unavailable.
- A secondary **"available by default: off"** mode exists for sporadic/part-time
  models who prefer to open specific dates instead (see §4). Default mode is
  **on** for everyone.

## 3. Concepts — how this maps to Sharetribe

Sharetribe availability has two primitives; we use both:

1. **Default availability plan** (`availabilityPlan`) — a recurring weekly
   pattern (per weekday, open or closed). This is the baseline.
2. **Availability exceptions** — date-specific overrides on top of the plan,
   each either `available` or `not-available` for a date range.

The listing type is `day` unit / `oneSeat`, so a date is simply **bookable** or
**blocked** (one booking per day).

| Our concept | Sharetribe representation |
|---|---|
| Available by default | Default plan = all 7 weekdays open (seats: 1) |
| Block a single date/range | `not-available` exception for that range |
| "Never available on <weekday>" recurring | Close that weekday in the default plan |
| "Available by default: off" mode | Default plan = all 7 weekdays **closed**; open dates become `available` exceptions |
| Booked date (confirmed booking) | Existing booking on the date — shown as locked, not editable |

## 4. The two modes

**Mode A — Available by default (primary, recommended, default on)**
- Baseline: every day open.
- Model adds **blocks** (not-available exceptions) for days off.
- Mental model: _"I'm around unless I say otherwise."_

**Mode B — Unavailable by default (secondary, opt-in)**
- Baseline: every day closed.
- Model adds **openings** (available exceptions) for the specific days they'll work.
- Mental model: _"I only work the days I choose."_

A single toggle switches modes. Switching is non-destructive where possible: we
warn that existing exceptions may be cleared/re-interpreted and confirm before
applying (see §6).

## 5. Screen design

### 5.1 Layout ("Your availability" wizard step)
1. **Heading + guidance** — one line explaining the default-available model.
2. **Settings row** (compact, above the calendar):
   - **Mode toggle**: "Available by default" (on/off) with a one-line helper.
   - **Minimum booking notice** (moved here from "Your profile", see the
     field-move task): "How much notice do you need before a shoot?"
     — Same day / 24h / 48h / 1 week / 2 weeks.
   - **Time zone**: defaults to the model's detected zone; editable.
   - _(v2)_ **Recurring days off**: quick chips for weekdays they never work.
3. **Month calendar** — the primary surface (see 5.2).
4. **Legend** — available / blocked / booked / past.
5. **Submit** — "Save and continue" (wizard) / "Save" (edit).

### 5.2 Month calendar grid
- Standard month view, week starts per locale (Mon in UK).
- Navigate months with ‹ / › ; can't page before the current month.
- Each cell is a **day** showing the date number and a state (5.3).
- **Interactions:**
  - **Tap a day** → toggles it blocked ↔ available (in Mode A: available→blocked;
    Mode B: blocked→available).
  - **Click-drag / tap-start then tap-end** → select a **range**, then choose
    "Block these dates" / "Open these dates". Ranges are the common case
    (holidays, travel) so this must be first-class, not buried.
  - **Booked days are locked** — not toggleable; tapping shows the booking.
  - **Past days** are disabled/greyed.
- Mobile: same grid, full-width, large tap targets; range selection via
  tap-start → tap-end (no drag needed).

### 5.3 Day states & visual language (design-system tokens)
| State | Meaning | Visual |
|---|---|---|
| Available | Bookable | default surface, normal date text |
| Blocked | Model unavailable | ink-100 fill, strikethrough or "×", muted text |
| Booked | Confirmed booking | accent-50 fill + a small dot/label; **locked** |
| Past | Before today | disabled, ink-300 text |
| Selected (in-progress range) | Mid-selection | accent-100 outline |

Availability is communicated with neutral ink for blocked (not red — red is
danger only), and cobalt only for booked/selected. Green reserved for any
"available" affirmation badge if needed.

## 6. Rules & edge cases
- **Empty calendar = fully available** (Mode A). Never render "no availability".
- **Blocking a booked day**: not allowed — the day is locked while a confirmed
  booking exists. (Cancellations free it up.)
- **Mode switch**: switching A→B (or back) reinterprets the baseline. Show a
  confirm dialog: "This changes your default. Dates you've already set may be
  cleared." Apply only on confirm. Prefer to preserve explicit exceptions where
  they still make sense; otherwise clear and start clean.
- **Past exceptions**: ignored/pruned; only today-forward matters.
- **Minimum booking notice** filters bookable dates at booking time (a client
  can't request a date inside the notice window) — it does not visually block
  the calendar for the model.
- **Time zone**: a "day" is defined in the model's zone; store it on the plan so
  bookings and blocks align.
- **Draft listings**: the calendar is editable in the wizard before publish; the
  default-available baseline is set when the plan is first created.

## 7. How availability drives the rest of the marketplace
- **Search**: (v2) optionally let clients filter by "available on <date>".
  Requires availability to be queryable — Sharetribe supports date filtering.
- **Listing page booking**: the client's date picker shows blocked/booked/notice
  dates as unselectable, mirroring this calendar.
- **Requests**: a confirmed booking writes back as a locked day here.

## 8. Technical implementation

### 8.1 Data
- `availabilityPlan` (type `availability-plan/time`): entries per weekday.
  - Mode A baseline: all 7 days `00:00–24:00`, seats 1.
  - Mode B baseline: no entries (all closed).
  - Recurring days-off (v2): remove those weekdays from the plan.
- `availabilityExceptions`: `not-available` (Mode A blocks) or `available`
  (Mode B openings), each a date range in the plan's time zone.
- Mode flag: store in listing `publicData.availabilityMode` (`'available' | 'unavailable'`)
  so the UI and any server logic know the baseline. (The plan alone implies it,
  but an explicit flag is clearer and future-proofs search.)
- `min_booking_notice`: existing custom enum field; move its rendering from
  "Your profile" to this step (exclude it from the Details form like the rate
  fields, render it in the settings row here, keep saving to `publicData`).

### 8.2 Save operations (existing SDK endpoints)
- `ownListings.update` with `availabilityPlan` for the baseline/mode.
- `availabilityExceptions.create` / `.delete` for blocks/openings (batch by range).
- No new backend needed — all native Sharetribe.

### 8.3 Components
- **Replace** `WeeklyCalendar` (weekly plan editor) with a new
  **`MonthAvailabilityCalendar`** (month grid + range selection + state cells).
- **Reuse** exception create/delete plumbing from
  `EditListingAvailabilityExceptionForm` / the panel's exception handlers.
- **Repurpose** `EditListingAvailabilityPlanForm` into a small "settings" block
  (mode toggle + min-notice + timezone) rather than the per-weekday hour editor.
- Panel (`EditListingAvailabilityPanel`) orchestrates: load plan+exceptions →
  compute per-day state → render calendar + settings → persist changes.

## 9. Scope & phasing

**MVP (this build):**
- Month calendar, available-by-default baseline, tap + range **blocking**.
- Mode toggle (A/B) with confirm-on-switch.
- Min-booking-notice moved into the settings row.
- Booked/past/blocked states; time zone.

**v2 (later):**
- Recurring weekday days-off chips.
- "Available on date" search filter for clients.
- Bulk actions ("block all weekends", "block next month"), copy-week.
- iCal / Google Calendar sync (block from external calendars).

## 10. Microcopy (draft)
- Step heading: **"Your availability"**
- Guidance: _"You're shown as available every day by default — just block out
  the dates you're away or already booked. Clients can only request dates you're
  open."_
- Mode toggle label: **"Available by default"** — helper: _"On: you're bookable
  unless you block a date. Off: you're only bookable on dates you open."_
- Empty state (Mode B, no openings): _"You haven't opened any dates yet — clients
  won't be able to book you. Tap dates to open them."_
- Range action buttons: **"Block these dates" / "Open these dates"**
- Min booking notice: **"Minimum booking notice"** — _"The least notice you need
  before a shoot."_

## 11. Open questions
1. **Search by date** — do we want client-side "available on <date>" filtering in
   MVP, or defer to v2? (Affects whether we store the explicit mode flag now —
   recommend yes regardless.)
2. **Range length cap** — any max block length, or unlimited?
3. **Booked-day source** — confirm bookings come only via the Sharetribe
   transaction (so we can reliably mark locked days).
4. **Default weekly pattern** — should we offer a "weekends off" quick-set in MVP,
   or keep MVP to date-blocking only?
