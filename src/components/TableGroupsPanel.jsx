import { useState } from 'react'
import { useDismissable } from '../hooks/useDismissable'

// Управление составными столами (группами) — только админ.
// Админ выбирает столы и склеивает их в группу; большую бронь потом
// можно поставить сразу на всю группу.
// Данные и операции приходят из FloorPlan (единый источник — useTableGroups).
export default function TableGroupsPanel({ tables, groups, onCreate, onRemove, onClose }) {
  const [name, setName] = useState('')
  const [picked, setPicked] = useState([]) // table_id[]
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useDismissable(onClose)

  const tableById = Object.fromEntries(tables.map((t) => [t.id, t]))
  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const handleCreate = async () => {
    setError('')
    if (picked.length < 2) { setError('Выберите минимум два стола'); return }
    const groupName = name.trim() ||
      'Столы ' + picked.map((id) => tableById[id]?.number).filter(Boolean).sort((a, b) => a - b).join('+')
    setBusy(true)
    const res = await onCreate(groupName, picked)
    setBusy(false)
    if (res?.error) { setError('Создавать группы может только администратор'); return }
    setName(''); setPicked([])
  }

  const capacityOf = (tableIds) =>
    tableIds.reduce((sum, id) => sum + (tableById[id]?.capacity || 0), 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Составные столы</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p className="modal-sub">Объединяйте столы для больших компаний</p>

        {error && <div className="error-text">{error}</div>}

        <div className="staff-list">
          {groups.length === 0 && (
            <div className="booking-empty">Групп пока нет</div>
          )}
          {groups.map((g) => (
            <div key={g.id} className="staff-row">
              <div className="staff-info">
                <span className="staff-name">{g.name}</span>
                <span className="booking-meta">
                  Столы {g.tableIds.map((id) => tableById[id]?.number ?? '?').join(', ')}
                  {' · '}до {capacityOf(g.tableIds)} чел.
                </span>
              </div>
              <div className="staff-actions">
                <button className="btn-ghost sm danger" onClick={() => onRemove(g.id)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="booking-form">
          <h3>Новая группа</h3>
          <label className="field-label">Название (необязательно)</label>
          <input className="field" value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Напр.: Банкетная зона" />

          <label className="field-label">Столы в группе</label>
          <div className="table-picker">
            {tables.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`table-pick ${picked.includes(t.id) ? 'on' : ''}`}
                onClick={() => toggle(t.id)}
              >
                №{t.number}
              </button>
            ))}
          </div>

          <div className="form-buttons">
            <button className="btn-primary" onClick={handleCreate} disabled={busy}>
              {busy ? 'Создание…' : 'Создать группу'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
