// Статусы брони: подписи, цвета (через css-класс) и порядок действий.
// status хранится в БД: booked / arrived / no_show / cancelled.
// Старые брони без поля status считаем 'booked'.

export const STATUS = {
  booked:    { label: 'Ожидается', cls: 'st-booked' },
  arrived:   { label: 'Пришли',    cls: 'st-arrived' },
  no_show:   { label: 'Не пришли', cls: 'st-no_show' },
  cancelled: { label: 'Отменена',  cls: 'st-cancelled' },
}

export const statusOf = (b) => b?.status || 'booked'

export const isActiveBooking = (b) => statusOf(b) !== 'cancelled'
