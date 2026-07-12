# Rogue Talent — Design System (Developer Handoff)

> **Single-source reference for Claude Code.** Everything needed to apply the Rogue Talent design system in a real codebase is in this one document: brand rules, every token value, component specs, content/voice guidance, and the complete CSS (Appendices A & B).

---

## 1. Overview

**Rogue Talent** is a two-sided marketplace that connects **models** directly with the **businesses** that book them — cutting out the traditional agent ("going rogue" against industry norms).

The brand serves two audiences at once:
- **Models** — should feel cool, modern, fashion-forward.
- **Businesses** — should feel professional, mature, trustworthy.

Visual reference point: **Vogue**, reinterpreted as a **modern consumer-tech product** (think Slack / Shopify friendliness). The result is editorial structure (masthead, hairlines, strict grid, generous whitespace) rendered in a crisp, technical, white-based UI with a single electric accent.

## 2. How to use this in a codebase

**These are design *references*, not production code to ship.** Recreate the look and behavior in the target codebase's existing environment (React, Vue, SwiftUI, native, Tailwind, etc.) using its established patterns. If no environment exists yet, pick the most appropriate framework and implement there.

Two ways to consume the system:

1. **Drop in the CSS (fastest).** This bundle ships `styles.css` (imports the token files in `tokens/`) and `components.css`. Link them in order:
   ```html
   <link rel="stylesheet" href="styles.css">     <!-- tokens: colors, type, spacing, radii, motion -->
   <link rel="stylesheet" href="components.css"> <!-- rt-* component classes -->
   ```
   The full text of both is inlined in **Appendix A** (tokens) and **Appendix B** (components) so you can recreate the files even without the bundle.

2. **Map the tokens into the target system** (Tailwind theme, CSS-in-JS theme, iOS asset catalog, etc.) using the tables below, then rebuild components with the codebase's primitives. Recommended for any real product.

**Fidelity: high.** Colors, type, spacing, and states below are final — match them exactly.

### Fonts
All from Google Fonts. Load before first paint:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Hanken+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

## 3. Brand principles

1. **Editorial structure, tech friendliness.** Masthead scale, hairline rules, strict grid and whitespace — but warm, legible, and approachable, not formal or heritage.
2. **Two audiences, one voice.** Confident and fashion-forward for talent; precise and trustworthy for business.
3. **Cobalt with intent.** The accent is a scalpel, not a highlighter — roughly one cobalt mark per view (the primary action, a verified badge, one word set apart).
4. **Rectilinear & quiet.** Sharp or lightly-rounded corners, hairline borders preferred over shadow, low cool-tinted elevation, no gradients.
5. **Red means danger only.** Never decorative — reserved for errors/destructive actions.
6. **No emoji.** Use the accent, a hairline, a dot, or a tracked label instead.

---

## 4. Color

Crisp **white** base, a **cool true-neutral ink ramp**, and one **electric cobalt** accent.

### Ink ramp (cool neutrals)
| Token | Hex | Use |
|---|---|---|
| `--ink-950` | `#0A0A0B` | True black — inverted blocks, footers |
| `--ink-900` | `#131417` | Primary text |
| `--ink-800` | `#202228` | — |
| `--ink-700` | `#333640` | Rules on dark |
| `--ink-600` | `#52565F` | Secondary text |
| `--ink-500` | `#71757E` | Muted text, captions |
| `--ink-400` | `#9A9DA5` | Disabled, placeholder |
| `--ink-300` | `#C4C6CC` | Hairline on dark surfaces |
| `--ink-200` | `#E2E3E7` | Hairline borders |
| `--ink-100` | `#EFF0F2` | Subtle fills, dividers |
| `--ink-50`  | `#F7F8F9` | Subtle section surface |
| `--white`   | `#FFFFFF` | The base — page & product surface |

### Electric Cobalt (accent) — `oklch(0.56 0.24 266)`
| Token | Hex | Use |
|---|---|---|
| `--accent-700` | `#1533B5` | Deep / pressed on light |
| `--accent-600` | `#1E45DD` | Pressed / active, link default |
| `--accent-500` | `#2B57FF` | **Accent — default** |
| `--accent-400` | `#5B7BFF` | Hover, on-dark accent |
| `--accent-100` | `#DCE3FF` | Tint fill / focus ring |
| `--accent-50`  | `#F0F3FF` | Faint tint surface |

### Semantic aliases (reference these, not raw hex)
| Alias | Value |
|---|---|
| `--text-primary` / `--text-secondary` / `--text-muted` / `--text-disabled` | ink-900 / ink-600 / ink-500 / ink-400 |
| `--text-inverse` / `--text-accent` | white / accent-600 |
| `--surface-page` / `--surface-card` | white / white |
| `--surface-subtle` / `--surface-ink` / `--surface-accent` | ink-50 / ink-950 / accent-500 |
| `--border-hairline` / `--border-subtle` / `--border-strong` / `--border-inverse` | ink-200 / ink-100 / ink-900 / ink-700 |
| `--on-ink` / `--on-accent` / `--focus-ring` | white / white / accent-500 |

