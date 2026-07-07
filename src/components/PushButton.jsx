import { useEffect, useState } from 'react'
import { pushSupported, pushState, enablePush } from '../lib/push'

// Кнопка «Включить уведомления» в шапке. Прячется, если уже включено
// или браузер не поддерживает пуши.
export default function PushButton() {
  const [state, setState] = useState('off')
  const [busy, setBusy] = useState(false)

  useEffect(() => { pushState().then(setState) }, [])

  if (!pushSupported() || state === 'unsupported' || state === 'on') return null

  const onClick = async () => {
    setBusy(true)
    const res = await enablePush()
    setBusy(false)
    if (res.ok) setState('on')
    else if (res.error === 'denied') alert('Уведомления запрещены. Разрешите их в настройках браузера для этого сайта.')
    else alert('Не удалось включить уведомления, попробуйте ещё раз.')
  }

  return (
    <button
      className="btn-ghost icon-btn"
      onClick={onClick}
      disabled={busy}
      title="Включить уведомления"
      aria-label="Включить уведомления"
    >
      🔔
    </button>
  )
}
