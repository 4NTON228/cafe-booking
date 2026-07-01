import { useState } from 'react'
import { statusOf } from '../lib/status'

// Кнопки смены статуса брони. Для «Не пришли» и «Отменить» сначала
// спрашиваем причину (доступно офикам и админам), затем сохраняем.
// onChange(status, reason) — reason=null для активных статусов.
export default function StatusControls({ booking, busy, onChange }) {
  const st = statusOf(booking)
  const [pending, setPending] = useState(null) // 'no_show' | 'cancelled' | null
  const [reason, setReason] = useState('')

  const start = (status) => {
    setPending(status)
    setReason(booking.status_reason || '')
  }
  const confirm = () => {
    onChange(pending, reason.trim() || null)
    setPending(null)
    setReason('')
  }
  const cancel = () => { setPending(null); setReason('') }

  if (pending) {
    return (
      <div className="reason-box">
        <label className="field-label">
          {pending === 'no_show' ? 'Причина: гость не пришёл' : 'Причина отмены'}
        </label>
        <textarea
          className="field"
          rows="2"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Напр.: не дозвонились, отменил по телефону"
          autoFocus
        />
        <div className="reason-actions">
          <button className="btn-ghost sm" onClick={cancel}>Отмена</button>
          <button className="btn-primary sm" disabled={busy} onClick={confirm}>Подтвердить</button>
        </div>
      </div>
    )
  }

  return (
    <div className="status-actions">
      {st !== 'arrived' && (
        <button className="btn-ghost sm" disabled={busy} onClick={() => onChange('arrived', null)}>Пришли</button>
      )}
      {st !== 'no_show' && (
        <button className="btn-ghost sm" disabled={busy} onClick={() => start('no_show')}>Не пришли</button>
      )}
      {st === 'cancelled' ? (
        <button className="btn-ghost sm" disabled={busy} onClick={() => onChange('booked', null)}>Вернуть</button>
      ) : (
        <button className="btn-ghost sm danger" disabled={busy} onClick={() => start('cancelled')}>Отменить</button>
      )}
    </div>
  )
}