### Status (quiet, warm-neutral tuned)
| Token | Hex | Use |
|---|---|---|
| `--status-success` | `#1E7F52` | Available / confirmed (green dot) |
| `--status-warning` | `#B6791C` | Booked / busy |
| `--status-error` | `#D22B2B` | **Danger only** — errors, destructive |
| `--status-info` | `#2B57FF` | Informational (= accent) |

---

## 5. Typography

Three roles, modern consumer-tech voice:

- **Display — Bricolage Grotesque** (contemporary, characterful grotesque). Wordmark, headlines, big numerals, rates. Weights **800 / 700**, tight tracking (`-0.035em`). **No italics** — Bricolage has none; set accent words in cobalt, never slanted.
- **Text — Hanken Grotesk** (friendly, legible workhorse). Body, UI, everything functional. Body line-height **1.6**; weights 400–800.
- **Labels / eyebrows — Hanken Grotesk, tracked.** 700 weight, UPPERCASE, tracking `0.12–0.16em`. This is the brand label voice (it replaced the old mono credit-line).
- **Utility — IBM Plex Mono.** Code, IDs, tabular figures, token names **only**. Not brand voice.

### Families
```
--font-display: "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif;
--font-sans:    "Hanken Grotesk", "Helvetica Neue", Arial, sans-serif;
--font-mono:    "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
```

### Scale (px)
| Token | px | Typical use |
|---|---|---|
| `--text-2xs` | 11 | Micro-labels |
| `--text-xs` | 12 | Eyebrows, badges, captions |
| `--text-sm` | 14 | UI text, secondary body |
| `--text-base` | 16 | Body |
| `--text-lg` | 18 | Lead body |
| `--text-xl` | 22 | Subheads, rates |
| `--text-2xl` | 28 | Card names, small headlines |
| `--text-3xl` | 36 | Section titles |
| `--text-4xl` | 48 | Page titles |
| `--text-5xl` | 64 | Hero |
| `--text-6xl` | 88 | Big hero |
| `--text-cover` | 128 | Masthead / cover |

**Weights:** regular 400, medium 500, semibold 600, bold 700, extrabold 800.
**Line-heights:** none 1 · tight 1.02 (display) · snug 1.28 · normal 1.6 (body) · relaxed 1.75.
**Tracking:** tighter −0.035em · tight −0.02em · normal 0 · wide 0.06em · wider 0.12em (labels) · widest 0.16em.

### Wordmark
Set **"Rogue Talent."** in Bricolage 800, sentence case, with **"Talent."** in cobalt (`--accent-500`/`--accent-400` on dark) — the period is part of the mark. An all-caps "ROGUE" stacked lockup is available as an alternate. In nav, an abbreviated **"Rogue."** (cobalt period) is used.

---

## 6. Spacing, layout & grid

4px base grid. Editorial layouts breathe — bias to the larger steps for section rhythm and margins.

| Token | px | · | Token | px |
|---|---|---|---|---|
| `--space-1` | 4 | | `--space-7` | 48 |
| `--space-2` | 8 | | `--space-8` | 64 |
| `--space-3` | 12 | | `--space-9` | 96 |
| `--space-4` | 16 | | `--space-10` | 128 |
| `--space-5` | 24 | | `--space-11` | 192 |
| `--space-6` | 32 | | | |

**Layout:** `--container-max: 1280px` (product/app shell) · `--container-editorial: 1080px` (marketing measure) · `--measure-text: 66ch` (long-form) · `--gutter: 24px` · `--section-gap: 96px`. **Grid:** 12 columns, 24px gap.

## 7. Radii, borders & shadows

Fundamentally rectilinear. Interactive product elements get an 8px radius (friendly-tech); pills for tags/chips/avatars.

| Radius | Value | Use |
|---|---|---|
| `--radius-none` | 0 | Editorial default — images, blocks |
| `--radius-sm` | 2px | Small inputs, badges |
| `--radius-md` | 4px | Menus, small buttons |
| `--radius-lg` | 8px | **Buttons, inputs, cards, modals** |
| `--radius-pill` | 999px | Tags, chips, avatars, toggles |

**Borders:** `--border-hair: 1px` (hairline rules — a signature) · `--border-key: 1.5px` (keyline frames, button borders) · `--border-bold: 2px` (focus / active tab).

**Shadows** (quiet, cool-tinted, low elevation — prefer hairlines):
`--shadow-xs` `0 1px 2px rgba(10,10,12,.05)` · `--shadow-sm` `0 2px 8px rgba(10,10,12,.06)` · `--shadow-md` `0 8px 28px rgba(10,10,12,.08)` · `--shadow-lg` `0 24px 56px rgba(10,10,12,.10)`.

## 8. Motion

Confident and quick, never bouncy. Fades and precise slides; no overshoot.

**Durations:** instant 80ms · fast 140ms (UI) · base 220ms · slow 380ms · editorial 640ms (hero/cover reveals).
**Easing:** `--ease-standard` `cubic-bezier(.2,0,0,1)` · `--ease-out` `cubic-bezier(.16,1,.3,1)` · `--ease-in` `cubic-bezier(.7,0,.84,0)` · `--ease-editorial` `cubic-bezier(.4,0,.1,1)`.

