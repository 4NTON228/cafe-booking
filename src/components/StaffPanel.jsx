import { useState } from 'react'
import { useStaff } from '../hooks/useStaff'
import { useDismissable } from '../hooks/useDismissable'

// Панель управления сотрудниками (только для админа). Открывается из шапки.
// Позволяет менять имя, роль и активировать/деактивировать аккаунты.
export default function StaffPanel({ currentUserId, onClose }) {
  const { staff, loading, setActive, setRole, setName } = useStaff(true)
  const [error, setError] = useState('')

  useDismissable(onClose)

  const guard = async (promise) => {
    setError('')
    const { error } = await promise
    if (error) setError('Менять сотрудников может только администратор')
  }

  const handleRename = (s) => {
    const name = window.prompt('Имя сотрудника', s.full_name)
    if (name && name.trim() && name.trim() !== s.full_name) {
      guard(setName(s.id, name.trim()))
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Сотрудники</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p className="modal-sub">Роли и доступ к бронированию</p>

        {error && <div className="error-text">{error}</div>}

        {loading ? (
          <div className="floor-loading">Загрузка…</div>
        ) : (
          <div className="staff-list">
            {staff.map((s) => {
              const self = s.id === currentUserId
              return (
                <div
                  key={s.id}
                  className={`staff-row ${s.is_active === false ? 'inactive' : ''}`}
                >
                  <div className="staff-info">
                    <span className="staff-name">
                      {s.full_name}
                      {s.role === 'admin' && <span className="role-badge">админ</span>}
                      {s.is_active === false && (
                        <span className="role-badge muted">отключён</span>
                      )}
                    </span>
                  </div>
                  <div className="staff-actions">
                    <button className="btn-ghost sm" onClick={() => handleRename(s)}>
                      Имя
                    </button>
                    <button
                      className="btn-ghost sm"
                      disabled={self}
                      title={self ? 'Свою роль менять нельзя' : ''}
                      onClick={() => guard(setRole(s.id, s.role === 'admin' ? 'staff' : 'admin'))}
                    >
                      {s.role === 'admin' ? 'Снять админа' : 'Сделать админом'}
                    </button>
                    <button
                      className={`btn-ghost sm ${s.is_active === false ? '' : 'danger'}`}
                      disabled={self}
                      title={self ? 'Себя отключить нельзя' : ''}
                      onClick={() => guard(setActive(s.id, s.is_active === false))}
                    >
                      {s.is_active === false ? 'Активировать' : 'Деактивировать'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
