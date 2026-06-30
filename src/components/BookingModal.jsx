import { useState } from 'react'
import { endTime, formatCreated } from '../lib/time'
import { useDismissable } from '../hooks/useDismissable'
import { STATUS, statusOf } from '../lib/status'
import PhoneLink from './PhoneLink'

// Варианты длительности брони (в минутах)
const DURATIONS = [
  { label: '30 мин', value: 30 },
  { label: '1 час', value: 60 },
  { label: '1,5 часа', value: 90 },
  { label: '2 часа', value: 120 },
  { label: '3 часа', value: 180 },
  { label: '4 часа', value: 240 },
]

// Клиентская валидация — для быстрого отклика.
// Настоящая защита в БД (CHECK + exclusion constraint), это лишь UX.
function validate(form) {
  if (!form.guest_name.trim()) return 'Укажите имя гостя'
  if (Number(form.guests_count) < 1) return 'Гостей должно быть больше нуля'
  if (form.phone && !/^\+?[0-9 ()\-]{6,20}$/.test(form.phone))
    return 'Проверьте формат телефона'
  if (!form.start_time) return 'Укажите время'
  if (form.has_preorder && !form.preorder_text.trim())
    return 'Опишите предзаказ или снимите галочку'
  return null
}

export default function BookingModal({
  table, date, isAdmin, bookings, onClose, onAdd, onUpdate, onDelete, onSetStatus,
}) {
  const empty = {
    guest_name: '', phone: '', guests_count: 2,
    start_time: '18:00', duration_min: 120,
    has_preorder: false, preorder_text: '', comment: '',
  }
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Закрытие по Esc + блокировка прокрутки фона под окном.
  useDismissable(onClose)

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  // Гостей больше вместимости стола — не блокируем (можно подставить стул),
  // но показываем предупреждение.
  const overCapacity = Number(form.guests_count) > table.capacity

  const changeStatus = async (id, status) => {
    setBusy(true); setError('')
    const res = await onSetStatus?.(id, status)
    setBusy(false)
    if (res?.error) setError('Не удалось изменить статус брони')
  }

  const handleSave = async () => {
    const validationError = validate(form)
    if (validationError) { setError(validationError); return }

    setError('')
    setBusy(true)

    // created_by НЕ передаём — БД проставит сама.
    const payload = {
      guest_name: form.guest_name.trim(),
      phone: form.phone.trim() || null,
      guests_count: Number(form.guests_count),
      start_time: form.start_time,
      duration_min: Number(form.duration_min),
      has_preorder: form.has_preorder,
      preorder_text: form.has_preorder ? form.preorder_text.trim() : null,
      comment: form.comment.trim() || null,
    }

    let result
    if (editingId) {
      result = await onUpdate(editingId, payload)
    } else {
      result = await onAdd({
        ...payload,
        table_id: table.id,
        booking_date: date,
      })
    }

    setBusy(false)

    if (result.error) {
      const msg = result.error.message || ''
      // exclusion constraint при пересечении возвращает код 23P01
      if (result.error.code === '23P01' || msg.includes('no_overlap')) {
        setError('Этот стол уже занят на выбранное время')
      } else if (msg.includes('phone')) {
        setError('Неверный формат телефона')
      } else if (msg.includes('guests_count')) {
        setError('Некорректное количество гостей')
      } else if (msg.includes('другой стол')) {
        setError('Перенос на другой стол недоступен — создайте новую бронь')
      } else {
        setError('Не удалось сохранить бронь')
      }
      return
    }

    setForm(empty)
    setEditingId(null)
  }

  const startEdit = (b) => {
    setEditingId(b.id)
    setError('')
    setForm({
      guest_name: b.guest_name,
      phone: b.phone || '',
      guests_count: b.guests_count,
      start_time: b.start_time.slice(0, 5),
      duration_min: b.duration_min,
      has_preorder: b.has_preorder || false,
      preorder_text: b.preorder_text || '',
      comment: b.comment || '',
    })
  }

  const handleDelete = async (id) => {
    setBusy(true)
    const result = await onDelete(id)
    setBusy(false)
    if (result.error) {
      setError('Удалять брони может только администратор')
      return
    }
    if (editingId === id) { setEditingId(null); setForm(empty) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Стол №{table.number}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p className="modal-sub">до {table.capacity} чел.</p>

        <div className="booking-list">
          {bookings.length === 0 && (
            <div className="booking-empty">На этот день броней нет</div>
          )}
          {bookings.map((b) => {
            const st = statusOf(b)
            return (
            <div key={b.id} className={`booking-row ${st === 'cancelled' ? 'is-cancelled' : ''}`}>
              <div className="booking-info">
                <span className="booking-time">
                  {b.start_time.slice(0, 5)}–{endTime(b.start_time, b.duration_min)}
                  <span className={`status-chip ${STATUS[st].cls}`}>{STATUS[st].label}</span>
                </span>
                <span className="booking-name">{b.guest_name}</span>
                <span className="booking-meta">
                  {b.guests_count} чел.
                  {b.phone && <> · <PhoneLink phone={b.phone} /></>}
                </span>
                {b.has_preorder && (
                  <span className="booking-preorder">
                    Предзаказ: {b.preorder_text}
                  </span>
                )}
                {b.comment && <span className="booking-comment">{b.comment}</span>}
                <span className="booking-author">
                  Забронировал
                  {b.creator?.full_name ? `: ${b.creator.full_name}` : ': —'}
                  {b.created_at ? ` · ${formatCreated(b.created_at)}` : ''}
                </span>

                <div className="status-actions">
                  {st !== 'arrived' && (
                    <button className="btn-ghost sm" disabled={busy} onClick={() => changeStatus(b.id, 'arrived')}>Пришли</button>
                  )}
                  {st !== 'no_show' && (
                    <button className="btn-ghost sm" disabled={busy} onClick={() => changeStatus(b.id, 'no_show')}>Не пришли</button>
                  )}
                  {st === 'cancelled' ? (
                    <button className="btn-ghost sm" disabled={busy} onClick={() => changeStatus(b.id, 'booked')}>Вернуть</button>
                  ) : (
                    <button className="btn-ghost sm danger" disabled={busy} onClick={() => changeStatus(b.id, 'cancelled')}>Отменить</button>
                  )}
                </div>
              </div>
              <div className="booking-actions">
                <button className="btn-ghost sm" onClick={() => startEdit(b)}>Изменить</button>
                {isAdmin && (
                  <button className="btn-ghost sm danger" onClick={() => handleDelete(b.id)}>Удалить</button>
                )}
              </div>
            </div>
            )
          })}
        </div>

        <div className="booking-form">
          <h3>{editingId ? 'Изменить бронь' : 'Новая бронь'}</h3>

          <label className="field-label">Имя гостя</label>
          <input className="field" value={form.guest_name}
            onChange={(e) => set('guest_name', e.target.value)} />

          <div className="field-row">
            <div>
              <label className="field-label">Время начала</label>
              <input className="field" type="time" value={form.start_time}
                onChange={(e) => set('start_time', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Длительность</label>
              <select className="field" value={form.duration_min}
                onChange={(e) => set('duration_min', e.target.value)}>
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div>
              <label className="field-label">Гостей</label>
              <input className="field" type="number" min="1" value={form.guests_count}
                onChange={(e) => set('guests_count', e.target.value)} />
              {overCapacity && (
                <span className="field-warn">Стол на {table.capacity} чел.</span>
              )}
            </div>
            <div>
              <label className="field-label">Телефон</label>
              <input className="field" value={form.phone}
                onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>

          <label className="checkbox-row">
            <input type="checkbox" checked={form.has_preorder}
              onChange={(e) => set('has_preorder', e.target.checked)} />
            <span>Есть предзаказ</span>
          </label>

          {form.has_preorder && (
            <>
              <label className="field-label">Что заказали заранее</label>
              <textarea className="field" rows="2" value={form.preorder_text}
                onChange={(e) => set('preorder_text', e.target.value)}
                placeholder="Напр.: 2 стейка, бутылка вина к 19:00" />
            </>
          )}

          <label className="field-label">Комментарий</label>
          <textarea className="field" rows="2" value={form.comment}
            onChange={(e) => set('comment', e.target.value)} />

          {error && <div className="error-text">{error}</div>}

          <div className="form-buttons">
            {editingId && (
              <button className="btn-ghost" onClick={() => { setEditingId(null); setForm(empty); setError('') }}>
                Отмена
              </button>
            )}
            <button className="btn-primary" onClick={handleSave} disabled={busy}>
              {busy ? 'Сохранение…' : editingId ? 'Сохранить' : 'Добавить бронь'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