---

## 9. Components

All classes are prefixed `rt-` and defined in `components.css` (Appendix B). Specs below; recreate faithfully in the target stack.

### Button — `.rt-btn`
Base: Hanken **700**, sentence case, `--radius-lg` (8px), padding 12×20, 1.5px border, `transition` on background/border/transform (fast). `:active` nudges `translateY(1px)`. Focus-visible: 2px white + 4px cobalt ring.

| Variant | Default | Hover | Active |
|---|---|---|---|
| `--primary` | bg accent-500, white | accent-600 | accent-700 |
| `--secondary` | white, ink-900 text, ink-900 1.5px border | bg ink-50 | bg ink-100 |
| `--ghost` | transparent, accent-600 | bg accent-50 | bg accent-100 |
| `--danger` | bg status-error, white | `#B71F1F` | — |

Sizes: `--sm` (12px, pad 8×14, radius-md) · default (14px) · `--lg` (16px, pad 15×28). Modifiers: `--block` (full width), `--icon` (44×44 square). `[disabled]`/`--disabled`: opacity .4, no pointer events. **On dark:** wrap in `.rt-on-ink` — primary hover brightens to accent-400, secondary becomes a light-on-transparent keyline, ghost uses accent-400.
**Rule:** one `--primary` per view (the main action). Everything else is secondary/ghost.

### Form field — `.rt-field`
Structure: `.rt-field` (column, gap 8) › `.rt-field__label` (Hanken 600, 14px; `.rt-req` asterisk = accent-500) › control › `.rt-field__hint` (12px muted) or `.rt-field__error` (12px, 600, status-error).
Controls `.rt-input` / `.rt-select` / `.rt-textarea`: 16px Hanken, white, 1px ink-200 border, `--radius-lg`, padding 12×14, full width. Placeholder ink-400. **Focus:** border accent-500 + `0 0 0 3px accent-100` ring. Disabled: bg ink-50, ink-400 text. Error: add `--error` (border status-error; focus ring red-tinted). `.rt-textarea` min-height 108, vertical resize. `.rt-select` has an inline SVG chevron. `.rt-search` wraps an input with a leading `.rt-search__icon` (input padding-left 42).

### Selection — `.rt-check`, `.rt-toggle`
Native input visually hidden + styled sibling. **Checkbox** `.rt-check__box`: 20px, 1.5px ink-300 border, radius-sm; checked → accent-500 fill + white check SVG. **Radio:** add `--radio` (pill box, dot). **Toggle** `.rt-toggle__track`: 44×26 pill, ink-300; knob 20px white; checked → accent-500 + knob `translateX(18px)`. All show a 3px accent-100 focus ring on `:focus-visible`.

### Tag & chip
**`.rt-tag`** (non-interactive label): pill, Hanken 600 12px, bg ink-100 / ink-700. Variants: `--accent` (accent-50 / accent-700), `--outline` (transparent, ink-200 border). **`.rt-chip`** (interactive filter): pill, Hanken 600 14px, white + 1px ink-200 border; hover border ink-400; `--selected` → ink-900 bg, white. Optional `.rt-chip__x` remove icon.

### Badge & status
**`.rt-badge`**: small pill, Hanken 700 11px UPPERCASE tracked, padding 4×9, radius-sm. Variants: `--verified` (accent-50 / accent-700, with check SVG — the trust signal), `--new` (accent-500 / white), `--available` (green tint / status-success, with dot), `--ink` (ink-950 / white = Featured), default (ink-100 / ink-700). **`.rt-dot`** 8px: `--available` green, `--busy` amber, `--off` ink-300. Availability is **green, never red**.

### Avatar — `.rt-avatar`
Circle, ink-100 bg, **display-font monogram** fallback (Bricolage 700). Sizes `--sm` 32 · default 44 · `--lg` 64. `.rt-avatar-group` overlaps (−12px, 2px white ring); overflow "+N" chip uses ink-900 bg + Hanken.

### Talent card — `.rt-talent` (hero object)
Column, white, 1px hairline, `--radius-lg`, width ~300, overflow hidden. Hover: `--shadow-md` + `translateY(-2px)` (base duration). Anatomy:
- `.rt-talent__photo` — 4:5 aspect; holds a status/verified `.rt-badge` top-left and a `.rt-ph` "Portfolio" label bottom-right. (Placeholder is a diagonal-stripe fill; swap for the real image.)
- `.rt-talent__body` (pad 24, gap 12): `.rt-talent__loc` (eyebrow location + availability dot) · `.rt-talent__name` (Bricolage 800, 28px) · `.rt-talent__meta` (14px secondary) · `.rt-talent__tags` · `.rt-talent__rule` (hairline) · `.rt-talent__foot` = `.rt-talent__rate` (Bricolage 800, 22px; `small` = "/ day" muted) + a `--sm` book button.

### Navigation — `.rt-nav`
Row, white, bottom hairline, pad 16×32. `.rt-nav__brand` ("Rogue." with cobalt period) · `.rt-nav__links` (Hanken 600 14px secondary; `--active`/hover → primary) · `.rt-nav__actions` (margin-left auto; Sign in link + `--primary --sm` button).

