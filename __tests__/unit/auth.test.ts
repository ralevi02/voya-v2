// Mock all native/expo modules before importing the tested module
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }))
jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}))
jest.mock('expo-linking', () => ({ createURL: jest.fn().mockReturnValue('voya://') }))
jest.mock('@react-native-async-storage/async-storage', () => ({}))
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      signInWithIdToken: jest.fn(),
    },
  },
}))

import { mapSessionToUser } from '@/hooks/useAuth'
import type { Session } from '@supabase/supabase-js'

describe('mapSessionToUser', () => {
  it('returns null when session is null', () => {
    expect(mapSessionToUser(null)).toBeNull()
  })

  it('maps session user data to User type', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'test@voya.app',
        created_at: '2026-04-08T00:00:00Z',
        user_metadata: {
          full_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      },
    } as unknown as Session

    expect(mapSessionToUser(mockSession)).toEqual({
      id: 'user-123',
      email: 'test@voya.app',
      full_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2026-04-08T00:00:00Z',
    })
  })

  it('handles missing user_metadata fields', () => {
    const mockSession = {
      user: {
        id: 'user-456',
        email: null,
        created_at: '2026-04-08T00:00:00Z',
        user_metadata: {},
      },
    } as unknown as Session

    expect(mapSessionToUser(mockSession)).toEqual({
      id: 'user-456',
      email: null,
      full_name: null,
      avatar_url: null,
      created_at: '2026-04-08T00:00:00Z',
    })
  })

  it('handles session with no user object', () => {
    const mockSession = {} as Session
    expect(mapSessionToUser(mockSession)).toBeNull()
  })
})
