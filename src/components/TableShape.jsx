// Один стол на схеме зала. Позиция (x, y) задаётся раскладкой зала.
// Цвет зависит от занятости.
export default function TableShape({ table, x, y, bookingsCount, onClick }) {
  const isBooked = bookingsCount > 0

  return (
    <button
      className={`table-shape ${table.shape} ${isBooked ? 'booked' : 'free'}`}
      style={{ left: x, top: y }}
      onClick={() => onClick(table)}
      title={`Стол №${table.number} · до ${table.capacity} чел.`}
    >
      <span className="table-number">{table.number}</span>
      <span className="table-cap">{table.capacity} чел.</span>
      {isBooked && <span className="table-badge">{bookingsCount}</span>}
    </button>
  )
}
