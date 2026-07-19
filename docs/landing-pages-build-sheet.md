# Landing pages — Console build sheet

_Build in **Console → Content → Pages**. Every section below is mapped to the **exact Console
fields**. Fidelity target: **pixel match** — anything tagged **`[L2]`** is done later in code (skip
it in Console). Fonts + cobalt already come through from the app._

## How each section works in Console
When you add a section you set, in order:
- **Section name** — a label just for you in Console (not shown on the page).
- **Section template** — Hero / Article / Carousel / Columns / Features / Listings.
- **Section title** + **title size** — H1 (page title) or H2 (section title). Use **H1 only on the
  Hero**; every other titled section is **H2**. Leave blank for no title.
- **Section description** — the intro line under the title.
- **Section call to action** — No CTA / Internal link / External link / Search. Internal link needs
  **link text** + **link address** (path only, e.g. `/signup`).
- **Section appearance** — **Default** (white bg, black text) or **Custom** (background color,
  background image, image overlay, text color Black/White, anchor link ID).

**Content blocks** (Columns / Features / Carousel / Article / Listings) are added one at a time.
Each block has: **Block title**, **Block text** (markdown), an optional **Block image**, and an
optional **Block CTA** (link text + address). Columns/Carousel also have a **Number of columns**
(1–4).

**Palette for Background color:** dark `#0A0A0B` · subtle `#F7F8F9` · cobalt `#2B57FF` · white
`#FFFFFF`. **CTA targets:** account `/signup` · browse `/s` · models page `/p/for-models` ·
business page `/p/for-business`.

## Notes
- **Commission — RESOLVED:** 15% customer fee only, model keeps 100%. Copy below is final.
- **Stats** ("4,200+…") and the **testimonial** are placeholders — fine for now.
- **`[L2]` items** (eyebrows, second hero buttons, numbered steps, card borders, big stat numerals,
  carousel badges, logo row, tags) have **no Console field** — leave them out; I add them in code.

---

# PAGE 01 — General homepage
**Where:** the existing **`landing-page`** asset (Console → Pages → Landing page). **URL:** `/`

### S1 · Hero
| Field | Value |
|---|---|
| Section name | `Hero` |
| Template | **Hero** |
| Section title | `Models and brands, connected direct.` |
| Title size | **H1 (Page title)** |
| Section description | `The marketplace where models and the businesses that book them work together directly — no agents, no middlemen, no cut.` |
| Call to action | **Internal link** · text `Create your account` · address `/signup` |
| Appearance | **Custom** · bg color `#0A0A0B` · bg image *(upload hero photo, or leave empty)* · overlay **Dark** · text **White** |

`[L2]`: eyebrow "The model, disrupted" · second button "Browse talent".

### S2 · Stats — Template: **Columns**, **4 columns**
| Field | Value |
|---|---|
| Section name | `Stats` |
| Section title | *(leave blank)* |
| Call to action | No call to action |
| Appearance | **Custom** · bg `#0A0A0B` · text **White** |

| # | Block title | Block text | Image | Block CTA |
|---|---|---|---|---|
| 1 | `4,200+` | `Verified models` | — | — |
| 2 | `18k` | `Direct bookings` | — | — |
| 3 | `40` | `Cities` | — | — |
| 4 | `<2h` | `Avg. response` | — | — |

`[L2]`: giant Bricolage numerals + mono labels styling.

### S3 · How it works — Template: **Columns**, **3 columns**
| Field | Value |
|---|---|
| Section title | `How Rogue works` · **H2** |
| Section description | `Find talent, agree terms and pay — all in one place, with no agency in the middle.` |
| Call to action | No call to action |
| Appearance | **Default** · **Anchor link ID** `how` |

| # | Block title | Block text |
|---|---|---|
| 1 | `Discover` | `Search verified talent by city, category and availability.` |
| 2 | `Book direct` | `Agree rates and dates with the model in-platform. No gatekeeper.` |
| 3 | `Shoot & pay` | `Secure payments, contracts and releases handled by Rogue.` |

`[L2]`: 01/02/03 numerals.

