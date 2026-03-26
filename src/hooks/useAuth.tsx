import { createContext, useContext, useState, ReactNode } from 'react'
import api from '../lib/api'

interface AuthState {
  token: string | null
  name: string | null
  role: 'admin' | 'super' | null
}

interface AuthContextType {
  auth: AuthState
  login: (code: string) => Promise<void>
  logout: () => void
  isSuper: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const stored = (): AuthState => {
  try {
    const raw = localStorage.getItem('academy_admin')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { token: null, name: null, role: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(stored)

  const login = async (code: string) => {
    const { data } = await api.post('/auth/login', { code })
    const state: AuthState = { token: data.token, name: data.name, role: data.role }
    localStorage.setItem('academy_token', data.token)
    localStorage.setItem('academy_admin', JSON.stringify(state))
    setAuth(state)
  }

  const logout = () => {
    localStorage.removeItem('academy_token')
    localStorage.removeItem('academy_admin')
    setAuth({ token: null, name: null, role: null })
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout, isSuper: auth.role === 'super' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
