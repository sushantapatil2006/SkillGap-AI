import { ArrowUpRight, BookOpen, CheckCircle2, ChevronRight, HelpCircle, Sparkles } from 'lucide-react'

export function LearningPlanView({ latestResult, attempts = [], onOpenAssessment, onOpenProfile }) {
  const learningPlan = latestResult?.recommendations?.[0]?.learning_plan || []
  const roleTitle = latestResult?.recommendations?.[0]?.role_title || 'Target Role'
  const hasCompletedAttempt = attempts.some((a) => a.status === 'completed')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <p className="eyebrow" style={{ margin: '0 0 8px' }}>
            <span className="pulse" /> Prerequisite-First Curriculum Sequencing
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: 0, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            Sequenced Learning Plan
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '12px 0 0', maxWidth: '640px', lineHeight: 1.6 }}>
            Skill gaps are automatically ordered according to dataset prerequisites. Foundations are
            scheduled first so each project milestone builds on solid engineering ground.
          </p>
        </div>

        <button className="primary-button" onClick={onOpenAssessment}>
          {hasCompletedAttempt ? 'Re-take assessment' : 'Start assessment'} <ArrowUpRight size={15} />
        </button>
      </div>

      {learningPlan.length > 0 ? (
        <div>
          <div
            style={{
              background: '#f2f7e8',
              border: '1px solid #dce8ca',
              padding: '18px 24px',
              borderRadius: '8px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong style={{ fontSize: '13px', color: '#4d6823' }}>
                Curriculum Sequenced for: {roleTitle}
              </strong>
              <p style={{ fontSize: '12px', color: '#61793c', margin: '4px 0 0' }}>
                {learningPlan.length} milestone actions generated using prerequisite topology.
              </p>
            </div>
            <span
              style={{
                fontFamily: 'DM Mono',
                fontSize: '11px',
                background: '#e0efc4',
                color: '#445f1b',
                padding: '4px 10px',
                borderRadius: '12px',
                fontWeight: 700,
              }}
            >
              PREREQUISITES FIRST
            </span>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {learningPlan.map((step, idx) => (
              <div
                key={step.skill_id || idx}
                className="panel"
                style={{ padding: '24px 28px', display: 'flex', alignItems: 'flex-start', gap: '20px' }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#18231f',
                    color: 'var(--lime)',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'DM Mono',
                    fontSize: '13px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  0{idx + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '17px', margin: 0, letterSpacing: '-0.4px' }}>
                      {step.name}
                    </h3>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: '#edf3e5',
                        color: '#49601d',
                        fontSize: '11px',
                        fontFamily: 'DM Mono',
                        fontWeight: 600,
                      }}
                    >
                      Target Level {step.target_level}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: '#885016', margin: '6px 0 10px', fontWeight: 600 }}>
                    Reason: {step.reason}
                  </p>

                  <p style={{ fontSize: '12px', color: '#68736b', margin: 0, lineHeight: 1.5 }}>
                    <strong>Next action:</strong> {step.next_action}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '28px',
              padding: '16px 20px',
              borderRadius: '8px',
              background: '#fafbf8',
              border: '1px solid var(--line)',
            }}
          >
            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
              <strong>Scientific Limitation Notice:</strong> Learning order uses dataset prerequisites;
              no learning-duration or employability guarantee is made. Scenario scores provide separate evidence
              and do not establish technical mastery.
            </p>
          </div>
        </div>
      ) : (
        <section className="panel" style={{ padding: '36px' }}>
          <div style={{ maxWidth: '640px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'var(--orange)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '16px',
                color: '#89551c',
              }}
            >
              <BookOpen size={22} />
            </div>

            <h3 style={{ fontSize: '18px', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              No Active Learning Plan Generated Yet
            </h3>

            <p style={{ fontSize: '13px', color: '#667269', lineHeight: 1.6, margin: '0 0 20px' }}>
              Learning roadmaps are sequenced dynamically once role compatibility is calculated for a
              completed assessment. The algorithm identifies gaps, checks prerequisites (e.g. foundational
              Python before Deep Learning), and schedules dependent skills in topological order.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="primary-button" onClick={onOpenAssessment}>
                {hasCompletedAttempt ? 'Review assessment attempts' : 'Start skills assessment'} <ArrowUpRight size={15} />
              </button>
              <button className="secondary-button" onClick={onOpenProfile}>
                Update profile & skills
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
