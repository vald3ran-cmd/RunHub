import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../src/api';
import { colors, spacing, radius, shadows, typography, activityMeta, ActivityType } from '../src/theme';
import { BarChart, Sparkline } from '../src/MiniCharts';
import { AnimatedCounter, Skeleton } from '../src/uiPolish';
import { TrophyIcon, FlameIcon, RunIcon, WalkIcon, BikeIcon } from '../src/icons/BrandIcons';
import { ChevronLeft, Award, TrendingUp, Clock, Zap } from 'lucide-react-native';

type Dashboard = {
  days_7: { date: string; weekday: string; distance_km: number; duration_seconds: number; count: number }[];
  weeks_12: { week: string; distance_km: number; count: number }[];
  totals: { distance_km: number; duration_seconds: number; count: number };
};

type PB = {
  longest_distance?: { value_km: number; session_id?: string; date?: string } | null;
  longest_duration?: { value_seconds: number; session_id?: string; date?: string } | null;
  best_pace?: { pace_min_per_km: number; session_id?: string; distance_km: number; date?: string } | null;
} | null;

type PBs = { run: PB; walk: PB; bike: PB };

export default function DashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [pbs, setPbs] = useState<PBs | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const days = data?.days_7 || [];
  const weeks = data?.weeks_12 || [];
  const totals = data?.totals || { distance_km: 0, duration_seconds: 0, count: 0 };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.4} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>STATISTICHE</Text>
          <Text style={styles.title}>Dashboard</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Lifetime totals */}
        <View style={styles.totalsRow}>
          <View style={styles.totalCard}>
            <View style={[styles.totalIcon, { backgroundColor: colors.primaryMuted }]}>
              <TrendingUp size={18} color={colors.primary} strokeWidth={2.4} />
            </View>
            {loading ? <Skeleton width={70} height={26} /> : (
              <AnimatedCounter value={totals.distance_km} decimals={1} style={styles.totalValue} />
            )}
            <Text style={styles.totalUnit}>km totali</Text>
          </View>
          <View style={styles.totalCard}>
            <View style={[styles.totalIcon, { backgroundColor: '#FEF3C7' }]}>
              <Clock size={18} color={colors.warning} strokeWidth={2.4} />
            </View>
            {loading ? <Skeleton width={70} height={26} /> : (
              <AnimatedCounter value={totals.duration_seconds / 3600} decimals={1} style={styles.totalValue} suffix="" />
            )}
            <Text style={styles.totalUnit}>ore totali</Text>
          </View>
          <View style={styles.totalCard}>
            <View style={[styles.totalIcon, { backgroundColor: '#D1FAE5' }]}>
              <Zap size={18} color={colors.success} strokeWidth={2.4} />
            </View>
            {loading ? <Skeleton width={50} height={26} /> : (
              <AnimatedCounter value={totals.count} decimals={0} style={styles.totalValue} />
            )}
            <Text style={styles.totalUnit}>sessioni</Text>
          </View>
        </View>

        {/* Bar chart: last 7 days */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Ultimi 7 giorni</Text>
            <Text style={styles.chartSub}>
              {days.reduce((a, b) => a + b.distance_km, 0).toFixed(1)} km
            </Text>
          </View>
          <BarChart
            data={days.map((d) => d.distance_km)}
            labels={days.map((d) => d.weekday.substring(0, 3))}
            width={320}
            height={140}
            color={colors.primary}
          />
        </View>

        {/* Sparkline: 12 weeks */}
        {weeks.length > 1 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>Trend 12 settimane</Text>
              <Text style={styles.chartSub}>{weeks.length} sett. attive</Text>
            </View>
            <Sparkline
              data={weeks.map((w) => w.distance_km)}
              width={320}
              height={60}
              color={colors.success}
              strokeWidth={2.5}
            />
          </View>
        )}

        {/* Personal Bests */}
        <View style={styles.pbSection}>
          <View style={styles.sectionRow}>
            <Award size={18} color={colors.primary} strokeWidth={2.4} />
            <Text style={styles.sectionTitle}>Personal Best</Text>
          </View>

          {(['run', 'walk', 'bike'] as ActivityType[]).map((type) => {
            const meta = activityMeta[type];
            const pb = pbs?.[type];
            if (!pb) return (
              <View key={type} style={[styles.pbCard, { opacity: 0.4 }]}>
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
                        <Text style={styles.pbValue}>{pb.best_pace.pace_min_per_km.toFixed(2)}'</Text>
                        <Text style={styles.pbLabel}>passo top</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function fmtDur(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },
  eyebrow: { ...typography.eyebrow, color: colors.textSecondary, marginBottom: 2 },
  title: { ...typography.displayMd, color: colors.textPrimary },
  totalsRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  totalCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
    ...shadows.sm,
  },
  totalIcon: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  totalValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  totalUnit: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 2 },
  chartCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  chartSub: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  pbSection: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  pbCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  pbIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  pbActivity: { ...typography.h3, color: colors.textPrimary, marginBottom: 4 },
  pbRow: { flexDirection: 'row', gap: spacing.md },
  pbStat: {},
  pbValue: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  pbLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pbEmpty: { color: colors.textMuted, fontSize: 12 },
});
