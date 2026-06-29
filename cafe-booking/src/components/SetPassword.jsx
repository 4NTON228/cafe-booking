import { useState } from 'react'

// Экран установки пароля. Показывается, когда пользователь пришёл по ссылке
// из письма (приглашение нового сотрудника или сброс пароля) — событие
// PASSWORD_RECOVERY. Здесь происходит активация аккаунта: задаём пароль.
export default function SetPassword({ onSubmit }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSave = async () => {
    setError('')
    if (password.length < 6) { setError('Пароль не короче 6 символов'); return }
    if (password !== confirm) { setError('Пароли не совпадают'); return }
    setBusy(true)
    const { error } = await onSubmit(password)
    setBusy(false)
    if (error) setError('Не удалось сохранить пароль, попробуйте ещё раз')
  }

  return (
    <div className="center-screen">
      <div className="login-card">
        <h1 className="login-title">Манилов</h1>
        <p className="login-sub">Задайте пароль</p>

        <label className="field-label">Новый пароль</label>
        <input
          className="field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label className="field-label">Повторите пароль</label>
        <input
          className="field"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />

        {error && <div className="error-text">{error}</div>}

        <button className="btn-primary" onClick={handleSave} disabled={busy}>
          {busy ? 'Сохранение…' : 'Сохранить и войти'}
        </button>
      </div>
    </div>
  )
}
