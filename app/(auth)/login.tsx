import { StyleSheet, Text, View } from 'react-native'

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VOYA</Text>
      <Text style={styles.subtitle}>Sign in placeholder</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
})
