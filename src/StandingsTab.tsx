import { useEffect, useState } from 'react'
import { supabase, calcPoints, calcRawPoints, type Match, type Prediction, type Profile } from './supabase'
import { useAuth } from './AuthContext'

type StageKey = Match['stage']

interface Row {
  profile: Profile
  total: number
  byStage: Record<StageKey, number>
  form: Array<number | null>
}

const STAGE_ORDER: StageKey[] = ['group', 'r32', 'r16', 'qf', 'sf', 'final']

const STAGE_LABELS: Record<StageKey, string> = {
  group: 'Gr.',
  r32: '1/16',
  r16: '1/8',
  qf: '1/4',
  sf: '1/2',
  final: 'Finał',
}

export function StandingsTab() {
  const { profile: me } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)

    const [{ data: profiles }, { data: matches }, { data: predictions }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('matches').select('*'),
      supabase.from('predictions').select('*'),
    ])

    if (!profiles || !matches || !predictions) { setLoading(false); return }

    const matchMap: Record<number, Match> = {}
    for (const m of matches as Match[]) matchMap[m.id] = m

    const result: Row[] = profiles.map((p: Profile) => {
      const myPreds = (predictions as Prediction[]).filter(pr => pr.user_id === p.id)
      const orderedPreds = [...myPreds].sort((a, b) => {
        const aMatch = matchMap[a.match_id]
        const bMatch = matchMap[b.match_id]
        if (!aMatch && !bMatch) return 0
        if (!aMatch) return 1
        if (!bMatch) return -1

        const dateDiff = new Date(aMatch.match_date).getTime() - new Date(bMatch.match_date).getTime()
        if (dateDiff !== 0) return dateDiff
        return aMatch.sort_order - bMatch.sort_order
      })

      let total = 0
      const byStage: Record<StageKey, number> = {
        group: 0,
        r32: 0,
        r16: 0,
        qf: 0,
        sf: 0,
        final: 0,
      }
      const rawHistory: number[] = []

      for (const pred of orderedPreds) {
        const match = matchMap[pred.match_id]
        if (!match) continue
        if (match.home_score === null || match.away_score === null) continue

        rawHistory.push(calcRawPoints(
          pred.home_score, pred.away_score,
          match.home_score, match.away_score,
        ))

        const pts = calcPoints(
          pred.home_score, pred.away_score,
          match.home_score, match.away_score,
          match.stage,
        )
        total += pts
        byStage[match.stage] += pts
      }

      const recentRaw = rawHistory.slice(-5)
      const form: Array<number | null> = Array(5).fill(null)
      const startIndex = 5 - recentRaw.length
      recentRaw.forEach((points, index) => {
        form[startIndex + index] = points
      })

      return { profile: p, total, byStage, form }
    })

    // Sort: total desc, then finals pts desc, etc.
    result.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total
      for (const s of ['final', 'sf', 'qf', 'r16', 'r32', 'group'] as StageKey[]) {
        const diff = (b.byStage[s] ?? 0) - (a.byStage[s] ?? 0)
        if (diff !== 0) return diff
      }
      return a.profile.username.localeCompare(b.profile.username)
    })

    setRows(result)
    setLoading(false)
  }

  if (loading) return <div className="center-msg">Ładowanie klasyfikacji...</div>

  return (
    <div className="standings-wrap">
      <h2 className="stage-header">Klasyfikacja generalna</h2>

      <div className="standings-table-wrap">
        <table className="standings-table standings-main-table">
          <colgroup>
            <col className="col-player" />
            <col className="col-total" />
            <col className="col-stage" />
            <col className="col-stage" />
            <col className="col-stage" />
            <col className="col-stage" />
            <col className="col-stage" />
            <col className="col-stage" />
            <col className="col-form" />
          </colgroup>
          <thead>
            <tr>
              <th className="name-col">Gracz</th>
              <th>Suma</th>
              {STAGE_ORDER.map(stage => (
                <th
                  key={stage}
                  className={stage === 'final' ? 'final-col' : stage === 'r32' ? 'stage-r32' : ''}
                >
                  {STAGE_LABELS[stage]}
                </th>
              ))}
              <th>Forma</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isMe = row.profile.id === me?.id

              return (
                <tr key={row.profile.id} className={isMe ? 'my-row' : ''}>
                  <td className="name-col">
                    {isMe ? <strong className="username-truncate">{row.profile.username}</strong> : <span className="username-truncate">{row.profile.username}</span>}
                  </td>
                  <td className="pts-total">{row.total}</td>
                  {STAGE_ORDER.map(stage => (
                    <td
                      key={stage}
                      className={stage === 'final' ? 'final-col' : stage === 'r32' ? 'stage-r32' : ''}
                    >
                      {row.byStage[stage] ?? 0}
                    </td>
                  ))}
                  <td className="form-col">
                    <div className="form-track" aria-label={`Forma: ${row.form.filter(v => v !== null).join(', ')} punktów`}>
                      {row.form.map((points, index) => (
                        <span
                          key={index}
                          className={`form-dot ${points === null ? 'empty' : ''}`}
                          style={points === null ? undefined : {
                            backgroundColor: getFormColor(points),
                            color: getFormTextColor(points),
                          }}
                          title={points === null ? 'Brak wyniku' : `${points} pkt`}
                        >
                          {points === null ? '' : points}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="center-msg">Brak danych</div>
      )}
    </div>
  )
}

function getFormColor(points: number): string {
  if (points <= 0) return '#000000'
  if (points === 1) return '#b91c1c'
  if (points === 2) return '#ea580c'
  if (points === 3) return '#f59e0b'
  if (points === 4) return '#84cc16'
  if (points === 5) return '#16a34a'
  return '#8b5cf6'
}

function getFormTextColor(points: number): string {
  return points === 3 || points === 4 ? '#0d1117' : '#ffffff'
}
