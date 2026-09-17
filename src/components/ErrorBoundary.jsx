import { Component } from 'react'

// Перехват ошибок отрисовки: без него любая ошибка в компоненте гасит весь
// экран в белый (пользователь думает, что приложение «вылетело»). Здесь мы
// показываем понятный экран восстановления и пишем ошибку в консоль для отладки.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Логируем, чтобы причину было видно в консоли (и в отчётах, если подключат).
    console.error('Сбой в приложении:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="center-screen error-screen">
          <h2>Что-то пошло не так</h2>
          <p>Приложение столкнулось с ошибкой. Нажмите «Обновить» — брони не потеряются.</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Обновить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
