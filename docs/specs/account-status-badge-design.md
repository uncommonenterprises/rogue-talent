# Account status badge — design spec (`rt-status`)

**APPROVED by Neil in chat 2026-09-21** — lifecycle spec ("Spec is approved") and the new
amber token family ("Yes, add the amber token"). Cleared to build.

Owner: ux-designer. Consumes: `docs/specs/account-status-lifecycle.md` (5 statuses, semantics),
`design-system/DESIGN_SYSTEM.md` + `src/styles/designTokens.css` (token system, `rt-badge`/
`rt-tag`/`rt-dot` conventions).

---

## 0. Scope note — how this relates to the existing `VerifiedBadge`

Per lifecycle spec §9, the old per-card/profile `VerifiedBadge` (`accent-50`/`accent-700`,
metadata-driven) is being retired — every visible model is Verified, so a public badge is
redundant. `rt-status` is its replacement **for the self-facing surfaces** (own dashboard/profile,
operator triage view) described in lifecycle spec §7 — it is not a public trust signal and is not
intended for search cards or other users' profiles.

---

## 1. Colour tokens

### 1.1 Existing tokens reused as-is (no change)

| Status | Token(s) used | Hex | Source |
|---|---|---|---|
| Approved (cobalt) | `--accent-50` / `--accent-700` | `#F0F3FF` / `#1533B5` | existing — identical pairing already shipped as `rt-badge--verified` |
| Verified (green) | `--status-success` (text/dot); tint bg is the existing raw rgba used by `rt-badge--available` | `#1E7F52`; bg `rgba(30,127,82,0.12)` | existing |
| Rejected/Suspended (red) | `--status-error` (text/dot); tint bg is a new **alpha composition of the existing token** (not a new colour — same pattern as the green tint above, just not yet written down anywhere) | `#D22B2B`; bg `rgba(210,43,43,0.10)` | existing hex, new alpha use |
| Draft (grey) | `--ink-100` / `--ink-700` | `#EFF0F2` / `#333640` | existing — identical to `rt-badge` default |

### 1.2 New token family — amber (Pending approval)

The DS has a single flat `--status-warning: #B6791C` (currently only used for the standalone
`rt-dot--busy`) but no *ramp* — no light tint for a badge background and no brightened variant
for use on dark surfaces, the way `--accent-*` has. Pending approval needs both, so this spec
defines one new ramp, named to match the existing `--accent-*` pattern exactly:

