const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

let accessToken = sessionStorage.getItem('skillgap_access_token') || ''

async function request(path, options = {}) {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.detail?.message || body.detail || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : response.json()
}

export async function login(email, password) {
  const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  accessToken = result.access_token
  sessionStorage.setItem('skillgap_access_token', accessToken)
  return result
}

export async function register(email, password) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export async function getProfile() { return request('/profiles/me') }
export async function saveProfile(profile) { return request('/profiles/me', { method: 'PUT', body: JSON.stringify(profile) }) }
export async function getAttempts() { return request('/assessments/attempts') }
export async function createAttempt() { return request('/assessments/attempts', { method: 'POST' }) }
export async function getResult(attemptId) { return request(`/career-results/${attemptId}`) }
export async function createResult(attemptId) { return request(`/career-results/${attemptId}`, { method: 'POST' }) }
