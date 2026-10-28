-- Named floor layouts (e.g. Essen 2026, PaxU) that admins can save and reload.
-- The live booth map remains public.layout_map (singleton id = 1).

create table if not exists public.saved_layouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  svg_markup text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_layouts_name_nonempty check (length(trim(name)) > 0)
);

create unique index if not exists saved_layouts_name_unique
  on public.saved_layouts (lower(trim(name)));

drop trigger if exists saved_layouts_set_updated_at on public.saved_layouts;
create trigger saved_layouts_set_updated_at
  before update on public.saved_layouts
  for each row execute function public.set_updated_at();

alter table public.saved_layouts enable row level security;

drop policy if exists saved_layouts_public_read on public.saved_layouts;
create policy saved_layouts_public_read on public.saved_layouts
  for select to anon, authenticated
  using (true);

drop policy if exists saved_layouts_admin_write on public.saved_layouts;
create policy saved_layouts_admin_write on public.saved_layouts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed the current live floor plan as "Essen 2026" when present.
insert into public.saved_layouts (name, svg_markup)
select 'Essen 2026', svg_markup
from public.layout_map
where id = 1
  and not exists (
    select 1 from public.saved_layouts sl
    where lower(trim(sl.name)) = lower('Essen 2026')
  );