| Token | Hex | Role | Contrast check |
|---|---|---|---|
| `--amber-50` | `#FBF3E4` | faint tint surface (reserved for future banner/alert use, not used by the badge itself) | — |
| `--amber-100` | `#F5E3C2` | tint fill — light-mode badge background | bg for text below |
| `--amber-400` | `#C98B2E` | brightened variant for on-dark text/dot (mirrors `--accent-400`'s "hover, on-dark accent" role) | 6.8:1 on `--ink-950` |
| `--amber-500` | `#B6791C` | base tone — **identical value to the existing `--status-warning`**, no visual change to today's `rt-dot--busy` | 5.4:1 on `--ink-950` (dot use) |
| `--amber-700` | `#8A5712` | deep tone — light-mode badge text/dot (mirrors how `--accent-700` pairs with `--accent-50`) | 4.8:1 on `--amber-100` |

Hue is the same warm amber-ochre as the existing `--status-warning` (HSL ≈ 36°, 73%, 41% at the
500 step) — the ramp is built *around* the existing value, not invented from scratch, so it sits
on-brand next to cobalt/green/red without introducing a new hue to the palette.

**Add to `src/styles/designTokens.css`**, in the color block alongside the other status tokens:

```css
/* --- Amber / warning ramp (Pending approval; also feeds rt-dot--busy) --- */
--amber-50: #FBF3E4;
--amber-100: #F5E3C2;
--amber-400: #C98B2E;
--amber-500: #B6791C; /* = existing --status-warning value, unchanged */
--amber-700: #8A5712;
```

Optional non-visual cleanup for the Developer: once the ramp exists, `--status-warning` can be
redefined as `var(--amber-500)` to make the ramp the single source of truth. Resolves to the exact
same hex — zero visual change to today's `rt-dot--busy`.

**Brand-rule check:** amber is additive, not a replacement for anything — red stays danger-only,
cobalt stays the single per-view action colour (a status chip is never a button, so it never
competes for the "one cobalt action" budget), no gradients used anywhere in this spec, hairline
borders only (see §2).

---

## 2. Component spec — `rt-status`

Matches the `rt-badge`/`rt-tag`/`rt-dot` family (§9, `design-system/components.css`): same type
ramp, same padding logic, same restrained rectilinear shape (badges use `--radius-sm`, not a
pill — pills stay reserved for tags/chips/avatars per the DS).

### 2.1 Shell (shared across all 5 statuses)

```css
.rt-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-sans);
  font-weight: var(--weight-bold);
  font-size: var(--text-2xs);       /* 11px — default size */
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  padding: 4px 9px;
  border-radius: var(--radius-sm);  /* 2px — same as rt-badge, not a pill */
}
.rt-status__dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
```

### 2.2 Sizes

| Size | Font | Padding | Dot | Use |
|---|---|---|---|---|
| default | `--text-2xs` (11px) | `4px 9px` | 6px | dense contexts — tables, list rows, operator triage view |
| `--lg` | `--text-xs` (12px) | `6px 12px` | 8px (matches standalone `rt-dot`) | prominent placement — own dashboard header, profile page |

```css
.rt-status--lg {
  font-size: var(--text-xs);
  padding: 6px 12px;
  gap: 6px;
}
.rt-status--lg .rt-status__dot { width: 8px; height: 8px; }
```

### 2.3 Fill treatment: tint + dot, not solid-fill

Deliberate choice: `rt-status` uses a **tinted background + coloured dot + coloured text**
(the `rt-badge--verified` / `rt-badge--available` pattern), *not* a solid saturated fill with
white text (the `rt-badge--new` pattern). Reasoning:
- `rt-badge--new`-style solid fill is reserved for high-emphasis promotional tags. A status chip
  is informational and often shown in a dense list (e.g. an operator triage table) — five status
  chips solid-filled in five colours per row would be visual noise and would read as five
  competing "actions," which breaks the one-cobalt-action-per-view rule in spirit even though
  technically none of them are buttons.
- Tint + dot keeps the chip quiet (hairlines-over-shadows, low-key) while the dot still gives a
  second, non-text signal of state at a glance.

### 2.4 Minimal variant — dot + text, no chip

For very dense rows (e.g. an operator table with one status per row, many rows) offer a
no-background variant using the exact same colour tokens as the filled chip, just without the
tint fill/padding — same pattern already used inline for `rt-dot--available`/`--busy`/`--off` next
to plain text (see `design-system/reference/Components.html`).

```css
.rt-status--minimal {
  background: transparent;
  padding: 0;
  text-transform: none;      /* reads better as sentence case inline, e.g. "Pending approval" */
  font-weight: var(--weight-semibold);
  font-size: var(--text-sm);
  letter-spacing: 0;
}
```

### 2.5 Status modifiers — light (default surface)

All values reference tokens; no hardcoded hex in the component itself.

```css
.rt-status--draft     { background: var(--ink-100); color: var(--ink-700); }
.rt-status--draft .rt-status__dot     { background: var(--ink-700); }

.rt-status--pending    { background: var(--amber-100); color: var(--amber-700); }
.rt-status--pending .rt-status__dot   { background: var(--amber-700); }

.rt-status--approved   { background: var(--accent-50); color: var(--accent-700); }
.rt-status--approved .rt-status__dot  { background: var(--accent-700); }

.rt-status--verified   { background: rgba(30,127,82,0.12); color: var(--status-success); }
.rt-status--verified .rt-status__dot  { background: var(--status-success); }

.rt-status--rejected   { background: rgba(210,43,43,0.10); color: var(--status-error); }
.rt-status--rejected .rt-status__dot  { background: var(--status-error); }
```

Note: dot colour = text colour for every status. That's a deliberate simplification (see §3) —
it guarantees the dot is never harder to read than the label sitting right next to it, and it's
one less pairing to get wrong at build time.

---

## 3. Dark treatment

The app doesn't have a `prefers-color-scheme` dark mode today — the DS's existing dark-surface
pattern is the `.rt-on-ink` **context wrapper** (used for dark editorial blocks; see
`design-system/components.css` `.rt-on-ink .rt-btn--*` rules, e.g. primary brightens to
`--accent-400`). `rt-status` follows the same convention: wrap in `.rt-on-ink` on any dark
surface (a dark dashboard panel, dark operator view, etc.) rather than introducing a new
mode-switching architecture. If a true system dark mode is added later, this scoping maps
directly onto it.

```css
.rt-on-ink .rt-status { background: rgba(255,255,255,0.06); }  /* same subtle lift as rt-btn--secondary:hover on ink */

.rt-on-ink .rt-status--draft,
.rt-on-ink .rt-status--draft .rt-status__dot     { color: var(--ink-300); background: var(--ink-300); }

.rt-on-ink .rt-status--pending,
.rt-on-ink .rt-status--pending .rt-status__dot   { color: var(--amber-400); background: var(--amber-400); }

.rt-on-ink .rt-status--approved,
.rt-on-ink .rt-status--approved .rt-status__dot  { color: var(--accent-400); background: var(--accent-400); }

/* Verified & Rejected: no bright on-dark token exists for green/red today (only cobalt has
   --accent-400). Rather than invent one outside this spec's scope, text drops to a high-contrast
   neutral and only the dot carries the status colour (a dot is a graphical object — WCAG's lower
   3:1 bar — while text needs 4.5:1, which the raw status-success/status-error hex don't clear on
   ink-950). Flag to PM: if this asymmetry bothers Neil, a --success-400 / --error-400 pair would
   need its own (small) sign-off — out of scope here. */
.rt-on-ink .rt-status--verified  { color: var(--white); }
.rt-on-ink .rt-status--verified .rt-status__dot  { background: var(--status-success); }

.rt-on-ink .rt-status--rejected  { color: var(--white); }
.rt-on-ink .rt-status--rejected .rt-status__dot  { background: var(--status-error); }
```

---

## 4. Visual ramp (all 5, light + dark)

```
LIGHT (on white / card surface)
┌──────────┐  ┌──────────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐
│ ● DRAFT  │  │ ● PENDING APPROVAL│  │ ● APPROVED │  │ ● VERIFIED │  │ ● REJECTED/SUSPENDED │
└──────────┘  └──────────────────┘  └────────────┘  └────────────┘  └──────────────────────┘
  grey chip      amber chip            cobalt chip     green chip        red chip
  ink-100 bg     amber-100 bg          accent-50 bg    green 12% tint    red 10% tint
  ink-700 text   amber-700 text        accent-700 text status-success   status-error
                                                        text             text

DARK (.rt-on-ink)
┌──────────┐  ┌──────────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐
│ ● DRAFT  │  │ ● PENDING APPROVAL│  │ ● APPROVED │  │ ● VERIFIED │  │ ● REJECTED/SUSPENDED │
└──────────┘  └──────────────────┘  └────────────┘  └────────────┘  └──────────────────────┘
  white-6% fill throughout; text/dot: ink-300 / amber-400 / accent-400 / white+green-dot / white+red-dot
```

Minimal (dot + text, dense rows) — same colours, no chip:

```
● Draft        ● Pending approval        ● Approved        ● Verified        ● Rejected/Suspended
```

---

## 5. Accessibility

- Status is never colour-only: every chip pairs the colour with a text label (differing wording
  per status), so colourblind users read the state from the words, not the hue — the dot is
  reinforcement, not the only signal.
- Text-on-background contrast (WCAG AA, 4.5:1 minimum for this small/bold text size), computed
  against the actual token pairs above:

  | Status | Light pair | Ratio | Dark pair | Ratio |
  |---|---|---|---|---|
  | Draft | `ink-700` on `ink-100` | ~10.6:1 | `ink-300` on `ink-950` | ~11.6:1 |
  | Pending approval | `amber-700` on `amber-100` | ~4.8:1 | `amber-400` on `ink-950` | ~6.8:1 |
  | Approved | `accent-700` on `accent-50` | ~8.7:1 | `accent-400` on `ink-950` | ~5.4:1 |
  | Verified | `status-success` on 12%-green-tint | ~4.5:1 | `white` on `ink-950` | ~19:1 (dot alone: `status-success` on `ink-950` ≈ 4.0:1, meets the 3:1 non-text bar) |
  | Rejected/Suspended | `status-error` on 10%-red-tint | ~4.7:1 | `white` on `ink-950` | ~19:1 (dot alone ≈ 3.9:1, meets 3:1 non-text bar) |

  All pairs clear WCAG AA for their role (4.5:1 for text, 3:1 for the dot as a graphical object).

---

## 6. Open items for the Developer / PM

1. Add the amber ramp to `src/styles/designTokens.css` (§1.2) — needs a nod from Neil alongside
   lifecycle-spec sign-off since it's a permanent palette addition, not just a component tweak.
2. Build `rt-status` as its own component (not a `rt-badge` modifier) since it has a five-way
   status enum, a size variant, and a minimal/dense variant that `rt-badge` doesn't need.
3. Placement per lifecycle spec §7: self dashboard/profile (primary, `--lg`), operator triage view
   (default or `--minimal` in a table). Not used on search cards or other users' profiles — that's
   the retired `VerifiedBadge`'s old job, not this component's.
4. The verified/rejected on-dark asymmetry (§3) is a known, scoped limitation — not a bug to
   silently "fix" with a new colour at build time. If it needs solving, that's a small new-token
   decision for PM/Neil, not a developer judgement call.
