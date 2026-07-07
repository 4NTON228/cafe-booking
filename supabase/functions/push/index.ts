import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const db = createClient(SUPABASE_URL, SERVICE_ROLE)

async function loadSecrets() {
  const { data } = await db.from('app_secrets').select('key,value')
  const s: Record<string, string> = {}
  for (const r of data ?? []) s[r.key] = r.value
  return s
}

async function tableNumbers() {
  const { data } = await db.from('tables').select('id,number')
  const m: Record<string, number> = {}
  for (const t of data ?? []) m[t.id] = t.number
  return m
}

// Отправить одно уведомление всем подпискам. Протухшие удаляем.
async function broadcast(payload: Record<string, unknown>) {
  const { data: subs } = await db.from('push_subscriptions').select('endpoint,subscription')
  const body = JSON.stringify(payload)
  let sent = 0
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(s.subscription as webpush.PushSubscription, body)
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) {
        await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      }
    }
  }))
  return sent
}

function hhmm(t: string) { return String(t).slice(0, 5) }

async function runReminders() {
  const nums = await tableNumbers()
  const { data: due } = await db.rpc('due_reminders')
  let sent = 0
  for (const b of due ?? []) {
    const n = nums[b.table_id] ?? '?'
    await broadcast({
      title: 'Скоро гость',
      body: `Стол №${n}, ${hhmm(b.start_time)} — ${b.guest_name}, ${b.guests_count} чел.`,
      url: '/',
      tag: `rem-${b.id}`,
    })
    await db.from('bookings').update({ reminded_at: new Date().toISOString() }).eq('id', b.id)
    sent++
  }
  return sent
}

async function runChange(newRow: any, oldRow: any) {
  const nums = await tableNumbers()
  const n = nums[newRow.table_id] ?? '?'
  let title = '', body = ''
  if (newRow.status === 'cancelled' && oldRow.status !== 'cancelled') {
    title = 'Бронь отменена'
    body = `Стол №${n}, ${hhmm(newRow.start_time)} — ${newRow.guest_name}`
  } else if (newRow.table_id !== oldRow.table_id) {
    const from = nums[oldRow.table_id] ?? '?'
    title = 'Бронь перенесена'
    body = `Со стола №${from} на №${n}, ${hhmm(newRow.start_time)} — ${newRow.guest_name}`
  } else {
    title = 'Бронь изменена'
    body = `Стол №${n}, новое время ${hhmm(newRow.start_time)} — ${newRow.guest_name}`
  }
  return await broadcast({ title, body, url: '/', tag: `chg-${newRow.id}` })
}

Deno.serve(async (req) => {
  const secrets = await loadSecrets()
  const provided = req.headers.get('x-webhook-secret')
  if (!secrets.webhook_secret || provided !== secrets.webhook_secret) {
    return new Response('forbidden', { status: 403 })
  }
  webpush.setVapidDetails(secrets.vapid_subject, secrets.vapid_public, secrets.vapid_private)

  const payload = await req.json().catch(() => ({}))
  let result: unknown
  if (payload.source === 'cron') {
    result = { reminders: await runReminders() }
  } else if (payload.type === 'change' && payload.new) {
    result = { sent: await runChange(payload.new, payload.old ?? {}) }
  } else {
    result = { ok: true }
  }
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
})
