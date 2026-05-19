import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../src/api';
import { colors, spacing, radius, fonts, activityMeta, ActivityType } from '../src/theme';
import { BarChart, Sparkline } from '../src/MiniCharts';
import { AnimatedCounter, Skeleton } from '../src/uiPolish';
import { RunIcon, WalkIcon, BikeIcon } from '../src/icons/BrandIcons';
import {
  ChevronLeft, Award, TrendingUp, TrendingDown, X,
} from 'lucide-react-native';

type DayPoint = { date: string; weekday: string; distance_km: number; duration_seconds: number; count: number };
type WeekPoint = { week: string; distance_km: number; count: number };
type Totals = { distance_km: number; duration_seconds: number; count: number };

type Dashboard = {
  days_7: DayPoint[];
  weeks_12: WeekPoint[];
  totals: Totals;
};

type PB = {
  longest_distance?: { value_km: number; session_id?: string; date?: string } | null;
  longest_duration?: { value_seconds: number; session_id?: string; date?: string } | null;
  best_pace?: { pace_min_per_km: number; session_id?: string; distance_km: number; date?: string } | null;
} | null;
type PBs = { run: PB; walk: PB; bike: PB };

type Period = '7G' | '30G' | '90G' | '1A' | 'TUTTO';
const PERIODS: Period[] = ['7G', '30G', '90G', '1A', 'TUTTO'];

