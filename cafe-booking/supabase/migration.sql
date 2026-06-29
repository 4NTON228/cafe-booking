-- ============================================================
--  КАФЕ «МАНИЛОВ» — СИСТЕМА БРОНИРОВАНИЯ СТОЛОВ
--  Полная миграция: применяется одной вставкой в Supabase SQL Editor.
--  Включает: профили с ролями и именами, столы по реальной схеме зала,
--  брони с предзаказом, защиту от пересечений (exclusion constraint),
--  soft delete, audit log, RLS.
-- ============================================================

-- Расширение для GiST-индекса по диапазонам (анти-овербукинг)
create extension if not exists btree_gist;

-- ============================================================
--  ПРОФИЛИ СОТРУДНИКОВ
--  Роль (admin/staff) + отображаемое имя. Имя показываем на бронях.
--  Аккаунты создаёт только владелец через панель Supabase —
--  открытой регистрации нет (отключается в настройках Auth, см. README).
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default 'Сотрудник',
  role         text not null default 'staff' check (role in ('admin', 'staff')),
  -- Активность аккаунта: деактивированный сотрудник может войти, но бронировать
  -- не может (проверка в RLS). Включает/выключает админ из панели «Сотрудники».
  is_active    boolean not null default true
);

alter table public.profiles enable row level security;

-- ============================================================
--  ФУНКЦИИ-ХЕЛПЕРЫ. Определяем ДО политик, которые на них ссылаются.
--  SECURITY DEFINER + фиксированный search_path — читают profiles
--  в обход RLS, чтобы политики не уходили в рекурсию.
-- ============================================================
-- current_role(): роль текущего пользователя.
create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- current_is_active(): активен ли текущий пользователь.
-- Используется в RLS броней — деактивированный сотрудник не бронирует.
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

-- Все авторизованные могут читать профили (нужно, чтобы показывать
-- имя создавшего бронь сотрудника всем коллегам).
create policy "read all profiles" on public.profiles
  for select to authenticated using (true);

-- Менять профили (роли, имена, активность) может только админ.
create policy "admin manages profiles" on public.profiles
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ============================================================
--  АВТО-СОЗДАНИЕ ПРОФИЛЯ при регистрации нового пользователя.
--  Имя берём из метаданных (если задал при создании), иначе заглушка.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Сотрудник'),
    'staff'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  СТОЛЫ — расположение по реальной схеме зала Манилова (из iiko).
--  Координаты pos_x/pos_y привязаны к области схемы 660×460 px.
--  Вместимость проставлена примерно — поправь под реальные столы.
-- ============================================================
create table public.tables (
  id       bigint generated always as identity primary key,
  number   int not null unique,
  capacity int not null default 2 check (capacity > 0),
  pos_x    int not null default 0,
  pos_y    int not null default 0,
  shape    text not null default 'round' check (shape in ('round', 'square'))
);

alter table public.tables enable row level security;

create policy "read tables" on public.tables
  for select to authenticated using (true);
create policy "admin manages tables" on public.tables
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Реальная раскладка зала по фото:
insert into public.tables (number, capacity, pos_x, pos_y, shape) values
  (5,  4, 230, 40,  'round'),   -- верхний ряд слева
  (4,  4, 330, 40,  'round'),
  (3,  2, 420, 40,  'round'),
  (2,  2, 500, 40,  'round'),
  (1,  2, 580, 40,  'round'),   -- верхний ряд справа
  (6,  4, 180, 200, 'round'),   -- середина слева
  (7,  4, 230, 330, 'round'),   -- нижний ряд
  (8,  4, 330, 330, 'round'),
  (11, 2, 430, 350, 'round'),
  (9,  6, 540, 290, 'square'),  -- зона справа внизу
  (10, 6, 600, 360, 'square');

-- ============================================================
--  БРОНИ
--  Валидация в CHECK-констрейнтах (нельзя обойти с клиента).
--  created_by проставляет БД автоматически (default auth.uid()) —
--  клиент не может подделать автора.
--  Предзаказ: флаг has_preorder + текст preorder_text.
-- ============================================================
create table public.bookings (
  id            bigint generated always as identity primary key,
  table_id      bigint not null references public.tables(id) on delete cascade,
  guest_name    text not null check (length(trim(guest_name)) > 0),
  phone         text check (phone is null or phone ~ '^\+?[0-9 ()\-]{6,20}$'),
  guests_count  int  not null check (guests_count > 0 and guests_count <= 50),
  booking_date  date not null,
  start_time    time not null,
  duration_min  int  not null default 120 check (duration_min between 30 and 360),
  -- Предзаказ
  has_preorder  boolean not null default false,
  preorder_text text,
  comment       text,
  -- Служебное. created_by ссылается на profiles (а не напрямую на auth.users),
  -- чтобы PostgREST мог встраивать имя автора: creator:profiles!bookings_created_by_fkey.
  -- profiles.id сам ссылается на auth.users.id — целостность к auth сохраняется.
  created_by    uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at    timestamptz default now(),
  deleted_at    timestamptz default null,  -- soft delete
  -- Диапазон времени для анти-овербукинга (generated)
  time_range tsrange generated always as (
    tsrange(
      (booking_date + start_time)::timestamp,
      (booking_date + start_time + (duration_min * interval '1 minute'))::timestamp,
      '[)'
    )
  ) stored
);

