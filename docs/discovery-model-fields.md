# Client Discovery — convert model attributes from user fields → listing fields

## Why
Sharetribe search and the public listing page read **listing** data only, never a user's
profile. So for clients to **see** a model's attributes on their profile page and **filter**
by them, those attributes must live on the **listing** (`publicData`), not the user profile.

## Sequencing (important — don't skip the order)
1. **You (Console):** create the 14 listing fields below. **Do NOT delete the old user
   fields yet.**
2. **Me (code):** rewire the "About you" step to collect these as listing fields, exclude
   them from "Your details", and write a migration that copies existing models'
   user-profile values onto their listings.
3. **You + me:** run the migration, verify on a real profile, then delete the old user
   fields.

> Keep the **Field ID exactly the same** as the current user field (e.g. `gender`,
> `height_cm`). The migration maps old→new by identical key.

## Global settings for all 14 fields
- **Listing type:** Model Profile (`model-profile`)
- **Field scope / visibility:** Public
- **Show on the listing page:** Yes
- **Category:** none / all (these apply to every model profile)

## Search-index note (no CLI needed)
In the current Sharetribe Console, turning on a **search filter** for a listing field also
indexes it automatically — there is **no separate Flex CLI step**. (The manual
`flex-cli search set` is legacy; only relevant if your Console can't add the filter itself.)

---

## A. Filterable fields (8) — Show on listing page: Yes + add a search filter

| Field ID | Label | Type | Filter | Options (value → label) / range |
|---|---|---|---|---|
| `modelling_categories` | Modelling categories | Select multiple (multi-enum) | Multi-select, **match any** | fashion→Fashion, commercial→Commercial, editorial→Editorial, fitness→Fitness, lifestyle→Lifestyle, beauty→Beauty, lingerie→Lingerie, swimwear→Swimwear, plus-size→Plus-size, petite→Petite, parts→Parts (hands/feet), hair→Hair, promotional-events→Promotional/Events |
| `ethnicity` | Ethnicity | Select multiple (multi-enum) | Multi-select, **match any** | asian→Asian, black→Black, hispanic-latino→Hispanic/Latino, middle-eastern→Middle Eastern, mixed→Mixed, white→White, other→Other |
| `experience_level` | Experience level | Select one (enum) | Single-select | new-face→New face, some-experience→Some experience, experienced→Experienced, professional→Professional |
| `gender` | Gender | Select one (enum) | Single-select | female→Female, male→Male, non-binary→Non-binary |
| `hair_colour` | Hair colour | Select one (enum) | Single-select | black→Black, brown→Brown, blonde→Blonde, red→Red, auburn→Auburn, grey-white→Grey/White, other→Other |
| `eye_colour` | Eye colour | Select one (enum) | Single-select | brown→Brown, blue→Blue, green→Green, hazel→Hazel, grey→Grey, other→Other |
| `availability_radius` | Availability radius | Select one (enum) | Single-select | local→Local only (25 mi), regional→Regional (50 mi), national→National, international→International |
| `height_cm` | Height (cm) | Whole number (long) | Range | min 100, max 250 |

## B. Display-only fields (6) — Show on listing page: Yes, **no** filter

| Field ID | Label | Type | Options / range |
|---|---|---|---|
| `bust_chest_cm` | Bust/Chest (cm) | Whole number | min 50, max 200 |
| `waist_cm` | Waist (cm) | Whole number | min 40, max 200 |
| `hips_cm` | Hips (cm) | Whole number | min 50, max 200 |
| `shoe_size_uk` | Shoe size (UK) | Whole number | min 1, max 20 |
| `model_website_url` | Website | Free text | — |
| `instagram_url` | Instagram Handle | Free text | — |

> **`ethnicity`** is set as a filter (a deliberate choice). Note this lets clients screen
> models by ethnicity — common in casting, but a legally/ethically sensitive decision to be
> aware of.

---

## Keep as USER fields (do NOT convert)
- `date_of_birth` — private; sensitive; not a discovery attribute.
- `id_verified` — metadata; admin-set; drives the Verified badge (`profile.metadata.id_verified`).
- All **client** fields (`company_name`, `client_website_url`, `industry`,
  `typical_projects`, `vat_number`, `id_verified_client`) — clients have no listings.

## Cleanup decisions (resolved)
- **`shoot_types`** (listing field) — **DELETED**. We keep `modelling_categories` as the
  single "what kind of model" facet (it owns the model-type niches: plus-size, petite,
  parts, hair, lifestyle).
- **`willing_to_travel`** (user field) — **DROP** (do NOT convert). It conflated "how far"
  (now `availability_radius`) with "who pays" (now `travel_fee_policy`, an existing listing
  field). Delete the `willing_to_travel` user field after migration; don't create a listing
  field for it.

Remaining service-oriented listing fields kept as-is: `languages`, `special_skills`,
`travel_fee_policy`, `min_booking_notice`, plus the rates.

---

## What I do next (code)
- Route these 14 keys to the "About you" step (render + save as listing fields); exclude
  them from "Your details" so they don't double-render there.
- Migration script: for each model listing, copy the author's `profile.publicData.<key>`
  into the listing's `publicData.<key>` for the 14 keys.
- Then you delete the old user fields.
