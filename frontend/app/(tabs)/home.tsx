import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { colors, spacing, radius } from '../../src/theme';
import { ProgressRing } from '../../src/ProgressRing';
import { AdBanner } from '../../src/Ads';

type Progress = {
  daily: { distance_km: number; duration_seconds: number; count: number };
  weekly: { distance_km: number; duration_seconds: number; count: number };
  monthly: { distance_km: number; duration_seconds: number; count: number };
  goals: { daily_km: number; weekly_km: number; monthly_km: number };
};

export default function Home() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = async () => {
    try {
      const { data } = await api.get('/stats/progress');
      setProgress(data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  };

  const dailyPct = progress ? progress.daily.distance_km / Math.max(progress.goals.daily_km, 0.1) : 0;
  const weeklyPct = progress ? progress.weekly.distance_km / Math.max(progress.goals.weekly_km, 0.1) : 0;
  const monthlyPct = progress ? progress.monthly.distance_km / Math.max(progress.goals.monthly_km, 0.1) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1765914448187-ee93dd13e1e6?w=1200' }}
          style={styles.hero}
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.greeting}>CIAO, {user?.name?.toUpperCase() ?? 'RUNNER'}</Text>
            <Text style={styles.heroTitle}>PRONTO A{"\n"}CORRERE?</Text>
            <TouchableOpacity
              testID="hero-start-run-button"
              style={styles.heroButton} onPress={() => router.push('/(tabs)/run')}
            >
              <Ionicons name="flash" size={18} color="#fff" />
              <Text style={styles.heroButtonText}>INIZIA UN RUN</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* Goals grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I TUOI TRAGUARDI</Text>
          <View style={styles.ringsRow}>
            <GoalRing label="OGGI" done={progress?.daily.distance_km ?? 0} goal={progress?.goals.daily_km ?? 0} pct={dailyPct} />
            <GoalRing label="SETTIMANA" done={progress?.weekly.distance_km ?? 0} goal={progress?.goals.weekly_km ?? 0} pct={weeklyPct} color={colors.success} />
            <GoalRing label="MESE" done={progress?.monthly.distance_km ?? 0} goal={progress?.goals.monthly_km ?? 0} pct={monthlyPct} color={colors.warning} />
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <StatCard label="CORSE" value={`${progress?.monthly.count ?? 0}`} sub="Questo mese" icon="trophy" />
            <StatCard label="TEMPO" value={fmtDuration(progress?.monthly.duration_seconds ?? 0)} sub="Totale mese" icon="time" />
          </View>
        </View>

        {/* CTAs */}
        <View style={styles.section}>
          <TouchableOpacity
            testID="cta-plans-button"
            style={styles.ctaCard} onPress={() => router.push('/(tabs)/plans')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaLabel}>PIANI DI ALLENAMENTO</Text>
              <Text style={styles.ctaTitle}>Trova il tuo programma</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="cta-ai-button"
            style={[styles.ctaCard, styles.premiumCard]} onPress={() => router.push('/ai-generate')}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.ctaLabel, { color: colors.primary }]}>AI COACH · PERFORMANCE</Text>
              <Text style={styles.ctaTitle}>Genera un piano su misura</Text>
            </View>
            <Ionicons name="sparkles" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="cta-social-button"
            style={styles.ctaCard} onPress={() => router.push('/social')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaLabel}>COMMUNITY</Text>
              <Text style={styles.ctaTitle}>Amici, feed e classifiche</Text>
            </View>
            <Ionicons name="people" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <AdBanner />
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalRing({ label, done, goal, pct, color }: { label: string; done: number; goal: number; pct: number; color?: string }) {
  return (
    <View style={styles.ringCard}>
      <ProgressRing progress={pct} size={100} strokeWidth={10} color={color ?? colors.primary}>
        <Text style={styles.ringValue}>{done.toFixed(1)}</Text>
        <Text style={styles.ringUnit}>/ {goal} km</Text>
      </ProgressRing>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: any }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function fmtDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  hero: { height: 260, justifyContent: 'flex-end' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9,9,11,0.65)' },
  heroContent: { padding: spacing.lg },
  greeting: { color: colors.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  heroTitle: { color: colors.textPrimary, fontSize: 40, fontWeight: '900', letterSpacing: -1, marginVertical: spacing.sm },
  heroButton: {
    backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.pill, gap: spacing.sm, marginTop: spacing.sm,
  },
  heroButtonText: { color: '#fff', fontWeight: '800', letterSpacing: 2 },
  section: { padding: spacing.lg, paddingTop: spacing.lg },
  sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', letterSpacing: 2, marginBottom: spacing.md },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  ringCard: {
    flex: 1, backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: radius.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  ringValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '900' },
  ringUnit: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  ringLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: spacing.sm },
  statsGrid: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1, backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: spacing.sm },
  statValue: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', marginTop: 2 },
  statSub: { color: colors.textSecondary, fontSize: 12 },
  ctaCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  premiumCard: { borderColor: colors.primary },
  ctaLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  ctaTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 4 },
});
