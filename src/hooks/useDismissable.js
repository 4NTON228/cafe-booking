import { useEffect } from 'react'

// Поведение модального окна: закрытие по Esc и блокировка прокрутки фона,
// пока окно открыто (важно на телефоне — иначе фон «уезжает» под окном).
export function useDismissable(onClose) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])
}
