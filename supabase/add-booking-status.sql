-- ============================================================
--  ДОБАВЛЕНИЕ СТАТУСОВ БРОНИ
--  Применяется поверх migration.sql.
--  status: booked (по умолчанию) / arrived (пришли) /
--          no_show (не пришли) / cancelled (отменена).
--  Обратная совместимость: старый фронт колонку не использует,
--  у новых строк default = 'booked'.
-- ============================================================

alter table public.bookings
  add column if not exists status text not null default 'booked'
  check (status in ('booked', 'arrived', 'no_show', 'cancelled'));

-- Отменённая бронь должна освобождать стол: исключаем её из анти-овербукинга.
-- Пересоздаём exclusion constraint, добавив условие status <> 'cancelled'.
alter table public.bookings drop constraint if exists no_overlap;
alter table public.bookings
  add constraint no_overlap
  exclude using gist (
    table_id with =,
    time_range with &&
  ) where (deleted_at is null and status <> 'cancelled');
