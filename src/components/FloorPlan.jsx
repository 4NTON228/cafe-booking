import { useState, useRef, useEffect } from 'react'
import { useBookings } from '../hooks/useBookings'
import { useAllBookings } from '../hooks/useAllBookings'
import TableShape from './TableShape'
import BookingModal from './BookingModal'
import BookingDetails from './BookingDetails'
import BookingsList from './BookingsList'
import DatePicker from './DatePicker'
import { isActiveBooking } from '../lib/status'

const today = () => new Date().toISOString().slice(0, 10)

// Размеры области схемы зала (к ней привязаны координаты столов ниже).
const PLAN_W = 700
const PLAN_H = 470

// Раскладка зала по номерам столов (реальное расположение).
// Меняй координаты здесь, если нужно подвинуть стол. Стол 11 отсутствует.
// Все столы умещаются в области PLAN_W×PLAN_H с полями по краям.
const LAYOUT = {
  5:  { x: 40,  y: 40 },   // верхний ряд (слева направо: 5 4 3 2 1)
  4:  { x: 170, y: 40 },
  3:  { x: 300, y: 40 },
  2:  { x: 430, y: 40 },
  1:  { x: 560, y: 40 },
  6:  { x: 120, y: 200 },  // середина слева
  9:  { x: 560, y: 200 },  // правый столбец (квадратные)
  7:  { x: 300, y: 360 },  // нижний ряд
  8:  { x: 430, y: 360 },
  10: { x: 560, y: 360 },
}

export default function FloorPlan({ isAdmin }) {
  const [date, setDate] = useState(today())
  const [activeTable, setActiveTable] = useState(null)
  const [detailBooking, setDetailBooking] = useState(null)
  const [view, setView] = useState('plan') // 'plan' | 'list'

  const {
    tables, bookings, loading, realtimeStatus,
    addBooking, updateBooking, deleteBooking, setBookingStatus, refetchBookings,
  } = useBookings(date)

  // Для раздела «Список броней» — все предстоящие брони (любые даты).
  const { bookings: allBookings, refetch: refetchAll } = useAllBookings(view === 'list')

  // Смена статуса + немедленное обновление обоих списков (не ждём realtime,
  // иначе при «приостановленных обновлениях» нажатие выглядит как «не работает»).
  const handleSetStatus = async (id, status, reason) => {
    const res = await setBookingStatus(id, status, reason)
    if (!res?.error) { refetchBookings(); refetchAll() }
    return res
  }

  // Масштабируем фиксированную схему зала под ширину экрана (важно на телефоне).
  const scrollRef = useRef(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Вписываем всю схему по ширине контейнера — так зал виден целиком,
    // без обрезания справа и без гигантских столов на телефоне.
    const update = () => setScale(Math.min(1, el.clientWidth / PLAN_W))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
    // tables.length важен: схема монтируется только когда столы загрузились,
    // и ref появляется именно тогда — иначе масштаб остаётся 1 (столы гигантские).
  }, [view, loading, tables.length])

  const rt = {
    live: { cls: 'live', text: 'Обновления в реальном времени' },
    connecting: { cls: 'connecting', text: 'Подключение…' },
    offline: { cls: 'offline', text: 'Нет связи — обновления приостановлены' },
  }[realtimeStatus] || { cls: 'connecting', text: 'Подключение…' }

  const bookingsFor = (tableId) =>
    bookings.filter((b) => b.table_id === tableId)

  // Для раскраски/счётчика на столе учитываем только активные брони
  // (отменённые освобождают стол).
  const activeCountFor = (tableId) =>
    bookings.filter((b) => b.table_id === tableId && isActiveBooking(b)).length

  // Сводка по выбранному дню: сколько активных броней и сколько гостей всего.
  const activeToday = bookings.filter(isActiveBooking)
  const guestsToday = activeToday.reduce((sum, b) => sum + (b.guests_count || 0), 0)

  // Показываем только столы, для которых задана позиция в раскладке (11 убран).
  const placedTables = tables.filter((t) => LAYOUT[t.number])

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

      {view === 'plan' && tables.length > 0 && (
        <div className="day-summary">
          {activeToday.length > 0
            ? `Броней: ${activeToday.length} · гостей: ${guestsToday}`
            : 'На этот день броней нет'}
        </div>
      )}

      {tables.length === 0 ? (
        <div className="floor-loading">Загрузка зала…</div>
      ) : view === 'plan' ? (
        <div className="floor-scroll" ref={scrollRef}>
          <div
            className="floor-scaler"
            style={{ width: PLAN_W * scale, height: PLAN_H * scale }}
          >
            <div
              className="floor-plan"
              style={{
                width: PLAN_W,
                height: PLAN_H,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              {placedTables.map((t) => (
                <TableShape
                  key={t.id}
                  table={t}
                  x={LAYOUT[t.number].x}
                  y={LAYOUT[t.number].y}
                  bookingsCount={activeCountFor(t.id)}
                  onClick={setActiveTable}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <BookingsList
          bookings={allBookings}
          tables={tables}
          onSelect={(booking) => setDetailBooking(booking)}
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
          onSetStatus={handleSetStatus}
        />
      )}

      {detailBooking && (
        <BookingDetails
          // Берём самую свежую версию из списка (статус мог измениться),
          // с откатом на исходный снимок, если бронь пропала из выборки.
          booking={allBookings.find((b) => b.id === detailBooking.id) || detailBooking}
          tableNumber={tables.find((t) => t.id === detailBooking.table_id)?.number ?? '—'}
          isAdmin={isAdmin}
          onClose={() => setDetailBooking(null)}
          onSetStatus={handleSetStatus}
          onDelete={deleteBooking}
        />
      )}
    </div>
  )
}
