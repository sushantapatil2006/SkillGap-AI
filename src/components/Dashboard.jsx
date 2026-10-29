import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Gauge,
  Plus,
  Sparkles,
  Target,
  UserCheck,
} from 'lucide-react'

export function Dashboard({
  profile,
  attempts = [],
  latestResult,
  onOpenProfile,
  onOpenAssessment,
  onAddSkill,
  setActiveTab,
  notify,
}) {
  const latestAttempt = attempts[0]
  const isCompletedAttempt = latestAttempt?.status === 'completed'
  const summary = latestAttempt?.summary

  // Profile readiness score calculation
  const skillsCount = profile?.skills?.length || 0
  const desiredRole = profile?.desired_roles?.[0] || 'Target Role Pending'

  const skillLevelNames = ['New / Exploring', 'Guided Basics', 'Routine Tasks', 'Independent Delivery', 'Design / Architecture']

  return (
    <>
      {/* 3 Metric Cards */}
      <section className="stats-grid">
        <article className="stat-card score-card">
          <div className="card-top">
            <span className="label">Assessment Status</span>
            <Gauge size={18} />
          </div>
          <div className="score-wrap">
            <div className="score-ring">
              {isCompletedAttempt && summary ? (
                <>
                  <strong style={{ fontSize: '18px' }}>
                    {summary.scenario_correct}/{summary.scenario_total}
                  </strong>
                  <span style={{ fontSize: '8px' }}>Scenarios</span>
                </>
              ) : (
                <>
                  <strong style={{ fontSize: '16px' }}>{attempts.length}</strong>
                  <span style={{ fontSize: '8px' }}>Attempts</span>
                </>
              )}
            </div>
            <div>
              <strong className="score-status">
                {isCompletedAttempt ? 'Assessment complete' : latestAttempt ? 'Attempt in progress' : 'Not yet taken'}
              </strong>
              <p>
                {latestAttempt
                  ? `Latest: Version ${latestAttempt.assessment_version}`
                  : 'Start an assessment to record evidence'}
              </p>
            </div>
          </div>
          <div className="card-foot">
            <span className="trend">
              {latestAttempt ? latestAttempt.status.replace('_', ' ') : 'Zero attempts'}
            </span>
            <span>in local database</span>
            <ArrowUpRight size={15} />
          </div>
        </article>

        <article className="stat-card">
          <div className="card-top">
            <span className="label">Target Direction</span>
            <Target size={18} />
          </div>
          <h2 className="role-stat" style={{ fontSize: '18px' }}>{desiredRole}</h2>
          <div className="match-line">
            <span className="dot lime-dot" />
            {profile?.specialization || 'General'} · {profile?.education_level || "Bachelor's degree"}
          </div>
          <div className="card-foot">
            <span>{profile?.experience_months ?? 0} months experience recorded</span>
            <ArrowUpRight size={15} />
          </div>
        </article>

        <article className="stat-card">
          <div className="card-top">
            <span className="label">Active Skill Claims</span>
            <BarChart3 size={18} />
          </div>
          <h2 className="number-stat">
            {skillsCount < 10 ? `0${skillsCount}` : skillsCount}
          </h2>
          <div className="match-line">
            <span className="dot orange-dot" />
            {profile?.skills?.filter((s) => s.level >= 3).length || 0} independent or expert
          </div>
          <div className="card-foot">
            <span>Self-reported with evidence</span>
            <ArrowUpRight size={15} />
          </div>
        </article>
      </section>

      {/* Main Content 2-Column Grid */}
      <section className="content-grid">
        <div className="left-column">
          {/* Panel 1: Career Direction & Compatibility */}
          <section className="panel role-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">01 / Career Direction</p>
                <h2>Target Roles & Compatibility</h2>
              </div>
              <button
                className="text-button"
                onClick={() => setActiveTab('Career paths')}
              >
                View details <ArrowUpRight size={15} />
              </button>
            </div>

            {latestResult?.recommendations?.length > 0 ? (
              <div className="role-list">
                {latestResult.recommendations.map((rec) => (
                  <div key={rec.role_id} className="role-row">
                    <span className="rank">0{rec.rank}</span>
                    <div className="role-avatar lime">
                      {rec.role_title.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="role-title">
                      <strong>{rec.role_title}</strong>
                      <span>
                        {rec.gaps?.length || 0} skill gaps identified
                      </span>
                    </div>
                    <div className="role-score">
                      <strong>{Math.round(rec.compatibility)}%</strong>
                      <span>Compatibility</span>
                    </div>
                    <ArrowUpRight size={16} className="row-arrow" />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px 0 8px' }}>
                <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, margin: '0 0 16px' }}>
                  {isCompletedAttempt
                    ? 'Assessment completed. Role classification model pending offline training via "skillgap-data train".'
                    : 'Complete a skills assessment to snapshot your profile evidence and benchmark role compatibility.'}
                </p>
                <button
                  className="primary-button"
                  onClick={onOpenAssessment}
                  style={{ fontSize: '12px', padding: '10px 16px' }}
                >
                  {isCompletedAttempt ? 'View assessment summary' : 'Start assessment'} <ArrowUpRight size={15} />
                </button>
              </div>
            )}
          </section>

          {/* Panel 2: Real Skill Inventory */}
          <section className="panel skill-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">02 / Technical Toolkit</p>
                <h2>Your Skill Inventory ({skillsCount})</h2>
              </div>
              <button className="add-button" onClick={onAddSkill}>
                <Plus size={15} /> Add skill
              </button>
            </div>

            {skillsCount === 0 ? (
              <div style={{ padding: '24px 0 8px' }}>
                <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, margin: '0 0 16px' }}>
                  No technical skills added to your database profile yet. Add your core languages, frameworks,
                  and tools with self-reported proficiency and evidence.
                </p>
                <button className="secondary-button" onClick={onAddSkill}>
                  <Plus size={15} /> Add first technical skill
                </button>
              </div>
            ) : (
              <div className="skill-grid">
                {profile.skills.map((skill) => {
                  const accents = ['lime', 'blue', 'violet', 'orange', 'pink']
                  const accent = accents[Math.abs(skill.name.length) % accents.length]
                  return (
                    <div className="skill-item" key={skill.name}>
                      <div className={`skill-icon ${accent}`}>
                        {skill.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="skill-details">
                        <strong>{skill.name}</strong>
                        <div className="level-bars">
                          {[0, 1, 2, 3].map((bar) => (
                            <span
                              className={bar < skill.level ? 'filled' : ''}
                              key={bar}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="skill-level" title={skill.evidence || 'No evidence provided'}>
                        {skillLevelNames[Math.max(0, Math.min(4, skill.level))]}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Assessment Feedback & Quote */}
        <aside className="right-column">
          <section className="panel gap-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">03 / Evidence Benchmark</p>
                <h2>Assessment Scenarios</h2>
              </div>
              <span className="count-badge">
                {summary ? summary.scenario_correct : attempts.length}
              </span>
            </div>

            {isCompletedAttempt && summary ? (
              <div>
                <p className="panel-description">
                  {summary.interpretation}
                </p>
                <div style={{ display: 'grid', gap: '10px', margin: '16px 0' }}>
                  {summary.feedback?.slice(0, 3).map((item) => (
                    <div
                      key={item.question_id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: item.correct ? '#f4f8ec' : '#faf3f2',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <strong style={{ textTransform: 'capitalize' }}>
                        {item.competency.replace(/_/g, ' ')}
                      </strong>
                      <span style={{ color: item.correct ? '#526b2a' : '#92362c', fontWeight: 600 }}>
                        {item.correct ? 'Verified' : 'Alternative'}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className="full-button"
                  onClick={() => setActiveTab('Assessments')}
                >
                  View full attempt breakdown <ArrowUpRight size={16} />
                </button>
              </div>
            ) : (
              <div>
                <p className="panel-description">
                  Work-sample scenarios benchmark your troubleshooting, data handling, and requirement
                  clarification abilities without relying on paid AI APIs.
                </p>
                <button
                  className="full-button"
                  onClick={onOpenAssessment}
                >
                  {latestAttempt ? 'Resume attempt' : 'Take skills assessment'} <ArrowUpRight size={16} />
                </button>
              </div>
            )}
          </section>

          <section className="quote-block">
            <Sparkles size={19} />
            <p>
              “Progress is not about knowing everything. It is about knowing what to learn next.”
            </p>
            <span>SkillGap AI Principle</span>
          </section>
        </aside>
      </section>

      {/* Bottom Recommendation Strip */}
      <section className="recommendation-strip">
        <div className="recommendation-intro">
          <span className="intro-icon">
            <BookOpen size={19} />
          </span>
          <div>
            <p className="eyebrow">Prerequisite-First Engine</p>
            <h2 style={{ fontSize: '13px' }}>Sequenced Roadmap</h2>
          </div>
        </div>

        {latestResult?.recommendations?.[0]?.learning_plan?.length > 0 ? (
          latestResult.recommendations[0].learning_plan.slice(0, 3).map((item, idx) => {
            const tones = ['lime', 'orange', 'blue']
            return (
              <div className="recommendation" key={item.skill_id || idx}>
                <div className={`rec-marker ${tones[idx % tones.length]}`} />
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.reason}</small>
                </div>
                <span>Target Level {item.target_level}</span>
              </div>
            )
          })
        ) : (
          <>
            <div className="recommendation">
              <div className="rec-marker lime" />
              <div>
                <strong>Profile & Evidence Setup</strong>
                <small>Record experience & self-reported skills</small>
              </div>
              <span>Step 01</span>
            </div>
            <div className="recommendation">
              <div className="rec-marker orange" />
              <div>
                <strong>Skills Assessment</strong>
                <small>Snapshot profile & answer work scenarios</small>
              </div>
              <span>Step 02</span>
            </div>
            <div className="recommendation">
              <div className="rec-marker blue" />
              <div>
                <strong>Dataset-Driven Roadmap</strong>
                <small>Sequenced prerequisite skill growth</small>
              </div>
              <span>Step 03</span>
            </div>
          </>
        )}
      </section>
    </>
  )
}
