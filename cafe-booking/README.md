# Манилов — система бронирования столов

Внутреннее приложение для персонала кафе. Официанты и админы бронируют
столы, видят занятость в реальном времени, отмечают предзаказы.

## Стек
React + Vite, Supabase (Auth + PostgreSQL + Realtime), деплой на Vercel.

## Роли
- **admin** (2 человека) — всё, включая удаление броней и правку схемы зала
- **staff** (4 человека) — создание и редактирование броней

## Запуск локально
1. `npm install`
2. Скопируй `.env.local.example` в `.env.local`, впиши URL и публичный ключ
   из Supabase → Project Settings → API.
3. В Supabase → SQL Editor выполни `supabase/migration.sql`.
4. Создай сотрудников: Authentication → Add user (email + пароль).
5. Назначь роли и имена (SQL Editor):
   ```sql
   update public.profiles set role = 'admin', full_name = 'Иван' where id = 'uuid';
   update public.profiles set full_name = 'Мария' where id = 'uuid-staff';
   ```
6. Отключи открытую регистрацию: Authentication → Providers → Email →
   выключи "Enable signup". Тогда заходить смогут только созданные тобой аккаунты.
7. `npm run dev`

## Деплой на Vercel
Подключи репозиторий, в Settings → Environment Variables добавь
`VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`, задеплой.

## Что важно знать
- **created_by** проставляет база автоматически — официант не может подделать,
  кто создал бронь. Имя автора видно на каждой брони.
- **Защита от двойной брони** — exclusion constraint на уровне индекса БД,
  гонок нет даже при одновременном бронировании одного стола.
- **Удаление мягкое** (soft delete) — бронь помечается, а не стирается.
  Восстановить может админ через снятие deleted_at.
- **Журнал действий** — таблица bookings_audit, читает только админ.
- Координаты и вместимость столов поправь в `supabase/migration.sql`
  (блок insert into tables) под реальный зал.
