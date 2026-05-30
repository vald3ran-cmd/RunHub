import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Image, ImageSourcePropType } from 'react-native';
import { colors } from '../../src/theme';
import { useT } from '../../src/i18n';

// Custom PNG tab icons (designed by user). They have transparent BG
// and use white + orange outline. Active/inactive states use opacity.
const ICONS = {
  home:    require('../../assets/icons/tab/tab-home.png'),
  plans:   require('../../assets/icons/tab/tab-plans.png'),
  run:     require('../../assets/icons/tab/tab-run.png'),
  history: require('../../assets/icons/tab/tab-history.png'),
  profile: require('../../assets/icons/tab/tab-profile.png'),
} as const;

type TabKey = keyof typeof ICONS;

function TabIcon({ source, focused, size = 30 }: { source: ImageSourcePropType; focused: boolean; size?: number }) {
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={{
        width: size,
        height: size,
        opacity: focused ? 1 : 0.7,
        // Slight upscale on focused tab for visual feedback
        transform: [{ scale: focused ? 1.08 : 1 }],
      }}
    />
  );
}

export default function TabsLayout() {
  const { t } = useT();
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
          title: t('tabs.home'),
          tabBarIcon: ({ focused }) => <TabIcon source={ICONS.home} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: t('tabs.plans'),
          tabBarIcon: ({ focused }) => <TabIcon source={ICONS.plans} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="run"
        options={{
          // Center "FAB-style" tab: bigger, with branded orange circle behind
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.runIcon, focused && styles.runIconFocused]}>
              <Image
                source={ICONS.run}
                resizeMode="contain"
                style={styles.runIconImg}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ focused }) => <TabIcon source={ICONS.history} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused }) => <TabIcon source={ICONS.profile} focused={focused} />,
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
  runIconFocused: {
    shadowOpacity: 0.7,
    shadowRadius: 18,
  },
  runIconImg: {
    width: 32,
    height: 32,
  },
});
