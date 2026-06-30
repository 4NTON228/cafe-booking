import { timeRange, formatCreated } from '../lib/time'

// Заголовок даты: «Пятница, 10 июля».
function formatDateHead(dateStr) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// Список всех предстоящих броней, сгруппированный по датам.
// onSelect(table, bookingDate) — открыть стол на нужную дату.
export default function BookingsList({ bookings, tables, onSelect }) {
  if (bookings.length === 0) {
    return <div className="booking-empty">Предстоящих броней нет</div>
  }

  const tableById = Object.fromEntries(tables.map((t) => [t.id, t]))

  // Группируем по дате (bookings уже отсортированы по дате и времени).
  const groups = []
  for (const b of bookings) {
    let g = groups[groups.length - 1]
    if (!g || g.date !== b.booking_date) {
      g = { date: b.booking_date, items: [] }
      groups.push(g)
    }
    g.items.push(b)
  }

  return (
    <div className="day-list">
      {groups.map((g) => (
        <div key={g.date}>
          <div className="day-date-head">{formatDateHead(g.date)}</div>
          {g.items.map((b) => {
            const table = tableById[b.table_id]
            return (
              <button
                key={b.id}
                className="day-row"
                onClick={() => table && onSelect(table, b.booking_date)}
              >
                <span className="day-table">№{table?.number ?? '—'}</span>
                <span className="day-main">
                  <span className="day-time">{timeRange(b.start_time, b.duration_min)}</span>
                  <span className="day-guest">{b.guest_name}</span>
                  <span className="day-meta">
                    {b.guests_count} чел.{b.phone ? ` · ${b.phone}` : ''}
                  </span>
                  {b.has_preorder && (
                    <span className="day-preorder">Предзаказ: {b.preorder_text}</span>
                  )}
                  <span className="day-author">
                    Забронировал
                    {b.creator?.full_name ? `: ${b.creator.full_name}` : ': —'}
                    {b.created_at ? ` · ${formatCreated(b.created_at)}` : ''}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
