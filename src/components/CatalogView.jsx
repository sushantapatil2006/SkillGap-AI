import { useEffect, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Database,
  HelpCircle,
  RefreshCw,
  Search,
  Server,
} from 'lucide-react'
import { getJobRolesCatalog, getSkillsCatalog } from '../api/career'
import { checkHealthLive, checkHealthModel, checkHealthReady } from '../api/health'

export function CatalogView({ notify }) {
  const [skills, setSkills] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState({ live: false, ready: false, model: false })
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchCatalogs()
  }, [])

  async function fetchCatalogs() {
    setLoading(true)
    try {
      const [skillsData, rolesData, live, ready, model] = await Promise.allSettled([
        getSkillsCatalog(),
        getJobRolesCatalog(),
        checkHealthLive(),
        checkHealthReady(),
        checkHealthModel(),
      ])

      setSkills(skillsData.status === 'fulfilled' ? skillsData.value || [] : [])
      setRoles(rolesData.status === 'fulfilled' ? rolesData.value || [] : [])
      setHealth({
        live: live.status === 'fulfilled' && live.value?.status === 'ok',
        ready: ready.status === 'fulfilled' && ready.value?.status === 'ready',
        model: model.status === 'fulfilled' && Boolean(model.value?.available),
      })
    } catch (err) {
      notify(`Failed to fetch taxonomy: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const filteredSkills = skills.filter((s) =>
    (s.name || s.id || '').toLowerCase().includes(filter.toLowerCase())
  )
  const filteredRoles = roles.filter((r) =>
    (r.title || r.id || '').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <p className="eyebrow" style={{ margin: '0 0 8px' }}>
            <span className="pulse" /> Database Catalogs & System Status
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: 0, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            Taxonomy & System Engine
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '12px 0 0', maxWidth: '640px', lineHeight: 1.6 }}>
            Official skills and role requirements imported from versioned dataset bundles. As documented
            in the backend specification, the application starts with empty catalogs until dataset import.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={fetchCatalogs}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} /> Refresh
        </button>
      </div>

      {/* System Health Indicators */}
      <section className="stats-grid" style={{ marginBottom: '24px' }}>
        <article className="stat-card" style={{ minHeight: 'auto', padding: '16px 20px' }}>
          <div className="card-top">
            <span className="label">Process Health</span>
            <Server size={16} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0 6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: health.live ? '#8ab52e' : '#dc3545',
              }}
            />
            <strong style={{ fontSize: '16px' }}>{health.live ? 'Live (200 OK)' : 'Offline'}</strong>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Endpoint /health/live</span>
        </article>

        <article className="stat-card" style={{ minHeight: 'auto', padding: '16px 20px' }}>
          <div className="card-top">
            <span className="label">Database Schema</span>
            <Database size={16} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0 6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: health.ready ? '#8ab52e' : '#dc3545',
              }}
            />
            <strong style={{ fontSize: '16px' }}>{health.ready ? 'Alembic Ready' : 'Pending'}</strong>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Endpoint /health/ready</span>
        </article>

        <article className="stat-card" style={{ minHeight: 'auto', padding: '16px 20px' }}>
          <div className="card-top">
            <span className="label">Inference Engine</span>
            <BookOpen size={16} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0 6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: health.model ? '#8ab52e' : '#e09838',
              }}
            />
            <strong style={{ fontSize: '16px' }}>
              {health.model ? 'Model Installed' : 'Pending Training'}
            </strong>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Endpoint /health/model</span>
        </article>
      </section>

      {/* Empty Catalog Notice or Catalog Data */}
      {skills.length === 0 && roles.length === 0 ? (
        <section className="panel" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#f4f6ee',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: '#65802d',
              }}
            >
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
                Catalogs are Clean (Zero Synthetic Seeds)
              </h3>
              <p style={{ fontSize: '12px', color: '#68736b', lineHeight: 1.6, margin: '0 0 16px', maxWidth: '680px' }}>
                As designed, the application starts with empty catalogs. No sample users, fake quiz seeds,
                or placeholder predictions are inserted. When your team has exported a dataset JSON bundle,
                you can import it transactionally:
              </p>
              <div
                style={{
                  background: '#18231f',
                  color: '#c9f466',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '11px',
                  padding: '14px 18px',
                  borderRadius: '6px',
                  lineHeight: 1.7,
                  maxWidth: '580px',
                }}
              >
                <div># Validate dataset contract:</div>
                <div>python -m training.cli validate data/dataset.json</div>
                <div style={{ marginTop: '6px' }}># Import taxonomy to database:</div>
                <div>python -m training.cli import data/dataset.json</div>
                <div style={{ marginTop: '6px' }}># Train offline model artifact:</div>
                <div>python -m training.cli train data/dataset.json --output artifacts/baseline-v1.joblib</div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <section className="panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', margin: '0 0 16px' }}>
              Imported Skills ({filteredSkills.length})
            </h3>
            <div style={{ display: 'grid', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {filteredSkills.map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper)',
                    fontSize: '12px',
                  }}
                >
                  <strong>{s.name}</strong>
                  <span style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                    ID: {s.id} · Prerequisites: {s.prerequisites?.join(', ') || 'None'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', margin: '0 0 16px' }}>
              Imported Job Roles ({filteredRoles.length})
            </h3>
            <div style={{ display: 'grid', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {filteredRoles.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper)',
                    fontSize: '12px',
                  }}
                >
                  <strong>{r.title}</strong>
                  <span style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                    Requirements: {r.requirements?.length || 0} skills configured
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
