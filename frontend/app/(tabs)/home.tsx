import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { colors, spacing, radius, shadows, typography } from '../../src/theme';
import { ProgressRing } from '../../src/ProgressRing';
import { AdBanner } from '../../src/Ads';
import {
  BoltIcon, SparklesIcon, TrophyIcon, FlameIcon,
} from '../../src/icons/BrandIcons';
import { AnimatedCounter } from '../../src/uiPolish';
import {
  ChevronRight, Heart, Users, Activity, Clock, BarChart3,
} from 'lucide-react-native';

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

  const userName = (user?.name?.split(' ')[0] || 'Runner');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Top bar — Logo + Saluto */}
        <View style={styles.topBar}>
          <Image
            source={require('../../assets/images/logo-transparent.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.helloLabel}>Ciao</Text>
            <Text style={styles.helloName} numberOfLines={1}>{userName} 👋</Text>
          </View>
        </View>

        {/* Hero — "Pronto a correre?" */}
        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>OGGI</Text>
            <Text style={styles.heroTitle}>Pronto a{'\n'}correre?</Text>
            <TouchableOpacity
              testID="hero-start-run-button"
              activeOpacity={0.85}
              style={styles.heroCta}
              onPress={() => router.push('/(tabs)/run')}
            >
              <BoltIcon size={16} color="#fff" />
              <Text style={styles.heroCtaText}>Inizia ora</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroVisual}>
            <View style={styles.heroBlob} />
            <View style={styles.heroBlob2} />
            <Image
              source={require('../../assets/images/logo-transparent.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Traguardi — 3 ring */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>I tuoi traguardi</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.sectionAction}>Modifica</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.ringsRow}>
          <GoalRing
            label="Oggi"
            done={progress?.daily.distance_km ?? 0}
            goal={progress?.goals.daily_km ?? 0}
            pct={dailyPct}
            color={colors.primary}
          />
          <GoalRing
            label="Settimana"
            done={progress?.weekly.distance_km ?? 0}
            goal={progress?.goals.weekly_km ?? 0}
            pct={weeklyPct}
            color={colors.success}
          />
          <GoalRing
            label="Mese"
            done={progress?.monthly.distance_km ?? 0}
            goal={progress?.goals.monthly_km ?? 0}
            pct={monthlyPct}
            color={colors.warning}
          />
        </View>

        {/* Quick stats */}
        <View style={styles.statsGrid}>
          <StatCard
            icon={<TrophyIcon size={22} color={colors.primary} />}
            label="Corse questo mese"
            value={`${progress?.monthly.count ?? 0}`}
          />
          <StatCard
            icon={<Clock size={22} color={colors.primary} strokeWidth={2.2} />}
            label="Tempo totale"
            value={fmtDuration(progress?.monthly.duration_seconds ?? 0)}
          />
        </View>

        {/* Apple Health */}
        {Platform.OS !== 'web' && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.lg, marginHorizontal: spacing.lg }]}>
              Integrazioni salute
            </Text>
            <TouchableOpacity
              testID="health-card-button"
              style={styles.healthCard}
              onPress={() => router.push('/wearables')}
              activeOpacity={0.85}
            >
              <View style={styles.healthIconWrap}>
                <Heart size={22} color="#FF2D55" strokeWidth={2.2} fill="#FF2D55" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.healthTitle}>
                  {Platform.OS === 'ios' ? 'Apple Health' : 'Google Health Connect'}
                </Text>
                <Text style={styles.healthSubtitle}>
                  Sincronizza passi, frequenza cardiaca e calorie.
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {/* Hub: Piani / AI / Social */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg, marginHorizontal: spacing.lg }]}>
          Esplora
        </Text>

        <View style={styles.exploreList}>
          <ExploreItem
            testID="cta-plans-button"
            icon={<Activity size={20} color={colors.primary} strokeWidth={2.2} />}
            eyebrow="Piani"
            title="Trova il tuo programma"
            onPress={() => router.push('/(tabs)/plans')}
          />
          <ExploreItem
            testID="cta-dashboard-button"
            icon={<BarChart3 size={20} color={colors.primary} strokeWidth={2.2} />}
            eyebrow="Statistiche"
            title="Dashboard e Personal Best"
            onPress={() => router.push('/dashboard')}
          />
          <ExploreItem
            testID="cta-ai-button"
            icon={<SparklesIcon size={20} color={colors.primary} />}
            eyebrow="AI Coach · Performance"
            title="Genera un piano su misura"
            onPress={() => router.push('/ai-generate')}
            highlight
          />
          <ExploreItem
            testID="cta-social-button"
            icon={<Users size={20} color={colors.primary} strokeWidth={2.2} />}
            eyebrow="Community"
            title="Amici, feed e classifiche"
            onPress={() => router.push('/social')}
          />
          <ExploreItem
            icon={<FlameIcon size={20} color={colors.primary} />}
            eyebrow="Achievement"
            title="I tuoi badge"
            onPress={() => router.push('/badges')}
          />
        </View>

        <AdBanner />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
