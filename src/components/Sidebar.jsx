import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  Compass,
  Database,
  LayoutDashboard,
  Target,
} from 'lucide-react'

export function Sidebar({ active, setActive, profile, onOpenProfile }) {
  const displayName = profile?.display_name || 'My Profile'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'

  // Calculate real completeness based on backend ProfileInput fields
  let completeness = 0
  if (profile?.display_name) completeness += 15
  if (profile?.education_level) completeness += 15
  if (profile?.specialization) completeness += 10
  if (profile?.experience_months > 0) completeness += 15
  if (profile?.desired_roles?.length > 0) completeness += 15
  if (profile?.skills?.length > 0) completeness += 20
  if (profile?.project_summary || profile?.experience_summary) completeness += 10
  completeness = Math.min(100, completeness)

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">S</span>
        <span>
          skillgap<span className="brand-dot">.</span>ai
        </span>
      </div>

      <div className="workspace-label">Workspace</div>

      <nav>
        <button
          className={`nav-item ${active === 'Overview' ? 'active' : ''}`}
          onClick={() => setActive('Overview')}
        >
          <LayoutDashboard size={17} />
          <span>Overview</span>
          {active === 'Overview' && <span className="nav-indicator" />}
        </button>

        <button
          className={`nav-item ${active === 'Career paths' ? 'active' : ''}`}
          onClick={() => setActive('Career paths')}
        >
          <Compass size={17} />
          <span>Career paths</span>
          {active === 'Career paths' && <span className="nav-indicator" />}
        </button>

        <button
          className={`nav-item ${active === 'Skill gaps' ? 'active' : ''}`}
          onClick={() => setActive('Skill gaps')}
        >
          <Target size={17} />
          <span>Skill gaps</span>
          {active === 'Skill gaps' && <span className="nav-indicator" />}
        </button>

        <button
          className={`nav-item ${active === 'Learning plan' ? 'active' : ''}`}
          onClick={() => setActive('Learning plan')}
        >
          <BookOpen size={17} />
          <span>Learning plan</span>
          {active === 'Learning plan' && <span className="nav-indicator" />}
        </button>

        <button
          className={`nav-item ${active === 'Assessments' ? 'active' : ''}`}
          onClick={() => setActive('Assessments')}
        >
          <ClipboardList size={17} />
          <span>Assessments</span>
          {active === 'Assessments' && <span className="nav-indicator" />}
        </button>

        <button
          className={`nav-item ${active === 'Catalogs' ? 'active' : ''}`}
          onClick={() => setActive('Catalogs')}
        >
          <Database size={17} />
          <span>Taxonomy & Catalogs</span>
          {active === 'Catalogs' && <span className="nav-indicator" />}
        </button>
      </nav>

      <div className="sidebar-bottom">
        <div className="progress-label">
          <span>Profile completeness</span>
          <strong>{completeness}%</strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${completeness}%` }} />
        </div>
        <button
          className="profile-mini"
          onClick={onOpenProfile}
          title="Edit profile in database"
        >
          <span className="avatar">{initials}</span>
          <span className="profile-name">
            <strong>{displayName}</strong>
            <small>{profile?.desired_roles?.[0] || 'Unassigned target role'}</small>
          </span>
          <ChevronRight size={15} />
        </button>
      </div>
    </aside>
  )
}
