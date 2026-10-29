import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Compass,
  Cpu,
  Database,
  Layers,
  Lock,
  Server,
  Sparkles,
  Target,
} from 'lucide-react'
import { checkHealthLive, checkHealthModel, checkHealthReady } from '../api/health'
import { AuthModal } from './AuthModal'

export function LandingPage({ onLogin, onRegister }) {
  const [authMode, setAuthMode] = useState(null) // 'login' | 'register' | null
  const [healthStatus, setHealthStatus] = useState({
    live: false,
    ready: false,
    modelAvailable: false,
    checked: false,
  })

  useEffect(() => {
    async function checkBackend() {
      try {
        const [live, ready, model] = await Promise.allSettled([
          checkHealthLive(),
          checkHealthReady(),
          checkHealthModel(),
        ])
        setHealthStatus({
          live: live.status === 'fulfilled' && live.value?.status === 'ok',
          ready: ready.status === 'fulfilled' && ready.value?.status === 'ready',
          modelAvailable: model.status === 'fulfilled' && Boolean(model.value?.available),
          checked: true,
        })
      } catch {
        setHealthStatus({ live: false, ready: false, modelAvailable: false, checked: true })
      }
    }
    checkBackend()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7f2', color: '#18231f' }}>
      {/* Top Navbar */}
      <header
        style={{
          height: '76px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 5vw',
          borderBottom: '1px solid #e2e6de',
          background: 'rgba(251, 252, 248, 0.85)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="brand" style={{ padding: 0 }}>
            <span className="brand-mark">S</span>
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.7px' }}>
              skillgap<span className="brand-dot">.</span>ai
            </span>
          </div>

          <div
            style={{
              marginLeft: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'DM Mono, monospace',
              fontSize: '10px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: healthStatus.ready ? '#eaf4d3' : '#fae8e6',
              color: healthStatus.ready ? '#536e29' : '#a2392f',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: healthStatus.ready ? '#8ab52e' : '#dc3545',
              }}
            />
            {healthStatus.ready ? 'Backend API live & ready' : 'Connecting to API...'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#77817a',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <CircleHelp size={16} /> API Docs
          </a>

          <button
            className="secondary-button"
            onClick={() => setAuthMode('login')}
            style={{ padding: '9px 16px', fontSize: '12px' }}
          >
            Log in
          </button>

          <button
            className="primary-button"
            onClick={() => setAuthMode('register')}
            style={{ padding: '9px 18px', fontSize: '12px' }}
          >
            Sign up <ArrowUpRight size={15} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '68px 5vw 48px' }}>
        <div style={{ maxWidth: '820px' }}>
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <span className="pulse" /> Original Authored Assessment · Version 2026-10-v1
          </p>

          <h1
            style={{
              fontSize: 'clamp(36px, 5.5vw, 64px)',
              lineHeight: 1.05,
              letterSpacing: '-3px',
              margin: '0 0 24px',
              fontWeight: 800,
            }}
          >
            Your next move, <em>made clearer</em> — backed by real evidence.
          </h1>

          <p
            style={{
              fontSize: '16px',
              lineHeight: 1.65,
              color: '#656f68',
              maxWidth: '680px',
              margin: '0 0 36px',
            }}
          >
            No fake scores or placeholder predictions. SkillGap AI combines behaviorally anchored
            proficiency levels, versioned situational engineering scenarios, and dataset-driven role
            compatibility directly stored in your database.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
            <button
              className="primary-button"
              onClick={() => setAuthMode('register')}
              style={{ padding: '14px 26px', fontSize: '13px' }}
            >
              <Sparkles size={17} /> Create free account <ArrowUpRight size={16} />
            </button>

            <button
              className="secondary-button"
              onClick={() => setAuthMode('login')}
              style={{ padding: '14px 22px', fontSize: '13px' }}
            >
              Sign in to existing workspace
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
            marginTop: '60px',
          }}
        >
          <div className="panel" style={{ padding: '24px 22px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--lime)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '16px',
                color: '#49601d',
              }}
            >
              <Target size={20} />
            </div>
            <p className="eyebrow" style={{ margin: '0 0 6px' }}>
              01 / Evidence-based
            </p>
            <h3 style={{ fontSize: '16px', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Behaviorally Anchored Profile
            </h3>
            <p style={{ fontSize: '12px', color: '#747f78', lineHeight: 1.6, margin: 0 }}>
              Self-report skill proficiency using 5 standardized tiers (from guided basics to independent
              delivery and system architecture) accompanied by concrete project evidence.
            </p>
          </div>

          <div className="panel" style={{ padding: '24px 22px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--blue)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '16px',
                color: '#2d5b79',
              }}
            >
              <Compass size={20} />
            </div>
            <p className="eyebrow" style={{ margin: '0 0 6px' }}>
              02 / Versioned Content
            </p>
            <h3 style={{ fontSize: '16px', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Situational Work Assessment
            </h3>
            <p style={{ fontSize: '12px', color: '#747f78', lineHeight: 1.6, margin: 0 }}>
              Select your track (Data & ML, Software Development, Cloud & DevOps, or Exploration) to
              tackle realistic engineering troubleshooting and design scenarios with instant scoring.
            </p>
          </div>

          <div className="panel" style={{ padding: '24px 22px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--violet)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '16px',
                color: '#5b4a85',
              }}
            >
              <Layers size={20} />
            </div>
            <p className="eyebrow" style={{ margin: '0 0 6px' }}>
              03 / Weighted Metrics
            </p>
            <h3 style={{ fontSize: '16px', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Requirement Skill Gaps
            </h3>
            <p style={{ fontSize: '12px', color: '#747f78', lineHeight: 1.6, margin: 0 }}>
              Mathematical compatibility computation based on weighted required skills. Unassessed
              skills are transparently flagged instead of guessed.
            </p>
          </div>

          <div className="panel" style={{ padding: '24px 22px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--orange)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '16px',
                color: '#89551c',
              }}
            >
              <BookOpen size={20} />
            </div>
            <p className="eyebrow" style={{ margin: '0 0 6px' }}>
              04 / Sequenced Roadmap
            </p>
            <h3 style={{ fontSize: '16px', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Prerequisite-First Learning
            </h3>
            <p style={{ fontSize: '12px', color: '#747f78', lineHeight: 1.6, margin: 0 }}>
              Actionable recommendations that order foundational prerequisite skills before advanced
              technologies so each step builds tangible project mastery.
            </p>
          </div>
        </div>

        {/* System & Architecture Transparency Banner */}
        <div
          className="quote-block"
          style={{
            marginTop: '32px',
            background: '#18231f',
            color: '#edf5e8',
            padding: '28px 32px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Lock size={18} color="var(--lime)" />
              <strong style={{ fontSize: '14px', letterSpacing: '-0.3px' }}>
                Secure, Private & Reproducible Design
              </strong>
            </div>
            <p style={{ fontSize: '12px', color: '#a0b1a5', margin: 0, maxWidth: '650px', lineHeight: 1.6 }}>
              Argon2id password hashing, rotating HttpOnly refresh cookies, SQLite/PostgreSQL schema
              migrations, and local offline scikit-learn training. All actions are executed directly
              against your backend database.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="primary-button"
              onClick={() => setAuthMode('register')}
              style={{
                background: 'var(--lime)',
                color: '#18231f',
                padding: '11px 18px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              Get started now <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Auth Modals */}
      {authMode && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
          onLogin={onLogin}
          onRegister={onRegister}
        />
      )}
    </div>
  )
}
