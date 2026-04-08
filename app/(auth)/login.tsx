import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useState } from 'react'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useAuth } from '@/hooks/useAuth'

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogle(): Promise<void> {
    setLoading(true)
    setError(null)
    const result = await signInWithGoogle()
    if (result.error) setError(result.error)
    setLoading(false)
  }

  async function handleApple(): Promise<void> {
    setLoading(true)
    setError(null)
    const result = await signInWithApple()
    if (result.error) setError(result.error)
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VOYA</Text>
      <Text style={styles.subtitle}>Plan your group trips</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color="#4285F4" />
      ) : (
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogle}>
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={styles.appleButton}
              onPress={handleApple}
            />
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: { fontSize: 40, fontWeight: 'bold', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 8 },
  error: { color: '#c00', fontSize: 13, textAlign: 'center' },
  buttons: { width: '100%', gap: 12 },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  googleText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  appleButton: { width: '100%', height: 48 },
})