### Tabs & segmented
**`.rt-tabs`** underline: `.rt-tab` Hanken 600 14px secondary, 2px transparent bottom border; `--active` → primary text + accent-500 underline. **`.rt-segmented`** (radios): ink-100 track, radius-lg, 3px pad; checked label → white bg + shadow-xs. Used for the **talent / business** switch and view toggles (grid/list/map).

---

## 10. Content & voice

- **Tone:** confident, spare, a little bold. Editorial headline energy; plain functional body. Talk *to* the reader ("your terms", "book direct"). Avoid marketplace clichés and hype.
- **Casing:** sentence case for body and headlines; UPPERCASE (tracked Hanken) for eyebrows, labels, tags.
- **Examples:**
  - Tagline: *"The model, disrupted."*
  - Value line: *"Booked direct, on your terms."*
  - Primary CTA: *"Book direct"*
  - Label/credit: `BOOKING VERIFIED · LONDON UK · £1,200/DAY`
- **Emoji:** none.

## 11. Iconography

Thin-stroke, rectilinear line icons at **~1.5px stroke** (candidate sets: Lucide or Phosphor "thin"), sized 16–18px inline, `stroke="currentColor"`. The handoff HTML uses inline SVGs in this style (search, check, plus, chevron, ×). Verified uses a checkmark; the two-sided relationship can use ↔. Confirm and standardize on one set in the codebase. **No emoji.**

## 12. Do / Don't

**Do:** use semantic aliases; keep one cobalt action per view; prefer hairlines over shadow; set accent words in cobalt (not italic); use green for availability; keep generous whitespace.
**Don't:** use red for anything but danger; add gradients; italicize the display font; introduce a second accent; use mono for brand copy; add emoji; round everything (keep the editorial edge).

---

## Appendix A — Design tokens CSS

> This is the exact content of the bundled token files. `styles.css` `@import`s them in this order: typography, colors, spacing, radii-shadows, motion.

### tokens/colors.css
```css
/* ============================================================
   ROGUE TALENT — COLOR TOKENS
   Crisp white base, cool true-neutral ink ramp, one electric
   accent. Modern and technical; red is reserved for danger only.
   ============================================================ */

:root {
  /* --- Ink ramp (cool, near-neutral greys) --- */
  --ink-950: #0A0A0B;  /* true black — ink blocks, footers */
  --ink-900: #131417;  /* primary text */
  --ink-800: #202228;
  --ink-700: #333640;
  --ink-600: #52565F;  /* secondary text */
  --ink-500: #71757E;  /* muted text, captions */
  --ink-400: #9A9DA5;  /* disabled, placeholder */
  --ink-300: #C4C6CC;  /* hairline on dark surfaces */
  --ink-200: #E2E3E7;  /* hairline borders */
  --ink-100: #EFF0F2;  /* subtle fills, dividers */
  --ink-50:  #F7F8F9;  /* subtle section surface */
  --white:   #FFFFFF;  /* the base — page & product surface */

  /* --- Electric Cobalt — the single accent ---
     oklch(0.56 0.24 266) · fresh, technical, trustworthy.
     Cool for talent, professional for business. Used with intent. */
  --accent-700: #1533B5;  /* deep, pressed on light */
  --accent-600: #1E45DD;  /* pressed / active */
  --accent-500: #2B57FF;  /* ACCENT — default */
  --accent-400: #5B7BFF;  /* hover, on-dark accent */
  --accent-100: #DCE3FF;  /* tint fill */
  --accent-50:  #F0F3FF;  /* faint tint surface */

  /* ============================================================
     SEMANTIC ALIASES — reference these in product & marketing.
     ============================================================ */

  /* Text */
  --text-primary: var(--ink-900);
  --text-secondary: var(--ink-600);
  --text-muted: var(--ink-500);
  --text-disabled: var(--ink-400);
  --text-inverse: var(--white);
  --text-accent: var(--accent-600);

  /* Surfaces */
  --surface-page: var(--white);      /* the base — marketing & product */
  --surface-card: var(--white);      /* cards, sheets */
  --surface-subtle: var(--ink-50);   /* subtle section fills */
  --surface-ink: var(--ink-950);     /* inverted / editorial black blocks */
  --surface-accent: var(--accent-500);

  /* Borders & dividers */
  --border-hairline: var(--ink-200); /* 1px editorial rules */
  --border-subtle: var(--ink-100);
  --border-strong: var(--ink-900);   /* keyline boxes, focus frames */
  --border-inverse: var(--ink-700);  /* rules on dark surfaces */

  /* On-color foregrounds */
  --on-ink: var(--white);
  --on-accent: var(--white);

  /* Focus */
  --focus-ring: var(--accent-500);

  /* Status — red now means ONE thing: danger. */
  --status-success: #1E7F52;
  --status-warning: #B6791C;
  --status-error: #D22B2B;
  --status-info: var(--accent-500);
}

```

