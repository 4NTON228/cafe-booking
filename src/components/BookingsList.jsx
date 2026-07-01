import { useState } from 'react'
import { timeRange, formatCreated } from '../lib/time'
import { STATUS, statusOf, reasonPrefix } from '../lib/status'
import PhoneLink from './PhoneLink'

// Заголовок даты: «Пятница, 10 июля».
function formatDateHead(dateStr) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// Список всех предстоящих броней, сгруппированный по датам.
// onSelect(booking) — открыть окно просмотра брони (без формы создания).
export default function BookingsList({ bookings, tables, onSelect }) {
  const [query, setQuery] = useState('')

  const tableById = Object.fromEntries(tables.map((t) => [t.id, t]))

  // Поиск по имени гостя и телефону (без учёта регистра).
  const q = query.trim().toLowerCase()
  const filtered = q
    ? bookings.filter((b) =>
        (b.guest_name || '').toLowerCase().includes(q) ||
        (b.phone || '').toLowerCase().includes(q))
    : bookings

  // Группируем по дате (bookings уже отсортированы по дате и времени).
  const groups = []
  for (const b of filtered) {
    let g = groups[groups.length - 1]
    if (!g || g.date !== b.booking_date) {
      g = { date: b.booking_date, items: [] }
      groups.push(g)
    }
    g.items.push(b)
  }

  return (
    <div className="day-list">
      <input
        className="field search-field"
        type="search"
        placeholder="Поиск по имени или телефону"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {groups.length === 0 ? (
        <div className="booking-empty">
          {q ? 'Ничего не найдено' : 'Предстоящих броней нет'}
        </div>
      ) : groups.map((g) => (
        <div key={g.date}>
          <div className="day-date-head">{formatDateHead(g.date)}</div>
          {g.items.map((b) => {
            const table = tableById[b.table_id]
            const st = statusOf(b)
            const open = () => onSelect(b)
            return (
              <div
                key={b.id}
                className={`day-row ${st === 'cancelled' ? 'is-cancelled' : ''}`}
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open()}
              >
                <span className="day-table">№{table?.number ?? '—'}</span>
                <span className="day-main">
                  <span className="day-time">
                    {timeRange(b.start_time, b.duration_min)}
                    <span className={`status-chip ${STATUS[st].cls}`}>{STATUS[st].label}</span>
                  </span>
                  <span className="day-guest">{b.guest_name}</span>
                  <span className="day-meta">
                    {b.guests_count} чел.
                    {b.phone && <> · <PhoneLink phone={b.phone} /></>}
                  </span>
                  {b.has_preorder && (
                    <span className="day-preorder">Предзаказ: {b.preorder_text}</span>
                  )}
                  {b.status_reason && (
                    <span className="booking-reason">{reasonPrefix(b)}: {b.status_reason}</span>
                  )}
                  <span className="day-author">
                    Забронировал
                    {b.creator?.full_name ? `: ${b.creator.full_name}` : ': —'}
                    {b.created_at ? ` · ${formatCreated(b.created_at)}` : ''}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
