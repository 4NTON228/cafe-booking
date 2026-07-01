-- ============================================================
--  СКРЫТЫЕ АДМИНЫ
--  Применяется поверх add-left-status-and-move.sql.
--  Пользователь остаётся role='staff' в profiles (другие видят его
--  обычным сотрудником), но получает админ-доступ через закрытую
--  таблицу hidden_admins, которую нельзя прочитать через API.
--  Клиент узнаёт СВОЙ статус через RPC am_i_admin() (чужой не виден).
-- ============================================================

create table if not exists public.hidden_admins (
  id uuid primary key references auth.users(id) on delete cascade
);
alter table public.hidden_admins enable row level security;
revoke all on public.hidden_admins from anon, authenticated;

create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select role = 'admin' from public.profiles where id = uid), false)
      or exists (select 1 from public.hidden_admins where id = uid);
$$;

create or replace function public.current_is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_admin(auth.uid());
$$;

create or replace function public.am_i_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_admin(auth.uid());
$$;

grant execute on function public.am_i_admin() to authenticated;
revoke execute on function public.is_admin(uuid) from anon, authenticated;

drop policy "admin manages profiles" on public.profiles;
create policy "admin manages profiles" on public.profiles
  for all to authenticated
  using (public.current_is_admin())
  with check (public.current_is_admin());

drop policy "admin manages tables" on public.tables;
create policy "admin manages tables" on public.tables
  for all to authenticated
  using (public.current_is_admin())
  with check (public.current_is_admin());

drop policy "admin reads audit" on public.bookings_audit;
create policy "admin reads audit" on public.bookings_audit
  for select to authenticated using (public.current_is_admin());

create or replace function public.guard_soft_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is distinct from old.deleted_at
     and not public.current_is_admin() then
    raise exception 'Удалять и восстанавливать брони может только администратор';
  end if;
  return new;
end;
$$;

create or replace function public.guard_booking_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.booking_date <> old.booking_date then
    raise exception 'Перенос на другую дату не поддерживается — создайте новую бронь';
  end if;
  if new.table_id <> old.table_id and not public.current_is_admin() then
    raise exception 'Переносить бронь на другой стол может только администратор';
  end if;
  return new;
end;
$$;

-- Выдать конкретному сотруднику скрытый админ-доступ:
insert into public.hidden_admins (id)
select id from auth.users where email = 'elvira@manilov.cafe'
on conflict do nothing;
