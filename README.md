# Mayday — Sleeve finder (Expo)

Greenfield Expo (React Native) sleeve finder for warehouse / shop-floor lookup of Mayday and Sleeve Kings packs. Staff search by SKU/name or W×H mm (±tolerance), filter Standard/Premium, then open a detail view with shelf-position badges and highlighted shelf maps.

**Reference UX only:** the public page at [bacon.bytesandpieces.xyz/mayday](https://bacon.bytesandpieces.xyz/mayday/) informed the product model. This repo does not claim ownership of that site; seed data was transcribed once into `seed/catalog.json` for parity.

## Stack

- **Client:** Expo SDK 58 + Expo Router + TypeScript
- **Backend:** Supabase (Postgres + Auth + Storage) when configured
- **Offline / Expo Go:** checked-in mock seed (`src/data/seed-catalog.json` + `assets/thumbs/`) — no secrets required

## Quick start (mock / Expo Go)

```bash
npm install
npm start
```

Scan the QR code with Expo Go, or press `w` for web. Catalog, placements, shelf SVGs, and thumbs load from the local seed. Admin screens explain that Supabase is required for writes.

Dev server tip: bind an uncommon port if needed:

```bash
npx expo start --port 19077
```

## Supabase setup (live catalog + admin)

1. Create a Supabase project.
2. Run `supabase/migrations/001_init.sql` in the SQL editor (schema, indexes, RLS, inventory stub tables).
3. Create a **public** Storage bucket named `product-thumbs` in the dashboard (recommended). The seed script will try to create it; if Storage returns `PGRST125` / “Invalid path”, create the bucket manually then re-run.
4. Copy `.env.example` → `.env` and set:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (**required for seed** — service_role from Project Settings → API, not the anon key)
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

8. Restart Expo so env vars load. Finder reads Postgres; Admin → sign in for CRUD / display_config / thumb upload.

### RLS summary

| Table | Anon / public | Admin (`admin_users`) |
|-------|---------------|------------------------|
| `products` (active) | SELECT | ALL |
| `shelf_placements`, `shelf_maps`, `layout_map`, `display_config` | SELECT | ALL |
| Inventory stubs | — | ALL |

## App map

| Route | Purpose |
|-------|---------|
| `/` | Sleeve finder: search, W×H ±tol, Standard/Premium, results grid |
| `/shelves` | Shelf view: floor layout + per-shelf cards |
| `/shelves/[id]` | One shelf: SVG map + SKUs/placements |
| `/product/[sku]` | Detail: positions, layout + shelf SVG highlight, pack photo, external link |
| `/admin/login` | Staff login (Supabase) or **demo admin** when env unset |
| `/admin` | Authenticated product/placement list |
| `/admin/shelves` | Configure shelves (maps + placements) |
| `/admin/shelves/[id]` | Edit one shelf’s SVG + add/remove slots |
| `/admin/layout-map` | Edit floor layout SVG |
| `/admin/product/[id]` | Create/edit product + thumb upload |
| `/admin/placement/[id]` | Edit/delete placement |
| `/admin/display` | Edit `display_config` JSON |

**Rights:** only users in `admin_users` (or demo admin locally) can edit shelf layouts. Everyone can browse `/shelves`.

## Seed provenance

- `seed/catalog.json` — products, placements, shelf/layout SVG, default display_config (no base64 thumbs)
- `seed/thumbs/` — JPEG pack photos extracted for Storage upload
- `assets/thumbs/` + `src/data/localThumbs.ts` — Metro-friendly local thumbs for mock mode (binary assets, not a 3 MB base64 blob in JS)

## Out of scope (MVP)

App Store / Play submission, inventory UX (tables exist unused), barcode scan, pricing/cart.
