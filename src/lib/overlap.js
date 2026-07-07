import { isActiveBooking } from './status'

// Интервал брони в минутах от начала суток: [start, start+duration).
function range(b) {
  const [h, m] = String(b.start_time).slice(0, 5).split(':').map(Number)
  const s = h * 60 + m
  return [s, s + Number(b.duration_min || 0)]
}
const overlaps = (a, b) => a[0] < b[1] && b[0] < a[1]

// Локальная проверка: не пересекается ли какая-то из новых броней с уже
// известными (сервер + офлайн-очередь) на том же столе и дате. Настоящая
// защита — в БД (exclusion constraint), это лишь чтобы поймать очевидный
// конфликт на том же устройстве ещё до отправки.
export function hasLocalOverlap(newRows, existing) {
  for (const nr of newRows) {
    const nRange = range(nr)
    for (const b of existing) {
      if (b.table_id !== nr.table_id) continue
      if (b.booking_date !== nr.booking_date) continue
      if (b.client_id && b.client_id === nr.client_id) continue // та же бронь
      if (!isActiveBooking(b)) continue
      if (overlaps(nRange, range(b))) return true
    }
  }
  return false
}
