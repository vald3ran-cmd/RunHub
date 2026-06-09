/**
 * Tab navigator — RunHub 1.6 Lab Edition.
 * 5 tab visibili: Lab · Diario · Importa · Allenamenti · Profilo.
 * Tab legacy (home/run/history/plans) restano accessibili come route ma
 * sono nascoste dalla tab bar (href: null) per non rompere link interni.
 *
 * Stile Scientific Light: sfondo card bianco, border sottile, accent arancione.
 */
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { FlaskConical, BookOpen, Watch, Calendar, User } from 'lucide-react-native';
import { useT } from '../../src/i18n';
import { tokens } from '../../src/design-system';

const { brand, neutral, text } = tokens;

export default function TabsLayout() {
  const { t } = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: text.muted,
        tabBarStyle: {
          backgroundColor: neutral.card,
          borderTopColor: neutral.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 84 : 70,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
          marginTop: 2,
        },
      }}
    >
      {/* ─── TABS VISIBILI (ordine 1.6 Lab Edition) ────────────── */}
      <Tabs.Screen
        name="lab"
        options={{
          title: t('tabs.lab') || 'Lab',
          tabBarIcon: ({ color, focused }) => (
            <FlaskConical size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="diario"
        options={{
          title: t('tabs.diario') || 'Diario',
          tabBarIcon: ({ color, focused }) => (
            <BookOpen size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="importa"
        options={{
          title: t('tabs.importa') || 'Importa',
          tabBarIcon: ({ color, focused }) => (
            <Watch size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="allenamenti"
        options={{
          title: t('tabs.allenamenti') || 'Allenamenti',
          tabBarIcon: ({ color, focused }) => (
            <Calendar size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <User size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />

      {/* ─── TABS LEGACY (nascoste ma route ancora navigabili) ──── */}
      <Tabs.Screen name="home" options={{ href: null }} />
      <Tabs.Screen name="plans" options={{ href: null }} />
      <Tabs.Screen name="run" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
    </Tabs>
  );
}
