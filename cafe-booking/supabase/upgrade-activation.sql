-- ============================================================
--  ОБНОВЛЕНИЕ: активация/деактивация сотрудников.
--  Применять ТОЛЬКО на уже развёрнутой базе (где migration.sql
--  выполнен раньше, до добавления is_active). На свежей установке
--  всё уже есть в migration.sql — этот файл не нужен.
--  Идемпотентно: можно выполнить повторно без ошибок.
-- ============================================================

-- 1. Колонка активности в профилях
alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- 2. Функция: активен ли текущий пользователь
create or replace function public.current_is_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_active from public.profiles where id = auth.uid()),
    false
  );
$$;

-- 3. Пересоздаём политики броней с проверкой активности
drop policy if exists "staff insert bookings" on public.bookings;
create policy "staff insert bookings" on public.bookings
  for insert to authenticated
  with check (created_by = auth.uid() and public.current_is_active());

drop policy if exists "staff update bookings" on public.bookings;
create policy "staff update bookings" on public.bookings
  for update to authenticated
  using (public.current_is_active())
  with check (public.current_is_active());