export default function DashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [pbs, setPbs] = useState<PBs | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30G');

  const load = async () => {
    try {
      const [d, p] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/stats/personal-bests'),
      ]);
      setData(d.data);
      setPbs(p.data);
    } catch {}
    finally { setLoading(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // ─────────────────────────────────────────────────────────────
  // Period-aware aggregation
  // ─────────────────────────────────────────────────────────────
  const aggregated = useMemo(() => {
    return computeForPeriod(period, data);
  }, [period, data]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.title}>Progressi</Text>
      </View>

      {/* Period pill selector */}
      <View style={styles.periodBar}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodPill, period === p && styles.periodPillActive]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.85}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* DISTANZA card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>DISTANZA</Text>
          <View style={styles.cardValueRow}>
            {loading ? <Skeleton width={140} height={36} /> : (
              <AnimatedCounter
                value={aggregated.totalDistanceKm}
                decimals={1}
                style={styles.cardValue}
                suffix=" km"
              />
            )}
          </View>
          <DeltaBadge deltaPct={aggregated.distanceDeltaPct} periodLabel={periodCompareLabel(period)} />
          <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
            <Sparkline
              data={aggregated.distanceSeries.length > 1 ? aggregated.distanceSeries : [0.01, 0.01]}
              width={300}
              height={90}
              color={colors.primary}
              strokeWidth={2.5}
            />
          </View>
        </View>

        {/* ATTIVITÀ card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ATTIVITÀ</Text>
          <View style={styles.cardValueRow}>
            {loading ? <Skeleton width={70} height={36} /> : (
              <AnimatedCounter
                value={aggregated.totalCount}
                decimals={0}
                style={styles.cardValue}
              />
            )}
          </View>
          <Text style={styles.cardSub}>Allenamenti</Text>
          <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
            <BarChart
              data={aggregated.countSeries.length ? aggregated.countSeries : [0, 0, 0, 0, 0, 0, 0]}
              labels={aggregated.countLabels}
              width={300}
              height={120}
              color={colors.primary}
            />
          </View>
        </View>

        {/* RITMO MEDIO card */}
        {aggregated.avgPaceMin > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>RITMO MEDIO</Text>
            <View style={styles.cardValueRow}>
              <Text style={styles.cardValue}>{fmtPace(aggregated.avgPaceMin)}</Text>
              <Text style={styles.cardUnit}>/km</Text>
            </View>
            <DeltaBadge deltaPct={aggregated.paceDeltaPct} periodLabel={periodCompareLabel(period)} invert />
          </View>
        ) : null}

        {/* PERSONAL BESTS */}
        <View style={styles.sectionLabelRow}>
          <Award size={16} color={colors.primary} strokeWidth={2.4} />
          <Text style={styles.sectionLabel}>PERSONAL BEST</Text>
        </View>

        {(['run', 'walk', 'bike'] as ActivityType[]).map((type) => {
          const meta = activityMeta[type];
          const pb = pbs?.[type];
          if (!pb) return (
            <View key={type} style={[styles.pbCard, { opacity: 0.45 }]}>
              <View style={[styles.pbIcon, { backgroundColor: meta.colorMuted }]}>
                {type === 'run' ? <RunIcon size={20} color={meta.color} /> :
                 type === 'walk' ? <WalkIcon size={20} color={meta.color} /> :
                 <BikeIcon size={20} color={meta.color} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pbActivity}>{meta.label}</Text>
                <Text style={styles.pbEmpty}>Nessun record ancora</Text>
              </View>
            </View>
          );
          return (
            <View key={type} style={styles.pbCard}>
              <View style={[styles.pbIcon, { backgroundColor: meta.colorMuted }]}>
                {type === 'run' ? <RunIcon size={20} color={meta.color} /> :
                 type === 'walk' ? <WalkIcon size={20} color={meta.color} /> :
                 <BikeIcon size={20} color={meta.color} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pbActivity}>{meta.label}</Text>
                <View style={styles.pbRow}>
                  {pb.longest_distance ? (
                    <View style={styles.pbStat}>
                      <Text style={styles.pbValue}>{pb.longest_distance.value_km}</Text>
                      <Text style={styles.pbLabel}>km max</Text>
                    </View>
                  ) : null}
                  {pb.longest_duration ? (
                    <View style={styles.pbStat}>
                      <Text style={styles.pbValue}>{fmtDur(pb.longest_duration.value_seconds)}</Text>
                      <Text style={styles.pbLabel}>tempo max</Text>
                    </View>
                  ) : null}
                  {pb.best_pace ? (
                    <View style={styles.pbStat}>
                      <Text style={styles.pbValue}>{fmtPace(pb.best_pace.pace_min_per_km)}</Text>
                      <Text style={styles.pbLabel}>passo top</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// Delta badge (green up arrow / red down arrow)
// `invert`: true means lower is better (e.g. pace) — flip colors
// ─────────────────────────────────────────────────────────────
function DeltaBadge({
  deltaPct, periodLabel, invert,
}: { deltaPct: number | null; periodLabel: string; invert?: boolean }) {
  if (deltaPct == null || isNaN(deltaPct)) return null;
  const up = deltaPct >= 0;
  const positive = invert ? !up : up;
  const color = positive ? colors.success : colors.danger;
  const Icon = up ? TrendingUp : TrendingDown;
  const sign = up ? '+' : '';
  return (
    <View style={styles.deltaRow}>
      <Icon size={12} color={color} strokeWidth={2.6} />
      <Text style={[styles.deltaText, { color }]}>{sign}{deltaPct.toFixed(0)}%</Text>
      <Text style={styles.deltaPeriod}>vs {periodLabel}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Aggregation helpers
// ─────────────────────────────────────────────────────────────
function computeForPeriod(period: Period, data: Dashboard | null) {
  const empty = {
    totalDistanceKm: 0,
    totalCount: 0,
    avgPaceMin: 0,
    distanceSeries: [] as number[],
    countSeries: [] as number[],
    countLabels: [] as string[],
    distanceDeltaPct: null as number | null,
    paceDeltaPct: null as number | null,
  };
  if (!data) return empty;
  const days = data.days_7 || [];
  const weeks = data.weeks_12 || [];

  if (period === '7G') {
    const series = days.map(d => d.distance_km);
    const total = series.reduce((a, b) => a + b, 0);
    const count = days.reduce((a, b) => a + b.count, 0);
    const totalDur = days.reduce((a, b) => a + b.duration_seconds, 0);
    return {
      ...empty,
      totalDistanceKm: total,
      totalCount: count,
      avgPaceMin: total > 0 ? (totalDur / 60) / total : 0,
      distanceSeries: series,
      countSeries: days.map(d => d.count),
      countLabels: days.map(d => (d.weekday || '').substring(0, 1)),
      // Delta: first 3 days vs last 4 (approximate)
      distanceDeltaPct: deltaSplit(series),
    };
  }

  if (period === '30G') {
    const w = weeks.slice(-4); // last 4 weeks ≈ 28 days
    const series = w.map(x => x.distance_km);
    const total = series.reduce((a, b) => a + b, 0);
    return {
      ...empty,
      totalDistanceKm: total,
      totalCount: w.reduce((a, b) => a + b.count, 0),
      avgPaceMin: 0, // not available at week granularity (no duration sum)
      distanceSeries: series,
      countSeries: w.map(x => x.count),
      countLabels: w.map((_, i) => `S${i + 1}`),
      distanceDeltaPct: deltaSplit(series),
    };
  }

  if (period === '90G') {
    const w = weeks.slice(-12); // 12 weeks ≈ 84 days
    const series = w.map(x => x.distance_km);
    const total = series.reduce((a, b) => a + b, 0);
    return {
      ...empty,
      totalDistanceKm: total,
      totalCount: w.reduce((a, b) => a + b.count, 0),
      avgPaceMin: 0,
      distanceSeries: series,
      countSeries: w.map(x => x.count),
      countLabels: w.map((_, i) => i % 2 === 0 ? `${i + 1}` : ''),
      distanceDeltaPct: deltaSplit(series),
    };
  }

  if (period === '1A') {
    // Approximate: weeks_12 is only 12 weeks, so we'll show what we have
    const series = weeks.map(x => x.distance_km);
    return {
      ...empty,
      totalDistanceKm: data.totals.distance_km,
      totalCount: data.totals.count,
      avgPaceMin: data.totals.distance_km > 0
        ? (data.totals.duration_seconds / 60) / data.totals.distance_km : 0,
      distanceSeries: series,
      countSeries: weeks.map(x => x.count),
      countLabels: weeks.map((_, i) => i % 2 === 0 ? `${i + 1}` : ''),
      distanceDeltaPct: deltaSplit(series),
    };
  }

  // TUTTO
  const series = weeks.map(x => x.distance_km);
  return {
    ...empty,
    totalDistanceKm: data.totals.distance_km,
    totalCount: data.totals.count,
    avgPaceMin: data.totals.distance_km > 0
      ? (data.totals.duration_seconds / 60) / data.totals.distance_km : 0,
    distanceSeries: series,
    countSeries: weeks.map(x => x.count),
    countLabels: weeks.map((_, i) => i % 2 === 0 ? `${i + 1}` : ''),
    distanceDeltaPct: null,
  };
}

// Split series in 2 halves, return delta % of second half vs first half
function deltaSplit(arr: number[]): number | null {
  if (!arr || arr.length < 4) return null;
  const half = Math.floor(arr.length / 2);
  const first = arr.slice(0, half).reduce((a, b) => a + b, 0) / Math.max(1, half);
  const second = arr.slice(half).reduce((a, b) => a + b, 0) / Math.max(1, arr.length - half);
  if (first <= 0) return null;
  return ((second - first) / first) * 100;
}

function periodCompareLabel(p: Period): string {
  switch (p) {
    case '7G': return '7 giorni precedenti';
    case '30G': return '30 giorni precedenti';
    case '90G': return '90 giorni precedenti';
    case '1A': return 'anno precedente';
    default: return 'periodo precedente';
  }
}

function fmtDur(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}
function fmtPace(p: number) {
  if (!p || isNaN(p)) return '—';
  const min = Math.floor(p);
  const sec = Math.floor((p - min) * 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontFamily: fonts.heading,
    letterSpacing: -0.5,
  },

  // Period selector
  periodBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    gap: 6,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  periodPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
  },
  periodTextActive: {
    color: '#fff',
  },

  // Stat card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  cardValue: {
    color: colors.textPrimary,
    fontSize: 32,
    fontFamily: fonts.heading,
    letterSpacing: -0.8,
  },
  cardUnit: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  cardSub: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },

  // Delta
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  deltaText: { fontSize: 12, fontFamily: fonts.bold },
  deltaPeriod: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.medium, marginLeft: 2 },

  // Section label
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
    marginBottom: 2,
  },
  sectionLabel: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: fonts.headingBold,
    letterSpacing: 1.6,
  },

  // PB card
  pbCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pbIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  pbActivity: { color: colors.textPrimary, fontSize: 15, fontFamily: fonts.bold, marginBottom: 4 },
  pbRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  pbStat: {},
  pbValue: { color: colors.textPrimary, fontSize: 15, fontFamily: fonts.bold },
  pbLabel: { color: colors.textSecondary, fontSize: 10, fontFamily: fonts.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  pbEmpty: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.medium },
});
