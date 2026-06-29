import { useAuth } from './hooks/useAuth'
import Login from './components/Login'
import FloorPlan from './components/FloorPlan'

export default function App() {
  const { session, profile, isAdmin, loading, signOut } = useAuth()

  if (loading) {
    return <div className="center-screen">Загрузка…</div>
  }

  // Не вошёл — показываем форму входа (регистрации нет, аккаунты создаёт владелец)
  if (!session) {
    return <Login />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Манилов</h1>
        <div className="header-right">
          <span className="user-name">
            {profile?.full_name || session.user.email}
            {isAdmin && <span className="role-badge">админ</span>}
          </span>
          <button className="btn-ghost" onClick={signOut}>Выйти</button>
        </div>
      </header>
      <FloorPlan isAdmin={isAdmin} />
    </div>
  )
}
