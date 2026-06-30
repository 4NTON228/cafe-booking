import { useState } from 'react'

// Телефон гостя как ссылка tel: — с телефона звонок в один тап.
// Рядом маленькая кнопка «копировать» (удобно на десктопе).
export default function PhoneLink({ phone }) {
  const [copied, setCopied] = useState(false)

  const copy = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(phone)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch { /* clipboard может быть недоступен */ }
  }

  // tel: не любит пробелы/скобки — чистим для href, показываем как есть.
  const href = `tel:${phone.replace(/[^\d+]/g, '')}`

  return (
    <span className="phone-link">
      <a href={href} onClick={(e) => e.stopPropagation()}>{phone}</a>
      <button
        type="button"
        className="phone-copy"
        onClick={copy}
        title="Скопировать номер"
        aria-label="Скопировать номер"
      >
        {copied ? '✓' : '⧉'}
      </button>
    </span>
  )
}
