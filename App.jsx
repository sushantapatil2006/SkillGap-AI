import { useState } from 'react'
import {
  ArrowUpRight, BarChart3, BookOpen, Check, ChevronRight, CircleHelp,
  Compass, FileText, Gauge, LayoutDashboard, LogOut, Plus, Search, Sparkles,
  Target, UserRound, X,
} from 'lucide-react'
import { createResult, getProfile, login, saveProfile } from './api'

const initialSkills = [
  { name: 'Python', level: 3, accent: 'lime' },
  { name: 'SQL', level: 2, accent: 'blue' },
  { name: 'Machine Learning', level: 2, accent: 'violet' },
  { name: 'Pandas', level: 3, accent: 'orange' },
]

const roleData = [
  { title: 'Machine Learning Engineer', score: 86, fit: 'Strong fit', skills: ['Python', 'ML', 'SQL'], tone: 'lime' },
  { title: 'Data Scientist', score: 78, fit: 'Good fit', skills: ['Statistics', 'Python', 'Pandas'], tone: 'blue' },
  { title: 'Data Analyst', score: 72, fit: 'Good fit', skills: ['SQL', 'Visualization', 'Excel'], tone: 'violet' },
]

const recommendations = [
  { title: 'Deep Learning foundations', meta: 'High priority  /  4 weeks', tag: 'Closes 2 role gaps', tone: 'lime' },
  { title: 'Advanced SQL patterns', meta: 'Medium priority  /  2 weeks', tag: 'Used in 8 target roles', tone: 'orange' },
  { title: 'Model deployment with FastAPI', meta: 'Medium priority  /  3 weeks', tag: 'Portfolio-ready project', tone: 'blue' },
]

function App() {
  const [active, setActive] = useState('Overview')
  const [skills, setSkills] = useState(initialSkills)
  const [showProfile, setShowProfile] = useState(false)
  const [toast, setToast] = useState('')
  const [authOpen, setAuthOpen] = useState(false)

  function notify(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }

  async function handleSaveProfile(profile) {
    try {
      await saveProfile(profile)
      notify('Profile synced with SkillGap AI')
    } catch {
      notify('Profile saved locally. Connect the API to sync it.')
    }
    setShowProfile(false)
  }

  async function handleLogin(email, password) {
    try {
      await login(email, password)
      const profile = await getProfile().catch(() => null)
      if (profile) notify(`Welcome back, ${profile.display_name}`)
      else notify('Signed in. Add your profile to get started.')
      setAuthOpen(false)
    } catch {
      notify('Demo mode active. Backend connection not detected.')
      setAuthOpen(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">S</span><span>skillgap<span className="brand-dot">.</span>ai</span></div>
        <div className="workspace-label">Workspace</div>
        <nav>
          <NavItem icon={<LayoutDashboard size={17} />} label="Overview" active={active === 'Overview'} onClick={() => setActive('Overview')} />
          <NavItem icon={<Compass size={17} />} label="Career paths" active={active === 'Career paths'} onClick={() => setActive('Career paths')} />
          <NavItem icon={<Target size={17} />} label="Skill gaps" active={active === 'Skill gaps'} onClick={() => setActive('Skill gaps')} />
          <NavItem icon={<BookOpen size={17} />} label="Learning plan" active={active === 'Learning plan'} onClick={() => setActive('Learning plan')} />
        </nav>
        <div className="sidebar-bottom">
          <div className="progress-label"><span>Profile completeness</span><strong>72%</strong></div>
          <div className="progress-track"><span /></div>
          <button className="profile-mini" onClick={() => setShowProfile(true)}><span className="avatar">AS</span><span className="profile-name"><strong>Alex Morgan</strong><small>Student profile</small></span><ChevronRight size={15} /></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{active}</strong></div>
          <div className="top-actions"><button className="icon-button" title="Search"><Search size={18} /></button><button className="icon-button" title="Help"><CircleHelp size={18} /></button><button className="user-button" onClick={() => setAuthOpen(true)}><span className="avatar small">AS</span><span>Alex</span><ChevronRight size={14} /></button></div>
        </header>

        <div className="page-content">
          <section className="hero-row">
            <div><p className="eyebrow"><span className="pulse" /> Updated just now</p><h1>Your next move, <em>made clearer.</em></h1><p className="hero-copy">An evidence-based view of where you are today and what will move you closer to your target career.</p></div>
            <button className="primary-button" onClick={() => setShowProfile(true)}><Sparkles size={17} /> Improve my profile <ArrowUpRight size={16} /></button>
          </section>

          {active === 'Overview' ? <Dashboard skills={skills} setSkills={setSkills} notify={notify} /> : <SectionView active={active} />}
        </div>
      </main>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} onSave={handleSaveProfile} />}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onLogin={handleLogin} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  )
}

function NavItem({ icon, label, active, onClick }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{active && <span className="nav-indicator" />}</button> }

