import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { View, StyleSheet } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
      }}
    >
      <Tabs.Screen name="home" options={{
        title: 'HOME',
        tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} />,
      }} />
      <Tabs.Screen name="plans" options={{
        title: 'PIANI',
        tabBarIcon: ({ color }) => <Ionicons name="list" size={22} color={color} />,
      }} />
      <Tabs.Screen name="run" options={{
        title: 'CORRI',
        tabBarIcon: ({ color }) => (
          <View style={styles.runIcon}>
            <Ionicons name="flash" size={26} color="#fff" />
          </View>
        ),
      }} />
      <Tabs.Screen name="history" options={{
        title: 'STORICO',
        tabBarIcon: ({ color }) => <Ionicons name="time" size={22} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'PROFILO',
        tabBarIcon: ({ color }) => <Ionicons name="person" size={22} color={color} />,
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  runIcon: {
    backgroundColor: colors.primary,
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    marginTop: -18,
    borderWidth: 4, borderColor: colors.background,
  },
});
