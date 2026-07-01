import { useState } from 'react'
import { endTime, formatCreated } from '../lib/time'
import { useDismissable } from '../hooks/useDismissable'
import { STATUS, statusOf, reasonPrefix } from '../lib/status'
import PhoneLink from './PhoneLink'
import StatusControls from './StatusControls'

// Длительность брони в минутах из времени начала и конца.
// Если конец раньше или равен началу — считаем, что бронь через полночь.
function durationFromTimes(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let diff = (eh * 60 + em) - (sh * 60 + sm)
  if (diff <= 0) diff += 1440
  return diff
}

// Клиентская валидация — для быстрого отклика.
// Настоящая защита в БД (CHECK + exclusion constraint), это лишь UX.
function validate(form) {
  if (!form.guest_name.trim()) return 'Укажите имя гостя'
  if (Number(form.guests_count) < 1) return 'Гостей должно быть больше нуля'
  if (form.phone && !/^\+?[0-9 ()\-]{6,20}$/.test(form.phone))
    return 'Проверьте формат телефона'
  if (!form.start_time || !form.end_time) return 'Укажите время начала и конца'
  const dur = durationFromTimes(form.start_time, form.end_time)
  if (dur < 30) return 'Бронь не короче 30 минут'
  if (dur > 360) return 'Бронь не длиннее 6 часов'
  if (form.has_preorder && !form.preorder_text.trim())
    return 'Опишите предзаказ или снимите галочку'
  return null
}

