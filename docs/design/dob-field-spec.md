# Signup form — date of birth field (SAF-38 age gate)

Design spec only. Build reference: `src/containers/AuthenticationPage/SignupForm/SignupForm.js`.
Context: `docs/onboarding-data-changes-design.md`, `docs/safety-framework-v1-scope.md` (SAF-38).

## 1. Placement in the signup form

Add to the existing `.defaultUserFields` block — **after Phone number, before the user-type
choice** (the last field added to the default block, not the first thing a new user sees):

```
Email
First name / Last name
Display name
Password (+ hint)
Phone number (existing, optional)
Date of birth   ← NEW, required            <!-- this spec -->
I'm a model / I'm a client (FieldSelectUserType)
```

Rationale: this matches the order already agreed in `onboarding-data-changes-design.md`, and it
keeps the sensitive field low-friction — it lands after the fields a user expects on any signup
form, not as the first, jarring ask. It's the **only** new field per that doc's "keep signup a
60-second job" principle — no framing copy, no separate "why we ask" modal, no extra step.

## 2. Input type and interaction

**Native HTML date input** (`<input type="date">`), not a free-text field and not a three-select
day/month/year picker.

- `max` attribute = today's date. Prevents picking a future DOB at the browser level (belt) —
  the validator below is the brace.
- No `min` needed beyond what the picker UI naturally allows; don't second-guess it with an
  arbitrary earliest year.
- No placeholder text — the native control shows the OS/browser's own date affordance (mm/dd/yyyy
  format cue on desktop, a scroll-wheel on iOS/Android). This is the point of using a real date
  input: correct format is enforced by the OS, not by us parsing a string.
- Full width, single field — same width as Email/Password, not split like the First/Last name row.
- Validate **on blur and on submit**, not on every keystroke/scroll of the native picker, so the
  error doesn't flash while the user is still mid-selection.

## 3. Field anatomy — `rt-field` / `rt-input`

Build as a standard `rt-field` with a native date `rt-input`, matching every other field on this
form:

```
.rt-field
  .rt-field__label   "Date of birth"  <span class="rt-req">*</span>
  input.rt-input[type=date]
  .rt-field__hint   (default state)
  .rt-field__error  (error state, replaces the hint)
```

- **Label:** "Date of birth" — sentence case, Hanken 600, 14px (`--text-sm`), `--text-primary`.
  Required asterisk in `--accent-500` (the one cobalt mark this field is allowed — it's the
  standard required-field convention already used elsewhere on the form, not a second accent).
- **Input:** Hanken, 16px, white fill, 1px `--border-hairline` (ink-200), `--radius-lg` (8px),
  padding 12×14 — identical box to Email/Password on this form. No calendar icon layered on top;
  the native control already renders one.
- **Focus:** border → `--accent-500`, ring `0 0 0 3px var(--accent-100)` — the standard rt-input
  focus state, nothing custom.
- **Helper text (default, no error):**
  > "You must be 18 or older to use Rogue Talent. Private — never shown on your profile."

  12px, `--text-muted` (ink-500), regular weight. Two jobs in one line: sets the expectation
  before anyone hits an error, and pre-empts the "why are you asking this" privacy concern (it's
  going to `protectedData.date_of_birth`, not the public profile).

## 4. Under-18 error state

Trigger: on blur/submit, parsed DOB is later than (today − 18 years).

- Swap the hint for `.rt-field__error`: 12px, Hanken 600 (semibold), `--status-error`
  (`#D22B2B`) — red used correctly here, as an actual blocking error, not decoration.
- Input border switches to `--status-error`; if focused again, ring becomes the red-tinted
  focus variant (`0 0 0 3px rgba(210,43,43,0.15)` per the `rt-input--error` spec).
- **Copy (fixed, does not vary by how far under 18 the entered date is):**
  > "You need to be 18 or older to join Rogue Talent."

  Plain and final — no countdown, no "come back in X years", no implied apology. SAF-38 is
  absolute with no exceptions, and the copy should read that way: a statement of the rule, not a
  negotiation. Doesn't accuse the user of lying; doesn't explain enforcement mechanics.
- Submit stays disabled while this error is present (same `invalid` gate the form already uses
  for every other field-level validator).

### Other validation states on the same field
- **Empty / required:** "Enter your date of birth." (matches the existing required-field pattern
  on this form, e.g. `SignupForm.firstNameRequired`).
- **Invalid/future date** (only reachable by bypassing the native picker, e.g. some autofill
  edge cases): "Enter a valid date of birth."

## 5. Brand compliance checklist

- Sentence case throughout; no title case, no emoji, no exclamation marks.
- Bricolage is never used here — this is a functional form field, Hanken only (Bricolage is
  reserved for display/headline/wordmark use per §5 of the design system).
- Exactly one cobalt element on this field: the required asterisk (shared convention across the
  whole form) and the focus ring (interaction state, not decoration) — no second accent
  introduced.
- Red (`--status-error`) appears **only** in the under-18/invalid error state — never as a
  border or label colour otherwise. This is a textbook "red = danger only" case, not a stretch
  of it.
- Hairline border (`--border-hairline`, 1px) over any shadow, `--radius-lg` (8px) — same as every
  other input on the page, no new radius or elevation invented for this field.
- No new copy tone: direct, unembellished, consistent with the rest of the form's voice (compare
  `SignupForm.passwordHint`'s plain "Use at least {minLength} characters.").

## 6. Out of scope for this spec

- Storage/validator implementation (`protectedData.date_of_birth`, the 18+ parsing logic) —
  Developer's call per `onboarding-data-changes-design.md`.
- SAF-01 (ID verification at go-live) — separate surface, not part of this field.
- No change to any other field on the signup form.
