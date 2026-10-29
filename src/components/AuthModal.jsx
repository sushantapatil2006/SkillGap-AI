import { useState } from 'react'
import { ArrowUpRight, X } from 'lucide-react'

export function AuthModal({ initialMode = 'login', onClose, onLogin, onRegister }) {
  const [mode, setMode] = useState(initialMode) // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    setError('')

    const cleanEmail = email.trim()
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please provide a valid email address.')
      return
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters long.')
      return
    }

    if (password.length > 128) {
      setError('Password must not exceed 128 characters.')
      return
    }

    setLoading(true)
    try {
      if (isRegister) {
        await onRegister(cleanEmail, password)
      } else {
        await onLogin(cleanEmail, password)
      }
      onClose()
    } catch (err) {
      const errMsg = err?.message || 'Operation failed'
      // If logging in and account not found or invalid credentials, provide helpful hint
      if (!isRegister && (errMsg.includes('401') || errMsg.includes('Invalid email or password'))) {
        setError('Invalid email or password. If you are new, click "Create an account" below.')
      } else {
        setError(errMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal auth-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Your workspace</p>
            <h2>{isRegister ? 'Create your account' : 'Sign in to sync'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <p className="modal-copy">
          {isRegister
            ? 'Set up your credentials to store career profiles and evidence securely.'
            : 'Connect to your SkillGap account to save assessments and recommendations.'}
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="you@example.com"
              autoFocus
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="12+ characters required"
              minLength={12}
              maxLength={128}
              required
            />
          </label>

          {error && (
            <p
              style={{
                color: '#b03d32',
                fontSize: '11px',
                marginTop: '10px',
                marginBottom: '0',
                lineHeight: 1.4,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary-button wide-button"
            disabled={loading}
          >
            {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}{' '}
            <ArrowUpRight size={16} />
          </button>
        </form>

        <small className="demo-note" style={{ cursor: 'pointer' }}>
          {isRegister ? (
            <span>
              Already registered?{' '}
              <strong
                onClick={() => {
                  setMode('login')
                  setError('')
                }}
                style={{ textDecoration: 'underline', color: 'var(--ink)' }}
              >
                Sign in
              </strong>
            </span>
          ) : (
            <span>
              Need an account?{' '}
              <strong
                onClick={() => {
                  setMode('register')
                  setError('')
                }}
                style={{ textDecoration: 'underline', color: 'var(--ink)' }}
              >
                Create one
              </strong>
            </span>
          )}
        </small>
      </div>
    </div>
  )
}
