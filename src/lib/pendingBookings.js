import { supabase } from '../supabaseClient'

// Очередь броней, созданных офлайн (или при сбое сети). Хранится в localStorage.
// При возврате сети отправляется в БД. Идемпотентность — по client_id.
const KEY = 'manilov-pending-bookings'
const REJ_KEY = 'manilov-rejected-bookings'
const listeners = new Set()

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}
function write(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* переполнение — игнор */ }
  listeners.forEach((l) => l())
}

export function subscribePending(fn) { listeners.add(fn); return () => listeners.delete(fn) }
export function getPendingOps() { return read(KEY) }
export function getRejected() { return read(REJ_KEY) }
export function clearRejected() { write(REJ_KEY, []) }

// Кол-во ожидающих отправки броней (party считаем как одну).
export function pendingCount() { return read(KEY).length }

// Развёрнутые строки ожидающих броней на конкретную дату (для схемы зала).
export function pendingRowsForDate(date) {
  const out = []
  for (const op of read(KEY))
    for (const r of op.rows)
      if (r.booking_date === date) out.push({ ...r, id: r.client_id, _pending: true })
  return out
}

// Все ожидающие строки от сегодня (для списка броней).
export function pendingRowsUpcoming(fromDate) {
  const out = []
  for (const op of read(KEY))
    for (const r of op.rows)
      if (r.booking_date >= fromDate) out.push({ ...r, id: r.client_id, _pending: true })
  return out
}

export function enqueueBooking(rows) {
  const op = { opId: crypto.randomUUID(), rows, ts: Date.now() }
  write(KEY, [...read(KEY), op])
  return op
}

function removeOp(opId) { write(KEY, read(KEY).filter((o) => o.opId !== opId)) }
function reject(op, reason) {
  const first = op.rows[0] || {}
  write(REJ_KEY, [...read(REJ_KEY), { opId: op.opId, guest: first.guest_name, reason, ts: Date.now() }])
  removeOp(op.opId)
}

let syncing = false
// Отправить очередь в БД. Возвращает { synced, rejected } — сколько ушло/отклонено.
export async function syncPending() {
  if (syncing || !navigator.onLine) return { synced: 0, rejected: 0 }
  const ops = read(KEY)
  if (ops.length === 0) return { synced: 0, rejected: 0 }
  syncing = true
  let synced = 0, rejected = 0
  try {
    for (const op of ops) {
      let res
      try { res = await supabase.from('bookings').insert(op.rows) }
      catch { break } // сеть отвалилась — оставляем очередь на потом
      const error = res?.error
      if (!error) { removeOp(op.opId); synced++; continue }
      if (error.code === '23505') { removeOp(op.opId); synced++; continue } // уже отправлено (дубль client_id)
      if (error.code === '23P01' || (error.message || '').includes('no_overlap')) {
        reject(op, 'Стол уже заняли, пока не было сети'); rejected++; continue
      }
      // Прочая ошибка (например, временная) — прекращаем, попробуем позже.
      break
    }
  } finally { syncing = false }
  return { synced, rejected }
}
