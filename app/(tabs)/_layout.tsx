import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="itinerary" options={{ title: 'Itinerary' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expenses' }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault' }} />
      <Tabs.Screen name="album" options={{ title: 'Album' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
    </Tabs>
  )
}
