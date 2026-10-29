import { useState } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

export function AccountSettingsModal({ user, onClose, onDeleteAccount, onLogout }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      await onDeleteAccount()
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Database Account</p>
            <h2>Account & Data Settings</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <p className="modal-copy">
          Your account credentials, profiles, assessments, and predictions are stored in the local
          database according to the backend schema.
        </p>

        <div style={{ background: '#f0f3eb', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gap: '8px', fontSize: '12px' }}>
            <div>
              <span style={{ color: 'var(--muted)', fontFamily: 'DM Mono', fontSize: '10px' }}>
                USER ID
              </span>
              <p style={{ margin: '2px 0 0', fontFamily: 'DM Mono', wordBreak: 'break-all', fontSize: '11px' }}>
                {user?.id || '—'}
              </p>
            </div>
            <div>
              <span style={{ color: 'var(--muted)', fontFamily: 'DM Mono', fontSize: '10px' }}>
                REGISTERED EMAIL
              </span>
              <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{user?.email || '—'}</p>
            </div>
          </div>
        </div>

        {!confirmDelete ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="text-button"
              style={{ color: '#b03d32', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={15} /> Delete account & all data
            </button>
            <button type="button" className="secondary-button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <div
            style={{
              border: '1px solid #e8bcbc',
              background: '#fdf2f2',
              padding: '16px',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b03d32', marginBottom: '8px' }}>
              <AlertTriangle size={17} />
              <strong style={{ fontSize: '12px' }}>Permanently delete account?</strong>
            </div>
            <p style={{ fontSize: '11px', color: '#666', lineHeight: 1.5, margin: '0 0 14px' }}>
              This will execute a cascading delete in the database, removing your profile, past assessment
              attempts, and career predictions. This cannot be undone.
            </p>
            {error && <p style={{ color: '#b03d32', fontSize: '11px', margin: '0 0 10px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ background: '#b03d32', color: '#fff' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Confirm delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
