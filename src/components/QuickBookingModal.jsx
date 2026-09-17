import { useState } from 'react'
import { isActiveBooking } from '../lib/status'

// Быстрая бронь «как в блокноте»: имя, время, гостей, стол — и всё.
// Длительность по умолчанию 2 часа; телефон/комментарий — под «Ещё».
const DEFAULT_DUR = 120

const toMin = (t) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

export default function QuickBookingModal({ date, tables, bookings, onClose, onAdd }) {
  const [form, setForm] = useState({
    guest_name: '', start_time: '18:00', guests_count: 2,
    table_id: '', phone: '', comment: '',
  })
  const [showMore, setShowMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Занят ли стол в выбранное время (для пометки «занят» в списке).
  const s = toMin(form.start_time)
  const e = s + DEFAULT_DUR
  const isBusy = (tid) => bookings.some((b) =>
    b.table_id === tid && isActiveBooking(b) &&
    s < toMin(b.start_time) + Number(b.duration_min || 0) && toMin(b.start_time) < e)

  const save = async () => {
    if (!form.guest_name.trim()) { setError('Укажите имя гостя'); return }
    if (!form.table_id) { setError('Выберите стол'); return }
    if (Number(form.guests_count) < 1) { setError('Гостей должно быть больше нуля'); return }
    setBusy(true); setError('')
    const res = await onAdd({
      guest_name: form.guest_name.trim(),
      phone: form.phone.trim() || null,
      guests_count: Number(form.guests_count),
      start_time: form.start_time,
      duration_min: DEFAULT_DUR,
      has_preorder: false,
      preorder_text: null,
      comment: form.comment.trim() || null,
      tags: [],
      table_id: Number(form.table_id),
      booking_date: date,
    })
    setBusy(false)
    if (res?.error) {
      const msg = res.error.message || ''
      if (res.error.code === '23P01' || res.error.code === 'local_overlap' || msg.includes('no_overlap'))
        setError('Этот стол уже занят на это время — выберите другой стол или время')
      else setError('Не удалось сохранить бронь')
      return
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()}>
        <div className="modal-head">
          <h2>Записать бронь</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="booking-form">
          <label className="field-label">Имя гостя</label>
          <input className="field" autoFocus value={form.guest_name}
            onChange={(ev) => set('guest_name', ev.target.value)} placeholder="Напр.: Ольга" />

          <div className="field-row">
            <div>
              <label className="field-label">Время</label>
              <input className="field" type="time" value={form.start_time}
                onChange={(ev) => set('start_time', ev.target.value)} />
            </div>
            <div>
              <label className="field-label">Гостей</label>
              <input className="field" type="number" min="1" value={form.guests_count}
                onChange={(ev) => set('guests_count', ev.target.value)} />
            </div>
          </div>

          <label className="field-label">Стол</label>
          <select className="field" value={form.table_id}
            onChange={(ev) => set('table_id', ev.target.value)}>
            <option value="">— выберите стол —</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id} disabled={isBusy(t.id)}>
                Стол №{t.number} · до {t.capacity} чел.{isBusy(t.id) ? ' (занят)' : ''}
              </option>
            ))}
          </select>

          <button type="button" className="link-btn more-toggle" onClick={() => setShowMore((v) => !v)}>
            {showMore ? 'Скрыть' : 'Ещё'} — телефон, комментарий
          </button>

          {showMore && (
            <div className="more-fields">
              <label className="field-label">Телефон</label>
              <input className="field" value={form.phone}
                onChange={(ev) => set('phone', ev.target.value)} />
              <label className="field-label">Комментарий</label>
              <textarea className="field" rows="2" value={form.comment}
                onChange={(ev) => set('comment', ev.target.value)} />
            </div>
          )}

          {error && <div className="error-text">{error}</div>}

          <div className="form-buttons">
            <button className="btn-primary" onClick={save} disabled={busy}>
              {busy ? 'Сохранение…' : 'Записать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
