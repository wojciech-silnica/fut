import { useState } from 'react'
import { useAuth } from './AuthContext'
import { AuthScreen } from './AuthScreen'
import { PredictionsTab } from './PredictionsTab'
import { StandingsTab } from './StandingsTab'
import { ScoringTab } from './ScoringTab'

type Tab = 'predictions' | 'standings' | 'scoring'

export default function App() {
  const { session, profile, loading, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('predictions')

  if (loading) {
    return (
      <div className="full-center">
        <span className="spinner" />
      </div>
    )
  }

  if (!session || !profile) return <AuthScreen />

  return (
    <div className="app">
      <header className="app-header">
        <span className="header-logo" aria-label="Liga Gojów">LG</span>
        <span className="header-title">
          <span className="header-title-full">Liga Gojów im. W. Silnicy &amp; Z. Zawady</span>
          <span className="header-title-short">Liga Gojów</span>
        </span>
        <button className="signout-btn" onClick={signOut} title="Wyloguj">
          <span className="username-pill">{profile.username}</span>
        </button>
      </header>

      <main className="app-main">
        {tab === 'predictions' && <PredictionsTab />}
        {tab === 'standings'   && <StandingsTab />}
        {tab === 'scoring'     && <ScoringTab />}
      </main>

      <nav className="bottom-nav">
        <button
          className={tab === 'predictions' ? 'active' : ''}
          onClick={() => setTab('predictions')}
        >
          Typy
        </button>
        <button
          className={tab === 'standings' ? 'active' : ''}
          onClick={() => setTab('standings')}
        >
          Tabela
        </button>
        <button
          className={tab === 'scoring' ? 'active' : ''}
          onClick={() => setTab('scoring')}
        >
          Punktacja
        </button>
      </nav>
    </div>
  )
}
