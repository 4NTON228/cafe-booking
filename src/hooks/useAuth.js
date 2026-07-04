import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// Хук авторизации: следит за сессией, подгружает профиль (имя + роль + активность),
// и обслуживает активацию аккаунта через ссылку восстановления пароля.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // { full_name, role, is_active }
  // Админ-статус берём с сервера (RPC), а не из profiles.role — так работают
  // и обычные, и «скрытые» админы (у которых role в profiles остаётся 'staff').
  const [adminFlag, setAdminFlag] = useState(false)
  const [loading, setLoading] = useState(true)
  // recovery=true, когда пользователь пришёл по ссылке из письма
  // (приглашение / сброс пароля) — показываем экран установки пароля.
  const [recovery, setRecovery] = useState(false)

  // Загрузить профиль текущего пользователя + серверный админ-статус.
  // Устойчив к ошибкам сети — не роняет приложение (вызывается fire-and-forget).
  const loadProfile = async (userId) => {
    if (!userId) { setProfile(null); setAdminFlag(false); return }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, role, is_active')
        .eq('id', userId)
        .single()
      setProfile(data || null)
      // am_i_admin() учитывает и скрытых админов; фолбэк — роль из профиля.
      const { data: adm, error } = await supabase.rpc('am_i_admin')
      setAdminFlag(error ? data?.role === 'admin' : adm === true)
    } catch {
      /* профиль подгрузим при следующем событии авторизации */
    }
  }

  useEffect(() => {
    let mounted = true

    // Экран загрузки снимаем сразу, как узнали сессию — НЕ ждём профиль,
    // иначе любой сбой запроса профиля вешает приложение в «постоянной загрузке».
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return
        setSession(data.session)
        setLoading(false)
        loadProfile(data.session?.user?.id) // fire-and-forget (вне auth-колбэка — безопасно)
      })
      .catch(() => { if (mounted) setLoading(false) })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Ссылка восстановления/приглашения — переводим в режим установки пароля.
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(session)
      setLoading(false)
      // ВАЖНО: нельзя await-ить supabase-запросы прямо в этом колбэке — это
      // дедлочит внутреннюю блокировку supabase-auth (зависает загрузка и
      // авто-обновление токена → вылеты и повторные логины). Откладываем.
      setTimeout(() => { if (mounted) loadProfile(session?.user?.id) }, 0)
    })

    return () => { mounted = false; listener.subscription.unsubscribe() }
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

  const isAdmin = adminFlag
  // Если профиль ещё не загружен — считаем активным, чтобы не мигал экран блокировки.
  const isActive = profile ? profile.is_active !== false : true

  return {
    session, profile, isAdmin, isActive, loading, recovery,
    signIn, signOut, sendPasswordReset, updatePassword,
  }
}
