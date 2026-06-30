import { useState } from 'react'
import { useBookings } from '../hooks/useBookings'
import { useAllBookings } from '../hooks/useAllBookings'
import TableShape from './TableShape'
import BookingModal from './BookingModal'
import BookingsList from './BookingsList'
import DatePicker from './DatePicker'

const today = () => new Date().toISOString().slice(0, 10)

export default function FloorPlan({ isAdmin }) {
  const [date, setDate] = useState(today())
  const [activeTable, setActiveTable] = useState(null)
  const [view, setView] = useState('plan') // 'plan' | 'list'

  const {
    tables, bookings, loading, realtimeStatus,
    addBooking, updateBooking, deleteBooking,
  } = useBookings(date)

  // Для раздела «Список броней» — все предстоящие брони (любые даты).
  const { bookings: allBookings } = useAllBookings(view === 'list')

  const rt = {
    live: { cls: 'live', text: 'Обновления в реальном времени' },
    connecting: { cls: 'connecting', text: 'Подключение…' },
    offline: { cls: 'offline', text: 'Нет связи — обновления приостановлены' },
  }[realtimeStatus] || { cls: 'connecting', text: 'Подключение…' }

  const bookingsFor = (tableId) =>
    bookings.filter((b) => b.table_id === tableId)

  // Столы по номеру; стол 11 убран из зала.
  const visibleTables = tables
    .filter((t) => t.number !== 11)
    .sort((a, b) => a.number - b.number)

  return (
    <div className="floor-wrap">
      <DatePicker date={date} onChange={setDate} />

      <div className="view-switch">
        <button
          className={`view-tab ${view === 'plan' ? 'active' : ''}`}
          onClick={() => setView('plan')}
        >
          Схема зала
        </button>
        <button
          className={`view-tab ${view === 'list' ? 'active' : ''}`}
          onClick={() => setView('list')}
        >
          Список броней
        </button>
      </div>

      <div className="legend">
        <span><i className="dot free" /> Свободно</span>
        <span><i className="dot booked" /> Забронировано</span>
        <span className={`rt-status ${rt.cls}`} title={rt.text}>
          <i className="rt-dot" /> {rt.text}
        </span>
      </div>

      {loading ? (
        <div className="floor-loading">Загрузка зала…</div>
      ) : view === 'plan' ? (
        <div className="floor-grid">
          {visibleTables.map((t) => (
            <TableShape
              key={t.id}
              table={t}
              bookingsCount={bookingsFor(t.id).length}
              onClick={setActiveTable}
            />
          ))}
        </div>
      ) : (
        <BookingsList
          bookings={allBookings}
          tables={tables}
          onSelect={(table, d) => { setDate(d); setActiveTable(table) }}
        />
      )}

      {activeTable && (
        <BookingModal
          table={activeTable}
          date={date}
          isAdmin={isAdmin}
          bookings={bookingsFor(activeTable.id)}
          onClose={() => setActiveTable(null)}
          onAdd={addBooking}
          onUpdate={updateBooking}
          onDelete={deleteBooking}
        />
      )}
    </div>
  )
}
