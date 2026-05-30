import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadows, typography, activityMeta, ActivityType } from '../../src/theme';
import { MapPin, Bug, ChevronRight, Zap, Footprints, Bike, Activity } from 'lucide-react-native';
import { useT } from '../../src/i18n';

type Mode = ActivityType;

export default function RunTab() {
  const router = useRouter();
  const { t } = useT();
  const [mode, setMode] = useState<Mode>('run');

  const ACTIVITIES: { type: Mode; title: string; subtitle: string; Icon: any }[] = [
    { type: 'run',  title: t('run.activity_run_title'),  subtitle: t('run.activity_run_sub'),  Icon: Activity },
    { type: 'walk', title: t('run.activity_walk_title'), subtitle: t('run.activity_walk_sub'), Icon: Footprints },
    { type: 'bike', title: t('run.activity_bike_title'), subtitle: t('run.activity_bike_sub'), Icon: Bike },
  ];

  const current = ACTIVITIES.find((a) => a.type === mode)!;
  const meta = activityMeta[mode];

  const startActivity = () => {
    const titleMap: Record<Mode, string> = {
      run: t('run.free_run'),
      walk: t('run.walk_free'),
      bike: t('run.bike_free'),
    };
    router.push({
      pathname: '/run-active',
      params: { title: titleMap[mode], activity_type: mode },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t('run.tab_eyebrow')}</Text>
          <Text style={styles.title}>{t('run.tab_title')}</Text>
          <Text style={styles.subtitle}>
            {t('run.tab_subtitle')}
          </Text>
        </View>

        {/* Activity selector */}
        <View style={styles.modeRow}>
          {ACTIVITIES.map((a) => {
            const m = activityMeta[a.type];
            const active = mode === a.type;
            const Icon = a.Icon;
            return (
              <TouchableOpacity
                key={a.type}
                testID={`mode-${a.type}`}
                activeOpacity={0.85}
                onPress={() => setMode(a.type)}
                style={[
                  styles.modeCard,
                  active && { borderColor: m.color, backgroundColor: m.colorMuted, ...shadows.md },
                ]}
              >
                <View
                  style={[
                    styles.modeIcon,
                    { backgroundColor: active ? m.color : colors.surfaceSecondary },
                  ]}
                >
                  <Icon size={26} color={active ? '#fff' : colors.textPrimary} strokeWidth={2.2} />
                </View>
                <Text style={[styles.modeLabel, active && { color: m.color }]}>
                  {a.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description of selected */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>{current.title}</Text>
          <Text style={styles.descriptionText}>{current.subtitle}</Text>

          <View style={styles.infoRow}>
            <MapPin size={16} color={meta.color} strokeWidth={2.2} />
            <Text style={styles.infoText}>
              {t('run.location_info')}
            </Text>
          </View>
        </View>

        {/* Big start button */}
        <TouchableOpacity
          testID="start-free-run-button"
          style={[styles.startBtn, { backgroundColor: meta.color, shadowColor: meta.color }]}
          onPress={startActivity}
          activeOpacity={0.9}
        >
          <Zap size={20} color="#fff" strokeWidth={2.4} fill="#fff" />
          <Text style={styles.startBtnText}>{t('run.start_with', { name: meta.label })}</Text>
        </TouchableOpacity>

        {/* Diagnostica GPS */}
        <TouchableOpacity
          testID="gps-test-link"
          style={styles.diag}
          onPress={() => router.push('/gps-test')}
        >
          <Bug size={14} color={colors.textSecondary} strokeWidth={2.2} />
          <Text style={styles.diagText}>{t('run.gps_diagnostic')}</Text>
          <ChevronRight size={14} color={colors.textSecondary} strokeWidth={2.2} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  eyebrow: { ...typography.eyebrow, color: colors.textSecondary, marginBottom: spacing.sm },
  title: { ...typography.displayMd, color: colors.textPrimary },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 22,
  },

  // Modes
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  modeIcon: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  // Description card
  descriptionCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  descriptionTitle: { ...typography.h2, color: colors.textPrimary },
  descriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  infoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
  },

  // Start button
  startBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 18,
    borderRadius: radius.pill,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  // Diagnostica
  diag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  diagText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
});
