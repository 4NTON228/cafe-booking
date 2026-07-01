import { useState } from 'react'
import { isConfigured, missingEnv } from './supabaseClient'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import Login from './components/Login'
import SetPassword from './components/SetPassword'
import Blocked from './components/Blocked'
import FloorPlan from './components/FloorPlan'
import StaffPanel from './components/StaffPanel'
import ConnectionError from './components/ConnectionError'

export default function App() {
  // Тему применяем глобально (в т.ч. на экране входа), даже если БД не настроена.
  const theme = useTheme()

  // Нет переменных окружения — показываем инструкцию вместо краша.
  if (!isConfigured) {
    return <ConnectionError missing={missingEnv} />
  }

  return <AuthedApp theme={theme} />
}

function AuthedApp({ theme }) {
  const {
    session, profile, isAdmin, isActive, loading, recovery,
    signOut, updatePassword,
  } = useAuth()
  const [staffOpen, setStaffOpen] = useState(false)

  if (loading) {
    return <div className="center-screen">Загрузка…</div>
  }

  // Пользователь пришёл по ссылке из письма — задаёт пароль (активация/сброс).
  if (recovery) {
    return <SetPassword onSubmit={updatePassword} />
  }

  // Не вошёл — форма входа (регистрации нет, аккаунты создаёт владелец).
  if (!session) {
    return <Login />
  }

  // Аккаунт деактивирован админом — бронировать нельзя.
  if (!isActive) {
    return <Blocked name={profile?.full_name} onSignOut={signOut} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Манилов</h1>
        <div className="header-right">
          <span className="user-name">
            {profile?.full_name || session.user.email}
            {/* Бейдж «админ» только у настоящих админов по роли —
                скрытые админы (role='staff') его не показывают. */}
            {profile?.role === 'admin' && <span className="role-badge">админ</span>}
          </span>
          <button
            className="btn-ghost icon-btn"
            onClick={theme.toggle}
            title={theme.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            aria-label="Сменить тему"
          >
            {theme.theme === 'dark' ? '☀' : '☾'}
          </button>
          {isAdmin && (
            <button className="btn-ghost" onClick={() => setStaffOpen(true)}>
              Сотрудники
            </button>
          )}
          <button className="btn-ghost" onClick={signOut}>Выйти</button>
        </div>
      </header>

      <FloorPlan isAdmin={isAdmin} />

      {staffOpen && (
        <StaffPanel
          currentUserId={session.user.id}
          onClose={() => setStaffOpen(false)}
        />
      )}
    </div>
  )
}
