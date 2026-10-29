import { ArrowUpRight, Compass, HelpCircle, Layers, Sparkles, Target } from 'lucide-react'

export function CareerPathsView({ profile, latestResult, attempts = [], onOpenAssessment, onOpenProfile }) {
  const desiredRoles = profile?.desired_roles || []
  const hasCompletedAttempt = attempts.some((a) => a.status === 'completed')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <p className="eyebrow" style={{ margin: '0 0 8px' }}>
            <span className="pulse" /> Role Predictions & Signal Analysis
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: 0, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            Career Paths & Compatibility
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '12px 0 0', maxWidth: '640px', lineHeight: 1.6 }}>
            Roles are ranked based on evidence extracted from your profile summaries and technical claims.
            Compatibility represents weighted coverage of role skill requirements.
          </p>
        </div>

        <button className="primary-button" onClick={onOpenAssessment}>
          {hasCompletedAttempt ? 'Re-take assessment' : 'Start assessment'} <ArrowUpRight size={15} />
        </button>
      </div>

      {latestResult?.recommendations?.length > 0 ? (
        <div style={{ display: 'grid', gap: '20px' }}>
          {latestResult.recommendations.map((rec) => (
            <div key={rec.role_id} className="panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: '#18231f',
                        color: 'var(--lime)',
                        fontFamily: 'DM Mono',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      RANK #{rec.rank}
                    </span>
                    <h2 style={{ fontSize: '20px', margin: 0, letterSpacing: '-0.6px' }}>{rec.role_title}</h2>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '8px 0 0' }}>
                    Calculated from your snapshotted profile evidence and work scenarios.
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1.5px', color: '#526b2a' }}>
                    {Math.round(rec.compatibility)}%
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                    COMPATIBILITY
                  </span>
                </div>
              </div>

              {/* Strengths & Gaps */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
                <div style={{ background: '#f3f8ec', padding: '16px', borderRadius: '8px' }}>
                  <strong style={{ fontSize: '12px', color: '#49601d', display: 'block', marginBottom: '8px' }}>
                    VERIFIED STRENGTHS ({rec.strengths?.length || 0})
                  </strong>
                  {rec.strengths?.length > 0 ? (
                    <div style={{ display: 'grid', gap: '6px' }}>
                      {rec.strengths.map((s) => (
                        <div key={s.skill_id} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{s.name}</span>
                          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Self-reported</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>No strengths met target level</span>
                  )}
                </div>

                <div style={{ background: '#faf3ec', padding: '16px', borderRadius: '8px' }}>
                  <strong style={{ fontSize: '12px', color: '#885016', display: 'block', marginBottom: '8px' }}>
                    SKILL GAPS TO CLOSE ({rec.gaps?.length || 0})
                  </strong>
                  {rec.gaps?.length > 0 ? (
                    <div style={{ display: 'grid', gap: '6px' }}>
                      {rec.gaps.slice(0, 4).map((g) => (
                        <div key={g.skill_id} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{g.name}</span>
                          <span style={{ color: '#885016', fontWeight: 600, fontSize: '11px' }}>
                            Level {g.reported_level} → {g.required_level}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>No gaps identified for this role</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <section className="panel" style={{ padding: '36px' }}>
          <div style={{ maxWidth: '640px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'var(--lime)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '16px',
                color: '#49601d',
              }}
            >
              <Compass size={22} />
            </div>

            <h3 style={{ fontSize: '18px', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              {hasCompletedAttempt
                ? 'Model Training Pending (Zero Synthetic Guesses)'
                : 'Take an assessment to generate evidence-based predictions'}
            </h3>

            <p style={{ fontSize: '13px', color: '#667269', lineHeight: 1.6, margin: '0 0 20px' }}>
              {hasCompletedAttempt
                ? 'Your assessment is complete and saved in the database! As documented in the backend README, role prediction uses an offline trained scikit-learn model ("skillgap-data train data/dataset.json"). Until a model artifact is installed, the backend safely returns 503 model_unavailable rather than inventing arbitrary predictions.'
                : 'Your profile target role is currently set to: ' +
                  (desiredRoles[0] || 'Unassigned') +
                  '. Complete a skills assessment to snapshot your technical evidence and compute real weighted compatibility.'}
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="primary-button" onClick={onOpenAssessment}>
                {hasCompletedAttempt ? 'Review assessment attempts' : 'Start skills assessment'} <ArrowUpRight size={15} />
              </button>
              <button className="secondary-button" onClick={onOpenProfile}>
                Edit target roles in profile
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
