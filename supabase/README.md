# Supabase

1. Apply `migrations/001_init.sql` in the Supabase SQL editor (or via Supabase CLI).
2. Ensure Storage bucket `product-thumbs` exists and is public (seed script can create it).
3. Seed from the repo root: `npm run seed` with `SUPABASE_SERVICE_ROLE_KEY` set.
4. Add your Auth user to `public.admin_users`.

Inventory tables are stubs only — no app UI yet.
