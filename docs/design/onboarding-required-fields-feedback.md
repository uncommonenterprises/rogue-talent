> Design spec — UX Designer → PM → Developer. No `src/` edits made; this document is the
> handoff. Grounded in `design-system/DESIGN_SYSTEM.md` and CLAUDE.md brand rules.

# "Your profile" step — required-field indication + stuck-button feedback

## The problem (as briefed)

The "Your profile" step (`EditListingWizard` → `DETAILS` tab, tab label "Your profile") has ~11
required model-attribute fields. "Next" (`saveActionMsg`) stays disabled until every one of them
is valid, but:

- Optional fields are marked "(optional)"; **required fields carry no marker at all** — the user
  has to infer "unmarked = required," which they don't reliably do.
- Errors only render once a field is `touched` (confirmed in `FieldTextInput.js` line 40:
  `hasError = touched && invalid && error`; `FieldCheckboxGroup`/`FieldSelect` follow the same
  pattern via `ValidationError`). **A field the user never focuses never shows an error, no matter
  how long the button stays disabled.**
- The submit button's `disabled` state (`EditListingDetailsForm.js` line 431:
  `submitDisabled = invalid || disabled || submitInProgress || !hasMandatoryListingTypeData || !isCompatibleCurrency`)
  has no "why" attached to it — HTML disabled buttons don't fire click/hover/focus events, so
  there's no event to hang a tooltip or "on-attempt" reveal off in the first place.

Net effect: a real model fills most of the form, misses one field, gets a dead button with zero
feedback, and — per the PM's confirmed tester finding — reasonably concludes the product is
broken. This compounds proposal RT-03 ("14-field wall").

## Recommended approach (summary)

1. **Mark required fields, not just optional ones** — a cobalt asterisk (`--accent-500`) after
   the label, using the design system's *own already-specified* pattern
   (`.rt-field__label .rt-req { color: var(--accent-500) }`, §9 Form field). Keep the existing
   "(optional)" suffix on the minority of optional fields — the two together are fully
   unambiguous with zero new copy to read.
2. **A persistent, live "Still needed" checklist** anchored directly above the Next button —
   not an on-click reveal. It lists, by plain-English label, the required fields that are still
   incomplete, updates in real time as the user fills fields in, and each item is a clickable
   link that jumps to (and focuses) that field. This is the answer to "what's stopping me" —
   recommended over the other three options below, with rationale.
3. **Sectioning is already shipped** (`PROFILE_FIELD_SECTIONS` in `EditListingDetailsForm.js`) —
   Stats / Appearance / Work / Links. No redesign needed; one small polish recommended (align
   `sectionHeading` CSS to the design-system eyebrow token instead of legacy Sharetribe grey/weight
   vars it currently uses).

Together these mean: the user can see *before* they even try to submit which fields are
mandatory, and if they stall, a calm, always-visible, named list — not a wall of red or a silent
dead button — tells them exactly what's left and lets them jump straight to it.

---

## 1. Required-field indication

### Visual spec
Reuse the design system's form-field spec verbatim (§9, Form field):

```
.rt-field__label { font: 600 14px Hanken; color: var(--text-primary); }
.rt-field__label .rt-req { color: var(--accent-500); }   /* already defined in components.css */
```

- Required field: `Label*` — asterisk in `--accent-500`, immediately after the label text, no
  extra space character needed beyond a normal word-space (`Height (cm) *`).
- Optional field: unchanged — `Label (optional)` in the existing muted style (already shipped;
  `getLabel()` in `CustomExtendedDataField.js`).
- Never both — a field is one or the other.
- No legend/asterisk-key needed at the top of the form: the two treatments (cobalt asterisk vs.
  "(optional)" muted suffix) are self-explanatory together and don't require the user to hold a
  rule in their head.

### Copy
No new translation strings needed for this part — it's a glyph, not text. (Screen readers: see
Accessibility below.)

