import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { colors, shadows } from '../../src/theme';
import {
  HomeIcon, PlansIcon, RunIcon, HistoryIcon, ProfileIcon,
} from '../../src/icons/BrandIcons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 84 : 72,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.8,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Piani',
          tabBarIcon: ({ color }) => <PlansIcon size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="run"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.runIcon}>
              <RunIcon size={26} color="#FFFFFF" strokeWidth={2.2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Storico',
          tabBarIcon: ({ color }) => <HistoryIcon size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color }) => <ProfileIcon size={22} color={color} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  runIcon: {
    backgroundColor: colors.primary,
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -22,
    borderWidth: 5,
    borderColor: '#0A0A0A',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
});
