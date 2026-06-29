import { createClient } from '@supabase/supabase-js'

// Ключи берутся из .env.local (переменные с префиксом VITE_ доступны в браузере).
// Здесь только публичный (anon/publishable) ключ — секретный на фронте не нужен.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
