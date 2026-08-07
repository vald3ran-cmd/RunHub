/**
 * Lab — Tab principale (RunHub 1.6.0 Lab Edition).
 * Dati REALI via GET /api/lab/overview. Mostra empty-state se l'utente
 * non ha sessioni o non ha ancora importato dati da smartwatch.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Image, TouchableOpacity, StatusBar,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Bell, TrendingUp, ChevronRight, FlaskConical } from 'lucide-react-native';
import {
  tokens, FontProvider,
  Card, KpiTile, InsightCard, ZoneBar, LineChart,
} from '../../src/design-system';
import { api } from '../../src/api';
import { AdBanner } from '../../src/Ads';
import { useT } from '../../src/i18n';
import { WeatherForecast } from '../../src/components/WeatherForecast';
import { useTierAccess, LockedTeaser } from '../../src/PremiumGate';

const { brand, neutral, text, semantic, spacing, typography, radius } = tokens;

type ScorePoint = { date: string; score: number };

type LabOverview = {
  has_data: boolean;
  sessions_count: number;
  run_score: number | null;
  run_score_letter?: string;
  run_score_trend: number[];
  weekly_km: number;
  weekly_count: number;
  weekly_delta_pct: number;
  kpi?: { carico_pct: number; recupero_pct: number; fatica_pct: number };
  training_load?: {
    ctl: number; atl: number; tsb: number;
    ctl_history: number[]; atl_history: number[]; tsb_history: number[];
  } | null;
  recovery?: any;
  predictions?: { '5k': string; '10k': string; '21k': string; '42k': string } | null;
  hr_zones?: { z1: number; z2: number; z3: number; z4: number; z5: number } | null;
  next_workout?: { plan_id?: string; workout_id?: string; title: string; description: string } | null;
  last_session?: any;
  last_update: string;
};

function LabInner() {
  const router = useRouter();
  const { t } = useT();
  const { hasAccess: hasPerformance } = useTierAccess('performance');
  const [data, setData] = useState<LabOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreHistory, setScoreHistory] = useState<ScorePoint[]>([]);
  const [historyDays, setHistoryDays] = useState<30 | 60 | 90>(30);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get('/lab/overview');
      setData(res.data);
      setError(null);
    } catch (e: any) {
      console.warn('[lab] overview error:', e?.message);
      setError(e?.response?.data?.detail || t('lab.load_error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  const fetchScoreHistory = useCallback(async (days: 30 | 60 | 90) => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/lab/run-score-history', { params: { days } });
      setScoreHistory(res.data.points || []);
    } catch (e) {
      console.warn('[lab] score history error:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchScoreHistory(30);
  }, [fetchOverview, fetchScoreHistory]);

  // refresh on focus (assicura aggiornamento dopo aver chiuso una sessione)
  useFocusEffect(useCallback(() => {
    fetchOverview();
  }, [fetchOverview]));

  const onRefresh = () => { setRefreshing(true); fetchOverview(); };

  const formatLastUpdate = (iso: string) => {
    try {
      const dt = new Date(iso);
      const now = new Date();
      const sameDay = dt.toDateString() === now.toDateString();
      const hh = dt.getHours().toString().padStart(2, '0');
      const mm = dt.getMinutes().toString().padStart(2, '0');
      return sameDay ? `oggi, ${hh}:${mm}` : dt.toLocaleDateString('it-IT');
    } catch { return iso; }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={styles.loadingTxt}>{t('lab.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data || !data.has_data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.empty}>
          <View style={styles.emptyIcon}>
            <FlaskConical size={44} color={brand.primary} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>{t('lab.empty_title')}</Text>
          <Text style={styles.emptyBody}>{t('lab.empty_desc')}</Text>
          <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/(tabs)/importa')}>
            <Text style={styles.emptyCtaText}>{t('lab.empty_go_import')}</Text>
            <ChevronRight size={14} color="#fff" strokeWidth={2.4} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.emptyCtaGhost} onPress={() => router.push('/(tabs)/run')}>
            <Text style={styles.emptyCtaGhostText}>{t('lab.empty_start_run')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const trend = data.run_score_trend?.length ? data.run_score_trend : [data.run_score || 70];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={require('../../assets/lab/logo-symbol.png')} style={styles.brandLogo} />
          <Text style={styles.brandText}>RunHub <Text style={{ color: brand.primary }}>LAB</Text></Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Bell size={20} color={text.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.lastUpdate}>{t('lab.last_update', { time: formatLastUpdate(data.last_update) })}</Text>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.primary} />}
      >
        {/* HERO RUN SCORE */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{t('lab.run_score')}</Text>
          <View style={styles.heroBody}>
            <View>
              <Text style={styles.heroLetter}>{data.run_score_letter || '—'}</Text>
              <Text style={styles.heroValue}>
                {data.run_score !== null ? Math.round(data.run_score) : '—'}
                <Text style={styles.heroOver}>/100</Text>
              </Text>
            </View>
            <View style={styles.heroChartWrap}>
              <LineChart
                series={[{ data: trend, color: brand.primary, strokeWidth: 2.5 }]}
                height={70}
              />
            </View>
          </View>
          <View style={styles.heroTrend}>
            <TrendingUp size={14} color={data.weekly_delta_pct >= 0 ? semantic.success : semantic.danger} strokeWidth={2.4} />
            <Text style={styles.heroTrendText}>
              {data.weekly_delta_pct >= 0 ? t('lab.trend_up') : t('lab.trend_down')}{' '}
              <Text style={{ color: data.weekly_delta_pct >= 0 ? semantic.success : semantic.danger, fontFamily: typography.kpiLabel.fontFamily }}>
                {data.weekly_delta_pct >= 0 ? '+' : ''}{data.weekly_delta_pct}%
              </Text>
              {' · '}{t('lab.week')}: {data.weekly_km.toFixed(1)} km · {data.weekly_count} {t('lab.sessions')}
            </Text>
          </View>
        </View>

        {hasPerformance ? (
          <RunScoreHistoryCard
            points={scoreHistory}
            days={historyDays}
            onChangeDays={(d) => {
              setHistoryDays(d);
              fetchScoreHistory(d);
            }}
            loading={historyLoading}
            t={t}
          />
        ) : (
          <LockedTeaser
            require="performance"
            title="Run Score Storico"
            description="Visualizza la traiettoria del tuo Run Score negli ultimi 30/60/90 giorni"
          />
        )}

        {/* AI INSIGHT (mostra solo se ha senso) */}
        {data.weekly_km > 0 ? (
          <InsightCard
            body={`${t('lab.insight_week', { km: data.weekly_km.toFixed(1), count: data.weekly_count, sign: data.weekly_delta_pct >= 0 ? '+' : '', pct: data.weekly_delta_pct })} ${
              data.weekly_delta_pct > 20
                ? t('lab.insight_load_high')
                : data.weekly_delta_pct < -20
                ? t('lab.insight_load_low')
                : t('lab.insight_load_stable')
            }`}
            timestamp={formatLastUpdate(data.last_update)}
            confidence={Math.min(95, 50 + data.sessions_count * 3)}
          />
        ) : null}

        {/* 3 KPI */}
        {data.kpi ? (
          <View style={styles.kpiRow}>
            <KpiTile label={t('lab.load')} value={data.kpi.carico_pct} helper={data.kpi.carico_pct > 80 ? t('lab.load_high') : data.kpi.carico_pct > 50 ? t('lab.load_med') : t('lab.load_low')} status={data.kpi.carico_pct > 80 ? 'danger' : data.kpi.carico_pct > 50 ? 'warning' : 'success'} progress={data.kpi.carico_pct} />
            <KpiTile label={t('lab.recovery')} value={data.kpi.recupero_pct} helper={data.kpi.recupero_pct > 70 ? t('lab.recovery_good') : data.kpi.recupero_pct > 40 ? t('lab.recovery_ok') : t('lab.recovery_bad')} status={data.kpi.recupero_pct > 70 ? 'success' : data.kpi.recupero_pct > 40 ? 'warning' : 'danger'} progress={data.kpi.recupero_pct} />
            <KpiTile label={t('lab.fatigue')} value={data.kpi.fatica_pct} helper={data.kpi.fatica_pct < 50 ? t('lab.fatigue_ok') : data.kpi.fatica_pct < 75 ? t('lab.fatigue_med') : t('lab.fatigue_high')} status={data.kpi.fatica_pct < 50 ? 'success' : data.kpi.fatica_pct < 75 ? 'warning' : 'danger'} progress={data.kpi.fatica_pct} />
          </View>
        ) : null}

        {/* WEATHER FORECAST 7 DAYS */}
        <WeatherForecast />

        {/* TRAINING LOAD */}
        {!hasPerformance ? (
          <LockedTeaser
            require="performance"
            title="Training Load"
            description="Monitora carico, recupero e fatica (CTL/ATL/TSB) delle ultime 8 settimane"
          />
        ) : data.training_load ? (
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('lab.training_load')}</Text>
              <Text style={styles.sectionSub}>{t('lab.last_8_weeks')}</Text>
            </View>
            <LineChart
              series={[
                { data: data.training_load.ctl_history, color: brand.primary, strokeWidth: 3 },
                { data: data.training_load.atl_history, color: semantic.danger, strokeWidth: 2.5 },
                { data: data.training_load.tsb_history, color: semantic.info, strokeWidth: 2.5 },
              ]}
              height={140}
              showGrid
            />
            <View style={styles.legend}>
              <LegendDot color={brand.primary} label={t('lab.ctl_label')} value={String(data.training_load.ctl)} />
              <LegendDot color={semantic.danger} label={t('lab.atl_label')} value={String(data.training_load.atl)} />
              <LegendDot color={semantic.info} label={t('lab.tsb_label')} value={String(data.training_load.tsb)} />
            </View>
          </Card>
        ) : null}

        {/* NEXT WORKOUT */}
        {data.next_workout ? (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.nextWorkout}
            onPress={() => data.next_workout?.plan_id ? router.push(`/plan/${data.next_workout.plan_id}`) : router.push('/(tabs)/allenamenti')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>{t('lab.next_workout')}</Text>
              <Text style={styles.nextTitle}>{data.next_workout.title}</Text>
              {data.next_workout.description ? (
                <Text style={styles.nextMeta}>{data.next_workout.description}</Text>
              ) : null}
            </View>
            <View style={styles.nextCta}>
              <Text style={styles.nextCtaText}>{t('lab.details')}</Text>
              <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.nextWorkout, { backgroundColor: neutral.card, borderWidth: 1, borderColor: neutral.border }]}
            onPress={() => router.push('/(tabs)/allenamenti')}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.nextLabel, { color: text.muted }]}>{t('lab.no_plan')}</Text>
              <Text style={[styles.nextTitle, { color: text.primary }]}>{t('lab.no_plan_cta')}</Text>
              <Text style={[styles.nextMeta, { color: text.secondary }]}>{t('lab.no_plan_sub')}</Text>
            </View>
            <ChevronRight size={18} color={text.muted} strokeWidth={2} />
          </TouchableOpacity>
        )}

        {/* PREVISIONI */}
        {data.predictions ? (
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('lab.performance_forecast')}</Text>
              <Text style={styles.sectionSub}>{t('lab.forecast_sub')}</Text>
            </View>
            <View style={styles.predRow}>
              <PredCol distance="5K" time={data.predictions['5k']} />
              <PredCol distance="10K" time={data.predictions['10k']} />
              <PredCol distance="21K" time={data.predictions['21k']} />
              <PredCol distance="42K" time={data.predictions['42k']} />
            </View>
          </Card>
        ) : null}

        {/* HR ZONES (solo se importati con HR) */}
        {!hasPerformance ? (
          <LockedTeaser
            require="performance"
            title="Zone di Frequenza Cardiaca"
            description="Analizza la distribuzione del tuo allenamento nelle 5 zone di frequenza cardiaca"
          />
        ) : data.hr_zones ? (
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('lab.hr_zones')}</Text>
              <Text style={styles.sectionSub}>{t('lab.hr_zones_sub')}</Text>
            </View>
            <View style={{ height: spacing.md }} />
            <ZoneBar z1={data.hr_zones.z1} z2={data.hr_zones.z2} z3={data.hr_zones.z3} z4={data.hr_zones.z4} z5={data.hr_zones.z5} />
          </Card>
        ) : (
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('lab.hr_zones')}</Text>
              <Text style={styles.sectionSub}>{t('lab.hr_zones_empty')}</Text>
            </View>
            <Text style={styles.placeholder}>{t('lab.hr_zones_import')}</Text>
          </Card>
        )}

        <AdBanner />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