### tokens/typography.css
```css
/* ============================================================
   ROGUE TALENT — TYPOGRAPHY TOKENS
   Modern consumer-tech voice: a characterful grotesque display
   over a friendly, highly-legible grotesque body. Labels are
   tracked uppercase grotesque. Mono is utility only.
   ============================================================ */

@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Hanken+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  /* --- Families ---
     Display: Bricolage Grotesque — contemporary, a little characterful.
              Wordmark, headlines, big numerals, rates. Weights 700/800.
     Sans:    Hanken Grotesk — friendly, warm, workhorse grotesque.
              Body, UI, labels, everything functional. 400–800.
     Mono:    IBM Plex Mono — UTILITY ONLY. Code, IDs, tabular figures,
              token names. NOT brand voice — labels use the sans. */
  --font-display: "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif;
  --font-sans: "Hanken Grotesk", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;

  /* --- Type scale (px) ---
     Dramatic jumps at the top for confident display, tight steps for text. */
  --text-2xs: 11px;
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 22px;
  --text-2xl: 28px;
  --text-3xl: 36px;
  --text-4xl: 48px;
  --text-5xl: 64px;
  --text-6xl: 88px;
  --text-cover: 128px; /* masthead / hero scale */

  /* --- Weights --- */
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
  --weight-extrabold: 800; /* display headlines & wordmark */

  /* --- Line heights --- */
  --leading-none: 1;
  --leading-tight: 1.02;   /* display headlines */
  --leading-snug: 1.28;    /* subheads */
  --leading-normal: 1.6;   /* body copy */
  --leading-relaxed: 1.75; /* long-form */

  /* --- Letter spacing ---
     Bricolage display wants tight tracking; grotesque labels want it wide. */
  --tracking-tighter: -0.035em;
  --tracking-tight: -0.02em;
  --tracking-normal: 0em;
  --tracking-wide: 0.06em;
  --tracking-wider: 0.12em;  /* uppercase labels / eyebrows */
  --tracking-widest: 0.16em; /* spaced-out utility labels */

  /* --- Semantic type roles --- */
  --role-eyebrow: var(--weight-bold) var(--text-xs)/1 var(--font-sans);
  --role-body: var(--weight-regular) var(--text-base)/var(--leading-normal) var(--font-sans);
  --role-display: var(--weight-extrabold) var(--text-5xl)/var(--leading-tight) var(--font-display);
}

```

### tokens/spacing.css
```css
/* ============================================================
   ROGUE TALENT — SPACING & LAYOUT TOKENS
   4px base grid. Editorial layouts breathe — bias toward the
   larger steps for section rhythm and margins.
   ============================================================ */

:root {
  /* --- Space scale (4px base) --- */
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;
  --space-10: 128px;
  --space-11: 192px;

  /* --- Layout --- */
  --container-max: 1280px;  /* product / app shell */
  --container-editorial: 1080px; /* marketing reading measure */
  --measure-text: 66ch;     /* long-form line length */
  --gutter: var(--space-5);
  --section-gap: var(--space-9);

  /* --- Editorial grid --- */
  --grid-columns: 12;
  --grid-gap: var(--space-5);
}

```

### tokens/radii-shadows.css
```css
/* ============================================================
   ROGUE TALENT — RADII, BORDERS & SHADOWS
   The system is fundamentally rectilinear — print/editorial DNA.
   Sharp corners by default; a small radius only on interactive
   product elements; pills reserved for tags & filter chips.
   Shadows are quiet and cool: no dramatic elevation.
   ============================================================ */

:root {
  /* --- Radii --- */
  --radius-none: 0;       /* editorial default — images, cards, blocks */
  --radius-sm: 2px;       /* inputs, buttons (subtle softening) */
  --radius-md: 4px;       /* product cards, menus */
  --radius-lg: 8px;       /* large surfaces, modals */
  --radius-pill: 999px;   /* tags, filter chips, avatars */

  /* --- Border widths --- */
  --border-0: 0;
  --border-hair: 1px;     /* editorial rules, dividers */
  --border-key: 1.5px;    /* keyline frames */
  --border-bold: 2px;     /* focus / selected emphasis */

  /* --- Shadows (low, neutral, warm-tinted) --- */
  --shadow-none: none;
  --shadow-xs: 0 1px 2px rgba(10, 10, 12, 0.05);
  --shadow-sm: 0 2px 8px rgba(10, 10, 12, 0.06);
  --shadow-md: 0 8px 28px rgba(10, 10, 12, 0.08);
  --shadow-lg: 0 24px 56px rgba(10, 10, 12, 0.10);
  --shadow-focus: 0 0 0 2px var(--white), 0 0 0 4px var(--accent-500);
}

```

### tokens/motion.css
```css
/* ============================================================
   ROGUE TALENT — MOTION TOKENS
   Editorial restraint: motion is confident and quick, never bouncy.
   Fades and precise slides; no elastic/overshoot easing.
   ============================================================ */

:root {
  --dur-instant: 80ms;
  --dur-fast: 140ms;
  --dur-base: 220ms;
  --dur-slow: 380ms;
  --dur-editorial: 640ms; /* hero reveals, cover transitions */

  /* Easing — crisp entrance, gentle settle. No overshoot. */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-editorial: cubic-bezier(0.4, 0, 0.1, 1);
}

```