function GoalRing({
  label, done, goal, pct, color,
}: { label: string; done: number; goal: number; pct: number; color: string }) {
  return (
    <View style={styles.ringCard}>
      <ProgressRing progress={pct} size={92} strokeWidth={9} color={color}>
        <Text style={styles.ringValue}>{done.toFixed(1)}</Text>
        <Text style={styles.ringUnit}>/ {goal} km</Text>
      </ProgressRing>
      <Text
        style={styles.ringLabel}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {label}
      </Text>
    </View>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  // Try to parse a numeric value out of the string for animation, fallback to text
  const numMatch = value.match(/^(\d+(?:\.\d+)?)$/);
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>{icon}</View>
      <View style={{ flex: 1 }}>
        {numMatch ? (
          <AnimatedCounter value={parseFloat(numMatch[1])} decimals={numMatch[1].includes('.') ? 1 : 0} style={styles.statValue} />
        ) : (
          <Text style={styles.statValue}>{value}</Text>
        )}
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

function ExploreItem({
  icon, eyebrow, title, onPress, highlight, testID,
}: {
  icon: React.ReactNode; eyebrow: string; title: string;
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
      <View style={{ flex: 1 }}>
        <Text style={[styles.exploreEyebrow, highlight && { color: colors.primary }]}>
          {eyebrow}
        </Text>
        <Text style={styles.exploreTitle}>{title}</Text>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function fmtDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  logo: { width: 44, height: 44 },
  helloLabel: { ...typography.small, color: colors.textSecondary },
  helloName: { ...typography.h2, color: colors.textPrimary },

  // Hero card
  heroCard: {
    flexDirection: 'row',
    backgroundColor: colors.textPrimary,
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    padding: spacing.lg,
    minHeight: 180,
    overflow: 'hidden',
    ...shadows.md,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  heroCta: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    gap: 6,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  heroCtaText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },
  heroVisual: { width: 110, alignItems: 'center', justifyContent: 'center' },
  heroLogo: { width: 88, height: 88, opacity: 0.95 },
  heroBlob: {
    position: 'absolute', right: -30, top: -10,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,107,107,0.18)',
  },
  heroBlob2: {
    position: 'absolute', right: 10, bottom: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,107,107,0.10)',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  sectionAction: { ...typography.small, color: colors.primary, fontWeight: '700' },

  // Rings
  ringsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  ringCard: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  ringValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  ringUnit: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  ringLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  statIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { color: colors.textPrimary, fontSize: 20, fontWeight: '900' },
  statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },

  // Health
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  healthIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,45,85,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  healthTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  healthSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

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
    ...shadows.sm,
  },
  exploreItemHighlight: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  exploreIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  exploreEyebrow: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  exploreTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
});
