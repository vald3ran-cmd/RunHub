import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { colors, spacing, radius } from '../src/theme';
import { HeatmapView } from '../src/Heatmap';
import { useT } from '../src/i18n';

export default function HeatmapScreen() {
  const router = useRouter();
  const { t } = useT();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/stats/routes');
        setRoutes(data || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const totalKm = routes.reduce((s, r) => s + (r.distance_km || 0), 0);
  const totalRuns = routes.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('heatmap.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalRuns}</Text>
            <Text style={styles.statLabel}>{t('heatmap.runs_label')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalKm.toFixed(1)}</Text>
            <Text style={styles.statLabel}>{t('heatmap.km_total_label')}</Text>
          </View>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : routes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('heatmap.no_runs_yet')}</Text>
            <Text style={styles.emptyText}>{t('heatmap.no_runs_sub')}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.replace('/(tabs)/run')}>
              <Text style={styles.emptyBtnText}>{t('heatmap.start_a_run')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <HeatmapView routes={routes} height={460} />
            <View style={styles.legend}>
              <Text style={styles.legendTitle}>{t('heatmap.legend')}</Text>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
                <Text style={styles.legendText}>{t('heatmap.last_run')}</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
                <Text style={styles.legendText}>{t('heatmap.recent_5')}</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#FFD60A' }]} />
                <Text style={styles.legendText}>{t('heatmap.history_10')}</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(255, 149, 0, 0.55)' }]} />
                <Text style={styles.legendText}>{t('heatmap.older')}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statBox: { flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' },
  statLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginTop: spacing.md },
  emptyText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, marginTop: spacing.md },
  emptyBtnText: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
  legend: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  legendTitle: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: 4 },
  legendDot: { width: 12, height: 4, borderRadius: 2 },
  legendText: { color: colors.textPrimary, fontSize: 13 },
});
