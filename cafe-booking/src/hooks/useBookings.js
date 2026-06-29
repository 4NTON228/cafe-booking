import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// Хук данных: столы + активные брони на выбранную дату + realtime.
// К броням подтягиваем имя создавшего сотрудника (из profiles).
export function useBookings(date) {
  const [tables, setTables] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  // Столы грузим один раз
  useEffect(() => {
    supabase.from('tables').select('*').order('number')
      .then(({ data }) => setTables(data || []))
  }, [])

  useEffect(() => {
    let active = true

    const fetchBookings = async () => {
      setLoading(true)
      // join к profiles, чтобы показать имя сотрудника на брони.
      // Только активные брони (deleted_at is null).
      const { data } = await supabase
        .from('bookings')
        .select('*, creator:profiles!bookings_created_by_fkey(full_name)')
        .eq('booking_date', date)
        .is('deleted_at', null)
        .order('start_time')
      if (active) {
        setBookings(data || [])
        setLoading(false)
      }
    }
    fetchBookings()

    // Realtime: при любом изменении броней перезапрашиваем список.
    const channel = supabase
      .channel('bookings-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchBookings())
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [date])

  // created_by НЕ передаём — БД проставит сама (default auth.uid()).
  const addBooking = (booking) =>
    supabase.from('bookings').insert(booking)

  const updateBooking = (id, fields) =>
    supabase.from('bookings').update(fields).eq('id', id)

  // Soft delete: помечаем deleted_at (разрешено только админам — проверка в БД).
  const deleteBooking = (id) =>
    supabase.from('bookings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

  return { tables, bookings, loading, addBooking, updateBooking, deleteBooking }
}
