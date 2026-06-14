import { useEffect, useRef, useState } from 'react'
import { supabase, calcPoints, type Match, type Prediction } from './supabase'
import { useAuth } from './AuthContext'

type PredMap = Record<number, { home: string; away: string; saved: boolean; dirty: boolean }>

function parseDbDate(value: string) {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const withOffset = normalized.replace(/([+-]\d{2})$/, '$1:00')
  const parsed = new Date(withOffset)
  return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed
}

function parseWarsawWallClock(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return parseDbDate(value)

  const [, year, month, day, hour, minute, second = '0'] = match
  const utcGuess = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Warsaw',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const parts = formatter.formatToParts(new Date(utcGuess))
  const values: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = part.value
  }

  const warsawGuess = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  )

  return new Date(utcGuess - (warsawGuess - utcGuess))
}

function isPastDeadline(deadline: string) {
  const deadlineDate = parseWarsawWallClock(deadline)
  return Number.isFinite(deadlineDate.getTime()) ? Date.now() > deadlineDate.getTime() : false
}

function formatMatchDate(dateStr: string) {
  const d = parseDbDate(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Warsaw',
  })
}

function formatDeadline(dateStr: string) {
  const d = parseWarsawWallClock(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Warsaw',
  })
}

export function PredictionsTab() {
  const { profile } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [preds, setPreds] = useState<PredMap>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const savingTimeout = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    load()
  }, [profile])

  async function load() {
    if (!profile) return
    setLoadingData(true)

    const [{ data: mData }, { data: pData }] = await Promise.all([
      supabase.from('matches').select('*'),
      supabase.from('predictions').select('*').eq('user_id', profile.id),
    ])

    const orderedMatches = [...((mData ?? []) as Match[])].sort((a, b) => {
      const dateDiff = parseDbDate(a.match_date).getTime() - parseDbDate(b.match_date).getTime()
      if (dateDiff !== 0) return dateDiff
      return a.sort_order - b.sort_order
    })

    setMatches(orderedMatches)

    const map: PredMap = {}
    for (const p of (pData ?? []) as Prediction[]) {
      map[p.match_id] = {
        home: String(p.home_score),
        away: String(p.away_score),
        saved: true,
        dirty: false,
      }
    }
    setPreds(map)
    setLoadingData(false)
  }

  function handleChange(matchId: number, side: 'home' | 'away', val: string) {
    // Allow empty or single digit 0-9 while typing
    if (val !== '' && !/^\d{1,2}$/.test(val)) return
    setPreds(prev => ({
      ...prev,
      [matchId]: {
        home: side === 'home' ? val : (prev[matchId]?.home ?? ''),
        away: side === 'away' ? val : (prev[matchId]?.away ?? ''),
        saved: false,
        dirty: true,
      },
    }))

    // Auto-save after 800ms of inactivity
    clearTimeout(savingTimeout.current[matchId])
    savingTimeout.current[matchId] = setTimeout(() => save(matchId, side, val), 800)
  }

  async function save(matchId: number, side?: string, val?: string) {
    if (!profile) return
    const current = preds[matchId] ?? {}
    const home = side === 'home' ? val : current.home
    const away = side === 'away' ? val : current.away

    if (home === '' || home === undefined || away === '' || away === undefined) return

    const homeN = parseInt(home, 10)
    const awayN = parseInt(away, 10)
    if (isNaN(homeN) || isNaN(awayN)) return

    setSaving(matchId)
    await supabase.from('predictions').upsert({
      user_id: profile.id,
      match_id: matchId,
      home_score: homeN,
      away_score: awayN,
    }, { onConflict: 'user_id,match_id' })

    setPreds(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], saved: true, dirty: false },
    }))
    setSaving(null)
  }

  if (loadingData) return <div className="center-msg">Ładowanie...</div>

  const playedMatches = matches.filter(m => m.home_score !== null && m.away_score !== null)
  const upcomingMatches = matches.filter(m => m.home_score === null || m.away_score === null)

  return (
    <div className="predictions-wrap">
      {playedMatches.length > 0 && (
        <details className="past-matches-group" open={false}>
          <summary className="past-matches-summary">
            <span>Zakończone mecze ({playedMatches.length})</span>
            <span className="chevron">▼</span>
          </summary>
          <div className="past-matches-list">
            {playedMatches.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                pred={preds[m.id]}
                saving={saving === m.id}
                onChange={handleChange}
                onSave={save}
              />
            ))}
          </div>
        </details>
      )}

      {upcomingMatches.map(m => (
        <MatchCard
          key={m.id}
          match={m}
          pred={preds[m.id]}
          saving={saving === m.id}
          onChange={handleChange}
          onSave={save}
        />
      ))}

      {matches.length === 0 && (
        <div className="center-msg">Brak meczów do wyświetlenia</div>
      )}
    </div>
  )
}

