import { createClient } from '@supabase/supabase-js'

// Ключи берутся из .env.local (переменные с префиксом VITE_ доступны в браузере).
// Здесь только публичный (anon/publishable) ключ — секретный на фронте не нужен.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Чего не хватает в окружении — собираем заранее, чтобы показать
// человекочитаемую ошибку вместо «Failed to construct URL» где-то в глубине.
export const missingEnv = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean)

export const isConfigured = missingEnv.length === 0

// Если переменные не заданы — не падаем на createClient, а отдаём заглушку.
// App покажет экран с инструкцией (см. ConnectionError), а не белый экран.
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Нужно, чтобы поймать ссылку восстановления пароля из письма (#access_token=…).
        detectSessionInUrl: true,
      },
    })
  : null
