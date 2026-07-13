-- ============================================================
--  МЕТКИ НА БРОНИ + ЖУРНАЛ БРОНИ
--  Применяется поверх add-push-notifications.sql.
-- ============================================================

-- Быстрые метки (день рождения, у окна и т.п.) — массив ключей.
alter table public.bookings add column if not exists tags text[] not null default '{}';

-- Журнал по брони: кто создал/изменил/удалил и когда. Берём из bookings_audit,
-- отдаём только действие + имя сотрудника + время (без снимка данных),
-- поэтому доступно всем авторизованным.
create or replace function public.booking_history(p_booking_id bigint)
returns table(action text, actor_name text, at timestamptz)
language sql security definer set search_path = public stable as $$
  select a.action,
         coalesce(p.full_name, '—') as actor_name,
         a.at
  from public.bookings_audit a
  left join public.profiles p on p.id = a.actor
  where a.booking_id = p_booking_id
  order by a.at;
$$;
grant execute on function public.booking_history(bigint) to authenticated;
