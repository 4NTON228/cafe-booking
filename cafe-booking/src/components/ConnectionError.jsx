// Экран, который видно, когда приложение не настроено на подключение к Supabase
// (нет переменных окружения). Лучше понятная инструкция, чем белый экран.
export default function ConnectionError({ missing }) {
  return (
    <div className="center-screen">
      <div className="login-card">
        <h1 className="login-title">Манилов</h1>
        <p className="login-sub">Нет подключения к базе</p>

        <p className="conn-text">
          Не заданы переменные окружения для Supabase:
        </p>
        <ul className="conn-list">
          {missing.map((name) => (
            <li key={name}><code>{name}</code></li>
          ))}
        </ul>
        <p className="conn-text">
          Локально: скопируй <code>.env.local.example</code> в
          {' '}<code>.env.local</code> и впиши URL и публичный ключ из
          Supabase → Project Settings → API, затем перезапусти{' '}
          <code>npm run dev</code>.
        </p>
        <p className="conn-text">
          На Vercel: добавь эти переменные в Settings → Environment Variables
          и сделай редеплой.
        </p>
      </div>
    </div>
  )
}