function Dashboard({ skills, setSkills, notify }) {
  return <>
    <section className="stats-grid">
      <article className="stat-card score-card"><div className="card-top"><span className="label">Career readiness</span><Gauge size={18} /></div><div className="score-wrap"><div className="score-ring"><strong>74</strong><span>/100</span></div><div><strong className="score-status">On track</strong><p>Top 26% of profiles</p></div></div><div className="card-foot"><span className="trend">+8 pts</span><span>since last assessment</span><ArrowUpRight size={15} /></div></article>
      <article className="stat-card"><div className="card-top"><span className="label">Best-fit role</span><Target size={18} /></div><h2 className="role-stat">ML Engineer</h2><div className="match-line"><span className="dot lime-dot" /> 86% compatibility</div><div className="card-foot"><span>Based on 42 signals</span><ArrowUpRight size={15} /></div></article>
      <article className="stat-card"><div className="card-top"><span className="label">Skills to unlock</span><BarChart3 size={18} /></div><h2 className="number-stat">04</h2><div className="match-line"><span className="dot orange-dot" /> 2 high priority</div><div className="card-foot"><span>Across your target roles</span><ArrowUpRight size={15} /></div></article>
    </section>

    <section className="content-grid">
      <div className="left-column">
        <section className="panel role-panel"><div className="panel-heading"><div><p className="eyebrow">01 / Career direction</p><h2>Roles that fit your signal</h2></div><button className="text-button">View all <ArrowUpRight size={15} /></button></div><div className="role-list">{roleData.map((role, index) => <RoleRow key={role.title} role={role} rank={index + 1} />)}</div></section>
        <section className="panel skill-panel"><div className="panel-heading"><div><p className="eyebrow">02 / Current toolkit</p><h2>Your skill inventory</h2></div><button className="add-button" onClick={() => { setSkills([...skills, { name: 'Statistics', level: 1, accent: 'pink' }]); notify('Statistics added to your profile') }}><Plus size={15} /> Add skill</button></div><div className="skill-grid">{skills.map((skill) => <div className="skill-item" key={skill.name}><div className={`skill-icon ${skill.accent}`}>{skill.name.slice(0, 2).toUpperCase()}</div><div className="skill-details"><strong>{skill.name}</strong><div className="level-bars">{[0, 1, 2, 3].map((bar) => <span className={bar < skill.level ? 'filled' : ''} key={bar} />)}</div></div><span className="skill-level">{['New', 'Foundational', 'Working', 'Strong', 'Expert'][skill.level]}</span></div>)}</div></section>
      </div>
      <aside className="right-column"><section className="panel gap-panel"><div className="panel-heading"><div><p className="eyebrow">03 / Highest leverage</p><h2>Close the gap</h2></div><span className="count-badge">04</span></div><p className="panel-description">The skills below appear most often in your target roles and are furthest from your current level.</p><div className="gap-list"><GapItem name="Deep Learning" current="Beginner" target="Independent" progress={28} tone="lime" /><GapItem name="Model deployment" current="Unassessed" target="Working" progress={8} tone="orange" /><GapItem name="Statistics" current="Foundational" target="Strong" progress={43} tone="blue" /></div><button className="full-button" onClick={() => notify('Learning plan is ready to explore')}>Open learning plan <ArrowUpRight size={16} /></button></section><section className="quote-block"><Sparkles size={19} /><p>“Progress is not about knowing everything. It is about knowing what to learn next.”</p><span>SkillGap insight</span></section></aside>
    </section>
    <section className="recommendation-strip"><div className="recommendation-intro"><span className="intro-icon"><BookOpen size={19} /></span><div><p className="eyebrow">Curated for your direction</p><h2>Start with one strong move</h2></div></div>{recommendations.map((item) => <div className="recommendation" key={item.title}><div className={`rec-marker ${item.tone}`} /><div><strong>{item.title}</strong><small>{item.meta}</small></div><span>{item.tag}</span></div>)}</section>
  </>
}

function RoleRow({ role, rank }) { return <div className="role-row"><span className="rank">0{rank}</span><div className={`role-avatar ${role.tone}`}>{role.title.split(' ').map(word => word[0]).join('').slice(0, 2)}</div><div className="role-title"><strong>{role.title}</strong><span>{role.skills.join('  /  ')}</span></div><div className="role-score"><strong>{role.score}%</strong><span>{role.fit}</span></div><ArrowUpRight size={16} className="row-arrow" /></div> }
function GapItem({ name, current, target, progress, tone }) { return <div className="gap-item"><div className="gap-name"><strong>{name}</strong><span>{current} <ChevronRight size={13} /> {target}</span></div><div className="gap-track"><span className={tone} style={{ width: `${progress}%` }} /></div><small>{progress}% aligned</small></div> }
function SectionView({ active }) { return <section className="empty-section"><div className="empty-icon"><Compass size={24} /></div><p className="eyebrow">{active}</p><h1>Make this view your next focus.</h1><p>Your profile intelligence will become more useful as you complete the assessment and add evidence from projects, certifications, and experience.</p><button className="primary-button">Continue profile <ArrowUpRight size={16} /></button></section> }

function ProfileModal({ onClose, onSave }) { const [name, setName] = useState('Alex Morgan'); const [role, setRole] = useState('Machine Learning Engineer'); return <div className="modal-backdrop"><div className="modal"><div className="modal-header"><div><p className="eyebrow">Profile details</p><h2>Shape your signal</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><p className="modal-copy">A few details help us tune role compatibility and learning priorities.</p><label>Display name<input value={name} onChange={e => setName(e.target.value)} /></label><label>Target role<input value={role} onChange={e => setRole(e.target.value)} /></label><label>Education level<select defaultValue="bachelors"><option value="bachelors">Bachelor's degree</option><option value="masters">Master's degree</option><option value="self">Self-taught</option></select></label><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={() => onSave({ display_name: name, desired_roles: [role], education_level: 'Bachelor degree', specialization: 'Computer Science', experience_months: 0, experience_summary: '', project_summary: '', skills: [] })}>Save profile <Check size={16} /></button></div></div></div> }
function AuthModal({ onClose, onLogin }) { const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); return <div className="modal-backdrop"><div className="modal auth-modal"><div className="modal-header"><div><p className="eyebrow">Your workspace</p><h2>Sign in to sync</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><p className="modal-copy">Connect to your SkillGap account to save assessments and recommendations.</p><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="12+ characters" /></label><button className="primary-button wide-button" onClick={() => onLogin(email, password)}>Sign in <ArrowUpRight size={16} /></button><small className="demo-note">Demo mode works without an active backend connection.</small></div></div> }

export default App
