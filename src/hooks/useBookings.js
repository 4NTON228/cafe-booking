import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

// Хук данных: столы + активные брони на выбранную дату + realtime.
// К броням подтягиваем имя создавшего сотрудника (из profiles).
// realtimeStatus отражает состояние подключения, чтобы показать индикатор.
export function useBookings(date) {
  const [tables, setTables] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  // 'connecting' | 'live' | 'offline'
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')

  // Дату держим в ref, чтобы realtime-колбэк всегда брал актуальную,
  // не пересоздавая подписку при каждом переключении дня.
  const dateRef = useRef(date)
  dateRef.current = date

  // Столы грузим один раз и держим в realtime (админ может править схему).
  const fetchTables = () =>
    supabase.from('tables').select('*').order('number')
      .then(({ data }) => setTables(data || []))

  useEffect(() => { fetchTables() }, [])

  // Перезагрузка броней на выбранную дату при смене даты.
  useEffect(() => {
    let active = true
    const fetchBookings = async () => {
      setLoading(true)
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
    return () => { active = false }
  }, [date])

  // Перезапросить брони на текущую (по ref) дату — для realtime-колбэков.
  const refetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*, creator:profiles!bookings_created_by_fkey(full_name)')
      .eq('booking_date', dateRef.current)
      .is('deleted_at', null)
      .order('start_time')
    setBookings(data || [])
  }

  // Realtime: одна подписка на всё время жизни компонента.
  // При любом изменении броней/столов перезапрашиваем данные.
  useEffect(() => {
    const channel = supabase
      .channel('floor-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => refetchBookings())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => fetchTables())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('live')
          // После (пере)подключения добираем то, что могли пропустить.
          refetchBookings()
          fetchTables()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('offline')
        } else if (status === 'CLOSED') {
          setRealtimeStatus('connecting')
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  // created_by НЕ передаём — БД проставит сама (default auth.uid()).
  // booking может быть массивом (бронь на всю группу столов) — insert атомарен.
  const addBooking = (booking) =>
    supabase.from('bookings').insert(booking)

  // Операции применяем ко всей «большой брони» (по party_id), если она такая;
  // иначе — к одной брони по id.
  const scope = (query, booking) =>
    booking?.party_id ? query.eq('party_id', booking.party_id) : query.eq('id', booking.id)

  const updateBooking = (booking, fields) =>
    scope(supabase.from('bookings').update(fields), booking)

  // Soft delete: помечаем deleted_at (разрешено только админам — проверка в БД).
  const deleteBooking = (booking) =>
    scope(supabase.from('bookings').update({ deleted_at: new Date().toISOString() }), booking)

  // Смена статуса брони (пришли / не пришли / отменена / ушёл / ожидается).
  // Причину (status_reason) храним только для no_show/cancelled/left,
  // при возврате в активный статус — очищаем.
  const setBookingStatus = (booking, status, reason) => {
    const needsReason = status === 'no_show' || status === 'cancelled' || status === 'left'
    return scope(
      supabase.from('bookings').update({ status, status_reason: needsReason ? (reason ?? null) : null }),
      booking,
    )
  }

  return {
    tables, bookings, loading, realtimeStatus,
    addBooking, updateBooking, deleteBooking, setBookingStatus,
    refetchBookings,
  }
}
