// Статусы брони: подписи, цвета (через css-класс) и порядок действий.
// status хранится в БД: booked / arrived / no_show / cancelled.
// Старые брони без поля status считаем 'booked'.

export const STATUS = {
  booked:    { label: 'Ожидается', cls: 'st-booked' },
  arrived:   { label: 'Пришли',    cls: 'st-arrived' },
  no_show:   { label: 'Не пришли', cls: 'st-no_show' },
  cancelled: { label: 'Отменена',  cls: 'st-cancelled' },
  left:      { label: 'Гость ушёл', cls: 'st-left' },
}

export const statusOf = (b) => b?.status || 'booked'

// Занимает ли бронь стол. Отменённая и завершённая ('left') — не занимают
// (стол освобождается и на схеме показывается свободным).
export const isActiveBooking = (b) => {
  const s = statusOf(b)
  return s !== 'cancelled' && s !== 'left'
}

// Для этих статусов храним причину/комментарий (status_reason).
export const statusNeedsReason = (s) =>
  s === 'no_show' || s === 'cancelled' || s === 'left'

// Быстрые подсказки для поля причины/комментария по статусу.
export const QUICK_WORDS = {
  left:      ['Понравилось', 'Не понравилось', 'Оставили отзыв'],
  no_show:   ['Не дозвонились', 'Опоздали', 'Передумали'],
  cancelled: ['Передумали', 'Не дозвонились', 'Перенос на другой день'],
}

// Подпись к сохранённому status_reason при показе брони.
export const reasonPrefix = (b) => (statusOf(b) === 'left' ? 'Комментарий' : 'Причина')
