import { createContext, useContext, useEffect, useState } from 'react'
import {
  deleteAccount as apiDeleteAccount,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  refreshToken as apiRefreshToken,
  register as apiRegister,
} from '../api/auth'
import { clearAccessToken, getAccessToken, setAccessToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function initSession() {
      try {
        const token = getAccessToken()
        if (token) {
          try {
            const me = await getMe()
            if (active && me) {
              setUser(me)
              return
            }
          } catch {
            // Token may have expired, fall through to refresh
          }
        }

        // Try single refresh through cookie
        const res = await apiRefreshToken().catch(() => null)
        if (res?.access_token) {
          const me = await getMe().catch(() => null)
          if (active && me) {
            setUser(me)
            return
          }
        }

        // If neither valid token nor refresh succeeded, reset cleanly
        if (active) {
          clearAccessToken()
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    initSession()

    return () => {
      active = false
    }
  }, [])

  async function login(email, password) {
    const result = await apiLogin(email, password)
    if (result?.access_token) {
      setAccessToken(result.access_token)
    }
    const me = await getMe()
    setUser(me)
    return result
  }

  async function register(email, password) {
    const regResult = await apiRegister(email, password)
    // Auto login after registration
    await login(email, password)
    return regResult
  }

  async function logout() {
    try {
      await apiLogout()
    } finally {
      clearAccessToken()
      setUser(null)
    }
  }

  async function deleteMyAccount() {
    try {
      await apiDeleteAccount()
    } finally {
      clearAccessToken()
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        login,
        register,
        logout,
        deleteMyAccount,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