---

## Appendix B — components.css

> Reusable component classes, built entirely on the tokens above. Link after the tokens.

```css
/* ============================================================
   ROGUE TALENT — COMPONENTS
   Reusable classes built entirely on the foundation tokens.
   Link AFTER styles.css:
     <link rel="stylesheet" href="styles.css">
     <link rel="stylesheet" href="components.css">
   Rectilinear, friendly-tech: 8px radii on interactive elements,
   Hanken labels, cobalt accent used sparingly.
   ============================================================ */

/* ---------------------------------------------------------------
   EYEBROW / LABEL — the brand label voice (tracked Hanken)
   --------------------------------------------------------------- */
.rt-eyebrow {
  font-family: var(--font-sans);
  font-weight: var(--weight-bold);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--text-muted);
}

/* ---------------------------------------------------------------
   BUTTON
   .rt-btn + variant (--primary / --secondary / --ghost / --danger)
   + optional size (--sm / --lg) + --block / --icon
   --------------------------------------------------------------- */
.rt-btn {
  --_bg: var(--accent-500);
  --_fg: var(--on-accent);
  --_bd: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-sans);
  font-weight: var(--weight-bold);
  font-size: var(--text-sm);
  line-height: 1;
  letter-spacing: 0.005em;
  padding: 12px 20px;
  border: var(--border-key) solid var(--_bd);
  border-radius: var(--radius-lg);
  background: var(--_bg);
  color: var(--_fg);
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: background var(--dur-fast) var(--ease-standard),
              border-color var(--dur-fast) var(--ease-standard),
              color var(--dur-fast) var(--ease-standard),
              transform var(--dur-fast) var(--ease-standard);
}
.rt-btn:active { transform: translateY(1px); }
.rt-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--white), 0 0 0 4px var(--accent-500); }

.rt-btn--primary { --_bg: var(--accent-500); --_fg: var(--white); }
.rt-btn--primary:hover { --_bg: var(--accent-600); }
.rt-btn--primary:active { --_bg: var(--accent-700); }

.rt-btn--secondary { --_bg: var(--white); --_fg: var(--ink-900); --_bd: var(--ink-900); }
.rt-btn--secondary:hover { --_bg: var(--ink-50); }
.rt-btn--secondary:active { --_bg: var(--ink-100); }

.rt-btn--ghost { --_bg: transparent; --_fg: var(--accent-600); --_bd: transparent; }
.rt-btn--ghost:hover { --_bg: var(--accent-50); }
.rt-btn--ghost:active { --_bg: var(--accent-100); }

.rt-btn--danger { --_bg: var(--status-error); --_fg: var(--white); }
.rt-btn--danger:hover { --_bg: #B71F1F; }

.rt-btn--sm { font-size: var(--text-xs); padding: 8px 14px; border-radius: var(--radius-md); }
.rt-btn--lg { font-size: var(--text-base); padding: 15px 28px; }
.rt-btn--block { display: flex; width: 100%; }
.rt-btn--icon { padding: 12px; width: 44px; height: 44px; }
.rt-btn[disabled], .rt-btn--disabled { opacity: 0.4; pointer-events: none; }

/* On dark surfaces the accent brightens */
.rt-on-ink .rt-btn--primary { --_bg: var(--accent-500); }
.rt-on-ink .rt-btn--primary:hover { --_bg: var(--accent-400); }
.rt-on-ink .rt-btn--secondary { --_bg: transparent; --_fg: var(--white); --_bd: var(--ink-600); }
.rt-on-ink .rt-btn--secondary:hover { --_bg: rgba(255,255,255,0.06); }
.rt-on-ink .rt-btn--ghost { --_fg: var(--accent-400); }

/* ---------------------------------------------------------------
   FORM FIELD
   .rt-field > .rt-field__label, .rt-input / .rt-select / .rt-textarea,
   .rt-field__hint, .rt-field__error
   --------------------------------------------------------------- */
.rt-field { display: flex; flex-direction: column; gap: var(--space-2); }
.rt-field__label {
  font-family: var(--font-sans);
  font-weight: var(--weight-semibold);
  font-size: var(--text-sm);
  color: var(--text-primary);
}
.rt-field__label .rt-req { color: var(--accent-500); }
.rt-field__hint { font-family: var(--font-sans); font-size: var(--text-xs); color: var(--text-muted); }
.rt-field__error { font-family: var(--font-sans); font-weight: var(--weight-semibold); font-size: var(--text-xs); color: var(--status-error); }

.rt-input, .rt-select, .rt-textarea {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--text-primary);
  background: var(--white);
  border: var(--border-hair) solid var(--ink-200);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  width: 100%;
  box-sizing: border-box;
  transition: border-color var(--dur-fast) var(--ease-standard),
              box-shadow var(--dur-fast) var(--ease-standard);
}
.rt-textarea { min-height: 108px; resize: vertical; line-height: var(--leading-normal); }
.rt-input::placeholder, .rt-textarea::placeholder { color: var(--ink-400); }
.rt-input:focus, .rt-select:focus, .rt-textarea:focus {
  outline: none;
  border-color: var(--accent-500);
  box-shadow: 0 0 0 3px var(--accent-100);
}
.rt-input:disabled, .rt-select:disabled, .rt-textarea:disabled { background: var(--ink-50); color: var(--text-disabled); cursor: not-allowed; }
.rt-input--error, .rt-select--error, .rt-textarea--error { border-color: var(--status-error); }
.rt-input--error:focus { box-shadow: 0 0 0 3px rgba(210,43,43,0.15); }

/* Select chevron */
.rt-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%2352565F' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 40px;
}

/* Search input (leading icon) */
.rt-search { position: relative; }
.rt-search .rt-input { padding-left: 42px; }
.rt-search__icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--ink-400); pointer-events: none; display: flex; }

/* ---------------------------------------------------------------
   CHECKBOX / RADIO / TOGGLE  (pure CSS via native inputs)
   --------------------------------------------------------------- */
.rt-check { display: inline-flex; align-items: center; gap: var(--space-3); font-family: var(--font-sans); font-size: var(--text-sm); color: var(--text-primary); cursor: pointer; }
.rt-check input { position: absolute; opacity: 0; width: 0; height: 0; }
.rt-check__box {
  width: 20px; height: 20px; flex: none;
  border: var(--border-key) solid var(--ink-300);
  border-radius: var(--radius-sm);
  background: var(--white);
  display: inline-flex; align-items: center; justify-content: center;
  transition: background var(--dur-fast), border-color var(--dur-fast);
}
.rt-check input:focus-visible + .rt-check__box { box-shadow: 0 0 0 3px var(--accent-100); }
.rt-check__box svg { opacity: 0; transition: opacity var(--dur-fast); }
.rt-check input:checked + .rt-check__box { background: var(--accent-500); border-color: var(--accent-500); }
.rt-check input:checked + .rt-check__box svg { opacity: 1; }
.rt-check--radio .rt-check__box { border-radius: var(--radius-pill); }

.rt-toggle { display: inline-flex; align-items: center; gap: var(--space-3); font-family: var(--font-sans); font-size: var(--text-sm); color: var(--text-primary); cursor: pointer; }
.rt-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.rt-toggle__track {
  width: 44px; height: 26px; flex: none;
  background: var(--ink-300);
  border-radius: var(--radius-pill);
  position: relative;
  transition: background var(--dur-base) var(--ease-standard);
}
.rt-toggle__track::after {
  content: ""; position: absolute; top: 3px; left: 3px;
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--white); box-shadow: var(--shadow-xs);
  transition: transform var(--dur-base) var(--ease-out);
}
.rt-toggle input:checked + .rt-toggle__track { background: var(--accent-500); }
.rt-toggle input:checked + .rt-toggle__track::after { transform: translateX(18px); }
.rt-toggle input:focus-visible + .rt-toggle__track { box-shadow: 0 0 0 3px var(--accent-100); }

/* ---------------------------------------------------------------
   TAG / CHIP
   --------------------------------------------------------------- */
.rt-tag {
  display: inline-flex; align-items: center; gap: var(--space-2);
  font-family: var(--font-sans); font-weight: var(--weight-semibold);
  font-size: var(--text-xs); letter-spacing: 0.01em;
  color: var(--ink-700); background: var(--ink-100);
  padding: 6px 12px; border-radius: var(--radius-pill);
}
.rt-tag--accent { color: var(--accent-700); background: var(--accent-50); }
.rt-tag--outline { background: transparent; border: var(--border-hair) solid var(--ink-200); color: var(--ink-700); }

.rt-chip {
  display: inline-flex; align-items: center; gap: var(--space-2);
  font-family: var(--font-sans); font-weight: var(--weight-semibold); font-size: var(--text-sm);
  color: var(--ink-800); background: var(--white);
  border: var(--border-hair) solid var(--ink-200);
  padding: 8px 14px; border-radius: var(--radius-pill);
  cursor: pointer; transition: all var(--dur-fast) var(--ease-standard);
}
.rt-chip:hover { border-color: var(--ink-400); }
.rt-chip--selected { background: var(--ink-900); color: var(--white); border-color: var(--ink-900); }
.rt-chip__x { display: inline-flex; opacity: 0.7; }
.rt-chip__x:hover { opacity: 1; }

/* ---------------------------------------------------------------
   BADGE  (verified / new / available / status dots)
   --------------------------------------------------------------- */
.rt-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-sans); font-weight: var(--weight-bold);
  font-size: var(--text-2xs); letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  padding: 4px 9px; border-radius: var(--radius-sm);
  background: var(--ink-100); color: var(--ink-700);
}
.rt-badge--verified { background: var(--accent-50); color: var(--accent-700); }
.rt-badge--new { background: var(--accent-500); color: var(--white); }
.rt-badge--available { background: rgba(30,127,82,0.12); color: var(--status-success); }
.rt-badge--ink { background: var(--ink-950); color: var(--white); }

.rt-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.rt-dot--available { background: var(--status-success); }
.rt-dot--busy { background: var(--status-warning); }
.rt-dot--off { background: var(--ink-300); }

/* ---------------------------------------------------------------
   AVATAR
   --------------------------------------------------------------- */
.rt-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--ink-100); color: var(--ink-600);
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-weight: var(--weight-bold);
  font-size: var(--text-base); overflow: hidden; flex: none;
  background-size: cover; background-position: center;
}
.rt-avatar--sm { width: 32px; height: 32px; font-size: var(--text-sm); }
.rt-avatar--lg { width: 64px; height: 64px; font-size: var(--text-2xl); }
.rt-avatar-group { display: inline-flex; }
.rt-avatar-group .rt-avatar { border: 2px solid var(--white); margin-left: -12px; }
.rt-avatar-group .rt-avatar:first-child { margin-left: 0; }

/* ---------------------------------------------------------------
   TALENT CARD — the hero marketplace object
   --------------------------------------------------------------- */
.rt-talent {
  display: flex; flex-direction: column;
  background: var(--surface-card);
  border: var(--border-hair) solid var(--border-hairline);
  border-radius: var(--radius-lg);
  overflow: hidden; width: 300px;
  transition: box-shadow var(--dur-base) var(--ease-standard),
              transform var(--dur-base) var(--ease-standard);
}
.rt-talent:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.rt-talent__photo {
  aspect-ratio: 4/5; position: relative;
  background: repeating-linear-gradient(135deg, #ECEDEF 0 12px, #F4F5F6 12px 24px);
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: var(--space-4);
}
.rt-talent__photo .rt-ph { align-self: flex-end; font-family: var(--font-sans); font-weight: var(--weight-bold); font-size: 9px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--ink-500); }
.rt-talent__body { padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-3); }
.rt-talent__loc { display: flex; align-items: center; justify-content: space-between; }
.rt-talent__name { font-family: var(--font-display); font-weight: var(--weight-extrabold); font-size: var(--text-2xl); letter-spacing: var(--tracking-tight); line-height: 1; }
.rt-talent__meta { font-family: var(--font-sans); font-size: var(--text-sm); color: var(--text-secondary); line-height: var(--leading-snug); }
.rt-talent__tags { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rt-talent__rule { height: 1px; background: var(--border-subtle); }
.rt-talent__foot { display: flex; align-items: center; justify-content: space-between; }
.rt-talent__rate { font-family: var(--font-display); font-weight: var(--weight-extrabold); font-size: var(--text-xl); letter-spacing: var(--tracking-tight); color: var(--text-primary); }
.rt-talent__rate small { font-family: var(--font-sans); font-weight: var(--weight-regular); font-size: var(--text-xs); color: var(--text-muted); }

/* ---------------------------------------------------------------
   NAV — top navigation bar
   --------------------------------------------------------------- */
.rt-nav {
  display: flex; align-items: center; gap: var(--space-6);
  padding: var(--space-4) var(--space-6);
  background: var(--white);
  border-bottom: var(--border-hair) solid var(--border-hairline);
}
.rt-nav__brand { font-family: var(--font-display); font-weight: var(--weight-extrabold); font-size: var(--text-xl); letter-spacing: var(--tracking-tight); color: var(--ink-900); text-decoration: none; }
.rt-nav__brand span { color: var(--accent-500); }
.rt-nav__links { display: flex; gap: var(--space-5); margin-left: var(--space-4); }
.rt-nav__link { font-family: var(--font-sans); font-weight: var(--weight-semibold); font-size: var(--text-sm); color: var(--text-secondary); text-decoration: none; transition: color var(--dur-fast); }
.rt-nav__link:hover { color: var(--text-primary); }
.rt-nav__link--active { color: var(--text-primary); }
.rt-nav__actions { margin-left: auto; display: flex; align-items: center; gap: var(--space-4); }

/* ---------------------------------------------------------------
   TABS  (underline) + SEGMENTED control (radios)
   --------------------------------------------------------------- */
.rt-tabs { display: flex; gap: var(--space-6); border-bottom: var(--border-hair) solid var(--border-hairline); }
.rt-tab { font-family: var(--font-sans); font-weight: var(--weight-semibold); font-size: var(--text-sm); color: var(--text-secondary); padding: 0 0 var(--space-3); cursor: pointer; border-bottom: var(--border-bold) solid transparent; margin-bottom: -1px; transition: color var(--dur-fast); }
.rt-tab:hover { color: var(--text-primary); }
.rt-tab--active { color: var(--text-primary); border-bottom-color: var(--accent-500); }

.rt-segmented { display: inline-flex; background: var(--ink-100); border-radius: var(--radius-lg); padding: 3px; }
.rt-segmented label { font-family: var(--font-sans); font-weight: var(--weight-semibold); font-size: var(--text-sm); color: var(--text-secondary); padding: 8px 18px; border-radius: var(--radius-md); cursor: pointer; transition: all var(--dur-fast); }
.rt-segmented input { position: absolute; opacity: 0; width: 0; height: 0; }
.rt-segmented input:checked + label { background: var(--white); color: var(--text-primary); box-shadow: var(--shadow-xs); }

```
