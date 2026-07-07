import { useEffect, useState } from 'react'
import { useOnline } from '../hooks/useOnline'
import {
  subscribePending, pendingCount, getRejected, clearRejected, syncPending,
} from '../lib/pendingBookings'

// Полоска состояния сети/синхронизации + уведомление об отклонённых
// офлайн-бронях. Здесь же запускается фоновая отправка очереди.
export default function OfflineBar() {
  const online = useOnline()
  const [count, setCount] = useState(pendingCount())
  const [rejected, setRejected] = useState(getRejected())

  useEffect(() =>
    subscribePending(() => { setCount(pendingCount()); setRejected(getRejected()) }), [])

  // Синхронизация при возврате сети и периодически, пока очередь не пуста.
  useEffect(() => {
    if (online) syncPending()
    const id = setInterval(() => { if (navigator.onLine) syncPending() }, 15000)
    return () => clearInterval(id)
  }, [online])

  if (!online) {
    return (
      <div className="offline-bar offline">
        <span className="offline-dot" /> Офлайн{count > 0 ? ` · ${count} броней ждут отправки` : ' · только просмотр и новые брони'}
      </div>
    )
  }
  if (count > 0) {
    return <div className="offline-bar syncing"><span className="offline-dot" /> Синхронизация… ({count})</div>
  }
  if (rejected.length > 0) {
    return (
      <div className="offline-bar rejected">
        {rejected.length === 1
          ? `Бронь «${rejected[0].guest || 'без имени'}» не сохранилась: ${rejected[0].reason}`
          : `${rejected.length} офлайн-броней не сохранились — столы уже заняли`}
        <button className="offline-dismiss" onClick={() => { clearRejected(); setRejected([]) }}>×</button>
      </div>
    )
  }
  return null
}
