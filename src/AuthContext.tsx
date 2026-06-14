import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, Profile } from './supabase'
import type { Session } from '@supabase/supabase-js'

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (username: string, password: string) => Promise<string | null>
  signIn: (username: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx>(null!)

// We store users as username@liga.local in Supabase auth
const fakeEmail = (u: string) => {
  const normalized = u.toLowerCase().trim().replace(/\s+/g, '')
  return `${normalized}@liga.local`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
      else setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, sess) => {
      setSession(sess)
      if (sess) loadProfile(sess.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadProfile(id: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
    setProfile(data ?? null)
    setLoading(false)
  }

  async function signUp(username: string, password: string): Promise<string | null> {
    const email = fakeEmail(username)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return error.message
    if (!data.user) return 'Nie udało się utworzyć konta'

    const { error: pe } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, username: username.trim() })

    if (pe) {
      // Rollback auth user if profile insert failed (e.g. username taken)
      await supabase.auth.signOut()
      return pe.code === '23505' ? 'Ta nazwa użytkownika jest już zajęta' : pe.message
    }

    await loadProfile(data.user.id)
    return null
  }

  async function signIn(username: string, password: string): Promise<string | null> {
    const email = fakeEmail(username)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return 'Nieprawidłowa nazwa użytkownika lub hasło'
    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider value={{ session, profile, loading, signUp, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
