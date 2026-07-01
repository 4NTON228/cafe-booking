import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

// Группы столов (составные столы). Возвращает список групп с массивом
// table_id участников. Realtime держит список актуальным.
// Управление (создать/удалить) — только админ (проверка в БД).
export function useTableGroups(enabled = true) {
  const [groups, setGroups] = useState([])

  const fetchGroups = useCallback(async () => {
    const { data } = await supabase
      .from('table_groups')
      .select('id, name, members:table_group_members(table_id)')
      .order('id')
    setGroups(
      (data || []).map((g) => ({
        id: g.id,
        name: g.name,
        tableIds: (g.members || []).map((m) => m.table_id),
      }))
    )
  }, [])

  useEffect(() => {
    if (!enabled) return
    fetchGroups()
    const channel = supabase
      .channel('table-groups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_groups' }, () => fetchGroups())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_group_members' }, () => fetchGroups())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [enabled, fetchGroups])

  // Создать группу с набором столов (одним махом).
  const createGroup = async (name, tableIds) => {
    const { data, error } = await supabase
      .from('table_groups').insert({ name }).select('id').single()
    if (error) return { error }
    const rows = tableIds.map((table_id) => ({ group_id: data.id, table_id }))
    const res = await supabase.from('table_group_members').insert(rows)
    await fetchGroups()
    return res
  }

  const removeGroup = async (id) => {
    const res = await supabase.from('table_groups').delete().eq('id', id)
    await fetchGroups()
    return res
  }

  return { groups, createGroup, removeGroup, refetch: fetchGroups }
}
