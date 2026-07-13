// Быстрые метки на брони. Хранятся как массив ключей в bookings.tags.
export const TAGS = [
  { key: 'birthday',  label: 'День рождения' },
  { key: 'window',    label: 'У окна' },
  { key: 'stroller',  label: 'С коляской' },
  { key: 'regular',   label: 'Постоянник' },
  { key: 'important', label: 'Важный гость' },
  { key: 'quiet',     label: 'Тихий стол' },
]

export const tagLabel = (key) => TAGS.find((t) => t.key === key)?.label || key
