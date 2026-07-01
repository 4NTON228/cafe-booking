-- ============================================================
--  СТАТУС «ГОСТЬ УШЁЛ» + ПЕРЕНОС БРОНИ НА ДРУГОЙ СТОЛ (АДМИН)
--  Применяется поверх add-status-reason.sql.
-- ============================================================

-- 1) Новый статус 'left' (гость ушёл): бронь завершена, стол освобождается.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('booked', 'arrived', 'no_show', 'cancelled', 'left'));

-- 2) Отменённая И завершённая ('left') бронь освобождают стол —
--    исключаем их из анти-овербукинга (стол снова можно бронировать).
alter table public.bookings drop constraint if exists no_overlap;
alter table public.bookings
  add constraint no_overlap
  exclude using gist (
    table_id with =,
    time_range with &&
  ) where (deleted_at is null and status <> 'cancelled' and status <> 'left');

-- 3) Перенос брони на другой стол разрешаем ТОЛЬКО админам (офики — нет).
--    Перенос на другую дату по-прежнему запрещён всем.
create or replace function public.guard_booking_update()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if new.booking_date <> old.booking_date then
    raise exception 'Перенос на другую дату не поддерживается — создайте новую бронь';
  end if;
  if new.table_id <> old.table_id and public.current_role() <> 'admin' then
    raise exception 'Переносить бронь на другой стол может только администратор';
  end if;
  return new;
end;
$$;
