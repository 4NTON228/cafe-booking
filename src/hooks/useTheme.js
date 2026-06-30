import { useState, useEffect } from 'react'

// Светлая/тёмная тема. Выбор запоминаем в localStorage, по умолчанию —
// системная настройка. Тема применяется через data-theme на <html>,
// а сами цвета переопределяются CSS-переменными в styles.css.
const STORAGE_KEY = 'manilov-theme'

function initialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* localStorage может быть недоступен */ }
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* игнор */ }
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return { theme, toggle }
}