### Implementation note for the Developer
`CustomExtendedDataField.js`, `getLabel()` (line 27) currently returns a **string**:
```js
const getLabel = fieldConfig => {
  const label = fieldConfig?.saveConfig?.label || fieldConfig?.label;
  const isRequired = !!fieldConfig?.saveConfig?.isRequired;
  return label && !isRequired ? `${label} (optional)` : label;
};
```
Change it to return a **node** (JSX), since every consumer (`FieldTextInput`, `FieldSelect`,
`FieldCheckboxGroup`'s `<legend>`) renders `{label}` directly as children, not as a raw string —
no consumer needs to change:
```js
const getLabel = fieldConfig => {
  const label = fieldConfig?.saveConfig?.label || fieldConfig?.label;
  const isRequired = !!fieldConfig?.saveConfig?.isRequired;
  if (!label) return label;
  return isRequired ? (
    <>
      {label} <span className={css.req} aria-hidden="true">*</span>
    </>
  ) : (
    `${label} (optional)`
  );
};
```
Add to `CustomExtendedDataField.module.css`:
```css
.req { color: var(--accent-500); }
```
(`--accent-500` is already a global token via `designTokens.css` — no new colour.)

**Scope note:** `CustomExtendedDataField` is shared across every listing-field-driven form in the
app (not just "Your profile"). This change will apply everywhere a required custom field renders
— that's a consistency win, not scope creep, but flag it to the PM as a heads-up since it's a
shared-component edit, not a "Your profile"-only change.

---

## 2. "What's stopping me" — options weighed, recommendation

| Option | Verdict |
|---|---|
| **(a) Inline validation on proceed-attempt** | Requires the button to be clickable-while-invalid so a "click" event exists to hang the reveal on (a truly `disabled` button fires no events at all). That in turn requires loosening every shared field component's `touched && invalid && error` gate to also check Final Form's `submitFailed`/`submitCount` — a change to `FieldTextInput`, `FieldSelect`, `FieldCheckboxGroup`, `FieldBoolean`, i.e. every form in the app, not just this one. Bigger, riskier diff for this fix. **Not recommended as the primary fix** (see "future enhancement" below). |
| **(c) Progress indicator ("6 of 11 completed")** | Tells the user *how much* is left, not *what*. Doesn't resolve the actual complaint (which field?). Also isn't a component the design system defines (no progress-bar spec in `components.css`) — would mean inventing a new visual pattern. **Rejected.** |
| **(d) Always-clickable Next, scroll-to-first-incomplete-field on click** | Same shared-component blast radius as (a) if paired with inline errors; on its own (scroll with no visible reason) it's not much better than what exists today — the user still has to guess why. **Rejected as primary; see below for how it's naturally superseded.** |
| **(b) "You still need to complete: …" summary — recommended, made *live* rather than on-attempt** | Reads directly off the same field configs already used for the tab-completion gate (`hasValidListingFieldsInExtendedData` in `EditListingWizard.js`) and off Final Form's `values`/`errors` in the panel component that already has both — no changes to the four shared Field components, no new interaction pattern, no new visual language. Because it's **live** (visible before any click), it also sidesteps the core accessibility problem with (a)/(d): a `disabled` button can't be hovered/focused to reveal a tooltip, and keyboard users can't "attempt" a click on a disabled control at all. A permanently-visible list has no such gap. |

**Recommendation: (b), live rather than click-triggered.**

### Behaviour / states

**State 1 — Fresh arrival** (form `pristine`, nothing touched yet):
No checklist shown. The Next button renders in its existing disabled visual state (`rt-btn`
`[disabled]`: opacity 0.4, `pointer-events: none` — already the button's current look, no change).
A single muted caption sits under the button:
> Complete the required fields above to continue.
(`--text-muted`, `--text-xs`, sentence case — matches the panel's existing `.guidance` paragraph
tone.) This avoids greeting a brand-new visitor with a list of 11 things before they've done
anything — the per-field asterisks (§1) already tell them what's needed as they scan the form.

**State 2 — In progress** (form dirty, still invalid — one or more required fields incomplete):
A block appears directly above the Next button, replacing the caption from State 1:

```
STILL NEEDED
┌───────────────────────────────────────────┐
│  Height           Hair colour              │
│  Ethnicity        Modelling categories     │
└───────────────────────────────────────────┘
[ Save & continue ]   ← still visually disabled
```

- **Eyebrow label** "Still needed" — `.rt-eyebrow` treatment (Hanken 700, `--text-xs`, uppercase
  via CSS `text-transform`, `--tracking-wider`, `--text-muted`). New string, sentence-case in
  source, CSS transforms the case (matches the existing eyebrow pattern in the design system —
  not a new voice decision).
- **Items** — each incomplete required field's label (its Console-configured label, same string
  the field itself displays, minus the asterisk), rendered as `.rt-tag--outline` (pill, hairline
  border, Hanken 600 14px, `--ink-700`) but as a real `<button type="button">`/`<a>` — clicking one
  scrolls to and focuses that field (see implementation note). No red anywhere here — this is
  informational, not an error state (red stays reserved for actual field-level validation errors
  once a field *has* been touched and left invalid, which is unchanged/untouched by this spec).
  Wrap in a `flex-wrap` row, `--space-2` gap, matching `.rt-chip`/`.rt-tag` row conventions used
  elsewhere (e.g. `rt-talent__tags`).
- The list re-renders on every keystroke/selection as items resolve — no debounce needed, this is
  cheap (same field list, ≤11 items).
- Button stays disabled (unchanged from today); it's the reason that's now visible.

**State 3 — All required fields valid:**
The checklist and caption both disappear; Next becomes the normal enabled cobalt primary button.
No confirmation/success message needed — the button simply becoming active *is* the confirmation
(consistent with the rest of the wizard, which doesn't celebrate step completion elsewhere).

### Copy (new `en.json` keys, `EditListingDetailsForm.*` namespace to match existing keys there)
```
"EditListingDetailsForm.stillNeededEyebrow": "Still needed",
"EditListingDetailsForm.stillNeededHelp": "Complete the required fields above to continue."
```
Field names in the list are **not** new copy — they reuse each field's existing Console-configured
label (the same string already shown on the field itself), so there's nothing to keep in sync by
hand.

### Implementation notes for the Developer
- Source of truth: derive the incomplete-required-field list in `EditListingDetailsForm.js` (it
  already has `values`, `listingFieldsConfig`, `selectedCategories`/`pickSelectedCategories`, and
  `invalid`/`errors` from `formRenderProps`) using the **same** eligibility + required-check logic
  the wizard gate already uses (`hasValidListingFieldsInExtendedData` /
  `isEligible`/`isValidField` in `EditListingWizard.js` lines ~180–227 and the `isEligible` filter
  in `AddListingFields`). Don't write a second, separately-maintained "is this field done" check —
  reuse or extract the existing predicate so the checklist and the actual tab-unlock condition can
  never drift apart. If it's easier to compute from Final Form directly:
  `formApi.getState().errors` keyed by namespaced field name, filtered to fields whose
  `fieldConfig.saveConfig.isRequired` is true, mapped to `fieldConfig.saveConfig.label ||
  fieldConfig.label` for display.
- **Scroll/focus target:** `AddListingFields.renderField()` (line 272) should wrap each rendered
  `<CustomExtendedDataField>` in an anchor container, e.g.
  `<div id={`field-${namespacedKey}`} className={css.fieldAnchor}>…</div>` — this works uniformly
  for every schema type (text input, select, checkbox group's `<fieldset>`, etc.) without needing
  each individual shared Field component to accept/forward an `id` on its own root. Clicking a
  checklist item does `document.getElementById('field-' + key)?.scrollIntoView({ behavior:
  'smooth', block: 'center' })` then focuses the first focusable control inside it
  (`querySelector('input, select, textarea')?.focus()`). Respect `prefers-reduced-motion` — fall
  back to instant scroll (`behavior: 'auto'`) as the design system's motion tokens are for
  micro-interactions, not scroll behaviour, and reduced-motion users shouldn't get an animated
  jump.
- Place the whole block (`stillNeeded` container + caption) in `EditListingDetailsForm.js`,
  immediately before the existing `<Button className={css.submitButton} …>` (line 519) — new CSS
  in `EditListingDetailsForm.module.css` alongside `.submitButton`/`.fieldSection`.
- This is additive to `EditListingDetailsForm.js`/`.module.css` and
  `CustomExtendedDataField.js`/`.module.css` only. `EditListingWizard.js`'s `tabCompleted`/
  `DETAILS` gate (line 268) is the logic being *surfaced*, not changed — its behaviour is
  identical to today; only the button's neighbourhood becomes legible.

### Future enhancement (not in this scope — flagging, not asking)
Option (a)/(d) — making Next clickable-while-invalid and revealing all field errors on a proceed
attempt via `submitFailed` — is a legitimate, complementary upgrade to how required-field errors
surface **app-wide**, not specific to this step. It would touch `FieldTextInput`, `FieldSelect`,
`FieldCheckboxGroup`, `FieldBoolean` (the `hasError`/`ValidationError` gating in each). Worth
doing eventually for every form in the product, but it's a materially bigger, shared-component
change than this brief's scope ("a real friction point on the model onboarding wizard") calls for,
and the live-checklist fix above already fully resolves the reported problem on its own. Recommend
the PM log it as a backlog item rather than bundling it here.

---

## 3. Wall friction / grouping — status check (kept tight, per brief)

**Already shipped**, not something this spec needs to introduce: `EditListingDetailsForm.js`
already groups the 11+ fields into four labelled sections (`PROFILE_FIELD_SECTIONS`, lines
251–256) — Stats, Appearance, Work, Links — with any Console field not covered by a section still
rendering in a trailing "remainder" group, so the grouping never silently hides a new field. Any
fields not present in your current Console config for the listed keys simply don't produce empty
sections. This already addresses the "14-field wall" perception without a further redesign.

**One small, in-scope polish recommended:** `EditListingDetailsPanel.module.css`
`.sectionHeading` (lines 83–89) currently uses **legacy Sharetribe tokens**
(`var(--fontWeightSemiBold, 600)`, `var(--colorGrey700, #4a4a4a)`), not the design system. Align it
to the `.rt-eyebrow` treatment now that a second eyebrow-style label is being introduced in this
same spec (§2's "Still needed"), so the two read as one consistent label language on the page:
```css
.sectionHeading {
  font-family: var(--font-sans);
  font-weight: var(--weight-bold);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--text-muted);
  margin: var(--space-6) 0 var(--space-2) 0;
}
```
This is a token-alignment fix (matches the "components adopted" rollout pattern already used
elsewhere in the codebase, e.g. `rt-nav`/`rt-tab`), not a copy or layout change — section heading
*text* ("Your stats", "Appearance", "Your work", "Links (optional)") stays as-is.

No further sectioning/pagination change recommended — splitting "Your profile" into multiple
wizard steps would be a materially bigger flow change (new tab, new gating, new nav) than this
brief calls for, and isn't needed once required/optional is legible and the live checklist removes
the dead-end.

---

## Accessibility notes

- The cobalt asterisk (§1) needs a text alternative for screen readers, since colour alone isn't
  sufficient and `aria-hidden="true"` (as in the code snippet above) removes it from the
  accessibility tree entirely: add `aria-label` or a visually-hidden "(required)" suffix on the
  `<label>`/`<legend>` element itself, not just the glyph. Simplest correct fix: keep the visible
  `*` `aria-hidden`, and add a `sr-only` span with the word "required" right after it. Same
  mechanism most form libraries use — flag this precisely to the Developer so it isn't dropped.
- "Still needed" list items must be real `<button type="button">` or `<a>` elements (not `<div
  onClick>`) so they're keyboard-reachable and get the existing focus-visible cobalt ring
  (`rt-chip`/`rt-tag` focus states) for free.
- Because the checklist is always visible in State 2 (not hidden behind hover/click), it works
  identically for mouse, keyboard, and screen-reader users — this is one of the reasons (b) beats
  (a)/(d) here, not just a nice side effect.

## Files the Developer would touch

- `src/components/CustomExtendedDataField/CustomExtendedDataField.js` — `getLabel()` (required
  asterisk).
- `src/components/CustomExtendedDataField/CustomExtendedDataField.module.css` — `.req` style +
  `sr-only` required-text style if not already present app-wide.
- `src/containers/EditListingPage/EditListingWizard/EditListingDetailsPanel/EditListingDetailsForm.js`
  — `AddListingFields.renderField()` (field anchor wrapper), new "Still needed" block + caption
  before the submit `<Button>`.
- `src/containers/EditListingPage/EditListingWizard/EditListingDetailsPanel/EditListingDetailsForm.module.css`
  — new classes for the still-needed block, eyebrow label, item list.
- `src/containers/EditListingPage/EditListingWizard/EditListingDetailsPanel/EditListingDetailsPanel.module.css`
  — `.sectionHeading` token alignment (§3).
- `src/translations/en.json` — two new keys (`EditListingDetailsForm.stillNeededEyebrow`,
  `EditListingDetailsForm.stillNeededHelp`) plus whatever `sr-only` "required" string convention
  the Developer already uses elsewhere in the app (reuse if one exists; don't invent a second one).
- No change needed to `EditListingWizard.js`'s `tabCompleted`/`DETAILS` gate (line 268) — its
  logic is being read from, not modified.

## Open questions for PM / Neil

1. **None safety/legal/brand-changing** — this is UI legibility/microcopy within the existing
   design system and voice; no new claims, no new colours, no change to what data is required. I
   don't think this needs Neil's sign-off beyond normal PM review, but flagging per the escalation
   categories in case the PM reads it differently.
2. **Scope confirmation:** the `getLabel()` change in `CustomExtendedDataField.js` is shared across
   the whole app (§1 scope note) — worth the PM confirming that's acceptable before the Developer
   picks this up, since it's technically broader than "the Your profile step" even though the
   visible effect elsewhere should only ever be "a required field now has an asterisk," which is a
   strict improvement.
3. **Backlog item, not a decision needed now:** the app-wide "reveal all errors on submit attempt"
   upgrade (end of §2) — recommend the PM logs it in the roadmap/decision log rather than acting on
   it as part of this fix.
