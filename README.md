# Mayday — Sleeve finder (Expo)

Warehouse / shop-floor app for looking up **Mayday** and **Sleeve Kings** packs: search by SKU/name or card size (W×H mm ±tolerance), filter Standard/Premium, then open detail with shelf-position badges and highlighted shelf maps.

**Reference UX only:** [bacon.bytesandpieces.xyz/mayday](https://bacon.bytesandpieces.xyz/mayday/) informed the product model. This repo does not claim ownership of that site; seed data was transcribed once into `seed/catalog.json` for parity.

## Stack

- **Client:** Expo SDK 58 + Expo Router + TypeScript
- **Backend:** Supabase (Postgres + Auth + Storage)
- **Native builds / store submit:** [EAS Build](https://docs.expo.dev/build/setup/) + EAS Submit
- **Offline / Expo Go:** checked-in mock seed (`src/data/seed-catalog.json` + `assets/thumbs/`) — no secrets required

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
2. Run `supabase/migrations/001_init.sql` in the SQL editor (schema, indexes, RLS, inventory stub tables).
3. Create a **public** Storage bucket named `product-thumbs` in the dashboard (recommended). The seed script will try to create it; if Storage returns `PGRST125` / “Invalid path”, create the bucket manually then re-run.
4. Copy `.env.example` → `.env` and set:
   - `EXPO_PUBLIC_SUPABASE_URL` — project root only, e.g. `https://xxxx.supabase.co` (**not** `.../rest/v1/`)
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — anon / public key
   - `SUPABASE_SERVICE_ROLE_KEY` — **seed only**; never put this in `EXPO_PUBLIC_*`
5. Seed (script loads `.env` from the repo root):

```bash
npm run seed
# catalog only (no Storage): SEED_SKIP_THUMBS=1 npm run seed
```

URL must be exactly `https://<project-ref>.supabase.co` (no trailing slash / path).

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

## Build & deploy (Android + iOS)

**Do not use Heroku for the mobile app.** Heroku hosts web/API processes; native installs need EAS cloud builders (or local Xcode / Android Studio). Keep Supabase as the backend; optionally use Heroku later only for a separate web admin if you want.

### One-time setup (on your machine)

1. Expo account: [expo.dev](https://expo.dev) → sign up.
2. From the repo:

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest init          # links project; commits extra.eas.projectId
```

3. Put Supabase public env on EAS (so cloud builds get them — `.env` is gitignored):

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value 'https://YOUR.supabase.co' --environment production --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value 'your-anon-key' --environment production --visibility sensitive
# repeat with --environment preview and --environment development as needed
```

4. **Android Play:** Google Play Console account (~$25 one-time).  
   **iOS App Store:** Apple Developer Program (~$99/year) — required for device/App Store builds (simulator profile works without store submit).

### Profiles (`eas.json`)

| Profile | What you get |
|---------|----------------|
| `development` | Dev client + Expo Go–like workflow (`expo-dev-client`); Android APK; iOS Simulator |
| `preview` | Internal installable builds (APK / ad-hoc) for warehouse testing |
| `production` | Play `.aab` + App Store `.ipa` |

```bash
# Try on a device / simulator first
npm run build:preview:android
npm run build:preview:ios

# Store-ready
npm run build:prod:android
npm run build:prod:ios
# or both: npm run build:prod:all
```

EAS will prompt to create Android keystore / iOS credentials the first time (let it manage them unless you already have store certs).

### Submit to stores

```bash
npm run submit:android   # needs Play service account linked in EAS
npm run submit:ios       # needs Apple / ASC API credentials
```

Or upload the artifacts from the EAS build page manually.

### OTA JS updates (optional later)

Production/preview profiles set Update `channel`s. After a native binary is installed:

```bash
npx eas-cli@latest update --channel production --message "fix finder copy"
```

## Out of scope (still)

Inventory UX (tables exist unused), barcode scan, pricing/cart. Store listing assets / review screenshots are on you when you submit.
