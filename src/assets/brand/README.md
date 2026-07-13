# Rogue Talent brand assets

Canonical, version-controlled brand assets (logo, logo-mark, favicons). Source of
truth for the repo. The **live** logo + favicon are set separately in the
Sharetribe Console hosted branding asset (which overrides the code) — these files
are for local imports, code fallbacks, and any custom UI we build.

Colours follow the design system: ink `#131417`, cobalt accent `#2B57FF`. See
[`design-system/DESIGN_SYSTEM.md`](../../../design-system/DESIGN_SYSTEM.md).

## Logo — full "Rogue." wordmark
| File | Size | Use |
|---|---|---|
| `logo.svg` | 756×144 (5.25:1) | Primary wordmark, dark ink on light. Prefer the SVG anywhere it can be inlined/`<img src>`. |
| `logo.png` | 756×144 | Raster fallback (1×) for the wordmark. |
| `logo-2x.png` | 1512×288 | Retina raster (2×). |
| `logo-inverse.svg` | 756×144 | Wordmark for **dark surfaces** (light on ink). |
| `logo-inverse.png` | 756×144 | Inverse raster (1×). |
| `logo-inverse-2x.png` | 1512×288 | Inverse retina (2×). |

Displayed logo height in the topbar is 24/36/48px (see `src/components/Logo/Logo.js`);
max display width 370px. The 144px-tall art = 3× a 48px display height.

## Logo mark — compact "R." glyph only
| File | Size | Use |
|---|---|---|
| `logo-mark.svg` | 387×144 | The mark alone, for tight spaces (compact nav, app icons, loaders). |
| `logo-mark.png` | 387×144 | Raster (1×). |
| `logo-mark-2x.png` | 774×288 | Retina (2×). |

## Favicons / touch icons
| File | Size | Use |
|---|---|---|
| `favicon.svg` | 512×512 | Modern scalable favicon (cobalt on light). |
| `favicon-ink.svg` | 512×512 | Dark-surface variant of the favicon. |
| `favicon-16.png` | 16×16 | Legacy favicon. |
| `favicon-32.png` | 32×32 | Legacy favicon. |
| `favicon-48.png` | 48×48 | Legacy favicon. |
| `favicon-512.png` | 512×512 | PWA / manifest icon. |
| `favicon-180.png` | 180×180 | 180px icon (same art as apple-touch). |
| `apple-touch-icon.png` | 180×180 | iOS home-screen icon. |

## Wiring notes (not yet done — Console serves the live assets)
- **Code fallback logo:** `src/config/configBranding.js` currently imports the
  default `biketribe-logo-*.png`. To use these as the local fallback, point
  `logoImageDesktop`/`logoImageMobile` at `./brand/logo.png` (and mobile →
  `logo-mark.png`). Only matters if the hosted Console logo is ever absent.
- **Static favicons:** `public/index.html` — add `<link rel="icon">` /
  `apple-touch-icon` tags if we ever stop relying on the Console-hosted favicon.