function PredCol({ distance, time }: { distance: string; time: string }) {
  return (
    <View style={styles.predCol}>
      <Text style={styles.predDistance}>{distance}</Text>
      <Text style={styles.predTime}>{time}</Text>
    </View>
  );
}

function RunScoreHistoryCard({
  points, days, onChangeDays, loading, t,
}: {
  points: ScorePoint[];
  days: 30 | 60 | 90;
  onChangeDays: (d: 30 | 60 | 90) => void;
  loading: boolean;
  t: (k: string, options?: Record<string, any>) => string;
}) {
  const scores = points.map(p => p.score);
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const max = scores.length > 0 ? Math.round(Math.max(...scores)) : 0;
  const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;

  return (
    <Card>
      <View style={hsStyles.header}>
        <View>
          <Text style={hsStyles.title}>{t('lab.score_trajectory')}</Text>
          <Text style={hsStyles.sub}>{t('lab.score_last_days', { days })}</Text>
        </View>
        <View style={hsStyles.pills}>
          {([30, 60, 90] as const).map(d => (
            <TouchableOpacity
              key={d}
              style={[hsStyles.pill, days === d && hsStyles.pillActive]}
              onPress={() => onChangeDays(d)}
            >
              <Text style={[hsStyles.pillText, days === d && hsStyles.pillTextActive]}>
                {d}{t('lab.score_days_suffix')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={hsStyles.kpiRow}>
        <View style={hsStyles.kpi}>
          <Text style={hsStyles.kpiValue}>{avg}</Text>
          <Text style={hsStyles.kpiLabel}>{t('lab.score_avg')}</Text>
        </View>
        <View style={hsStyles.kpi}>
          <Text style={hsStyles.kpiValue}>{max}</Text>
          <Text style={hsStyles.kpiLabel}>{t('lab.score_peak')}</Text>
        </View>
        <View style={hsStyles.kpi}>
          <Text style={[hsStyles.kpiValue, { color: trend >= 0 ? semantic.success : semantic.danger }]}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
          </Text>
          <Text style={hsStyles.kpiLabel}>{t('lab.score_trend')}</Text>
        </View>
      </View>

      {loading ? (
        <View style={hsStyles.loadingWrap}>
          <ActivityIndicator size="small" color={brand.primary} />
        </View>
      ) : scores.length > 1 ? (
        <LineChart
          series={[{ data: scores, color: brand.primary, strokeWidth: 2.5 }]}
          height={130}
          showGrid
        />
      ) : (
        <View style={hsStyles.empty}>
          <Text style={hsStyles.emptyText}>{t('lab.score_empty')}</Text>
        </View>
      )}

      {points.length >= 2 ? (
        <View style={hsStyles.dateRow}>
          <Text style={hsStyles.dateLabel}>{points[0].date}</Text>
          <Text style={hsStyles.dateLabel}>{points[points.length - 1].date}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const hsStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  title: { ...typography.kpiLabel, color: text.primary },
  sub: { ...typography.caption, color: text.muted, marginTop: 2 },
  pills: { flexDirection: 'row', gap: 4, backgroundColor: neutral.surfaceSoft, borderRadius: 999, padding: 3 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillActive: { backgroundColor: brand.primary },
  pillText: { ...typography.caption, color: text.muted, fontWeight: '700' },
  pillTextActive: { color: '#fff' },
  kpiRow: { flexDirection: 'row', marginBottom: spacing.md },
  kpi: { flex: 1, alignItems: 'center' },
  kpiValue: { ...typography.kpiValue, color: text.primary, fontSize: 22 },
  kpiLabel: { ...typography.kpiLabel, color: text.muted, fontSize: 9, marginTop: 2 },
  loadingWrap: { height: 130, alignItems: 'center', justifyContent: 'center' },
  empty: { height: 80, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.caption, color: text.muted, textAlign: 'center' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  dateLabel: { ...typography.caption, color: text.muted, fontSize: 10 },
});

export default function LabScreen() {
  return (
    <FontProvider>
      <LabInner />
    </FontProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { color: text.muted, ...typography.caption },

  empty: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingTop: 80 },
  emptyIcon: { width: 88, height: 88, borderRadius: 999, backgroundColor: brand.subtle, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...typography.sectionTitle, color: text.primary, fontSize: 24, textAlign: 'center' },
  emptyBody: { ...typography.body, color: text.secondary, textAlign: 'center', maxWidth: 320, lineHeight: 22 },
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: brand.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999, marginTop: 8 },
  emptyCtaText: { ...typography.kpiLabel, color: '#fff', fontSize: 11 },
  emptyCtaGhost: { paddingVertical: 10 },
  emptyCtaGhostText: { ...typography.kpiLabel, color: text.muted, fontSize: 11 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.marginApp, paddingTop: spacing.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { width: 30, height: 30 },
  brandText: { ...typography.bodyBold, color: text.primary, fontSize: 17, letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { padding: 8, position: 'relative' },
  lastUpdate: { ...typography.caption, color: text.muted, paddingHorizontal: spacing.marginApp, paddingBottom: spacing.sm },

  scroll: { padding: spacing.marginApp, paddingTop: spacing.sm, gap: spacing.gapSection },

  hero: { backgroundColor: '#0F172A', borderRadius: radius.card, padding: spacing.xl },
  heroLabel: { ...typography.kpiLabel, color: '#94A3B8' },
  heroBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  heroLetter: { ...typography.heroMetric, color: brand.primary, fontSize: 56 },
  heroValue: { ...typography.heroMetric, color: text.inverse, fontSize: 44, marginTop: -8 },
  heroOver: { ...typography.body, color: '#94A3B8', fontSize: 16 },
  heroChartWrap: { flex: 1, marginLeft: spacing.md },
  heroTrend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  heroTrendText: { ...typography.caption, color: '#94A3B8', letterSpacing: 0.3, flex: 1 },

  kpiRow: { flexDirection: 'row', gap: spacing.sm },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.md },
  sectionTitle: { ...typography.kpiLabel, color: text.primary },
  sectionSub: { ...typography.caption, color: text.muted },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendLabel: { ...typography.caption, color: text.secondary },
  legendValue: { ...typography.monoInline, color: text.primary, fontSize: 12 },

  nextWorkout: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: brand.primary, borderRadius: radius.card,
    padding: spacing.lg,
  },
  nextLabel: { ...typography.kpiLabel, color: '#FFD9BA' },
  nextTitle: { ...typography.bodyBold, color: '#fff', fontSize: 18, marginTop: 2 },
  nextMeta: { ...typography.caption, color: '#FFD9BA', marginTop: 2 },
  nextCta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  nextCtaText: { color: '#fff', ...typography.kpiLabel, fontSize: 10 },

  predRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  predCol: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  predDistance: { ...typography.kpiLabel, color: text.muted, fontSize: 10 },
  predTime: { ...typography.kpiValue, color: text.primary, fontSize: 18, marginTop: 4 },

  placeholder: { ...typography.body, color: text.muted, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
});