-- Индекс под частый запрос: активные брони на дату
create index idx_active_bookings
  on public.bookings (booking_date)
  where deleted_at is null;

-- ============================================================
--  АНТИ-ОВЕРБУКИНГ через EXCLUSION CONSTRAINT.
--  Postgres гарантирует на уровне индекса: два пересекающихся
--  интервала для одного стола физически не существуют. Атомарно,
--  без race condition (в отличие от SELECT-then-INSERT триггера).
--  Условие where: удалённые брони (soft delete) не блокируют стол.
-- ============================================================
alter table public.bookings
  add constraint no_overlap
  exclude using gist (
    table_id with =,
    time_range with &&
  ) where (deleted_at is null);

-- ============================================================
--  ЗАЩИТА UPDATE: нельзя перенести бронь на другой стол/дату
--  через update — это должно быть новой бронью.
-- ============================================================
create or replace function public.guard_booking_update()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if new.table_id <> old.table_id or new.booking_date <> old.booking_date then
    raise exception 'Перенос на другой стол или дату — удалите и создайте новую бронь';
  end if;
  return new;
end;
$$;

create trigger trg_guard_update
  before update on public.bookings
  for each row execute function public.guard_booking_update();

-- ============================================================
--  SOFT DELETE только для админов.
--  Staff может редактировать брони, но не может ставить deleted_at.
-- ============================================================
create or replace function public.guard_soft_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is distinct from old.deleted_at
     and public.current_role() <> 'admin' then
    raise exception 'Удалять и восстанавливать брони может только администратор';
  end if;
  return new;
end;
$$;

create trigger trg_guard_soft_delete
  before update on public.bookings
  for each row execute function public.guard_soft_delete();

-- ============================================================
--  AUDIT LOG: журнал всех действий с бронями.
--  Кто, что, когда — снимок состояния в jsonb. Читает только админ.
-- ============================================================
create table public.bookings_audit (
  id         bigint generated always as identity primary key,
  booking_id bigint,
  action     text,
  actor      uuid default auth.uid(),
  snapshot   jsonb,
  at         timestamptz default now()
);

alter table public.bookings_audit enable row level security;
create policy "admin reads audit" on public.bookings_audit
  for select to authenticated using (public.current_role() = 'admin');

create or replace function public.audit_booking()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.bookings_audit (booking_id, action, snapshot)
  values (coalesce(new.id, old.id), tg_op, to_jsonb(coalesce(new, old)));
  return coalesce(new, old);
end;
$$;

create trigger trg_audit_booking
  after insert or update or delete on public.bookings
  for each row execute function public.audit_booking();

-- ============================================================
--  RLS ДЛЯ БРОНЕЙ: одно кафе, общий зал.
--  Все авторизованные видят все брони (иначе зал не общий).
--  Insert — любой сотрудник, но created_by обязан быть им самим.
--  Update — любой сотрудник (с ограничениями триггеров выше).
--  Delete физический запрещён всем (используем soft delete).
-- ============================================================
alter table public.bookings enable row level security;

create policy "read bookings" on public.bookings
  for select to authenticated using (true);

-- Создавать брони может только активный сотрудник, и только от своего имени.
create policy "staff insert bookings" on public.bookings
  for insert to authenticated
  with check (created_by = auth.uid() and public.current_is_active());

-- Редактировать брони может только активный сотрудник
-- (доп. ограничения — в триггерах guard_* выше).
create policy "staff update bookings" on public.bookings
  for update to authenticated
  using (public.current_is_active())
  with check (public.current_is_active());

-- Физический delete не разрешаем никому — только soft delete через update.
-- (Если когда-то понадобится чистка старых данных — делай вручную как админ.)

-- ============================================================
--  БЕЗОПАСНОСТЬ: триггерные функции не нужны напрямую через REST/RPC.
--  Триггеры продолжают работать (выполняются в контексте таблицы),
--  а прямой вызов /rest/v1/rpc/... для них закрыт.
--  current_role()/current_is_active() НЕ трогаем — их вызывает RLS.
-- ============================================================
revoke execute on function public.guard_booking_update() from anon, authenticated;
revoke execute on function public.guard_soft_delete()   from anon, authenticated;
revoke execute on function public.audit_booking()        from anon, authenticated;
revoke execute on function public.handle_new_user()      from anon, authenticated;

-- ============================================================
--  REALTIME
--  bookings — занятость зала; tables — правка схемы админом;
--  profiles — список сотрудников и их активность в панели админа.
-- ============================================================
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.tables;
alter publication supabase_realtime add table public.profiles;

-- ============================================================
--  ПОСЛЕ МИГРАЦИИ:
--  1. Создай сотрудников: Authentication → Add user (email + пароль).
--     В user metadata можно сразу задать full_name.
--  2. Назначь двух админов:
--     update public.profiles set role = 'admin', full_name = 'Имя'
--       where id = 'uuid-сотрудника';
--  3. Остальным проставь имена:
--     update public.profiles set full_name = 'Имя' where id = '...';
--  4. В Authentication → Providers → Email отключи "Enable signup",
--     чтобы регистрироваться могли только созданные тобой аккаунты.
-- ============================================================
