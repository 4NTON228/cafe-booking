import { useState, useRef, useEffect } from 'react'
import { useBookings } from '../hooks/useBookings'
import TableShape from './TableShape'
import BookingModal from './BookingModal'
import BookingsList from './BookingsList'
import DatePicker from './DatePicker'

const today = () => new Date().toISOString().slice(0, 10)

// Реальные размеры схемы зала (координаты столов привязаны к этой области).
const PLAN_W = 660
const PLAN_H = 460

export default function FloorPlan({ isAdmin }) {
  const [date, setDate] = useState(today())
  const [activeTable, setActiveTable] = useState(null)
  const [view, setView] = useState('plan') // 'plan' | 'list'

  const {
    tables, bookings, loading, realtimeStatus,
    addBooking, updateBooking, deleteBooking,
  } = useBookings(date)

  // Масштабируем фиксированную схему зала под ширину экрана (важно на телефоне).
  const scrollRef = useRef(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => setScale(Math.min(1, el.clientWidth / PLAN_W))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [view, loading])

  const rt = {
    live: { cls: 'live', text: 'Обновления в реальном времени' },
    connecting: { cls: 'connecting', text: 'Подключение…' },
    offline: { cls: 'offline', text: 'Нет связи — обновления приостановлены' },
  }[realtimeStatus] || { cls: 'connecting', text: 'Подключение…' }

  const bookingsFor = (tableId) =>
    bookings.filter((b) => b.table_id === tableId)

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
          Список броней{bookings.length ? ` (${bookings.length})` : ''}
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
        <div className="floor-scroll" ref={scrollRef}>
          <div
            className="floor-scaler"
            style={{ width: PLAN_W * scale, height: PLAN_H * scale }}
          >
            <div
              className="floor-plan"
              style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
              {tables.map((t) => (
                <TableShape
                  key={t.id}
                  table={t}
                  bookingsCount={bookingsFor(t.id).length}
                  onClick={setActiveTable}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <BookingsList
          bookings={bookings}
          tables={tables}
          onSelectTable={setActiveTable}
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