### S4 · Featured talent — Template: **Listings**
| Field | Value |
|---|---|
| Section title | `Featured talent` · **H2** |
| Call to action | **Internal link** · text `View all` · address `/s` |
| Appearance | **Custom** · bg `#F7F8F9` · text **Black** |
| Listings | select up to ~4 published model listings |

`[L2]`: rt-talent card styling if the default differs.

### S5 · Why Rogue — Template: **Features** (auto-alternates media/text)
| Field | Value |
|---|---|
| Section title | *(leave blank)* |
| Call to action | No call to action |
| Appearance | **Default** |

| # | Block title | Block text | Image |
|---|---|---|---|
| 1 | `Keep the relationship — and the fee.` | `The work happens between the model and the business. Rogue just makes it safe, not expensive.` | upload (4:3) |
| 2 | `Everyone is checked before they book.` | `Models and businesses are verified, so every booking starts from trust.` | upload (4:3) |

`[L2]`: eyebrows "No agents. Ever." / "Verified both sides".

### S6 · Protection — Template: **Columns**, **3 columns**
| Field | Value |
|---|---|
| Section title | `Built-in protection, every booking` · **H2** |
| Section description | `The trust that agencies claimed to provide — now built into the platform, on both sides.` |
| Call to action | No call to action |
| Appearance | **Custom** · bg `#0A0A0B` · text **White** |

| # | Block title | Block text |
|---|---|---|
| 1 | `Escrow payments` | `The business pays upfront into escrow. Funds release to the model the moment the shoot is confirmed complete — no chasing invoices.` |
| 2 | `Clear contracts` | `Every booking generates a contract with configurable image usage rights — duration, channels, territory — agreed by both sides before the shoot.` |
| 3 | `Two-way reviews` | `Models and businesses review each other after every job. The best talent and the best clients rise to the top.` |

`[L2]`: bordered cards on dark.

### S7 · Choose your path — Template: **Columns**, **2 columns**
| Field | Value |
|---|---|
| Section title | *(leave blank)* |
| Call to action | No call to action |
| Appearance | **Default** |

| # | Block title | Block text | Block CTA |
|---|---|---|---|
| 1 | `I'm a model` | `Build a profile, set your rates, get booked directly. Keep everything you earn.` | Internal · `Join as talent` · `/signup` |
| 2 | `I'm a business` | `Search, book and pay verified models directly. Faster casting, one flat 15% booking fee — no agency markup.` | Internal · `Join as business` · `/signup` |

`[L2]`: card borders; cobalt-tint on the business card.

### S8 · Closing CTA — Template: **Hero**
| Field | Value |
|---|---|
| Section title | `Ready to go rogue?` · **H2** |
| Section description | `Create your free account in minutes.` |
| Call to action | **Internal link** · text `Create your account` · address `/signup` |
| Appearance | **Custom** · bg `#2B57FF` · text **White** |

---

# PAGE 02 — Models homepage
**Where:** new page, **pageId `for-models`**. **URL:** `/p/for-models`

### S1 · Hero
| Field | Value |
|---|---|
| Template | **Hero** |
| Section title | `Your face. Your rates. No middleman.` · **H1** |
| Section description | `Build a profile, get discovered by real brands, and keep everything you earn.` |
| Call to action | **Internal link** · text `Create your profile` · address `/signup` |
| Appearance | **Custom** · bg `#0A0A0B` · bg image *(upload)* · overlay **Dark** · text **White** |

`[L2]`: eyebrow "For models" · second button "See how it works".

### S2 · Value props — Template: **Columns**, **4 columns**
| Field | Value |
|---|---|
| Section title | *(leave blank)* |
| Call to action | No call to action |
| Appearance | **Default** |

| # | Block title | Block text |
|---|---|---|
| 1 | `Keep your full rate` | `No commission, ever. You keep 100% of your day rate — the business pays the platform fee.` |
| 2 | `Set your own rates` | `You decide your day rate and which work you take on.` |
| 3 | `Get discovered` | `Verified brands search Rogue for talent like you every day.` |
| 4 | `Verified businesses only` | `Every business is verified before they can book — you're never dealing with random strangers.` |

