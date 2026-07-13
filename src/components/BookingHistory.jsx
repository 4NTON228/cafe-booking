import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatCreated } from '../lib/time'

// Журнал брони: кто создал/изменил/удалил и когда. Данные — из RPC booking_history
// (только действие + имя + время, без снимка). Раскрывается по кнопке.
const ACTION = { INSERT: 'Создал', UPDATE: 'Изменил', DELETE: 'Удалил' }

export default function BookingHistory({ bookingId }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(null)

  const toggle = async () => {
    if (!open && rows === null) {
      const { data } = await supabase.rpc('booking_history', { p_booking_id: bookingId })
      setRows(data || [])
    }
    setOpen((o) => !o)
  }

  return (
    <div className="history">
      <button type="button" className="link-btn inline" onClick={toggle}>
        {open ? 'Скрыть историю' : 'История'}
      </button>
      {open && (
        <div className="history-list">
          {rows === null
            ? <span className="booking-meta">Загрузка…</span>
            : rows.length === 0
              ? <span className="booking-meta">Нет записей</span>
              : rows.map((r, i) => (
                  <div key={i} className="history-row">
                    <b>{ACTION[r.action] || r.action}</b>: {r.actor_name}
                    <span className="history-at"> · {formatCreated(r.at)}</span>
                  </div>
                ))}
        </div>
      )}
    </div>
  )
}
