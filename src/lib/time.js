// Утилиты времени для броней.

// Время окончания брони. В БД хранится только start_time + duration_min
// (отдельной колонки end_time нет), поэтому считаем на клиенте.
export function endTime(startTime, durationMin) {
  const [h, m] = startTime.slice(0, 5).split(':').map(Number)
  const total = h * 60 + m + Number(durationMin || 0)
  const eh = Math.floor(total / 60) % 24
  const em = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(eh)}:${pad(em)}`
}

// Диапазон брони «18:00–20:00».
export function timeRange(startTime, durationMin) {
  return `${startTime.slice(0, 5)}–${endTime(startTime, durationMin)}`
}

// Когда бронь была создана сотрудником: дата + время.
export function formatCreated(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}