`[L2]`: the big glyph (100% / You / ↗ / ✓) above each title; card borders.

### S3 · Booked direct — Template: **Features**
| Field | Value |
|---|---|
| Section title | *(leave blank)* |
| Call to action | No call to action |
| Appearance | **Custom** · bg `#F7F8F9` · text **Black** |

| # | Block title | Block text | Image |
|---|---|---|---|
| 1 | `Brands message you. Not an agent.` | `Own your relationships and your calendar. You approve every booking before it's confirmed.` | upload (4:5 portrait) |

`[L2]`: eyebrow "Booked direct" · tags (Editorial / Top booked / Runway).

### S4 · Three steps — Template: **Columns**, **3 columns**
| Field | Value |
|---|---|
| Section title | `Start earning in three steps` · **H2** |
| Call to action | No call to action |
| Appearance | **Default** |

| # | Block title | Block text |
|---|---|---|
| 1 | `Create your profile` | `Add your portfolio, stats, categories and day rate.` |
| 2 | `Get booked direct` | `Approve requests from verified brands on your terms.` |
| 3 | `Get paid, protected` | `Contracts and secure payment handled by Rogue.` |

### S5 · You're protected — Template: **Columns**, **3 columns**
_(Design labelled this "Article", but it's a 3-card grid — use **Columns · 3** for the match.)_
| Field | Value |
|---|---|
| Section title | `You're protected, start to finish` · **H2** |
| Section description | `Going direct doesn't mean going it alone. Rogue handles the parts that used to need an agency.` |
| Call to action | No call to action |
| Appearance | **Default** |

| # | Block title | Block text |
|---|---|---|
| 1 | `Paid on time, always` | `Payment is secured in escrow before you arrive. You're paid the moment the client confirms the shoot is done.` |
| 2 | `Your image, your terms` | `Every job comes with a clear contract covering how your images can be used. You agree the terms before you shoot.` |
| 3 | `Know before you book` | `Rate every client, and see other models' ratings before you accept. Only work with businesses you can trust.` |

### S6 · Testimonial — Template: **Article** (single block)
| Field | Value |
|---|---|
| Section title | *(leave blank)* |
| Call to action | No call to action |
| Appearance | **Custom** · bg `#0A0A0B` · text **White** |

| # | Block title | Block text |
|---|---|---|
| 1 | `"I left my agency and doubled my take-home. Same shoots, none of the cut."` | `Mara Voss · Editorial model, London` |

### S7 · Closing CTA — Template: **Hero**
| Field | Value |
|---|---|
| Section title | `Ready to go rogue?` · **H2** |
| Section description | `Your profile is free. You keep what you earn.` |
| Call to action | **Internal link** · text `Create your profile` · address `/signup` |
| Appearance | **Custom** · bg `#2B57FF` · text **White** |

---

# PAGE 03 — Clients homepage
**Where:** new page, **pageId `for-business`**. **URL:** `/p/for-business`

### S1 · Hero
| Field | Value |
|---|---|
| Template | **Hero** |
| Section title | `Book verified models. Directly.` · **H1** |
| Section description | `Search, book and pay talent without an agency in the loop. Faster casting, transparent rates, contracts handled.` |
| Call to action | **Internal link** · text `Create an account` · address `/signup` |
| Appearance | **Custom** · bg `#0A0A0B` · bg image *(upload)* · overlay **Dark** · text **White** |

`[L2]`: eyebrow "For businesses" · second button "Browse talent".

### S2 · Trust bar — Template: **Columns**, **1 column**
| Field | Value |
|---|---|
| Section title | *(leave blank)* |
| Section description | `Trusted by studios, brands & photographers` |
| Call to action | No call to action |
| Appearance | **Custom** · bg `#F7F8F9` · text **Black** |

`[L2]`: the row of 5 partner logos (supply logos later).

### S3 · Cast in hours — Template: **Columns**, **3 columns**
| Field | Value |
|---|---|
| Section title | `Cast in hours, not weeks` · **H2** |
| Section description | `Skip the agency back-and-forth. Find, book and pay talent yourself.` |
| Call to action | No call to action |
| Appearance | **Default** |

| # | Block title | Block text |
|---|---|---|
| 1 | `Search` | `Filter by city, category, availability and budget.` |
| 2 | `Book direct` | `Message and confirm with the model — no gatekeeper.` |
| 3 | `Shoot` | `Contracts, releases and payment handled in-platform.` |

### S4 · Available this week — Template: **Carousel**, **4 columns**
| Field | Value |
|---|---|
| Section title | `Available this week` · **H2** |
| Call to action | No call to action |
| Appearance | **Default** |

| # | Block title | Block text | Image |
|---|---|---|---|
| 1 | `Mara Voss` | `London · £1,200/day` | upload (4:5) |
| 2 | `Aïcha Ndiaye` | `Paris · €1,600/day` | upload (4:5) |
| 3 | `Lena Kaur` | `Berlin · €1,100/day` | upload (4:5) |
| 4 | `Theo Adeyemi` | `NYC · $1,400/day` | upload (4:5) |

`[L2]`: "● Available" badges + swipe affordance. _(Alternative: use a **Listings** section here to
auto-pull live talent instead of these static blocks — say the word if you'd prefer that.)_

### S5 · Flat fee & protection — Template: **Features**
| Field | Value |
|---|---|
| Section title | *(leave blank)* |
| Call to action | No call to action |
| Appearance | **Default** |

| # | Block title | Block text | Image |
|---|---|---|---|
| 1 | `The model keeps 100%. You pay one flat fee.` | `A flat 15% booking fee on top of the model's rate — no agency markup, and full transparency on exactly what the talent earns.` | upload (4:3) |
| 2 | `Every model checked. Every contract handled.` | `Verified profiles, e-signed releases and secure payment — all inside Rogue.` | upload (4:3) |

`[L2]`: eyebrows "One flat fee" / "Verified & protected".

### S6 · Every booking, protected — Template: **Columns**, **3 columns**
| Field | Value |
|---|---|
| Section title | `Every booking, protected` · **H2** |
| Section description | `Book with the confidence of an agency, without the agency.` |
| Call to action | No call to action |
| Appearance | **Default** |

| # | Block title | Block text |
|---|---|---|
| 1 | `Escrow payments` | `Pay upfront into escrow; funds release to the model only once you confirm the shoot is complete. A formal process covers any dispute.` |
| 2 | `Usage rights, locked in` | `Standardised contracts let you set image usage — duration, channels, territory, sublicensing — agreed and e-signed before the shoot.` |
| 3 | `Reviewed talent` | `See real ratings on professionalism, punctuality and quality from other businesses before you book. No more casting blind.` |

### S7 · Closing CTA — Template: **Hero**
| Field | Value |
|---|---|
| Section title | `Post your first booking` · **H2** |
| Section description | `Create a free account and start casting today.` |
| Call to action | **Internal link** · text `Create an account` · address `/signup` |
| Appearance | **Custom** · bg `#2B57FF` · text **White** |

---

# Custom nav per page (code — Layer 2, I do this)
Same marketing nav on all three; only the active link + CTA differ:

| Page | Active link | Nav CTA → `/signup` |
|---|---|---|
| `/` | Discover | Join Rogue Talent |
| `/p/for-models` | For models | Create your profile |
| `/p/for-business` | For business | Create an account |

Nav links: Discover (`/s`) · How it works (`/#how`) · For models (`/p/for-models`) · For business
(`/p/for-business`) · Sign in (`/login`). Route-aware `TopbarDesktop` for logged-out visitors.

# Layer 2 — pixel-match styling pass (code, I do this)
Eyebrows · second hero CTA + gradient overlay · dark-band card styling · giant stat numerals ·
01/02/03 step numerals · bordered/tinted cards (dual-path, value-props, trust) · cobalt closing
band · carousel badges + swipe · listings → rt-talent card · trust-bar logo row · route-aware nav.

# Assets needed
3 × hero photos 1600×1200 · feature/story images (4:3 + 4:5) · 4 × talent portraits for the
carousel · 5 × partner logos (optional at first).
