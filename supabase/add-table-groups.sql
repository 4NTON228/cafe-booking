-- ============================================================
--  СОСТАВНЫЕ СТОЛЫ (ГРУППЫ)
--  Применяется поверх add-hidden-admins.sql.
--  Админ склеивает столы в группу. Большую бронь можно поставить
--  сразу на всю группу — создаётся по одной брони на каждый стол
--  группы с общим party_id (анти-овербукинг работает по каждому столу).
-- ============================================================

create table if not exists public.table_groups (
  id   bigint generated always as identity primary key,
  name text not null
);
alter table public.table_groups enable row level security;
create policy "read table_groups" on public.table_groups
  for select to authenticated using (true);
create policy "admin manages table_groups" on public.table_groups
  for all to authenticated
  using (public.current_is_admin()) with check (public.current_is_admin());

create table if not exists public.table_group_members (
  group_id bigint references public.table_groups(id) on delete cascade,
  table_id bigint references public.tables(id) on delete cascade,
  primary key (group_id, table_id)
);
alter table public.table_group_members enable row level security;
create policy "read group members" on public.table_group_members
  for select to authenticated using (true);
create policy "admin manages group members" on public.table_group_members
  for all to authenticated
  using (public.current_is_admin()) with check (public.current_is_admin());

alter table public.bookings add column if not exists party_id uuid;

alter publication supabase_realtime add table public.table_groups;
alter publication supabase_realtime add table public.table_group_members;
