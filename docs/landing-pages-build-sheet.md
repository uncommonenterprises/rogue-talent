# Landing pages — Console build sheet

_Source: Claude Design "Sharetribe Landing Pages". Build these in **Console → Content → Pages**
using the section templates named below, then paste the copy. Fidelity target: **pixel match**
to the mockup — see §"Layer 2" for the code styling pass that closes the gap after content is in._

## How to use this
Each page is a stack of **sections**. For every section: pick the **template** (Hero / Columns /
Features / Carousel / Article / Listings), set its **fields**, choose a **background**, and paste
the **copy**. Where a value isn't a native Sharetribe field, it's tagged **[L2]** — it comes from
the Layer-2 code styling pass, not Console (don't try to force it in Console).

**Palette for background fields:** ink/near-black `#0A0A0B`, ink `#131417`, subtle surface
`#F7F8F9`, cobalt `#2B57FF`, cobalt tint `#F0F3FF`, white `#FFFFFF`. Fonts (Bricolage / Hanken /
IBM Plex Mono) already load app-wide, and DS tokens are bridged, so type + cobalt come through.

**CTA link targets:** account = `/signup` · browse talent = `/s` · models page = `/p/for-models`
· business page = `/p/for-business`. (Model signup can be `/signup` — userType is chosen on the
form; we can deep-link a preselected type in L2 if wanted.)

---

## Notes
1. **Commission — RESOLVED (2026-07-19).** The marketplace now charges a **15% customer booking
   fee only** (0% provider; model keeps 100%), updated in Console. The design copy ("keep 100% /
   one flat 15% fee") is therefore accurate — use it as written.
2. **Placeholder stats.** "4,200+ models · 18k bookings · 40 cities · <2h response" and the
   testimonial ("Mara Voss") are placeholders — fine for now, edit before go-live.

---

# PAGE 01 — General homepage
**Where:** the existing **`landing-page`** asset (Console → Pages → the default Landing page).
**URL:** `/` · **One action:** create an account · **Nav CTA:** "Join Rogue Talent"

### 1 — HERO
- **Background:** hero image **1600×1200**, dark left-to-right gradient overlay **[L2 overlay]**
- **Eyebrow [L2]:** "The model, disrupted"
- **Title:** Models and brands, connected direct.
- **Ingress:** The marketplace where models and the businesses that book them work together directly — no agents, no middlemen, no cut.
- **CTA (primary):** Create your account → `/signup`
- **CTA (secondary) [L2]:** Browse talent → `/s` _(stock hero has one CTA; second is code)_

### 2 — COLUMNS · 4  (stats band)
- **Background:** `#0A0A0B` · **Section title:** none
- **Blocks** (block title = stat, block text = label; no images):

| Block title | Block text |
|---|---|
| 4,200+ | Verified models |
| 18k | Direct bookings |
| 40 | Cities |
| <2h | Avg. response |

### 3 — COLUMNS · 3  (how it works)
- **Background:** white
- **Title:** How Rogue works
- **Ingress:** Find talent, agree terms and pay — all in one place, with no agency in the middle.
- **Blocks** (the 01/02/03 numerals are **[L2]**):

| Block title | Block text |
|---|---|
| Discover | Search verified talent by city, category and availability. |
| Book direct | Agree rates and dates with the model in-platform. No gatekeeper. |
| Shoot & pay | Secure payments, contracts and releases handled by Rogue. |

### 4 — LISTINGS  (featured talent)
- **Template:** Listings (`SectionListings` — auto-pulls live talent) · **Background:** `#F7F8F9`
- **Title:** Featured talent · **CTA:** View all → `/s`
- _Confirm it renders the rt-talent card style; tune in L2 if needed._

### 5 — FEATURES  (alternating text ⇄ media)
- **Background:** white · media blocks alternate side
- **Block 1** — eyebrow **[L2]** "No agents. Ever." · title **Keep the relationship — and the fee.** · text: The work happens between the model and the business. Rogue just makes it safe, not expensive. · image (4:3)
- **Block 2** (media left) — eyebrow **[L2]** "Verified both sides" · title **Everyone is checked before they book.** · text: Models and businesses are verified, so every booking starts from trust. · image (4:3)

### 6 — COLUMNS · 3  (trust infrastructure, dark)
- **Background:** `#0A0A0B` (light text) · bordered cards **[L2]**
- **Title:** Built-in protection, every booking
- **Ingress:** The trust that agencies claimed to provide — now built into the platform, on both sides.

| Block title | Block text |
|---|---|
| Escrow payments | The business pays upfront into escrow. Funds release to the model the moment the shoot is confirmed complete — no chasing invoices. |
| Clear contracts | Every booking generates a contract with configurable image usage rights — duration, channels, territory — agreed by both sides before the shoot. |
| Two-way reviews | Models and businesses review each other after every job. The best talent and the best clients rise to the top. |

### 7 — COLUMNS · 2  (dual path)
- **Background:** white · each block is a bordered card with a button **[L2 card styling]**
- **Block 1** — title **I'm a model** · text: Build a profile, set your rates, get booked directly. Keep everything you earn. · CTA **Join as talent** → `/signup` (ink button)
- **Block 2** — title **I'm a business** · text: Search, book and pay verified models directly. Faster casting, one flat 15% booking fee — no agency markup. · CTA **Join as business** → `/signup` (cobalt button; card has cobalt-tint bg `#F0F3FF` + cobalt border)

### 8 — HERO  (closing CTA band)
- **Background:** solid `#2B57FF`, no image, centered · **Title:** Ready to go rogue?
- **Ingress:** Create your free account in minutes. · **CTA:** Create your account → `/signup` (white button)

---

# PAGE 02 — Models homepage
**Where:** new custom page, **pageId `for-models`** · **URL:** `/p/for-models`
**One action:** create a talent profile · **Nav CTA:** "Create your profile"

### 1 — HERO
- **Background:** hero image 1600×1200 + gradient **[L2]** · **Eyebrow [L2]:** "For models"
- **Title:** Your face. Your rates. No middleman.
- **Ingress:** Build a profile, get discovered by real brands, and keep everything you earn.
- **CTA:** Create your profile → `/signup` · **CTA secondary [L2]:** See how it works → `#how`

### 2 — COLUMNS · 4  (value props, light cards)
- **Background:** white · bordered cards; the big glyph is the block title in cobalt **[L2]**

| Block title | Sub-title | Block text |
|---|---|---|
| 100% | Keep your full rate | No commission, ever. You keep 100% of your day rate — the business pays the platform fee. |
| You | Set your own rates | You decide your day rate and which work you take on. |
| ↗ | Get discovered | Verified brands search Rogue for talent like you every day. |
| ✓ | Verified businesses only | Every business is verified before they can book — you're never dealing with random strangers. |
_(Columns blocks have title + text; the "sub-title" second line is **[L2]** or fold into the text.)_

### 3 — FEATURES  (booked direct)
- **Background:** `#F7F8F9` · text left / portrait image (4:5) right
- **Eyebrow [L2]:** "Booked direct" · **Title:** Brands message you. Not an agent.
- **Text:** Own your relationships and your calendar. You approve every booking before it's confirmed.
- **Tags [L2]:** Editorial · Top booked · Runway

### 4 — COLUMNS · 3  (three steps)
- **Background:** white · **Title:** Start earning in three steps

| Block title | Block text |
|---|---|
| Create your profile | Add your portfolio, stats, categories and day rate. |
| Get booked direct | Approve requests from verified brands on your terms. |
| Get paid, protected | Contracts and secure payment handled by Rogue. |

### 5 — ARTICLE  (how you're protected)
- **Background:** white · rendered as a 3-card grid **[L2]** (Article stores the blocks; layout is code)
- **Title:** You're protected, start to finish
- **Ingress:** Going direct doesn't mean going it alone. Rogue handles the parts that used to need an agency.

| Block title | Block text |
|---|---|
| Paid on time, always | Payment is secured in escrow before you arrive. You're paid the moment the client confirms the shoot is done. |
| Your image, your terms | Every job comes with a clear contract covering how your images can be used. You agree the terms before you shoot. |
| Know before you book | Rate every client, and see other models' ratings before you accept. Only work with businesses you can trust. |

### 6 — ARTICLE  (testimonial, dark)
- **Background:** `#0A0A0B` · **Quote:** "I left my agency and doubled my take-home. Same shoots, none of the cut."
- **Attribution:** Mara Voss · Editorial model, London

### 7 — HERO  (closing band)
- **Background:** `#2B57FF` · **Title:** Ready to go rogue? · **Ingress:** Your profile is free. You keep what you earn. · **CTA:** Create your profile → `/signup`

---

# PAGE 03 — Clients homepage
**Where:** new custom page, **pageId `for-business`** · **URL:** `/p/for-business`
**One action:** create an account · **Nav CTA:** "Create an account"

### 1 — HERO
- **Background:** hero image 1600×1200 + gradient **[L2]** · **Eyebrow [L2]:** "For businesses"
- **Title:** Book verified models. Directly.
- **Ingress:** Search, book and pay talent without an agency in the loop. Faster casting, transparent rates, contracts handled.
- **CTA:** Create an account → `/signup` · **CTA secondary [L2]:** Browse talent → `/s`

### 2 — COLUMNS · 1  (trust bar)
- **Background:** `#F7F8F9`, centered · **Text:** Trusted by studios, brands & photographers
- **Logo row:** 5 partner logos (image row) — supply logos, or leave as placeholder bars for now **[L2 layout]**

### 3 — COLUMNS · 3  (cast in hours)
- **Background:** white · **Title:** Cast in hours, not weeks
- **Ingress:** Skip the agency back-and-forth. Find, book and pay talent yourself.

| Block title | Block text |
|---|---|
| Search | Filter by city, category, availability and budget. |
| Book direct | Message and confirm with the model — no gatekeeper. |
| Shoot | Contracts, releases and payment handled in-platform. |

### 4 — CAROUSEL  (available this week)
- **Template:** Carousel · **Title:** Available this week · swipeable, "● Available" badge **[L2]**
- **Blocks** (thumbnail image + title/subtitle):

| Block title | Subtitle |
|---|---|
| Mara Voss | London · £1,200/day |
| Aïcha Ndiaye | Paris · €1,600/day |
| Lena Kaur | Berlin · €1,100/day |
| Theo Adeyemi | NYC · $1,400/day |
_(Static carousel per the design. Alternative: reuse the auto `SectionListings` here too so it
stays fresh — flag if you'd prefer that.)_

### 5 — FEATURES  (alternating value props)
- **Background:** white
- **Block 1** — eyebrow **[L2]** "One flat fee" · title **The model keeps 100%. You pay one flat fee.** · text: A flat 15% booking fee on top of the model's rate — no agency markup, and full transparency on exactly what the talent earns.
- **Block 2** (media left) — eyebrow **[L2]** "Verified & protected" · title **Every model checked. Every contract handled.** · text: Verified profiles, e-signed releases and secure payment — all inside Rogue.

### 6 — COLUMNS · 3  (every booking, protected)
- **Background:** white · **Title:** Every booking, protected
- **Ingress:** Book with the confidence of an agency, without the agency.

| Block title | Block text |
|---|---|
| Escrow payments | Pay upfront into escrow; funds release to the model only once you confirm the shoot is complete. A formal process covers any dispute. |
| Usage rights, locked in | Standardised contracts let you set image usage — duration, channels, territory, sublicensing — agreed and e-signed before the shoot. |
| Reviewed talent | See real ratings on professionalism, punctuality and quality from other businesses before you book. No more casting blind. |

### 7 — HERO  (closing band)
- **Background:** `#2B57FF` · **Title:** Post your first booking · **Ingress:** Create a free account and start casting today. · **CTA:** Create an account → `/signup`

---

# Custom nav per page (code — Layer 2)
Sharetribe's topbar is one shared component and Console custom links are global, so per-page nav
is **code**, not Console. All three pages use the **same marketing nav** — only the active link
and the primary CTA differ:

| Page | Active link | Nav CTA |
|---|---|---|
| General `/` | Discover | Join Rogue Talent → `/signup` |
| Models `/p/for-models` | For models | Create your profile → `/signup` |
| Clients `/p/for-business` | For business | Create an account → `/signup` |

Nav links (all pages): **Discover** (`/s`) · **How it works** (`/#how` or a page) · **For models**
(`/p/for-models`) · **For business** (`/p/for-business`) · **Sign in** (`/login`).
Plan: make `TopbarDesktop` route-aware (we already made it role-aware) — detect the current
page/route and render the marketing nav + per-page CTA for logged-out visitors on these pages;
keep the app nav for logged-in users.

---

# Layer 2 — the pixel-match styling pass (code)
Content-in gets ~75%; these close the gap to the mockup. Done on the `PageBuilder` section
components (`SectionHero`, `SectionColumns`, `SectionFeatures`, `SectionCarousel`, `SectionArticle`,
`SectionListings`) + a route-aware topbar:
- **Eyebrows** (mono uppercase kickers) on hero + feature blocks
- **Second hero CTA** + the gradient overlay on hero images
- **Dark-section treatment** (`#0A0A0B` bands: light text, bordered cards)
- **Stats band** (4-col, giant Bricolage numerals, mono labels)
- **Numbered steps** (01/02/03) on the "how it works" / "steps" columns
- **Bordered cards** for dual-path, value-props, trust cards; cobalt-tint "business" card
- **Cobalt closing band** (centered, white button)
- **Carousel** badges + swipe affordance; **Listings** → rt-talent card
- **Route-aware marketing nav** + per-page CTA

# Assets needed
- 3 × **hero photos** 1600×1200 (general / models / clients)
- Feature/story images (4:3 and 4:5 portrait)
- 5 × partner **logos** for the clients trust bar (optional at first)
