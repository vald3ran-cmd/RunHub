import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { colors, spacing, radius, shadows, typography, activityMeta, ActivityType, getActivityLabel } from '../../src/theme';
import { RouteMap } from '../../src/RouteMap';
import { RunIcon, WalkIcon, BikeIcon, BoltIcon } from '../../src/icons/BrandIcons';
import { AnimatedCounter } from '../../src/uiPolish';
import { haptics } from '../../src/uiPolish';
import {
  ChevronLeft, Share2, CheckCircle2, MapPin, Clock, Flame, Zap, Award,
} from 'lucide-react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useT } from '../../src/i18n';
import { useTierAccess, LockedTeaser } from '../../src/PremiumGate';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useT();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isNewPB, setIsNewPB] = useState<string | null>(null);
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/workouts/${id}`);
        setSession(data);

        // Check PB
        try {
          const pbRes = await api.get('/stats/personal-bests');
          const type = (data.activity_type as ActivityType) || 'run';
          const pb = pbRes.data?.[type];
          if (pb?.longest_distance?.session_id === data.session_id) {
            setIsNewPB(t('workout_detail.pb_distance'));
            haptics.success();
          } else if (pb?.best_pace?.session_id === data.session_id) {
            setIsNewPB(t('workout_detail.pb_pace'));
            haptics.success();
          }
        } catch {}
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <View style={styles.loader}><ActivityIndicator color={colors.primary} /></View>;
  if (!session) return <View style={styles.loader}><Text style={{ color: colors.textSecondary }}>{t('workout_detail.session_not_found')}</Text></View>;

  const pace = session.avg_pace_min_per_km;
  const activityType: ActivityType = (session.activity_type as ActivityType) || 'run';
  const activity = activityMeta[activityType];
  const ActIcon = activityType === 'walk' ? WalkIcon : activityType === 'bike' ? BikeIcon : RunIcon;

  const onShareImage = async () => {
    try {
      haptics.medium();
      if (!shareCardRef.current) return;
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 0.95,
        result: 'tmpfile',
      });
      try {
        const Sharing = require('expo-sharing');
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('workout_detail.share_dialog_title') });
          return;
        }
      } catch {}
      // Fallback su Share API testuale
      onShareText();
    } catch (e: any) {
      console.warn('Share error:', e?.message);
      Alert.alert(t('workout_detail.share_error'), t('workout_detail.share_error_msg'));
    }
  };

  const onShareText = async () => {
    try {
      const paceStr = pace ? `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, '0')}/km` : '';
      const emoji = activityType === 'walk' ? '🚶' : activityType === 'bike' ? '🚴' : '🏃';
      const msg = `${t('workout_detail.share_msg_intro', { emoji, activity: getActivityLabel(activityType, t, true).toLowerCase() })}\n\n` +
        `📍 ${session.distance_km.toFixed(2)} km\n` +
        `⏱️ ${formatTime(session.duration_seconds)}\n` +
        (paceStr ? `⚡ ${t('workout_detail.share_msg_pace', { pace: paceStr })}\n` : '') +
        (session.calories ? `🔥 ${session.calories} kcal\n` : '') +
        `\n${t('workout_detail.share_msg_footer')}`;
      await Share.share({ message: msg, title: t('workout_detail.share_msg_my_activity') });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.4} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="share-workout-button"
            style={[styles.iconBtn, { backgroundColor: colors.primary }]}
            onPress={onShareImage}
          >
            <Share2 size={20} color="#fff" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* ─────────────────────────────────────────────── */}
        {/* SHARE CARD — il blocco esportato come immagine */}
        {/* ─────────────────────────────────────────────── */}
        <ViewShot ref={shareCardRef as any} options={{ format: 'png', quality: 0.95 }} style={styles.shareCardWrap}>
          <View style={[styles.shareCard, { backgroundColor: colors.textPrimary }]}>
            {/* Header card */}
            <View style={styles.cardHeader}>
              <View style={[styles.activityBadge, { backgroundColor: activity.color }]}>
                <ActIcon size={16} color="#fff" strokeWidth={2.4} />
                <Text style={styles.activityBadgeText}>{getActivityLabel(activityType, t)}</Text>
              </View>
              <Text style={styles.cardBrand}>RunHub</Text>
            </View>

            {/* Hero metric */}
            <View style={styles.heroMetric}>
              <Text style={styles.heroValue}>{session.distance_km.toFixed(2)}</Text>
              <Text style={styles.heroUnit}>KM</Text>
            </View>

            {/* PB Badge */}
            {isNewPB ? (
              <View style={styles.pbBanner}>
                <Award size={14} color="#fff" strokeWidth={2.4} />
                <Text style={styles.pbBannerText}>{t('workout_detail.new_record')} · {isNewPB}</Text>
              </View>
            ) : null}

            {/* Stats grid */}
            <View style={styles.cardStats}>
              <CardStat
                icon={<Clock size={14} color="rgba(255,255,255,0.6)" strokeWidth={2.4} />}
                label={t('workout_detail.duration')}
                value={formatTime(session.duration_seconds)}
              />
              <View style={styles.cardDivider} />
              <CardStat
                icon={<Zap size={14} color="rgba(255,255,255,0.6)" strokeWidth={2.4} />}
                label={activityType === 'bike' ? t('workout_detail.kmh') : t('workout_detail.pace')}
                value={
                  activityType === 'bike'
                    ? (session.duration_seconds > 0
                        ? ((session.distance_km / session.duration_seconds) * 3600).toFixed(1)
                        : '--')
                    : (pace
                        ? `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, '0')}`
                        : '--')
                }
              />
              <View style={styles.cardDivider} />
              <CardStat
                icon={<Flame size={14} color="rgba(255,255,255,0.6)" strokeWidth={2.4} />}
                label={t('workout_detail.kcal')}
                value={String(session.calories ?? '--')}
              />
            </View>

            {/* Date footer */}
            <Text style={styles.cardDate}>{formatDate(session.completed_at, locale)}</Text>

            {/* Decorative blobs */}
            <View style={[styles.blobBig, { backgroundColor: activity.color, opacity: 0.18 }]} />
            <View style={[styles.blobSmall, { backgroundColor: activity.color, opacity: 0.10 }]} />
          </View>
        </ViewShot>

        {/* Completed badge */}
        <View style={styles.metaSection}>
          <View style={styles.completedBadge}>
            <CheckCircle2 size={18} color={colors.success} strokeWidth={2.4} />
            <Text style={styles.completedText}>{t('workout_detail.completed')}</Text>
          </View>
          <Text style={styles.title}>{session.title}</Text>
          <Text style={styles.date}>{new Date(session.completed_at).toLocaleString(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'it-IT')}</Text>
        </View>

        {/* Mappa */}
        {session.locations && session.locations.length > 1 ? (
          <View style={styles.mapSection}>
            <View style={styles.mapHeader}>
              <MapPin size={16} color={colors.primary} strokeWidth={2.4} />
              <Text style={styles.mapHeaderText}>{t('workout_detail.route')}</Text>
            </View>
            <RouteMap coords={session.locations} height={260} showsUser={false} />
          </View>
        ) : null}

        {/* Statistiche dettagliate (Performance+) */}
        <DetailedStatsCard session={session} t={t} />

        {/* Split km per km (Starter+) */}
        <SplitsCard session={session} t={t} />

        {/* Fun equivalents (Performance+) */}
        <FunEquivalentsCard session={session} t={t} />

        {/* Share buttons */}
        <View style={styles.shareRow}>
          <TouchableOpacity
            testID="share-image-button"
            style={[styles.shareBtn, { backgroundColor: colors.primary }]}
            onPress={onShareImage}
            activeOpacity={0.9}
          >
            <Share2 size={18} color="#fff" strokeWidth={2.4} />
            <Text style={styles.shareBtnText}>{t('workout_detail.share_image')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="share-text-button"
            style={styles.shareBtnSecondary}
            onPress={onShareText}
            activeOpacity={0.9}
          >
            <Text style={styles.shareBtnSecondaryText}>{t('workout_detail.share_text')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CardStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.cardStat}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        {icon}
        <Text style={styles.cardStatLabel}>{label}</Text>
      </View>
      <Text style={styles.cardStatValue}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// DETAILED STATS CARD
// ─────────────────────────────────────────────────────────────
function DetailedStatsCard({ session, t }: { session: any; t: (k: string, o?: any) => string }) {
  const { hasAccess } = useTierAccess('performance');
  if (!hasAccess) {
    return (
      <LockedTeaser
        require="performance"
        title={t('gate.stats_locked_title')}
        description={t('gate.stats_locked_desc')}
      />
    );
  }
  const dur = Number(session.duration_seconds || 0);
  const dist = Number(session.distance_km || 0);
  const kcal = Number(session.calories || 0);
  const activityType: ActivityType = (session.activity_type as ActivityType) || 'run';
  const splits = Array.isArray(session.splits) ? session.splits : [];

  // Avg speed
  const avgSpeed = dur > 0 ? (dist / dur) * 3600 : 0;
  // Max speed (compute from locations if available)
  const maxSpeed = computeMaxSpeed(session.locations || []);
  // Avg pace from session or recompute
  const avgPace = session.avg_pace_min_per_km || (dur > 0 && dist > 0 ? (dur / 60) / dist : 0);
  // Best/Worst km
  let bestPace = Infinity, worstPace = 0;
  splits.forEach((s: any) => {
    const p = Number(s.pace_min_per_km);
    if (p > 0) {
      if (p < bestPace) bestPace = p;
      if (p > worstPace) worstPace = p;
    }
  });
  const kcalPerKm = dist > 0 ? kcal / dist : 0;
  const kcalPerMin = dur > 0 ? (kcal * 60) / dur : 0;
  const elev = Number(session.elevation_gain_m || 0);

  const rows: { label: string; value: string; show: boolean }[] = [
    { label: t('workout_detail.stat_elevation_gain'), value: `${elev.toFixed(0)} m`, show: elev > 0 },
    { label: t('workout_detail.stat_avg_speed'), value: `${avgSpeed.toFixed(1)} km/h`, show: avgSpeed > 0 },
    { label: t('workout_detail.stat_max_speed'), value: `${maxSpeed.toFixed(1)} km/h`, show: maxSpeed > 0 },
    { label: t('workout_detail.stat_avg_pace'), value: activityType !== 'bike' && avgPace > 0 ? `${formatPace(avgPace)} /km` : '—', show: activityType !== 'bike' && avgPace > 0 },
    { label: t('workout_detail.stat_best_km_pace'), value: activityType !== 'bike' && bestPace !== Infinity ? `${formatPace(bestPace)} /km` : '—', show: activityType !== 'bike' && bestPace !== Infinity },
    { label: t('workout_detail.stat_slowest_km_pace'), value: activityType !== 'bike' && worstPace > 0 ? `${formatPace(worstPace)} /km` : '—', show: activityType !== 'bike' && worstPace > 0 },
    { label: t('workout_detail.stat_kcal_per_km'), value: `${kcalPerKm.toFixed(0)} kcal`, show: kcalPerKm > 0 },
    { label: t('workout_detail.stat_kcal_per_min'), value: `${kcalPerMin.toFixed(1)} kcal`, show: kcalPerMin > 0 },
  ].filter(r => r.show);

  if (rows.length === 0) return null;

  return (
    <View style={styles.statsCard}>
      <View style={styles.cardSectionHeader}>
        <Text style={styles.cardSectionTitle}>{t('workout_detail.detailed_stats')}</Text>
      </View>
      <View style={styles.statsGrid}>
        {rows.map((r, i) => (
          <View key={i} style={styles.statCell}>
            <Text style={styles.statCellLabel}>{r.label}</Text>
            <Text style={styles.statCellValue}>{r.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SPLITS CARD (table + bar chart per km)
// ─────────────────────────────────────────────────────────────
function SplitsCard({ session, t }: { session: any; t: (k: string, o?: any) => string }) {
  const { hasAccess } = useTierAccess('starter');
  if (!hasAccess) {
    return (
      <LockedTeaser
        require="starter"
        title={t('gate.splits_locked_title')}
        description={t('gate.splits_locked_desc')}
      />
    );
  }
  const splits = Array.isArray(session.splits) ? session.splits : [];
  const activityType: ActivityType = (session.activity_type as ActivityType) || 'run';
  if (splits.length === 0) {
    return (
      <View style={styles.statsCard}>
        <View style={styles.cardSectionHeader}>
          <Text style={styles.cardSectionTitle}>{t('workout_detail.splits_title')}</Text>
        </View>
        <Text style={styles.splitsEmpty}>{t('workout_detail.splits_empty')}</Text>
      </View>
    );
  }
  // best/worst
  let bestIdx = 0, worstIdx = 0;
  let bestPace = Infinity, worstPace = 0;
  splits.forEach((s: any, i: number) => {
    const p = Number(s.pace_min_per_km);
    if (p > 0 && p < bestPace) { bestPace = p; bestIdx = i; }
    if (p > worstPace) { worstPace = p; worstIdx = i; }
  });
  const range = worstPace - bestPace;

  return (
    <View style={styles.statsCard}>
      <View style={styles.cardSectionHeader}>
        <Text style={styles.cardSectionTitle}>{t('workout_detail.splits_title')}</Text>
      </View>
      {/* Header */}
      <View style={styles.splitHeader}>
        <Text style={[styles.splitColHead, { flex: 0.5 }]}>{t('workout_detail.splits_col_km')}</Text>
        <Text style={[styles.splitColHead, { flex: 1 }]}>{t('workout_detail.splits_col_time')}</Text>
        <Text style={[styles.splitColHead, { flex: 2 }]}>{activityType === 'bike' ? 'KM/H' : t('workout_detail.splits_col_pace')}</Text>
      </View>
      {splits.map((s: any, i: number) => {
        const p = Number(s.pace_min_per_km) || 0;
        const dur = Number(s.duration_sec) || 0;
        const isBest = i === bestIdx && bestPace !== Infinity;
        const isWorst = i === worstIdx && worstPace > bestPace;
        // bar fill: best=100% green, worst=100% red. proporzional
        const fill = range > 0 ? 1 - (p - bestPace) / range : 1;
        const barColor = isBest ? colors.success : isWorst ? colors.primary : '#8B5CF6';
        const speedDisp = activityType === 'bike' && dur > 0 ? `${(3600 / dur).toFixed(1)} km/h` : `${formatPace(p)} /km`;
        return (
          <View key={i} style={styles.splitRow}>
            <Text style={[styles.splitKm, { flex: 0.5 }]}>{s.km}</Text>
            <Text style={[styles.splitTime, { flex: 1 }]}>{formatDuration(dur)}</Text>
            <View style={[styles.splitBarWrap, { flex: 2 }]}>
              <View style={[styles.splitBar, { width: `${Math.max(20, Math.min(100, fill * 100))}%`, backgroundColor: barColor }]}>
                <Text style={styles.splitBarLabel}>{speedDisp}</Text>
              </View>
              {isBest ? <Text style={styles.splitTag}>{t('workout_detail.splits_best')}</Text> : null}
              {isWorst ? <Text style={styles.splitTag}>{t('workout_detail.splits_worst')}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// FUN EQUIVALENTS CARD
// ─────────────────────────────────────────────────────────────
function FunEquivalentsCard({ session, t }: { session: any; t: (k: string, o?: any) => string }) {
  const { hasAccess } = useTierAccess('performance');
  if (!hasAccess) {
    return (
      <LockedTeaser
        require="performance"
        title={t('gate.equiv_locked_title')}
        description={t('gate.equiv_locked_desc')}
      />
    );
  }
  const kcal = Number(session.calories || 0);
  const dist = Number(session.distance_km || 0);
  const elev = Number(session.elevation_gain_m || 0);
  const activityType: ActivityType = (session.activity_type as ActivityType) || 'run';

  // 1 fetta di pizza margherita ~ 250 kcal; 1 barretta cioccolato ~ 200 kcal
  const pizzaSlices = kcal > 0 ? Math.max(1, Math.round((kcal / 250) * 10) / 10) : 0;
  const chocoBars = kcal > 0 ? Math.max(1, Math.round((kcal / 200) * 10) / 10) : 0;
  // 1 passo ~ 0.75m corsa, 0.6m camminata
  const stepsPerKm = activityType === 'walk' ? 1400 : activityType === 'run' ? 1300 : 0;
  const totalSteps = stepsPerKm > 0 ? Math.round(dist * stepsPerKm) : 0;
  // 1 campo da calcio ~ 105m
  const footballFields = dist > 0 ? Math.round((dist * 1000) / 105) : 0;
  // Burj Khalifa = 828m
  const burjTimes = elev > 0 ? Math.round((elev / 828) * 100) / 100 : 0;

  const items: string[] = [];
  if (pizzaSlices > 0) {
    const n = pizzaSlices % 1 === 0 ? String(pizzaSlices.toFixed(0)) : pizzaSlices.toFixed(1).replace('.', ',');
    const isOne = pizzaSlices <= 1;
    items.push(t('workout_detail.equiv_pizza', { n, unit: isOne ? t('workout_detail.equiv_pizza_slice_one') : t('workout_detail.equiv_pizza_slice_many') }));
  }
  if (chocoBars > 0) {
    const n = chocoBars % 1 === 0 ? String(chocoBars.toFixed(0)) : chocoBars.toFixed(1).replace('.', ',');
    const isOne = chocoBars <= 1;
    items.push(t('workout_detail.equiv_choco', { n, unit: isOne ? t('workout_detail.equiv_choco_one') : t('workout_detail.equiv_choco_many') }));
  }
  if (totalSteps > 0) items.push(t('workout_detail.equiv_steps', { n: totalSteps.toLocaleString() }));
  if (footballFields > 0) items.push(t('workout_detail.equiv_field', { n: footballFields }));
  if (burjTimes > 0) items.push(t('workout_detail.equiv_burj', { n: burjTimes.toString().replace('.', ',') }));

  if (items.length === 0) return null;

  return (
    <View style={styles.statsCard}>
      <View style={styles.cardSectionHeader}>
        <Text style={styles.cardSectionTitle}>{t('workout_detail.equiv_title')}</Text>
      </View>
      {items.map((line, i) => (
        <Text key={i} style={styles.equivLine}>{line}</Text>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function formatPace(p: number): string {
  if (!p || p <= 0 || !isFinite(p)) return '—';
  const min = Math.floor(p);
  const sec = Math.floor((p - min) * 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
}
function formatDuration(s: number): string {
  const m = Math.floor(s / 60); const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
function computeMaxSpeed(locations: any[]): number {
  if (!Array.isArray(locations) || locations.length < 2) return 0;
  let max = 0;
  for (let i = 1; i < locations.length; i++) {
    const a = locations[i - 1], b = locations[i];
    if (!a?.lat || !b?.lat) continue;
    const dt = (b.timestamp - a.timestamp) / 1000; // seconds
    if (dt <= 0 || dt > 10) continue; // skip large gaps
    const d = haversine(a.lat, a.lng, b.lat, b.lng);
    const kmh = (d / dt) * 3.6;
    if (kmh > max && kmh < 60) max = kmh; // cap at 60 km/h for noise
  }
  return max;
}
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
function formatDate(iso: string, locale: string = 'it') {
  try {
    const tag = locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'it-IT';
    return new Date(iso).toLocaleDateString(tag, { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },

  // ─── Share Card ───────────────────────────────────────
  shareCardWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  shareCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    minHeight: 380,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.pill,
  },
  activityBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  cardBrand: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  heroMetric: {
    flexDirection: 'row', alignItems: 'baseline',
    marginTop: spacing.lg, marginBottom: spacing.lg,
  },
  heroValue: { color: '#fff', fontSize: 96, fontWeight: '900', letterSpacing: -4 },
  heroUnit: { color: 'rgba(255,255,255,0.6)', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginLeft: 8 },
  pbBanner: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 6, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: 'rgba(255,107,107,0.95)',
    marginBottom: spacing.md,
  },
  pbBannerText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  cardStats: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  cardStat: { flex: 1 },
  cardStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  cardStatValue: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  cardDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },
  cardDate: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: spacing.md },

  // Decorative blobs
  blobBig: {
    position: 'absolute', right: -60, top: -40,
    width: 200, height: 200, borderRadius: 100,
  },
  blobSmall: {
    position: 'absolute', right: 80, bottom: -40,
    width: 120, height: 120, borderRadius: 60,
  },

  // Meta section
  metaSection: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  completedText: { color: colors.success, fontWeight: '900', letterSpacing: 1.5, fontSize: 11 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', marginTop: spacing.sm, letterSpacing: -0.4 },
  date: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },

  // Map
  mapSection: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  mapHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  mapHeaderText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },

  // Share buttons
  shareRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, marginTop: spacing.xl,
  },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: radius.pill,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  shareBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  shareBtnSecondary: {
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    ...shadows.sm,
  },
  shareBtnSecondaryText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },

  // ─── New: detailed stats / splits / fun equivalents cards ───
  statsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: spacing.sm,
  },
  cardSectionTitle: {
    color: colors.textPrimary,
    fontSize: 12, fontWeight: '900', letterSpacing: 2,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  statCell: {
    width: '50%',
    paddingVertical: 10,
    paddingRight: 8,
  },
  statCellLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  statCellValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },

  // Splits
  splitsEmpty: { color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingVertical: spacing.md },
  splitHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 6, marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  splitColHead: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  splitRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6,
  },
  splitKm: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  splitTime: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  splitBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  splitBar: {
    height: 22, borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
    minWidth: 60,
  },
  splitBarLabel: { color: '#fff', fontSize: 11, fontWeight: '800' },
  splitTag: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' },

  // Fun equivalents
  equivLine: {
    color: colors.textPrimary, fontSize: 14, fontWeight: '500',
    marginVertical: 4, lineHeight: 20,
  },
});
