import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

// Форма входа. Регистрации нет — аккаунты создаёт владелец в панели Supabase.
export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setBusy(true)
    const { error } = await signIn(email, password)
    if (error) setError('Неверный логин или пароль')
    setBusy(false)
  }

  return (
    <div className="center-screen">
      <div className="login-card">
        <h1 className="login-title">Манилов</h1>
        <p className="login-sub">Бронирование столов</p>

        <label className="field-label">Логин (email)</label>
        <input
          className="field"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        <label className="field-label">Пароль</label>
        <input
          className="field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        {error && <div className="error-text">{error}</div>}

        <button className="btn-primary" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Вход…' : 'Войти'}
        </button>
      </div>
    </div>
  )
}
