import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Linking from 'expo-linking'
import { supabase } from '@/services/supabase'
import type { User } from '@/types/user'

WebBrowser.maybeCompleteAuthSession()

export function mapSessionToUser(session: Session | null): User | null {
  if (!session?.user) return null
  const { user } = session
  return {
    id: user.id,
    email: user.email ?? null,
    full_name: user.user_metadata?.full_name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    created_at: user.created_at,
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(mapSessionToUser(data.session))
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(mapSessionToUser(newSession))
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle(): Promise<{ error: string | null }> {
    const redirectUrl = Linking.createURL('/')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    })
    if (error || !data.url) return { error: error?.message ?? 'OAuth init failed' }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
    if (result.type !== 'success') return { error: null }
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url)
    return { error: sessionError?.message ?? null }
  }

  async function signInWithApple(): Promise<{ error: string | null }> {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) return { error: 'No identity token from Apple' }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      })
      return { error: error?.message ?? null }
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('canceled')) return { error: null }
      return { error: e instanceof Error ? e.message : 'Apple sign-in failed' }
    }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
  }

  return { session, user, loading, signInWithGoogle, signInWithApple, signOut }
}
