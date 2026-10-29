import { clearAccessToken, refreshAuthToken, request, setAccessToken } from './client'

export async function login(email, password) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
  if (result?.access_token) {
    setAccessToken(result.access_token)
  }
  return result
}

export async function register(email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
}

export async function refreshToken() {
  const token = await refreshAuthToken()
  if (!token) {
    throw new Error('Refresh failed')
  }
  return { access_token: token }
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' })
  } finally {
    clearAccessToken()
  }
}

export async function getMe() {
  return request('/auth/me')
}

export async function deleteAccount() {
  try {
    await request('/auth/me', { method: 'DELETE' })
  } finally {
    clearAccessToken()
  }
}
