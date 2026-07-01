import { useState } from 'react'
import { statusOf, QUICK_WORDS } from '../lib/status'

// Заголовки поля причины/комментария по статусу.
const REASON_LABEL = {
  no_show:   'Причина: гость не пришёл',
  cancelled: 'Причина отмены',
  left:      'Комментарий (как всё прошло)',
}

// Кнопки смены статуса брони. Для «Не пришли», «Отменить» и «Гость ушёл»
// сначала спрашиваем причину/комментарий (доступно офикам и админам).
// «Гость ушёл» освобождает стол. Быстрые слова подставляются в текст.
// onChange(status, reason) — reason=null для активных статусов.
export default function StatusControls({ booking, busy, onChange }) {
  const st = statusOf(booking)
  const [pending, setPending] = useState(null) // 'no_show' | 'cancelled' | 'left' | null
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

  const addWord = (word) =>
    setReason((r) => (r.trim() ? `${r.trim()}, ${word}` : word))

  if (pending) {
    const words = QUICK_WORDS[pending] || []
    return (
      <div className="reason-box">
        <label className="field-label">{REASON_LABEL[pending]}</label>
        {words.length > 0 && (
          <div className="quick-words">
            {words.map((w) => (
              <button key={w} type="button" className="quick-word" onClick={() => addWord(w)}>
                {w}
              </button>
            ))}
          </div>
        )}
        <textarea
          className="field"
          rows="2"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Можно выбрать слова выше или написать своё"
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
      {(st === 'booked' || st === 'no_show') && (
        <button className="btn-ghost sm" disabled={busy} onClick={() => onChange('arrived', null)}>Пришли</button>
      )}
      {(st === 'booked' || st === 'arrived') && (
        <button className="btn-ghost sm" disabled={busy} onClick={() => start('no_show')}>Не пришли</button>
      )}
      {(st === 'booked' || st === 'arrived') && (
        <button className="btn-ghost sm accent" disabled={busy} onClick={() => start('left')}>Гость ушёл</button>
      )}
      {(st === 'cancelled' || st === 'left') ? (
        <button className="btn-ghost sm" disabled={busy} onClick={() => onChange('booked', null)}>Вернуть</button>
      ) : (
        <button className="btn-ghost sm danger" disabled={busy} onClick={() => start('cancelled')}>Отменить</button>
      )}
    </div>
  )
}
