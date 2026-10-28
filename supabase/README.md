# Supabase

1. Apply `migrations/001_init.sql` then `002_saved_layouts.sql` in the Supabase SQL editor (or via Supabase CLI).
2. Ensure Storage bucket `product-thumbs` exists and is public (seed script can create it).
3. Seed from the repo root: `npm run seed` with `SUPABASE_SERVICE_ROLE_KEY` set (also upserts named layout **Essen 2026**).
4. Add your Auth user to `public.admin_users`.

`layout_map` is the live staff floor plan (singleton). `saved_layouts` holds named event copies managed from Admin → Floor layout.

Inventory tables are stubs only — no app UI yet.
