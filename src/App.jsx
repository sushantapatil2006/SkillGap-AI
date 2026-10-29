import { LandingPage } from './components/LandingPage'
import { Workspace } from './components/Workspace'
import { useAuth } from './context/AuthContext'

export default function App() {
  const { user, loading, login, register } = useAuth()

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f6f7f2',
          color: '#18231f',
          fontFamily: 'Manrope, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="brand-mark"
            style={{
              width: '42px',
              height: '42px',
              fontSize: '20px',
              margin: '0 auto 16px',
            }}
          >
            S
          </div>
          <p
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '11px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Connecting to SkillGap AI...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LandingPage onLogin={login} onRegister={register} />
  }

  return <Workspace />
}
