import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { hasLocalOverlap } from '../lib/overlap'
import {
  subscribePending, enqueueBooking, pendingRowsForDate, syncPending,
} from '../lib/pendingBookings'

const SELECT = '*, creator:profiles!bookings_created_by_fkey(full_name)'

function isNetworkError(err) {
  return err && !err.code && /fetch|network|load failed|Failed/i.test(err.message || '')
}

// Серверные брони + офлайн-очередь. Дубли по client_id убираем (после
// синхронизации серверная строка вытесняет оптимистичную).
function merge(server, pending) {
  const ids = new Set(server.map((b) => b.client_id).filter(Boolean))
  const extra = pending.filter((p) => !ids.has(p.client_id))
  return [...server, ...extra].sort((a, b) => (a.start_time < b.start_time ? -1 : 1))
}

// Хук данных: столы + активные брони на выбранную дату + realtime + офлайн-очередь.
export function useBookings(date) {
  const [tables, setTables] = useState([])
  const [serverBookings, setServerBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const [pendingTick, setPendingTick] = useState(0)

  const dateRef = useRef(date)
  dateRef.current = date

  // Столы: не затираем кэш пустотой при офлайн-ошибке.
  const fetchTables = () =>
    supabase.from('tables').select('*').order('number')
      .then(({ data, error }) => { if (!error && data) setTables(data) })
      .catch(() => {})

  useEffect(() => { fetchTables() }, [])

  const refetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings').select(SELECT)
        .eq('booking_date', dateRef.current)
        .is('deleted_at', null)
        .order('start_time')
      if (!error && data) setServerBookings(data)
    } catch { /* офлайн — оставляем кэш */ }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('bookings').select(SELECT)
          .eq('booking_date', date)
          .is('deleted_at', null)
          .order('start_time')
        if (active && !error && data) setServerBookings(data)
      } catch { /* офлайн */ }
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [date])

  // Реагируем на изменения офлайн-очереди: пере-сливаем и добираем серверные
  // данные (после синхронизации показать реальную бронь вместо оптимистичной).
  useEffect(() => {
    return subscribePending(() => { setPendingTick((t) => t + 1); refetchBookings() })
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('floor-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => refetchBookings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => fetchTables())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('live')
          refetchBookings(); fetchTables(); syncPending()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('offline')
        } else if (status === 'CLOSED') {
          setRealtimeStatus('connecting')
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [])

  const bookings = useMemo(
    () => merge(serverBookings, pendingRowsForDate(date)),
    [serverBookings, date, pendingTick],
  )
  const bookingsRef = useRef(bookings)
  bookingsRef.current = bookings

  // Создание брони: онлайн — сразу в БД; офлайн/сбой сети — в очередь
  // (оптимистично показываем, отправим при возврате сети). booking может быть
  // массивом (бронь на всю группу). client_id — для идемпотентности.
  const addBooking = async (booking) => {
    const rows = (Array.isArray(booking) ? booking : [booking])
      .map((r) => ({ ...r, client_id: r.client_id || crypto.randomUUID() }))

    if (hasLocalOverlap(rows, bookingsRef.current)) {
      return { error: { code: 'local_overlap', message: 'стол уже занят' } }
    }

    if (navigator.onLine) {
      let res
      try { res = await supabase.from('bookings').insert(rows) }
      catch (e) { res = { error: { message: String(e?.message || e) } } }
      if (!res.error) { refetchBookings(); return res }
      if (isNetworkError(res.error)) { enqueueBooking(rows); return { queued: true } }
      return res
    }
    enqueueBooking(rows)
    return { queued: true }
  }

  const scope = (query, booking) =>
    booking?.party_id ? query.eq('party_id', booking.party_id) : query.eq('id', booking.id)

  const updateBooking = (booking, fields) =>
    scope(supabase.from('bookings').update(fields), booking)

  const deleteBooking = (booking) =>
    scope(supabase.from('bookings').update({ deleted_at: new Date().toISOString() }), booking)

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
