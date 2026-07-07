-- ============================================================
--  ИДЕМПОТЕНТНОСТЬ ОФЛАЙН-БРОНЕЙ
--  Применяется поверх add-table-groups.sql.
--  client_id (uuid) генерит клиент до отправки. Повторная отправка
--  той же брони (после потери сети/ответа) не создаёт дубль.
-- ============================================================

alter table public.bookings add column if not exists client_id uuid;
create unique index if not exists bookings_client_id_key
  on public.bookings (client_id) where client_id is not null;
