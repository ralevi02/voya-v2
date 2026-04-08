import { StyleSheet, Text, View } from 'react-native'

export default function ItineraryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Itinerary</Text>
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