export default function BookingModal({
  table, date, isAdmin, bookings, tables = [], group = null, partyTablesById = {},
  onClose, onAdd, onUpdate, onDelete, onSetStatus,
}) {
  const empty = {
    guest_name: '', phone: '', guests_count: 2,
    start_time: '18:00', end_time: '20:00',
    has_preorder: false, preorder_text: '', comment: '',
    table_id: table.id,
  }
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null) // редактируемая бронь или null
  const [bookWholeGroup, setBookWholeGroup] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const editingId = editing?.id

  // Закрытие по Esc + блокировка прокрутки фона под окном.
  useDismissable(onClose)

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  // Стол входит в составную группу (2+ стола) — можно бронировать всю группу.
  const groupTables = group?.tables?.length > 1 ? group.tables : null
  const groupCapacity = groupTables
    ? groupTables.reduce((s, t) => s + (t.capacity || 0), 0) : 0

  // Гостей больше вместимости стола — не блокируем (можно подставить стул),
  // но показываем предупреждение. Для брони на всю группу сравниваем с суммой.
  const capLimit = !editingId && bookWholeGroup && groupTables ? groupCapacity : table.capacity
  const overCapacity = Number(form.guests_count) > capLimit

  const changeStatus = async (booking, status, reason) => {
    setBusy(true); setError('')
    const res = await onSetStatus?.(booking, status, reason)
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
      duration_min: durationFromTimes(form.start_time, form.end_time),
      has_preorder: form.has_preorder,
      preorder_text: form.has_preorder ? form.preorder_text.trim() : null,
      comment: form.comment.trim() || null,
    }

    let result
    if (editingId) {
      // table_id включаем, чтобы админ мог перенести бронь на другой стол
      // (для офиков БД-триггер запретит смену стола).
      result = await onUpdate(editing, { ...payload, table_id: Number(form.table_id) })
    } else if (bookWholeGroup && groupTables) {
      // Бронь на всю группу: по строке на каждый стол с общим party_id.
      // Вставка массива атомарна — если любой стол занят, откатится вся бронь.
      const partyId = crypto.randomUUID()
      result = await onAdd(groupTables.map((t) => ({
        ...payload, table_id: t.id, booking_date: date, party_id: partyId,
      })))
    } else {
      result = await onAdd({ ...payload, table_id: table.id, booking_date: date })
    }

    setBusy(false)

    if (result.error) {
      const msg = result.error.message || ''
      // exclusion constraint при пересечении возвращает код 23P01
      if (result.error.code === '23P01' || msg.includes('no_overlap')) {
        setError(bookWholeGroup ? 'Один из столов группы уже занят на это время' : 'Этот стол уже занят на выбранное время')
      } else if (msg.includes('phone')) {
        setError('Неверный формат телефона')
      } else if (msg.includes('guests_count')) {
        setError('Некорректное количество гостей')
      } else if (msg.includes('другой стол')) {
        setError('Переносить бронь на другой стол может только администратор')
      } else if (msg.includes('другую дату')) {
        setError('Перенос на другую дату недоступен — создайте новую бронь')
      } else {
        setError('Не удалось сохранить бронь')
      }
      return
    }

    setForm(empty)
    setEditing(null)
    setBookWholeGroup(false)
  }

  const startEdit = (b) => {
    setEditing(b)
    setError('')
    setForm({
      guest_name: b.guest_name,
      phone: b.phone || '',
      guests_count: b.guests_count,
      start_time: b.start_time.slice(0, 5),
      end_time: endTime(b.start_time, b.duration_min),
      has_preorder: b.has_preorder || false,
      preorder_text: b.preorder_text || '',
      comment: b.comment || '',
      table_id: b.table_id,
    })
  }

  const handleDelete = async (b) => {
    setBusy(true)
    const result = await onDelete(b)
    setBusy(false)
    if (result.error) {
      setError('Удалять брони может только администратор')
      return
    }
    if (editingId === b.id) { setEditing(null); setForm(empty) }
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
                {b.party_id && partyTablesById[b.party_id]?.length > 1 && (
                  <span className="booking-group">Столы {partyTablesById[b.party_id].join(', ')}</span>
                )}
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
                {b.status_reason && (
                  <span className="booking-reason">{reasonPrefix(b)}: {b.status_reason}</span>
                )}
                <span className="booking-author">
                  Забронировал
                  {b.creator?.full_name ? `: ${b.creator.full_name}` : ': —'}
                  {b.created_at ? ` · ${formatCreated(b.created_at)}` : ''}
                </span>

                <StatusControls
                  booking={b}
                  busy={busy}
                  onChange={(status, reason) => changeStatus(b, status, reason)}
                />
              </div>
              <div className="booking-actions">
                <button className="btn-ghost sm" onClick={() => startEdit(b)}>Изменить</button>
                {isAdmin && (
                  <button className="btn-ghost sm danger" onClick={() => handleDelete(b)}>Удалить</button>
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
              <label className="field-label">Время конца</label>
              <input className="field" type="time" value={form.end_time}
                onChange={(e) => set('end_time', e.target.value)} />
            </div>
          </div>

          {editingId && isAdmin && !editing?.party_id && tables.length > 0 && (
            <>
              <label className="field-label">Перенести на стол</label>
              <select className="field" value={form.table_id}
                onChange={(e) => set('table_id', e.target.value)}>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Стол №{t.number} (до {t.capacity} чел.)
                  </option>
                ))}
              </select>
            </>
          )}

          {!editingId && groupTables && (
            <label className="checkbox-row">
              <input type="checkbox" checked={bookWholeGroup}
                onChange={(e) => setBookWholeGroup(e.target.checked)} />
              <span>
                Забронировать всю группу: столы {groupTables.map((t) => t.number).join('+')}
                {' '}(до {groupCapacity} чел.)
              </span>
            </label>
          )}

          <div className="field-row">
            <div>
              <label className="field-label">Гостей</label>
              <input className="field" type="number" min="1" value={form.guests_count}
                onChange={(e) => set('guests_count', e.target.value)} />
              {overCapacity && (
                <span className="field-warn">
                  {bookWholeGroup && groupTables ? `Группа на ${groupCapacity} чел.` : `Стол на ${table.capacity} чел.`}
                </span>
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
              <button className="btn-ghost" onClick={() => { setEditing(null); setForm(empty); setError('') }}>
                Отмена
              </button>
            )}
            <button className="btn-primary" onClick={handleSave} disabled={busy}>
              {busy ? 'Сохранение…'
                : editingId ? 'Сохранить'
                : (bookWholeGroup && groupTables) ? 'Забронировать группу'
                : 'Добавить бронь'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
