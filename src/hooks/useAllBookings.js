import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { subscribePending, pendingRowsUpcoming } from '../lib/pendingBookings'

// Все активные брони начиная с сегодняшнего дня (для раздела «Список броней»).
// Не привязано к выбранной дате — показываем все предстоящие даты сразу.
// Включает офлайн-очередь (брони, ещё не отправленные на сервер).
export function useAllBookings(enabled) {
  const [serverBookings, setServerBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingTick, setPendingTick] = useState(0)
  const fetchRef = useRef(() => {})

  useEffect(() => {
    if (!enabled) return
    let active = true
    const today = new Date().toISOString().slice(0, 10)

    const fetchAll = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*, creator:profiles!bookings_created_by_fkey(full_name)')
          .is('deleted_at', null)
          .gte('booking_date', today)
          .order('booking_date')
          .order('start_time')
        if (active && !error && data) setServerBookings(data)
      } catch { /* офлайн — оставляем кэш */ }
      if (active) setLoading(false)
    }
    fetchRef.current = fetchAll
    fetchAll()

    const unsub = subscribePending(() => { setPendingTick((t) => t + 1); fetchAll() })

    const channel = supabase
      .channel('all-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchAll())
      .subscribe()

    return () => {
      active = false
      unsub()
      supabase.removeChannel(channel)
    }
  }, [enabled])

  const today = new Date().toISOString().slice(0, 10)
  const bookings = useMemo(() => {
    const ids = new Set(serverBookings.map((b) => b.client_id).filter(Boolean))
    const extra = pendingRowsUpcoming(today).filter((p) => !ids.has(p.client_id))
    return [...serverBookings, ...extra].sort((a, b) =>
      a.booking_date === b.booking_date
        ? (a.start_time < b.start_time ? -1 : 1)
        : (a.booking_date < b.booking_date ? -1 : 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverBookings, pendingTick])

  const refetch = () => fetchRef.current()

  return { bookings, loading, refetch }
}
