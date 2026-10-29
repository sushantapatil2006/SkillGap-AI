import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react'
import {
  completeAttempt,
  createAttempt,
  getAttempt,
  listAttempts,
  saveAnswers,
} from '../api/assessment'
import { createCareerResult, getCareerResult } from '../api/career'

export function AssessmentView({ profile, onOpenProfile, notify, onSelectAttemptResult }) {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeAttempt, setActiveAttempt] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [viewingSummaryAttempt, setViewingSummaryAttempt] = useState(null)
  const [careerResult, setCareerResult] = useState(null)
  const [loadingResult, setLoadingResult] = useState(false)

  // Fetch attempts on mount
  useEffect(() => {
    loadAttempts()
  }, [])

  async function loadAttempts() {
    setLoading(true)
    try {
      const data = await listAttempts()
      setAttempts(data || [])
    } catch (err) {
      notify(`Failed to load attempts: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleStartNewAttempt() {
    if (!profile) {
      notify('Please set up your profile before taking an assessment.')
      onOpenProfile?.()
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const newAttempt = await createAttempt()
      setActiveAttempt(newAttempt)
      setAnswers(newAttempt.answers || {})
      setCurrentIndex(0)
      notify('Started new assessment attempt.')
      await loadAttempts()
    } catch (err) {
      if (err.status === 409) {
        setError('Please save your profile in the database before starting an assessment.')
        notify('Please save your profile first.')
      } else {
        setError(err.message || 'Failed to start attempt.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResumeAttempt(attemptId) {
    setSubmitting(true)
    setError('')
    try {
      const attemptData = await getAttempt(attemptId)
      setActiveAttempt(attemptData)
      setAnswers(attemptData.answers || {})

      // Find first unanswered question
      const activeQuestions = getActiveQuestions(attemptData.assessment?.questions, attemptData.answers || {})
      const firstUnansweredIndex = activeQuestions.findIndex(
        (q) => !attemptData.answers?.[q.id]
      )
      setCurrentIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0)
    } catch (err) {
      setError(`Failed to resume attempt: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleViewSummary(attemptId) {
    setLoadingResult(true)
    setCareerResult(null)
    try {
      const attemptData = await getAttempt(attemptId)
      setViewingSummaryAttempt(attemptData)

      // Try fetching prediction if attempt is completed
      if (attemptData.status === 'completed') {
        try {
          const res = await getCareerResult(attemptId)
          setCareerResult(res)
          onSelectAttemptResult?.(res)
        } catch (resErr) {
          // If no prediction generated yet, offer generation
          if (resErr?.status === 404) {
            try {
              const generated = await createCareerResult(attemptId)
              setCareerResult(generated)
              onSelectAttemptResult?.(generated)
            } catch (genErr) {
              // 503 model_unavailable is expected when model isn't trained yet
              if (genErr?.status === 503) {
                setCareerResult({ modelUnavailable: true, detail: genErr.message })
              }
            }
          } else if (resErr?.status === 503) {
            setCareerResult({ modelUnavailable: true, detail: resErr.message })
          }
        }
      }
    } catch (err) {
      notify(`Could not load summary: ${err.message}`)
    } finally {
      setLoadingResult(false)
    }
  }

  // Helper to filter questions respecting 'when' conditions
  function getActiveQuestions(allQuestions = [], currentAnswers = {}) {
    return allQuestions.filter((q) => {
      if (!q.when) return true
      const parentValue = currentAnswers[q.when.question_id]
      return q.when.values?.includes(parentValue)
    })
  }

  const questions = getActiveQuestions(
    activeAttempt?.assessment?.questions || [],
    answers
  )
  const currentQuestion = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1

  function handleAnswerSelect(value) {
    if (!currentQuestion) return
    const updated = { ...answers, [currentQuestion.id]: value }

    // If changing track, server discards inapplicable answers; mirror locally
    if (currentQuestion.id === 'track') {
      const validQuestions = getActiveQuestions(
        activeAttempt?.assessment?.questions || [],
        updated
      )
      const validIds = new Set(validQuestions.map((q) => q.id))
      Object.keys(updated).forEach((k) => {
        if (!validIds.has(k)) delete updated[k]
      })
    }

    setAnswers(updated)

    // Save answer to backend
    if (activeAttempt?.id) {
      saveAnswers(activeAttempt.id, [{ question_id: currentQuestion.id, value }]).catch(
        (err) => console.warn('Autosave warning:', err)
      )
    }
  }

  async function handleNextStep() {
    if (!currentQuestion) return
    const currentVal = answers[currentQuestion.id]

    if (currentQuestion.required && (currentVal === undefined || currentVal === '')) {
      setError('Please provide an answer before continuing.')
      return
    }
    setError('')

    // Ensure current answer is synced to backend before advancing
    if (activeAttempt?.id && currentVal !== undefined) {
      try {
        await saveAnswers(activeAttempt.id, [{ question_id: currentQuestion.id, value: currentVal }])
      } catch (err) {
        console.warn('Save on next error:', err)
      }
    }

    if (!isLast) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      await handleCompleteAttempt()
    }
  }

  async function handleCompleteAttempt() {
    if (!activeAttempt?.id) return
    setSubmitting(true)
    setError('')
    try {
      const completed = await completeAttempt(activeAttempt.id)
      // Pre-generate career result so summary view does not log 404 on initial check
      try {
        await createCareerResult(completed.id)
      } catch {
        // Model might be unavailable or already computed
      }
      setActiveAttempt(null)
      notify('Assessment successfully completed and frozen in database!')
      await loadAttempts()
      await handleViewSummary(completed.id)
    } catch (err) {
      setError(err?.message || 'Failed to complete assessment.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- RENDER 1: Active Assessment In-Progress Runner ---
  if (activeAttempt) {
    return (
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <p className="eyebrow" style={{ margin: '0 0 6px' }}>
              Assessment Version {activeAttempt.assessment_version} · Step {currentIndex + 1} of {questions.length}
            </p>
            <h2 style={{ margin: 0, fontSize: '24px', letterSpacing: '-0.8px' }}>
              {activeAttempt.assessment?.title || 'Skills Assessment'}
            </h2>
          </div>
          <button
            className="secondary-button"
            onClick={() => {
              setActiveAttempt(null)
              loadAttempts()
            }}
            style={{ fontSize: '12px' }}
          >
            Save & Exit
          </button>
        </div>

        {/* Progress indicator */}
        <div className="progress-track" style={{ margin: '0 0 32px', height: '6px' }}>
          <span style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }} />
        </div>

        {currentQuestion && (
          <div className="panel" style={{ padding: '32px' }}>
            <span
              style={{
                fontFamily: 'DM Mono',
                fontSize: '11px',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '10px',
              }}
            >
              Section: {currentQuestion.section} {currentQuestion.required ? '(Required)' : '(Optional)'}
            </span>

            <h3 style={{ fontSize: '18px', margin: '0 0 12px', lineHeight: 1.35, letterSpacing: '-0.4px' }}>
              {currentQuestion.prompt}
            </h3>

            {currentQuestion.rationale && (
              <p style={{ fontSize: '11px', color: '#7a857e', margin: '0 0 24px', fontStyle: 'italic' }}>
                Context: {currentQuestion.rationale}
              </p>
            )}

            {currentQuestion.type === 'single' ? (
              <div style={{ display: 'grid', gap: '10px', margin: '20px 0' }}>
                {currentQuestion.options?.map((opt) => {
                  const isSelected = answers[currentQuestion.id] === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleAnswerSelect(opt.value)}
                      style={{
                        textAlign: 'left',
                        padding: '14px 18px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #8ab52e' : '1px solid var(--line)',
                        background: isSelected ? '#f2f8e6' : 'var(--paper)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={16} color="#607e2a" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div style={{ margin: '20px 0' }}>
                <textarea
                  rows={5}
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }))
                  }}
                  onBlur={(e) => {
                    if (activeAttempt?.id) {
                      saveAnswers(activeAttempt.id, [{ question_id: currentQuestion.id, value: e.target.value }]).catch(
                        (err) => console.warn('Autosave warning:', err)
                      )
                    }
                  }}
                  placeholder="Provide concrete details or evidence from your projects..."
                  maxLength={currentQuestion.max_length || 3000}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    fontFamily: 'Manrope',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'DM Mono', float: 'right' }}>
                  {(answers[currentQuestion.id] || '').length} / {currentQuestion.max_length || 3000} chars
                </span>
              </div>
            )}

            {error && (
              <div
                style={{
                  color: '#b03d32',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '16px',
                }}
              >
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '36px' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setError('')
                  if (currentIndex > 0) setCurrentIndex((i) => i - 1)
                }}
                disabled={currentIndex === 0 || submitting}
              >
                Previous
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleNextStep}
                disabled={submitting}
              >
                {isLast ? (submitting ? 'Completing...' : 'Finish assessment') : 'Next question'}{' '}
                {isLast ? <Check size={16} /> : <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- RENDER 2: View Completed Attempt Summary & Scenario Review ---
  if (viewingSummaryAttempt) {
    const summary = viewingSummaryAttempt.summary
    return (
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <button
          className="text-button"
          onClick={() => {
            setViewingSummaryAttempt(null)
            setCareerResult(null)
          }}
          style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ← Back to attempts list
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <p className="eyebrow" style={{ margin: '0 0 6px' }}>
              Attempt Results · Version {viewingSummaryAttempt.assessment_version}
            </p>
            <h2 style={{ fontSize: '26px', margin: 0, letterSpacing: '-0.9px' }}>
              Assessment Evaluation
            </h2>
          </div>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontFamily: 'DM Mono',
              background: '#e9f3d5',
              color: '#536e29',
              fontWeight: 700,
            }}
          >
            COMPLETED
          </span>
        </div>

        {summary ? (
          <div className="panel" style={{ padding: '28px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
              <div className="score-ring" style={{ width: '74px', height: '74px' }}>
                <strong style={{ fontSize: '22px' }}>
                  {summary.scenario_correct}/{summary.scenario_total}
                </strong>
                <span>Scenarios</span>
              </div>
              <div>
                <strong style={{ fontSize: '15px' }}>
                  Situational Scenarios Verified
                </strong>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
                  {summary.interpretation}
                </p>
              </div>
            </div>

            <h4 style={{ fontSize: '13px', margin: '24px 0 12px', fontFamily: 'DM Mono', color: 'var(--muted)' }}>
              SCENARIO COMPETENCY BREAKDOWN
            </h4>

            <div style={{ display: 'grid', gap: '10px' }}>
              {summary.feedback?.map((item) => (
                <div
                  key={item.question_id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    background: item.correct ? '#f3f8e8' : '#faf1f0',
                    border: `1px solid ${item.correct ? '#d7e7b4' : '#eed6d5'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.correct ? (
                        <CheckCircle2 size={16} color="#607e2a" />
                      ) : (
                        <XCircle size={16} color="#b03d32" />
                      )}
                      <strong style={{ fontSize: '13px' }}>
                        {item.competency.replace(/_/g, ' ').toUpperCase()}
                      </strong>
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'DM Mono', color: item.correct ? '#526b2a' : '#92362c' }}>
                      {item.correct ? 'Verified' : 'Alternative response'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#555', margin: '8px 0 0', lineHeight: 1.5 }}>
                    {item.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="panel" style={{ padding: '24px', marginBottom: '24px' }}>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>
              This attempt does not contain a scored scenario summary.
            </p>
          </div>
        )}

        {/* Career Predictions Integration */}
        <div className="panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
            Role Compatibility & Predictions
          </h3>

          {loadingResult ? (
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Checking career results...</p>
          ) : careerResult?.modelUnavailable ? (
            <div
              style={{
                background: '#fcf8ee',
                border: '1px solid #f3e4be',
                padding: '16px',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#906a1c', marginBottom: '6px' }}>
                <HelpCircle size={16} />
                <strong style={{ fontSize: '13px' }}>Offline Machine Learning Model Pending</strong>
              </div>
              <p style={{ fontSize: '12px', color: '#6d5a2d', lineHeight: 1.6, margin: 0 }}>
                {careerResult.detail ||
                  'The role classification model is not yet trained. Run "skillgap-data train data/dataset.json" and set MODEL_PATH in backend/.env to activate ranking.'}
              </p>
            </div>
          ) : careerResult?.recommendations?.length > 0 ? (
            <div>
              <p style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>
                Based on your profile evidence snapshot and assessment:
              </p>
              <div style={{ display: 'grid', gap: '10px' }}>
                {careerResult.recommendations.map((rec) => (
                  <div
                    key={rec.role_id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      background: 'var(--paper)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '13px' }}>{rec.role_title}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)' }}>
                        Rank #{rec.rank}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#536e29', fontSize: '14px' }}>
                      {Math.round(rec.compatibility)}% match
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
              No predictions calculated for this attempt yet.
            </p>
          )}
        </div>
      </div>
    )
  }

  // --- RENDER 3: Attempts List & Assessment Hub ---
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <p className="eyebrow" style={{ margin: '0 0 8px' }}>
            <span className="pulse" /> Original Authored Assessment · Version 2026-10-v1
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: 0, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            Skills & Scenario Assessments
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '12px 0 0', maxWidth: '640px', lineHeight: 1.6 }}>
            Each assessment snapshots your current profile and presents behaviorally anchored questions
            and situational work scenarios. Completed attempts are immutable records in the database.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={handleStartNewAttempt}
          disabled={submitting}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Play size={15} /> Start new attempt <ArrowUpRight size={15} />
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#fdf2f2',
            border: '1px solid #ebd0d0',
            color: '#b03d32',
            padding: '14px 18px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          {!profile && (
            <button
              className="primary-button"
              onClick={onOpenProfile}
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              Set up profile now
            </button>
          )}
        </div>
      )}

      {/* Attempts Table / List */}
      <section className="panel" style={{ padding: '24px' }}>
        <div className="panel-heading" style={{ marginBottom: '20px' }}>
          <div>
            <p className="eyebrow">Database Records</p>
            <h2 style={{ fontSize: '17px' }}>Your Assessment Attempts</h2>
          </div>
          <span style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'var(--muted)' }}>
            {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'} recorded
          </span>
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: '12px', margin: 0 }}>
            Querying attempts from database...
          </p>
        ) : attempts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <ClipboardList size={32} color="#a0aba3" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', margin: '0 0 8px' }}>No assessments completed yet</h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.6 }}>
              Start an assessment to benchmark your technical autonomy, practical experience, and work-sample
              engineering scenarios across Data, Software, or Cloud tracks.
            </p>
            <button className="primary-button" onClick={handleStartNewAttempt}>
              Start your first assessment <ArrowUpRight size={15} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {attempts.map((att, idx) => {
              const isCompleted = att.status === 'completed'
              const dateStr = new Date(att.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div
                  key={att.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'var(--muted)' }}>
                      #{attempts.length - idx}
                    </span>
                    <div>
                      <strong style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Version {att.assessment_version}
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '9px',
                            fontFamily: 'DM Mono',
                            textTransform: 'uppercase',
                            background: isCompleted ? '#e9f4d3' : '#faeedb',
                            color: isCompleted ? '#536e29' : '#8f601b',
                          }}
                        >
                          {att.status.replace('_', ' ')}
                        </span>
                      </strong>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '3px' }}>
                        Initiated {dateStr}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {isCompleted ? (
                      <button
                        className="secondary-button"
                        onClick={() => handleViewSummary(att.id)}
                        style={{ fontSize: '11px', padding: '8px 14px' }}
                      >
                        View feedback & results <ChevronRight size={14} />
                      </button>
                    ) : (
                      <button
                        className="primary-button"
                        onClick={() => handleResumeAttempt(att.id)}
                        style={{ fontSize: '11px', padding: '8px 14px' }}
                      >
                        Resume attempt <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
