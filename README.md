# Mayday — Sleeve finder (Expo)

Warehouse / shop-floor app for looking up **Mayday** and **Sleeve Kings** packs: search by SKU/name or card size (W×H mm ±tolerance), filter Standard/Premium, then open detail with shelf-position badges and highlighted shelf maps.

**Reference UX only:** [bacon.bytesandpieces.xyz/mayday](https://bacon.bytesandpieces.xyz/mayday/) informed the product model. This repo does not claim ownership of that site; seed data was transcribed once into `seed/catalog.json` for parity.

## Stack

| Layer | Choice |
|-------|--------|
| Client | Expo SDK 58 + Expo Router + TypeScript |
| Backend | Supabase (Postgres + Auth + Storage) when configured |
| Offline | Checked-in mock seed — works in Expo Go with no secrets |

IDs already set for later native builds: `xyz.mayday.sleevefinder` (iOS + Android).

## Quick start (mock / Expo Go)

```bash
npm install
npm start
```

Scan the QR code with Expo Go, or press `w` for web. Catalog, placements, shelf SVGs, and thumbs load from the local seed.

```bash
npx expo start --port 19077   # optional uncommon port
```

## Supabase setup (live catalog + admin)

1. Create a Supabase project.
2. Run `supabase/migrations/001_init.sql` in the SQL editor.
3. Create a public Storage bucket named `product-thumbs` (or let the seed script create it).
4. Copy `.env.example` → `.env` and set:
   - `EXPO_PUBLIC_SUPABASE_URL` — project root only, e.g. `https://xxxx.supabase.co` (**not** `.../rest/v1/`)
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — anon / public key
   - `SUPABASE_SERVICE_ROLE_KEY` — **seed only**; never put this in `EXPO_PUBLIC_*`
5. Seed (script loads `.env` from the repo root):

```bash
npm run seed
# or skip Storage uploads: SEED_SKIP_THUMBS=1 npm run seed
```

6. Create an Auth user (email/password) in Supabase Auth.
7. Insert that user into `admin_users`:

```sql
insert into public.admin_users (id, email, role)
values ('<auth-user-uuid>', 'you@example.com', 'admin');
```

8. Restart Expo so env vars load. Finder reads Postgres; Admin → sign in for CRUD / display config / thumb upload / floor layout.

Without the two `EXPO_PUBLIC_*` vars, the app shows a mock-seed banner and falls back to local data.

### RLS summary

| Table | Anon / public | Admin (`admin_users`) |
|-------|---------------|------------------------|
| `products` (active) | SELECT | ALL |
| `shelf_placements`, `shelf_maps`, `layout_map`, `display_config` | SELECT | ALL |
| Inventory stubs | — | ALL |

## Floor layout

Physical racks are modeled as **two triangular-prism carousels** (three faces each — like a carousel that doesn’t spin).

- **Staff** see a top-down map on `/shelves` and product detail; faces carry `data-shelf` for blink highlight.
- **Admin → Floor layout** (`/admin/layout-map`): drag hubs A/B, rotate ±30°, tap a face then an S# chip to assign shelves, Save.
- Layout is stored as SVG in `layout_map` with embedded JSON (`data-mayday-layout`) so the editor can round-trip. See `src/lib/floorLayout.ts`.

## App map

| Route | Purpose |
|-------|---------|
| `/` | Sleeve finder: search, W×H ±tol, Standard/Premium, results grid |
| `/shelves` | Floor layout + per-shelf cards |
| `/shelves/[id]` | One shelf: SVG map + SKUs/placements |
| `/product/[sku]` | Detail: positions, floor + shelf highlight, pack photo, external link |
| `/admin/login` | Staff login (Supabase) or **demo admin** when env unset |
| `/admin` | Product / placement list |
| `/admin/shelves` | Configure shelves (maps + placements) |
| `/admin/shelves/[id]` | Edit one shelf’s SVG + slots |
| `/admin/layout-map` | Drag/rotate carousels and assign faces |
| `/admin/product/[id]` | Create/edit product + thumb upload |
| `/admin/placement/[id]` | Edit/delete placement |
| `/admin/display` | Edit `display_config` JSON |

**Rights:** only users in `admin_users` (or demo admin locally) can edit shelf layouts and catalog writes. Everyone can browse finder + `/shelves`.

## Seed provenance

- `seed/catalog.json` — products, placements, shelf/layout SVG, default `display_config` (no base64 thumbs)
- `seed/thumbs/` — JPEG pack photos for Storage upload
- `assets/thumbs/` + `src/data/localThumbs.ts` — Metro-friendly local thumbs for mock mode

## Mobile builds (deferred)

Native App Store / Play builds are planned for a later run. When ready, use [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm i -g eas-cli && eas login && eas build:configure
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "…"
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "…"
eas build -p ios --profile preview
eas build -p android --profile preview
```

Until then: Expo Go / `npx expo start`, or `npx expo run:ios` / `run:android` with Xcode / Android Studio.

## BoardGameGeek / “sleeves for a game”

BGG’s **official XML API2** can resolve games but **does not expose sleeve/card-set data**. Sleeve data on BGG game pages is loaded via internal endpoints that are **not licensed for third-party apps** (BGG ToS). For game→sleeve recommendations later, prefer Mayday / Sleeve Kings’ own sleeves-by-game data (or a first-party mapping), not unofficial BGG JSON/geekdo APIs.

## Out of scope (current MVP)

Store submission, inventory UX (tables exist unused), barcode scan, pricing/cart, BGG-integrated sleeve lookup.
