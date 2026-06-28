/**
 * Diario — Lista cronologica delle sessioni importate / registrate.
 * Stile Scientific Light. Per ora mock; in 1.6.x si collegherà a:
 *   GET /api/workouts/history (sessioni esistenti) + futuro /api/imported_sessions.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Search, Filter, GitCompare } from 'lucide-react-native';
import { tokens, FontProvider, SessionCard, Chip } from '../../src/design-system';
import { api } from '../../src/api';
import { AdBanner } from '../../src/Ads';
import { useT, t as tStatic } from '../../src/i18n';

const { brand, neutral, text, spacing, typography } = tokens;

type Source = 'apple_watch' | 'garmin' | 'phone' | 'file';
type SessionItem = {
  id: string;
  title: string;
  distanceKm: number;
  durationStr: string;
  paceStr: string;
  zoneChip: string;
  scoreLetter: string;
  scoreValue: number;
  dateLabel: string;
  monthKey: string;
  source: Source;
};

type FilterKey = 'all' | 'apple_watch' | 'garmin' | 'phone' | 'file';

const MONTH_KEYS = ['month_jan','month_feb','month_mar','month_apr','month_may','month_jun','month_jul','month_aug','month_sep','month_oct','month_nov','month_dec'];

function fmtDuration(sec: number): string {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function fmtPace(pace?: number | null): string {
  if (!pace || pace <= 0 || pace > 30) return '—';
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

function fmtRelativeDate(iso: string): string {
  const dt = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - dt.getTime()) / 86400000);
  if (diffDays === 0) return tStatic('diario.relative_today');
  if (diffDays === 1) return tStatic('diario.relative_yesterday');
  if (diffDays < 7) return tStatic('diario.relative_days_ago', { n: diffDays });
  return `${dt.getDate()} ${tStatic(`diario.${MONTH_KEYS[dt.getMonth()]}`).slice(0, 3).toLowerCase()}`;
}

function zoneFromPace(pace?: number | null, activity?: string): string {
  if (activity === 'bike') return tStatic('diario.zone_bike');
  if (activity === 'walk') return tStatic('diario.zone_walk');
  if (!pace || pace <= 0) return tStatic('diario.zone_run');
  if (pace < 4.5) return tStatic('diario.zone_z5');
  if (pace < 5.0) return tStatic('diario.zone_z4');
  if (pace < 5.5) return tStatic('diario.zone_z3');
  if (pace < 6.5) return tStatic('diario.zone_z2');
  return tStatic('diario.zone_z1');
}

function scoreFromDistance(km: number, pace?: number | null): { letter: string; value: number } {
  let score = Math.min(95, 50 + km * 4 + (pace ? Math.max(0, (7 - pace) * 6) : 0));
  score = Math.round(score);
  let letter = 'C';
  if (score >= 90) letter = 'A+';
  else if (score >= 82) letter = 'A';
  else if (score >= 75) letter = 'A-';
  else if (score >= 68) letter = 'B+';
  else if (score >= 60) letter = 'B';
  else if (score >= 50) letter = 'C+';
  return { letter, value: score };
}

function sourceFromImport(importSource?: string | null): Source {
  if (importSource === 'fit' || importSource === 'gpx' || importSource === 'tcx') return 'file';
  if (importSource === 'apple_health') return 'apple_watch';
  if (importSource === 'garmin' || importSource === 'health_connect') return 'garmin';
  return 'phone';
}

function DiarioInner() {
  const router = useRouter();
  const { t, locale: _locale } = useT();
  // Subscribe to locale changes so the static tStatic() calls in helpers/useMemo
  // re-evaluate when language switches.
  void _locale;
  const [filter, setFilter] = useState<FilterKey>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get('/workouts/history');
      const raw: any[] = res.data || [];
      const mapped: SessionItem[] = raw.map((s) => {
        const completedAt = s.completed_at;
        const dt = completedAt ? new Date(completedAt) : new Date();
        const km = Number(s.distance_km) || 0;
        const dur = Number(s.duration_seconds) || 0;
        const pace = s.avg_pace_min_per_km;
        const score = scoreFromDistance(km, pace);
        return {
          id: s.session_id,
          title: s.title || tStatic('diario.session_default'),
          distanceKm: km,
          durationStr: fmtDuration(dur),
          paceStr: fmtPace(pace),
          zoneChip: zoneFromPace(pace, s.activity_type),
          scoreLetter: score.letter,
          scoreValue: score.value,
          dateLabel: fmtRelativeDate(completedAt),
          monthKey: `${tStatic(`diario.${MONTH_KEYS[dt.getMonth()]}`)} ${dt.getFullYear()}`,
          source: sourceFromImport(s.import_source),
        };
      });
      setSessions(mapped);
    } catch (e) {
      console.warn('[diario] history error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useFocusEffect(useCallback(() => { fetchSessions(); }, [fetchSessions]));

  const filtered = useMemo(
    () => filter === 'all' ? sessions : sessions.filter(s => s.source === filter),
    [filter, sessions],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, SessionItem[]>();
    filtered.forEach(s => {
      if (!map.has(s.monthKey)) map.set(s.monthKey, []);
      map.get(s.monthKey)!.push(s);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const totalKm = filtered.reduce((acc, s) => acc + s.distanceKm, 0);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 2) next.add(id);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('diario.title')}</Text>
          <Text style={styles.subtitle}>
            {t('diario.subtitle', { n: filtered.length, km: totalKm.toFixed(1) })}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.compareBtn, compareMode && styles.compareBtnActive]}
          onPress={() => { setCompareMode(v => !v); setSelected(new Set()); }}
        >
          <GitCompare size={16} color={compareMode ? '#fff' : text.primary} strokeWidth={2} />
          <Text style={[styles.compareBtnText, compareMode && { color: '#fff' }]}>{t('diario.compare_btn')}</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchBar}>
        <Search size={16} color={text.muted} strokeWidth={2} />
        <Text style={styles.searchPlaceholder}>{t('diario.search_placeholder')}</Text>
        <View style={styles.filterIconWrap}>
          <Filter size={14} color={text.muted} strokeWidth={2} />
        </View>
      </View>

      {/* FILTER CHIPS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        <Chip label={t('diario.filter_all')} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={t('diario.filter_apple_watch')} selected={filter === 'apple_watch'} onPress={() => setFilter('apple_watch')} />
        <Chip label={t('diario.filter_garmin')} selected={filter === 'garmin'} onPress={() => setFilter('garmin')} />
        <Chip label={t('diario.filter_phone')} selected={filter === 'phone'} onPress={() => setFilter('phone')} />
        <Chip label={t('diario.filter_file')} selected={filter === 'file'} onPress={() => setFilter('file')} />
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSessions(); }} tintColor={brand.primary} />}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={brand.primary} />
          </View>
        ) : grouped.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('diario.empty_title')}</Text>
            <Text style={styles.emptyBody}>
              {sessions.length === 0
                ? t('diario.empty_body_first')
                : t('diario.empty_body_filter')}
            </Text>
            <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/(tabs)/importa')}>
              <Text style={styles.emptyCtaText}>{t('diario.empty_cta')}</Text>
            </TouchableOpacity>
          </View>
        ) : grouped.map(([month, items]) => (
          <View key={month} style={styles.section}>
            <Text style={styles.monthLabel}>{month.toUpperCase()}</Text>
            <View style={{ gap: spacing.sm }}>
              {items.map(item => {
                const isSelected = selected.has(item.id);
                return (
                  <View key={item.id} style={[isSelected && styles.selectedWrap]}>
                    <SessionCard
                      title={item.title}
                      distanceKm={item.distanceKm}
                      durationStr={item.durationStr}
                      paceStr={item.paceStr}
                      zoneChip={item.zoneChip}
                      scoreLetter={item.scoreLetter}
                      scoreValue={item.scoreValue}
                      dateLabel={item.dateLabel}
                      source={item.source}
                      onPress={() => {
                        if (compareMode) toggleSelect(item.id);
                        else router.push(`/workout/${item.id}`);
                      }}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <AdBanner />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* COMPARE BAR */}
      {compareMode && selected.size > 0 ? (
        <View style={styles.compareBar}>
          <Text style={styles.compareBarText}>
            {selected.size === 1 ? t('diario.compare_one_selected') : t('diario.compare_two_selected')}
          </Text>
          <TouchableOpacity
            disabled={selected.size !== 2}
            style={[styles.compareBarBtn, selected.size !== 2 && { opacity: 0.5 }]}
            onPress={() => {
              const [first] = Array.from(selected);
              if (first) router.push(`/workout/${first}`);
            }}
          >
            <Text style={styles.compareBarBtnText}>{t('diario.compare_cta')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function DiarioScreen() {
  return (
    <FontProvider>
      <DiarioInner />
    </FontProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.marginApp, paddingTop: spacing.sm, paddingBottom: spacing.md,
    gap: spacing.md,
  },
  title: { ...typography.sectionTitle, color: text.primary, fontSize: 26 },
  subtitle: { ...typography.caption, color: text.muted, marginTop: 2 },
  compareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: neutral.border,
    backgroundColor: neutral.card,
  },
  compareBtnActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  compareBtnText: { ...typography.kpiLabel, color: text.primary, fontSize: 10 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.marginApp,
    backgroundColor: neutral.card,
    borderRadius: 12, borderWidth: 1, borderColor: neutral.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchPlaceholder: { ...typography.body, color: text.muted, flex: 1, fontSize: 14 },
  filterIconWrap: { padding: 4 },

  chipsRow: { paddingHorizontal: spacing.marginApp, paddingVertical: spacing.md, gap: 8 },

  scroll: { paddingHorizontal: spacing.marginApp, gap: spacing.lg },
  section: { gap: spacing.sm },
  monthLabel: { ...typography.kpiLabel, color: text.muted, fontSize: 10, marginTop: spacing.sm },
  selectedWrap: {
    borderRadius: 22,
    borderWidth: 2, borderColor: brand.primary,
  },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { ...typography.bodyBold, color: text.primary, fontSize: 16 },
  emptyBody: { ...typography.caption, color: text.muted, marginTop: 6, textAlign: 'center' },
  emptyCta: {
    marginTop: 16, paddingHorizontal: 18, paddingVertical: 10,
    backgroundColor: brand.primary, borderRadius: 999,
  },
  emptyCtaText: { ...typography.kpiLabel, color: '#fff', fontSize: 11 },

  compareBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: neutral.card, borderTopWidth: 1, borderTopColor: neutral.border,
    paddingHorizontal: spacing.marginApp, paddingVertical: 14, paddingBottom: 22,
  },
  compareBarText: { ...typography.body, color: text.primary, fontSize: 14 },
  compareBarBtn: {
    backgroundColor: brand.primary, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 999,
  },
  compareBarBtnText: { ...typography.kpiLabel, color: '#fff', fontSize: 11 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
});
