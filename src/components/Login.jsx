import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

// Форма входа. Открытой регистрации нет — аккаунты создаёт владелец в Supabase.
// Для активации нового аккаунта и сброса пароля есть режим «Забыли пароль?»:
// сотрудник получает письмо со ссылкой и задаёт пароль сам.
export default function Login() {
  const { signIn, sendPasswordReset } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleSignIn = async () => {
    setError('')
    setBusy(true)
    const { error } = await signIn(email, password)
    if (error) setError('Неверный логин или пароль')
    setBusy(false)
  }

  const handleReset = async () => {
    setError('')
    setNotice('')
    if (!email.trim()) { setError('Укажите email'); return }
    setBusy(true)
    const { error } = await sendPasswordReset(email.trim())
    setBusy(false)
    if (error) {
      setError('Не удалось отправить письмо')
      return
    }
    // Текст нейтральный, чтобы не раскрывать, какие email существуют.
    setNotice('Если такой аккаунт есть, на почту придёт ссылка для установки пароля.')
  }

  const isReset = mode === 'reset'

  return (
    <div className="center-screen">
      <div className="login-card">
        <h1 className="login-title">Манилов</h1>
        <p className="login-sub">
          {isReset ? 'Восстановление пароля' : 'Бронирование столов'}
        </p>

        <label className="field-label">Логин (email)</label>
        <input
          className="field"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (isReset ? handleReset() : handleSignIn())}
        />

        {!isReset && (
          <>
            <label className="field-label">Пароль</label>
            <div className="field-pw">
              <input
                className="field"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((s) => !s)}
              >
                {showPw ? 'Скрыть' : 'Показать'}
              </button>
            </div>
          </>
        )}

        {error && <div className="error-text">{error}</div>}
        {notice && <div className="notice-text">{notice}</div>}

        {isReset ? (
          <button className="btn-primary" onClick={handleReset} disabled={busy}>
            {busy ? 'Отправка…' : 'Отправить ссылку'}
          </button>
        ) : (
          <button className="btn-primary" onClick={handleSignIn} disabled={busy}>
            {busy ? 'Вход…' : 'Войти'}
          </button>
        )}

        <button
          className="link-btn"
          onClick={() => {
            setMode(isReset ? 'signin' : 'reset')
            setError('')
            setNotice('')
          }}
        >
          {isReset ? '← Назад ко входу' : 'Забыли пароль?'}
        </button>
      </div>
    </div>
  )
}
