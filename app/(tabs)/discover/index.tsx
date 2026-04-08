import { StyleSheet, Text, View } from 'react-native'

export default function DiscoverScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Discover</Text>
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
  label: {
    fontSize: 20,
    fontWeight: '600',
  },
})
