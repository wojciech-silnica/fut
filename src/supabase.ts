import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key)

// ─── Database types ───────────────────────────────────────────────────────────

export interface Profile {
  id: string
  username: string
}

export interface Match {
  id: number
  match_date: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  group_name: string | null
  deadline: string
  sort_order: number
}

export interface Prediction {
  id: number
  user_id: string
  match_id: number
  home_score: number
  away_score: number
  points: number | null
  created_at: string
  updated_at: string
}

export interface PredictionWithMatch extends Prediction {
  match: Match
}

// ─── Scoring engine ───────────────────────────────────────────────────────────

const STAGE_MULTIPLIER: Record<Match['stage'], number> = {
  group: 1,
  r32:   2,
  r16:   2,
  qf:    3,
  sf:    3,
  final: 4,
}

/** Returns raw points (before multiplier) for one match */
export function calcRawPoints(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number,
): number {
  // Perfect draw (6 pts)
  if (predHome === realHome && predAway === realAway && realHome === realAway) return 6

  // Perfect result – win (5 pts)
  if (predHome === realHome && predAway === realAway) return 5

  const predDiff = predHome - predAway
  const realDiff = realHome - realAway

  // Blind draw (3 pts): both pick draw but wrong score
  if (predDiff === 0 && realDiff === 0) return 3

  // Right winner + right goal difference (3 pts)
  if (predDiff !== 0 && predDiff === realDiff) return 3

  // Right winner only (2 pts)
  const predWinner = predDiff > 0 ? 'home' : predDiff < 0 ? 'away' : 'draw'
  const realWinner = realDiff > 0 ? 'home' : realDiff < 0 ? 'away' : 'draw'
  if (predWinner === realWinner && predWinner !== 'draw') return 2

  // Miss (0 pts)
  return 0
}

export function calcPoints(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number,
  stage: Match['stage'],
): number {
  const raw = calcRawPoints(predHome, predAway, realHome, realAway)
  return raw * STAGE_MULTIPLIER[stage]
}
