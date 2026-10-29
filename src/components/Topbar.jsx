import { ChevronRight, CircleHelp, LogOut, Settings, User } from 'lucide-react'

export function Topbar({ active, user, profile, onOpenProfile, onOpenAccount, onLogout }) {
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Workspace</span>
        <ChevronRight size={14} />
        <strong>{active}</strong>
      </div>

      <div className="top-actions">
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="icon-button"
          title="Interactive API Docs (FastAPI Swagger)"
          style={{ textDecoration: 'none' }}
        >
          <CircleHelp size={18} />
        </a>

        {onOpenAccount && (
          <button
            className="icon-button"
            title="Account settings & database actions"
            onClick={onOpenAccount}
          >
            <Settings size={18} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="user-button"
            onClick={onOpenProfile}
            title={`Signed in as ${user?.email || 'authenticated user'} (Click to edit profile)`}
          >
            <span className="avatar small">{initials}</span>
            <span>{displayName}</span>
          </button>

          <button
            className="icon-button"
            title="Sign out of account"
            onClick={onLogout}
            style={{ width: '32px', height: '32px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
