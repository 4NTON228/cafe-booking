import { useState } from 'react'
import { endTime, formatCreated } from '../lib/time'
import { useDismissable } from '../hooks/useDismissable'
import { STATUS, statusOf } from '../lib/status'
import PhoneLink from './PhoneLink'

// Окно просмотра одной брони (открывается из «Списка броней»).
// Только данные брони + управление статусом — БЕЗ формы создания новой брони.
// Создавать брони можно только из схемы зала (клик по столу).
export default function BookingDetails({
  booking, tableNumber, isAdmin, onClose, onSetStatus, onDelete,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const st = statusOf(booking)

  useDismissable(onClose)

  const changeStatus = async (status) => {
    setBusy(true); setError('')
    const res = await onSetStatus(booking.id, status)
    setBusy(false)
    if (res?.error) setError('Не удалось изменить статус')
  }

  const handleDelete = async () => {
    setBusy(true); setError('')
    const res = await onDelete(booking.id)
    setBusy(false)
    if (res?.error) { setError('Удалять брони может только администратор'); return }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Стол №{tableNumber}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p className="modal-sub">Бронь · просмотр</p>

        <div className="booking-row" style={{ marginBottom: 0 }}>
          <div className="booking-info">
            <span className="booking-time">
              {booking.start_time.slice(0, 5)}–{endTime(booking.start_time, booking.duration_min)}
              <span className={`status-chip ${STATUS[st].cls}`}>{STATUS[st].label}</span>
            </span>
            <span className="booking-name">{booking.guest_name}</span>
            <span className="booking-meta">
              {booking.guests_count} чел.
              {booking.phone && <> · <PhoneLink phone={booking.phone} /></>}
            </span>
            {booking.has_preorder && (
              <span className="booking-preorder">Предзаказ: {booking.preorder_text}</span>
            )}
            {booking.comment && <span className="booking-comment">{booking.comment}</span>}
            <span className="booking-author">
              Забронировал
              {booking.creator?.full_name ? `: ${booking.creator.full_name}` : ': —'}
              {booking.created_at ? ` · ${formatCreated(booking.created_at)}` : ''}
            </span>
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="details-actions">
          {st !== 'arrived' && (
            <button className="btn-ghost sm" disabled={busy} onClick={() => changeStatus('arrived')}>Пришли</button>
          )}
          {st !== 'no_show' && (
            <button className="btn-ghost sm" disabled={busy} onClick={() => changeStatus('no_show')}>Не пришли</button>
          )}
          {st === 'cancelled' ? (
            <button className="btn-ghost sm" disabled={busy} onClick={() => changeStatus('booked')}>Вернуть</button>
          ) : (
            <button className="btn-ghost sm danger" disabled={busy} onClick={() => changeStatus('cancelled')}>Отменить</button>
          )}
          {isAdmin && (
            <button className="btn-ghost sm danger" disabled={busy} onClick={handleDelete}>Удалить</button>
          )}
        </div>
      </div>
    </div>
  )
}
