// Экран для деактивированного сотрудника. Аккаунт существует и пароль верный,
// но админ снял активность — бронировать нельзя. Доступ вернёт админ.
export default function Blocked({ name, onSignOut }) {
  return (
    <div className="center-screen">
      <div className="login-card">
        <h1 className="login-title">Манилов</h1>
        <p className="login-sub">Доступ приостановлен</p>
        <p className="conn-text">
          {name ? `${name}, ` : ''}ваш аккаунт деактивирован.
          Обратитесь к администратору, чтобы восстановить доступ.
        </p>
        <button className="btn-primary" onClick={onSignOut}>Выйти</button>
      </div>
    </div>
  )
}
