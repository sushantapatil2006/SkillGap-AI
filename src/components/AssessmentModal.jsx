import { useEffect, useState } from 'react'
import { ArrowUpRight, Check, ChevronRight, X } from 'lucide-react'
import {
  completeAttempt,
  createAttempt,
  getCurrentAssessment,
  saveAnswers,
} from '../api/assessment'
import { createCareerResult } from '../api/career'

export function AssessmentModal({ onClose, onComplete, notify }) {
  const [assessmentDef, setAssessmentDef] = useState(null)
  const [attemptId, setAttemptId] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function start() {
      try {
        setLoading(true)
        const def = await getCurrentAssessment()
        setAssessmentDef(def)

        // Try creating an attempt on backend
        try {
          const attempt = await createAttempt()
          setAttemptId(attempt.id)
          if (attempt.answers) {
            setAnswers(attempt.answers)
          }
        } catch (attemptErr) {
          // If profile not yet saved, inform user
          if (attemptErr.status === 409) {
            setError('Please save your profile first before starting an assessment.')
          }
        }
      } catch (err) {
        setError('Failed to load assessment. Connect to the backend to proceed.')
      } finally {
        setLoading(false)
      }
    }
    start()
  }, [])

  const questions = assessmentDef?.questions || []
  const currentQuestion = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1

  function handleAnswerChange(value) {
    if (!currentQuestion) return
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }))
  }

  async function handleNext() {
    if (!currentQuestion) return
    const value = answers[currentQuestion.id]

    if (currentQuestion.required && (value === undefined || value === '')) {
      setError('This question is required.')
      return
    }
    setError('')

    // Save answer to backend if attempt is active
    if (attemptId) {
      saveAnswers(attemptId, [
        { question_id: currentQuestion.id, value: value || '' },
      ]).catch(() => {})
    }

    if (!isLast) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      await handleComplete()
    }
  }

  async function handleComplete() {
    setSubmitting(true)
    setError('')
    try {
      if (attemptId) {
        // Submit all answers batch
        const batch = Object.entries(answers).map(([qid, val]) => ({
          question_id: qid,
          value: val,
        }))
        if (batch.length > 0) {
          await saveAnswers(attemptId, batch)
        }
        await completeAttempt(attemptId)

        // Try to generate career results
        try {
          await createCareerResult(attemptId)
        } catch (resultErr) {
          // 503 model_unavailable is normal before dataset training
          if (resultErr?.status !== 503) {
            console.warn('Career result generation note:', resultErr)
          }
        }
      }
      notify('Assessment successfully completed!')
      onComplete?.()
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to complete assessment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              Skill assessment {questions.length > 0 && `• Step ${currentIndex + 1} of ${questions.length}`}
            </p>
            <h2>{assessmentDef?.sections?.find((s) => s.id === currentQuestion?.section)?.title || 'Career Readiness'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <p className="modal-copy">Loading assessment questions...</p>
        ) : error && !currentQuestion ? (
          <div>
            <p className="modal-copy" style={{ color: '#b03d32' }}>{error}</p>
            <div className="modal-actions">
              <button className="primary-button" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : currentQuestion ? (
          <div>
            <p className="modal-copy" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
              {currentQuestion.prompt}
            </p>

            {currentQuestion.rationale && (
              <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px', marginBottom: '14px' }}>
                {currentQuestion.rationale}
              </small>
            )}

            {currentQuestion.type === 'single' && currentQuestion.options ? (
              <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleAnswerChange(opt.value)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      borderRadius: '7px',
                      border: answers[currentQuestion.id] === opt.value ? '2px solid #8ab52e' : '1px solid var(--line)',
                      background: answers[currentQuestion.id] === opt.value ? '#f0f6e4' : 'var(--paper)',
                      fontWeight: answers[currentQuestion.id] === opt.value ? 700 : 500,
                      fontSize: '12px',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <label>
                Your response
                <textarea
                  rows={4}
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'Manrope',
                    outline: 'none',
                  }}
                  placeholder="Provide concrete details or evidence..."
                  maxLength={currentQuestion.max_length || 3000}
                />
              </label>
            )}

            {error && (
              <p style={{ color: '#b03d32', fontSize: '11px', marginTop: '10px' }}>{error}</p>
            )}

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              {currentIndex > 0 && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setError('')
                    setCurrentIndex((i) => i - 1)
                  }}
                >
                  Previous
                </button>
              )}
              <button
                type="button"
                className="primary-button"
                onClick={handleNext}
                disabled={submitting}
              >
                {isLast ? (submitting ? 'Submitting...' : 'Complete assessment') : 'Next question'}{' '}
                {isLast ? <Check size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        ) : (
          <p className="modal-copy">No questions available.</p>
        )}
      </div>
    </div>
  )
}
