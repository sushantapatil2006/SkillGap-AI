const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

let accessToken = sessionStorage.getItem('skillgap_access_token') || ''
let inFlightRefresh = null

export function getAccessToken() {
  if (!accessToken) {
    accessToken = sessionStorage.getItem('skillgap_access_token') || ''
  }
  return accessToken
}

export function setAccessToken(token) {
  accessToken = token || ''
  if (accessToken) {
    sessionStorage.setItem('skillgap_access_token', accessToken)
  } else {
    sessionStorage.removeItem('skillgap_access_token')
  }
}

export function clearAccessToken() {
  setAccessToken('')
}

/**
 * Deduplicated, single-flight refresh token rotation.
 * Ensures concurrent requests share the same refresh call so single-use
 * refresh tokens are not burned.
 */
export async function refreshAuthToken() {
  if (inFlightRefresh) {
    return inFlightRefresh
  }

  inFlightRefresh = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        clearAccessToken()
        return null
      }

      const data = await response.json().catch(() => null)
      if (data?.access_token) {
        setAccessToken(data.access_token)
        return data.access_token
      }

      clearAccessToken()
      return null
    } catch {
      clearAccessToken()
      return null
    } finally {
      inFlightRefresh = null
    }
  })()

  return inFlightRefresh
}

/**
 * Formats FastAPI/Pydantic validation errors or standard HTTP errors into clean strings.
 */
function extractErrorMessage(body, status) {
  if (!body) return `Request failed (${status})`

  // Pydantic 422 validation errors array: [{ loc: ["body", "password"], msg: "...", type: "..." }]
  if (Array.isArray(body.detail)) {
    const messages = body.detail
      .map((item) => {
        const field = Array.isArray(item.loc) ? item.loc.filter((part) => part !== 'body').join('.') : ''
        return field ? `${field}: ${item.msg}` : item.msg
      })
      .filter(Boolean)
    if (messages.length > 0) {
      return messages.join('; ')
    }
  }

  // Standard string detail or nested message
  if (typeof body.detail === 'string') {
    return body.detail
  }
  if (body.detail?.message) {
    return body.detail.message
  }
  if (body.message) {
    return body.message
  }

  return `Request failed with status ${status}`
}

export async function request(path, options = {}, isRetry = false) {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getAccessToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  // Handle 401 Unauthorized with automatic transparent token refresh
  if (response.status === 401 && !isRetry) {
    const isAuthRoute =
      path.startsWith('/auth/login') ||
      path.startsWith('/auth/register') ||
      path.startsWith('/auth/refresh') ||
      path.startsWith('/auth/logout')

    if (!isAuthRoute) {
      const newToken = await refreshAuthToken()
      if (newToken) {
        // Retry the original request once with the newly rotated access token
        return request(path, options, true)
      }
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const message = extractErrorMessage(body, response.status)
    const error = new Error(message)
    error.status = response.status
    error.body = body
    throw error
  }

  return response.status === 204 ? null : response.json()
}
