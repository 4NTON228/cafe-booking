// Переключение даты: стрелки назад/вперёд + поле выбора.
export default function DatePicker({ date, onChange }) {
  const shift = (days) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    onChange(d.toISOString().slice(0, 10))
  }

  const label = new Date(date).toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="date-picker">
      <button className="date-arrow" onClick={() => shift(-1)}>‹</button>
      <div className="date-center">
        <span className="date-label">{label}</span>
        <input
          className="date-input"
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <button className="date-arrow" onClick={() => shift(1)}>›</button>
    </div>
  )
}
