import React, { useState } from 'react'
import { useAuth } from './AuthContext'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (username.includes(' ')) {
      setError('Nazwa użytkownika nie może zawierać spacji.')
      return
    }
    
    setLoading(true)
    setError(null)

    const err = mode === 'login'
      ? await signIn(username, password)
      : await signUp(username, password)

    setError(err)
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">LG</div>
        <h1 className="auth-title">Liga Gojów</h1>
        <p className="auth-sub">MŚ 2026</p>

        <div className="tab-switch">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => { setMode('login'); setError(null) }}
          >Zaloguj się</button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => { setMode('register'); setError(null) }}
          >Zarejestruj się</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label>Nazwa użytkownika</label>
            <input
              type="text"
              required
              maxLength={14}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Wpisz nazwę..."
            />
          </div>
          <div className="field">
            <label>Hasło</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}
          </button>
        </form>
      </div>
    </div>
  )
}
