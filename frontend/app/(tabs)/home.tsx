import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { colors, spacing, radius, shadows, typography, fonts } from '../../src/theme';
import { AdBanner } from '../../src/Ads';
import { AnimatedCounter } from '../../src/uiPolish';
import { BarChart } from '../../src/MiniCharts';
import {
  ChevronRight, Calendar, BarChart3, Sparkles, Users, Award, Heart,
} from 'lucide-react-native';

type Progress = {
  daily: { distance_km: number; duration_seconds: number; count: number };
  weekly: { distance_km: number; duration_seconds: number; count: number };
  monthly: { distance_km: number; duration_seconds: number; count: number };
  goals: { daily_km: number; weekly_km: number; monthly_km: number };
};

type Workout = {
  id: string;
  workout_id?: string;
  title?: string;
  name?: string;
  type?: string;
  distance_km?: number;
  scheduled_for?: string;
};

type PlanLite = {
  id?: string;
  plan_id?: string;
  title?: string;
  name?: string;
  current_week?: number;
  total_weeks?: number;
  progress?: number; // 0..1
};

export default function Home() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [activePlan, setActivePlan] = useState<PlanLite | null>(null);
  const [nextWorkout, setNextWorkout] = useState<Workout | null>(null);
  const [weeklyBars, setWeeklyBars] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = async () => {
    try {
      const [p, plans, history] = await Promise.all([
        api.get('/stats/progress').catch(() => null),
        api.get('/plans').catch(() => null),
        api.get('/workouts/history?limit=30').catch(() => null),
      ]);
      if (p?.data) setProgress(p.data);

      // Active plan
      const plansList = plans?.data?.plans || plans?.data || [];
      if (Array.isArray(plansList) && plansList.length > 0) {
        const active = plansList.find((pl: any) => pl.is_active) || plansList[0];
        setActivePlan({
          id: active.id || active.plan_id,
          title: active.title || active.name || 'Piano',
          current_week: active.current_week,
          total_weeks: active.total_weeks || active.weeks,
          progress: active.progress ?? (active.current_week && active.total_weeks
            ? active.current_week / active.total_weeks : 0),
        });
      } else {
        setActivePlan(null);
      }

      // Next workout (from active plan or general)
      const nw = plans?.data?.next_workout
        || (Array.isArray(plansList) && plansList[0]?.next_workout)
        || null;
      if (nw) {
        setNextWorkout({
          id: nw.id || nw.workout_id,
          title: nw.title || nw.name || nw.type || 'Allenamento',
          type: nw.type,
          distance_km: nw.distance_km,
          scheduled_for: nw.scheduled_for,
        });
      }

      // Compute weekly bars from history (last 7 days)
      const hist = history?.data?.workouts || history?.data || [];
      if (Array.isArray(hist)) {
        const bars = computeWeeklyBars(hist);
        setWeeklyBars(bars);
      }
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  };

  const userName = (user?.name?.split(' ')[0] || 'Runner');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <View style={styles.greetingRow}>
            <Text style={styles.greetingHello}>Ciao {userName}!</Text>
            <Image
              source={require('../../assets/images/logo-transparent.png')}
              style={styles.greetingLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.greetingSubtitle}>Pronto a dare il massimo oggi?</Text>
        </View>

        {/* ── PANORAMICA ── */}
        <SectionLabel text="PANORAMICA" />
        <View style={styles.panoramaCard}>
          <PanoramaTile
            label="DISTANZA"
            value={progress?.weekly.distance_km ?? 0}
            decimals={1}
            unit="km"
          />
          <View style={styles.panoramaDivider} />
          <PanoramaTile
            label="TEMPO"
            valueText={fmtTimeHours(progress?.weekly.duration_seconds ?? 0)}
            unit="h"
          />
          <View style={styles.panoramaDivider} />
          <PanoramaTile
            label="ALLENAMENTI"
            value={progress?.weekly.count ?? 0}
            decimals={0}
            unit="questa settimana"
            unitSmall
          />
        </View>

        {/* ── I TUOI PIANI ── */}
        <SectionLabel text="I TUOI PIANI" />
        {activePlan ? (
          <TouchableOpacity
            style={styles.planCard}
            activeOpacity={0.85}
            onPress={() => router.push(activePlan.id ? `/plan/${activePlan.id}` : '/(tabs)/plans')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle} numberOfLines={1}>{activePlan.title}</Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.max(2, Math.min(100, (activePlan.progress || 0) * 100))}%` },
                  ]}
                />
              </View>
            </View>
            {activePlan.current_week && activePlan.total_weeks ? (
              <Text style={styles.planMeta}>
                Settimana {activePlan.current_week}/{activePlan.total_weeks}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.planCardEmpty}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/plans')}
          >
            <Text style={styles.planEmptyTitle}>Scegli il tuo piano</Text>
            <Text style={styles.planEmptySubtitle}>Inizia un programma personalizzato</Text>
            <ChevronRight size={20} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* ── PROSSIMO ALLENAMENTO ── */}
        <SectionLabel text="PROSSIMO ALLENAMENTO" />
        {nextWorkout ? (
          <TouchableOpacity
            style={styles.nextWorkoutCard}
            activeOpacity={0.85}
            onPress={() => router.push(`/workout/${nextWorkout.id}`)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.nextWorkoutTitle} numberOfLines={1}>
                {nextWorkout.title}
              </Text>
              <Text style={styles.nextWorkoutMeta} numberOfLines={1}>
                {nextWorkout.distance_km
                  ? `${nextWorkout.distance_km} km`
                  : (nextWorkout.type || 'Allenamento')}
                {nextWorkout.scheduled_for ? ` · ${fmtSchedule(nextWorkout.scheduled_for)}` : ''}
              </Text>
            </View>
            <ChevronRight size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextWorkoutCardEmpty}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/run')}
          >
            <View style={styles.nextWorkoutIconWrap}>
              <Calendar size={20} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextWorkoutTitle}>Nessun allenamento in programma</Text>
              <Text style={styles.nextWorkoutMeta}>Avvia una corsa libera</Text>
            </View>
            <ChevronRight size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* ── PROGRESSI ── */}
        <SectionLabel text="PROGRESSI" />
        <View style={styles.progressCard}>
          <Text style={styles.progressSubtitle}>Questa settimana</Text>
          <View style={styles.barChartWrap}>
            <BarChart
              data={weeklyBars}
              labels={['L', 'M', 'M', 'G', 'V', 'S', 'D']}
              width={300}
              height={150}
              color={colors.primary}
            />
          </View>
        </View>

        {/* ── ESPLORA ── (link rapidi) */}
        <SectionLabel text="ESPLORA" />
        <View style={styles.exploreList}>
          <ExploreItem
            testID="cta-dashboard-button"
            icon={<BarChart3 size={20} color={colors.primary} strokeWidth={2.2} />}
            title="Dashboard e Personal Best"
            onPress={() => router.push('/dashboard')}
          />
          <ExploreItem
            testID="cta-ai-button"
            icon={<Sparkles size={20} color={colors.primary} strokeWidth={2.2} />}
            title="AI Coach · genera un piano"
            onPress={() => router.push('/ai-generate')}
            highlight
          />
          <ExploreItem
            testID="cta-social-button"
            icon={<Users size={20} color={colors.primary} strokeWidth={2.2} />}
            title="Community e classifiche"
            onPress={() => router.push('/social')}
          />
          <ExploreItem
            icon={<Award size={20} color={colors.primary} strokeWidth={2.2} />}
            title="I tuoi badge"
            onPress={() => router.push('/badges')}
          />
          {Platform.OS !== 'web' && (
            <ExploreItem
              testID="health-card-button"
              icon={<Heart size={20} color="#FF2D55" strokeWidth={2.2} fill="#FF2D55" />}
              title={Platform.OS === 'ios' ? 'Apple Health' : 'Google Health Connect'}
              onPress={() => router.push('/wearables')}
            />
          )}
        </View>

        <View style={{ height: spacing.lg }} />
        <AdBanner />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <View style={styles.sectionLabelDot} />
      <Text style={styles.sectionLabelText}>{text}</Text>
    </View>
  );
}

function PanoramaTile({
  label, value, valueText, unit, decimals = 0, unitSmall,
}: { label: string; value?: number; valueText?: string; unit?: string; decimals?: number; unitSmall?: boolean }) {
  return (
    <View style={styles.panoramaTile}>
      <Text style={styles.panoramaLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
        {valueText !== undefined ? (
          <Text style={styles.panoramaValue}>{valueText}</Text>
        ) : (
          <AnimatedCounter
            value={value || 0}
            decimals={decimals}
            style={styles.panoramaValue}
          />
        )}
      </View>
      {unit ? (
        <Text style={[styles.panoramaUnit, unitSmall && styles.panoramaUnitSmall]} numberOfLines={1}>
          {unit}
        </Text>
      ) : null}
    </View>
  );
}

function ExploreItem({
  icon, title, onPress, highlight, testID,
}: {
  icon: React.ReactNode; title: string;
  onPress: () => void; highlight?: boolean; testID?: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.exploreItem, highlight && styles.exploreItemHighlight]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.exploreIcon, highlight && { backgroundColor: colors.primaryMuted }]}>
        {icon}
      </View>
      <Text style={styles.exploreTitle}>{title}</Text>
      <ChevronRight size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
function fmtTimeHours(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h}:${pad2(m)}:${pad2(sec)}`;
}
function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function fmtSchedule(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const sameDay = d.toDateString() === now.toDateString();
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const hh = pad2(d.getHours()); const mm = pad2(d.getMinutes());
    if (sameDay) return `Oggi · ${hh}:${mm}`;
    if (isTomorrow) return `Domani · ${hh}:${mm}`;
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${hh}:${mm}`;
  } catch { return iso; }
}

function computeWeeklyBars(workouts: any[]): number[] {
  // Lun..Dom (ISO week: Mon=0)
  const bars = [0, 0, 0, 0, 0, 0, 0];
  const now = new Date();
  // start of current week (monday)
  const day = now.getDay(); // 0=sun..6=sat
  const offset = (day + 6) % 7; // days since monday
  const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(now.getDate() - offset);
  const next = new Date(monday); next.setDate(monday.getDate() + 7);

  workouts.forEach((w: any) => {
    const ts = w.completed_at || w.date || w.created_at;
    if (!ts) return;
    const d = new Date(ts);
    if (d >= monday && d < next) {
      const idx = (d.getDay() + 6) % 7;
      const km = parseFloat(w.distance_km || w.distance || 0);
      bars[idx] += isNaN(km) ? 0 : km;
    }
  });
  return bars;
}

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Greeting
  greeting: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greetingLogo: {
    width: 34,
    height: 34,
  },
  greetingHello: {
    color: colors.textPrimary,
    fontSize: 26,
    fontFamily: fonts.heading,
    letterSpacing: -0.6,
  },
  greetingSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.medium,
    marginTop: 4,
  },

  // Section label (▸ PANORAMICA in orange uppercase)
  sectionLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 2,
  },
  sectionLabelDot: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionLabelText: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: fonts.headingBold,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },

  // Panorama card (3 tiles inline)
  panoramaCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  panoramaTile: {
    flex: 1,
    paddingHorizontal: 6,
    minHeight: 64,
  },
  panoramaLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  panoramaValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontFamily: fonts.heading,
    letterSpacing: -0.6,
  },
  panoramaUnit: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  panoramaUnitSmall: {
    fontSize: 9.5,
    letterSpacing: 0.3,
  },
  panoramaDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 4,
  },

  // Plan card
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: fonts.bold,
    marginBottom: 10,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  planMeta: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.medium,
    marginLeft: 4,
  },
  planCardEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  planEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.bold,
    flex: 1,
  },
  planEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.medium,
  },

  // Next workout
  nextWorkoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nextWorkoutCardEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nextWorkoutIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  nextWorkoutTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  nextWorkoutMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },

  // Progress chart card
  progressCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
  },
  barChartWrap: {
    alignItems: 'center',
  },

  // Explore list
  exploreList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  exploreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exploreItemHighlight: {
    borderColor: colors.primary,
  },
  exploreIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  exploreTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
});
