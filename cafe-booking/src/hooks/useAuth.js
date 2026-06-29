import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// Хук авторизации: следит за сессией и подгружает профиль (имя + роль).
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // { full_name, role }
  const [loading, setLoading] = useState(true)

  // Загрузить профиль текущего пользователя
  const loadProfile = async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', userId)
      .single()
    setProfile(data || null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        await loadProfile(session?.user?.id)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  const isAdmin = profile?.role === 'admin'

  return { session, profile, isAdmin, loading, signIn, signOut }
}