// ─── Single match card ────────────────────────────────────────────────────────

interface CardProps {
  match: Match
  pred: PredMap[number] | undefined
  saving: boolean
  onChange: (id: number, side: 'home' | 'away', v: string) => void
  onSave: (id: number) => void
}

function MatchCard({ match, pred, saving, onChange, onSave }: CardProps) {
  const locked = isPastDeadline(match.deadline)
  const played = match.home_score !== null && match.away_score !== null
  const points = played && pred ? calcPredPoints(pred, match) : 0

  function indicator() {
    if (played) return null
    if (locked) return <span className="badge locked">Zamknięte</span>
    if (saving) return <span className="badge saving">Zapisuję</span>
    if (pred?.saved && !pred.dirty) return <span className="badge saved">Zapisane</span>
    return null
  }

  if (played) {
    return (
      <div className={`match-card ${locked ? 'locked' : ''} played-card`}>
        <div className="played-card-summary">
          <div className="match-meta">
            <span className="match-time">{formatMatchDate(match.match_date)}</span>
          </div>
          <div className="match-row">
            <span className="team home-team">{match.home_team}</span>
            <span className="result">{match.home_score}:{match.away_score}</span>
            <span className="team away-team">{match.away_team}</span>
          </div>
          {pred && (
            <div className="played-card-points">
              <span className={`match-points pts pts-${getPointsClass(pred, match)}`}>
                {points} pkt
              </span>
            </div>
          )}
        </div>
        
        <div className="played-card-body">
          {pred ? (
            <span className="your-pred">Twój typ: {pred.home}:{pred.away}</span>
          ) : (
            <span className="your-pred no-pred">Brak typowania</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`match-card ${locked ? 'locked' : ''}`}>
      <div className="match-meta">
        <span className="match-time">{formatMatchDate(match.match_date)}</span>
        <span className="match-deadline">
          {!locked && `typ do ${formatDeadline(match.deadline)}`}
        </span>
        {indicator()}
      </div>

      <div className="match-row">
        <span className="team home-team">{match.home_team}</span>

        {locked ? (
          <div className="result-display">
            <span className="result-placeholder">vs</span>
            {pred ? (
              <span className="your-pred">Twój typ: {pred.home}:{pred.away}</span>
            ) : (
              <span className="your-pred no-pred">Brak typowania</span>
            )}
          </div>
        ) : (
          <div className="score-inputs">
            <input
              type="number"
              min="0"
              max="99"
              value={pred?.home ?? ''}
              onChange={e => onChange(match.id, 'home', e.target.value)}
              onBlur={() => onSave(match.id)}
              placeholder="–"
              className="score-input"
            />
            <span className="colon">:</span>
            <input
              type="number"
              min="0"
              max="99"
              value={pred?.away ?? ''}
              onChange={e => onChange(match.id, 'away', e.target.value)}
              onBlur={() => onSave(match.id)}
              placeholder="–"
              className="score-input"
            />
          </div>
        )}

        <span className="team away-team">{match.away_team}</span>
      </div>
    </div>
  )
}

function calcPredPoints(pred: PredMap[number], match: Match): number {
  if (match.home_score === null || match.away_score === null) return 0
  const ph = parseInt(pred.home, 10)
  const pa = parseInt(pred.away, 10)
  if (isNaN(ph) || isNaN(pa)) return 0
  return calcPoints(ph, pa, match.home_score, match.away_score, match.stage)
}

function getPointsClass(pred: PredMap[number], match: Match): string {
  const pts = calcPredPoints(pred, match)
  const mult = match.stage === 'group' ? 1 : match.stage === 'r32' || match.stage === 'r16' ? 2 : match.stage === 'qf' || match.stage === 'sf' ? 3 : 4
  const raw = pts / mult
  if (raw >= 5) return 'great'
  if (raw >= 3) return 'good'
  if (raw >= 2) return 'ok'
  return 'bad'
}
