import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

// Хук управления сотрудниками для админа: список профилей + смена роли,
// имени и активности. Изменения профилей разрешены только админу (RLS).
// Realtime по profiles держит список в актуальном состоянии у всех админов.
export function useStaff(enabled) {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchStaff = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_active')
      .order('full_name')
    setStaff(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!enabled) return
    fetchStaff()

    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchStaff())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [enabled, fetchStaff])

  const setActive = (id, is_active) =>
    supabase.from('profiles').update({ is_active }).eq('id', id)

  const setRole = (id, role) =>
    supabase.from('profiles').update({ role }).eq('id', id)

  const setName = (id, full_name) =>
    supabase.from('profiles').update({ full_name }).eq('id', id)

  return { staff, loading, setActive, setRole, setName, refresh: fetchStaff }
}
