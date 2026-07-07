-- ============================================================
--  ПУШ-УВЕДОМЛЕНИЯ (Web Push)
--  Применяется поверх add-booking-client-id.sql.
--  Требует edge-функцию `push` (см. supabase/functions/push).
--  ВНИМАНИЕ: значения app_secrets (VAPID и webhook_secret) здесь —
--  плейсхолдеры. Реальные ключи заданы в проекте отдельно.
-- ============================================================

-- Подписки на пуши (устройство сотрудника).
create table if not exists public.push_subscriptions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  subscription jsonb not null,
  created_at   timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "own subs select" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "own subs insert" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy "own subs update" on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own subs delete" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- Секреты приложения (VAPID и пр.). Закрыто: ни одной политики — только service_role.
create table if not exists public.app_secrets (key text primary key, value text not null);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
-- insert into public.app_secrets(key,value) values
--   ('vapid_public','...'),('vapid_private','...'),('vapid_subject','mailto:...'),
--   ('push_fn_url','https://<ref>.supabase.co/functions/v1/push'),
--   ('webhook_secret', encode(gen_random_bytes(18),'hex'));

-- Публичный VAPID-ключ клиенту (не секретный).
create or replace function public.get_vapid_public()
returns text language sql security definer set search_path = public stable as $$
  select value from public.app_secrets where key = 'vapid_public';
$$;
grant execute on function public.get_vapid_public() to anon, authenticated;

-- Отметка об отправленном напоминании.
alter table public.bookings add column if not exists reminded_at timestamptz;

-- Брони, которым пора напомнить (за 15–30 мин до начала, по МСК).
create or replace function public.due_reminders()
returns setof public.bookings language sql security definer set search_path = public stable as $$
  select * from public.bookings
  where deleted_at is null and status = 'booked' and reminded_at is null
    and (booking_date + start_time)
        between (now() at time zone 'Europe/Moscow') + interval '15 minutes'
            and (now() at time zone 'Europe/Moscow') + interval '30 minutes';
$$;
revoke execute on function public.due_reminders() from anon, authenticated;

-- ===== Расписание и вебхук =====
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.notify_booking_change()
returns trigger language plpgsql security definer set search_path = public, net as $$
declare fn_url text; secret text;
begin
  if new.deleted_at is not null then return new; end if;
  if (new.status = 'cancelled' and old.status is distinct from 'cancelled')
     or new.table_id is distinct from old.table_id
     or new.start_time is distinct from old.start_time
     or new.booking_date is distinct from old.booking_date then
    select value into fn_url from public.app_secrets where key = 'push_fn_url';
    select value into secret from public.app_secrets where key = 'webhook_secret';
    perform net.http_post(
      url := fn_url,
      headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', secret),
      body := jsonb_build_object('type','change','new', to_jsonb(new), 'old', to_jsonb(old))
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_booking_change on public.bookings;
create trigger trg_notify_booking_change
  after update on public.bookings for each row execute function public.notify_booking_change();

-- Напоминания каждые 5 минут.
select cron.schedule('push-reminders', '*/5 * * * *', $cron$
  select net.http_post(
    url := (select value from public.app_secrets where key = 'push_fn_url'),
    headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', (select value from public.app_secrets where key = 'webhook_secret')),
    body := '{"source":"cron"}'::jsonb
  );
$cron$);
