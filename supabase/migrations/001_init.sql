-- Mayday MVP schema: catalog SKUs, placements, shelf maps, display config, admin role.
-- Inventory stub tables are unused in MVP but leave room for later.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Admin roles (email must match auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users au where au.id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Products (SKUs)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  brand text not null,
  width_mm numeric,
  height_mm numeric,
  pack_count int,
  is_premium boolean not null default false,
  thumb_path text,
  product_url text,
  accent_color text,
  accent_gradient jsonb,
  sort_hint int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_size_idx on public.products (width_mm, height_mm);
create index if not exists products_sku_trgm_idx on public.products using gin (sku gin_trgm_ops);
create index if not exists products_name_trgm_idx on public.products using gin (name gin_trgm_ops);
create index if not exists products_premium_idx on public.products (is_premium) where is_active;
create index if not exists products_active_idx on public.products (is_active);

-- ---------------------------------------------------------------------------
-- Shelf placements
-- ---------------------------------------------------------------------------
create table if not exists public.shelf_placements (
  id uuid primary key default gen_random_uuid(),
  position_code text not null unique,
  shelf int not null,
  row int not null,
  slot int not null,
  product_id uuid not null references public.products (id) on delete cascade,
  unique (shelf, row, slot)
);

create index if not exists shelf_placements_product_idx on public.shelf_placements (product_id);
create index if not exists shelf_placements_shelf_idx on public.shelf_placements (shelf);

-- ---------------------------------------------------------------------------
-- Shelf / layout SVG maps
-- ---------------------------------------------------------------------------
create table if not exists public.shelf_maps (
  shelf int primary key check (shelf >= 1),
  svg_markup text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.layout_map (
  id int primary key default 1 check (id = 1),
  svg_markup text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Admin-customizable display config
-- ---------------------------------------------------------------------------
create table if not exists public.display_config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  version int not null default 1,
  payload jsonb not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Inventory stubs (unused in MVP)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text
);

create table if not exists public.inventory_balances (
  product_id uuid not null references public.products (id) on delete cascade,
  location_id uuid not null references public.inventory_locations (id) on delete cascade,
  qty_on_hand numeric not null default 0,
  qty_reserved numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (product_id, location_id)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  location_id uuid references public.inventory_locations (id) on delete set null,
  delta numeric not null,
  reason text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists display_config_set_updated_at on public.display_config;
create trigger display_config_set_updated_at
  before update on public.display_config
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: public read catalog; admin write
-- ---------------------------------------------------------------------------
alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.shelf_placements enable row level security;
alter table public.shelf_maps enable row level security;
alter table public.layout_map enable row level security;
alter table public.display_config enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.inventory_movements enable row level security;

-- admin_users: admins can read their row / list; only service role inserts typically
drop policy if exists admin_users_select_self_or_admin on public.admin_users;
create policy admin_users_select_self_or_admin on public.admin_users
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists admin_users_write_admin on public.admin_users;
create policy admin_users_write_admin on public.admin_users
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- products
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- placements
drop policy if exists placements_public_read on public.shelf_placements;
create policy placements_public_read on public.shelf_placements
  for select to anon, authenticated
  using (true);

drop policy if exists placements_admin_write on public.shelf_placements;
create policy placements_admin_write on public.shelf_placements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- shelf maps / layout
drop policy if exists shelf_maps_public_read on public.shelf_maps;
create policy shelf_maps_public_read on public.shelf_maps
  for select to anon, authenticated
  using (true);

drop policy if exists shelf_maps_admin_write on public.shelf_maps;
create policy shelf_maps_admin_write on public.shelf_maps
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists layout_map_public_read on public.layout_map;
create policy layout_map_public_read on public.layout_map
  for select to anon, authenticated
  using (true);

drop policy if exists layout_map_admin_write on public.layout_map;
create policy layout_map_admin_write on public.layout_map
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- display config
drop policy if exists display_config_public_read on public.display_config;
create policy display_config_public_read on public.display_config
  for select to anon, authenticated
  using (true);

drop policy if exists display_config_admin_write on public.display_config;
create policy display_config_admin_write on public.display_config
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- inventory stubs: admin only (no public stock UX yet)
drop policy if exists inventory_locations_admin on public.inventory_locations;
create policy inventory_locations_admin on public.inventory_locations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists inventory_balances_admin on public.inventory_balances;
create policy inventory_balances_admin on public.inventory_balances
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists inventory_movements_admin on public.inventory_movements;
create policy inventory_movements_admin on public.inventory_movements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Storage bucket for pack thumbs (run in dashboard or via API; documented here)
-- insert into storage.buckets (id, name, public) values ('product-thumbs', 'product-thumbs', true)
-- on conflict do nothing;
-- Public read + admin write policies should be added on storage.objects for that bucket.
