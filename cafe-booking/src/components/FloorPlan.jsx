import { useState } from 'react'
import { useBookings } from '../hooks/useBookings'
import TableShape from './TableShape'
import BookingModal from './BookingModal'
import DatePicker from './DatePicker'

const today = () => new Date().toISOString().slice(0, 10)

export default function FloorPlan({ isAdmin }) {
  const [date, setDate] = useState(today())
  const [activeTable, setActiveTable] = useState(null)

  const {
    tables, bookings, loading,
    addBooking, updateBooking, deleteBooking,
  } = useBookings(date)

  const bookingsFor = (tableId) =>
    bookings.filter((b) => b.table_id === tableId)

  return (
    <div className="floor-wrap">
      <DatePicker date={date} onChange={setDate} />

      <div className="legend">
        <span><i className="dot free" /> Свободно</span>
        <span><i className="dot booked" /> Забронировано</span>
      </div>

      {loading ? (
        <div className="floor-loading">Загрузка зала…</div>
      ) : (
        <div className="floor-plan">
          {tables.map((t) => (
            <TableShape
              key={t.id}
              table={t}
              bookingsCount={bookingsFor(t.id).length}
              onClick={setActiveTable}
            />
          ))}
        </div>
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
