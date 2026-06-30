import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

// Все активные брони начиная с сегодняшнего дня (для раздела «Список броней»).
// Не привязано к выбранной дате — показываем все предстоящие даты сразу.
export function useAllBookings(enabled) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  // Держим актуальную функцию загрузки в ref, чтобы отдавать наружу стабильный
  // refetch (для немедленного обновления после смены статуса, не дожидаясь realtime).
  const fetchRef = useRef(() => {})

  useEffect(() => {
    if (!enabled) return
    let active = true
    const today = new Date().toISOString().slice(0, 10)

    const fetchAll = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, creator:profiles!bookings_created_by_fkey(full_name)')
        .is('deleted_at', null)
        .gte('booking_date', today)
        .order('booking_date')
        .order('start_time')
      if (active) {
        setBookings(data || [])
        setLoading(false)
      }
    }
    fetchRef.current = fetchAll
    fetchAll()

    const channel = supabase
      .channel('all-bookings')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchAll())
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [enabled])

  const refetch = () => fetchRef.current()

  return { bookings, loading, refetch }
}
