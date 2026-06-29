import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// Хук авторизации: следит за сессией, подгружает профиль (имя + роль + активность),
// и обслуживает активацию аккаунта через ссылку восстановления пароля.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // { full_name, role, is_active }
  const [loading, setLoading] = useState(true)
  // recovery=true, когда пользователь пришёл по ссылке из письма
  // (приглашение / сброс пароля) — показываем экран установки пароля.
  const [recovery, setRecovery] = useState(false)

  // Загрузить профиль текущего пользователя
  const loadProfile = async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role, is_active')
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
      async (event, session) => {
        // Ссылка восстановления/приглашения — переводим в режим установки пароля.
        if (event === 'PASSWORD_RECOVERY') setRecovery(true)
        setSession(session)
        await loadProfile(session?.user?.id)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  // Отправить письмо со ссылкой для установки/сброса пароля.
  const sendPasswordReset = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

  // Установить новый пароль (в режиме recovery после перехода по ссылке).
  const updatePassword = async (password) => {
    const result = await supabase.auth.updateUser({ password })
    if (!result.error) setRecovery(false)
    return result
  }

  const isAdmin = profile?.role === 'admin'
  // Если профиль ещё не загружен — считаем активным, чтобы не мигал экран блокировки.
  const isActive = profile ? profile.is_active !== false : true

  return {
    session, profile, isAdmin, isActive, loading, recovery,
    signIn, signOut, sendPasswordReset, updatePassword,
  }
}
