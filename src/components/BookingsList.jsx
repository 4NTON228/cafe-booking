import { timeRange, formatCreated } from '../lib/time'

// Список всех броней на выбранный день (все столы вместе, по времени).
// Удобно на телефоне и как общий обзор «кто куда забронирован».
export default function BookingsList({ bookings, tables, onSelectTable }) {
  if (bookings.length === 0) {
    return <div className="booking-empty">На этот день броней нет</div>
  }

  const tableById = Object.fromEntries(tables.map((t) => [t.id, t]))
  const sorted = [...bookings].sort((a, b) =>
    a.start_time.localeCompare(b.start_time))

  return (
    <div className="day-list">
      {sorted.map((b) => {
        const table = tableById[b.table_id]
        return (
          <button
            key={b.id}
            className="day-row"
            onClick={() => table && onSelectTable(table)}
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
  )
}
