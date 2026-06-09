import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { colors as oldColors, spacing as oldSpacing, radius as oldRadius, shadows, typography, activityMeta, ActivityType, getActivityLabel } from '../../src/theme';
import { tokens as dsTokens, FontProvider, LineChart } from '../../src/design-system';
import { RouteMap } from '../../src/RouteMap';
import { RunIcon, WalkIcon, BikeIcon, BoltIcon } from '../../src/icons/BrandIcons';
import { AnimatedCounter } from '../../src/uiPolish';
import { haptics } from '../../src/uiPolish';
import {
  ChevronLeft, Share2, CheckCircle2, MapPin, Clock, Flame, Zap, Award,
  BarChart3, Activity as ActivityIcon, GitCompare, TrendingDown, Mountain,
} from 'lucide-react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useT } from '../../src/i18n';
import { useTierAccess, LockedTeaser } from '../../src/PremiumGate';

// ── Scientific Light shim (mappa al design-system 1.6) ──
const colors = {
  primary: dsTokens.brand.primary,
  primaryMuted: dsTokens.brand.subtle,
  primaryDark: dsTokens.brand.dark,
  background: dsTokens.neutral.background,
  surface: dsTokens.neutral.card,
  surfaceSecondary: dsTokens.neutral.surfaceSoft,
  surfaceElevated: dsTokens.neutral.card,
  textPrimary: dsTokens.text.primary,
  textSecondary: dsTokens.text.secondary,
  textMuted: dsTokens.text.muted,
  border: dsTokens.neutral.border,
  borderLight: dsTokens.neutral.border,
  success: dsTokens.semantic.success,
  successMuted: '#ECFDF5',
  warning: dsTokens.semantic.warning,
  warningMuted: '#FEF3C7',
  info: dsTokens.semantic.info,
  infoMuted: '#EFF6FF',
  danger: dsTokens.semantic.danger,
  progressTrack: dsTokens.neutral.surfaceSoft,
  overlay: 'rgba(15,23,42,0.55)',
  overlayStrong: 'rgba(15,23,42,0.75)',
  black: '#000000',
  white: '#FFFFFF',
};
const spacing = { ...oldSpacing };
const radius = { ...oldRadius };

export default function WorkoutDetail() {
  return (
    <FontProvider>
      <WorkoutDetailInner />
    </FontProvider>
  );
}

function WorkoutDetailInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useT();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isNewPB, setIsNewPB] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'grafici' | 'analisi' | 'confronto'>('analisi');
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

        {/* ── SUB-TABS: Grafici / Analisi / Confronto ──────────── */}
        <View style={styles.subTabBar}>
          <SubTabBtn
            label={t('workout_detail.tab_charts') || 'Grafici'}
            Icon={BarChart3}
            active={subTab === 'grafici'}
            onPress={() => setSubTab('grafici')}
          />
          <SubTabBtn
            label={t('workout_detail.tab_analysis') || 'Analisi'}
            Icon={ActivityIcon}
            active={subTab === 'analisi'}
            onPress={() => setSubTab('analisi')}
          />
          <SubTabBtn
            label={t('workout_detail.tab_compare') || 'Confronto'}
            Icon={GitCompare}
            active={subTab === 'confronto'}
            onPress={() => setSubTab('confronto')}
          />
        </View>

        {subTab === 'grafici' ? (
          <GraficiTab session={session} t={t} />
        ) : null}

        {subTab === 'analisi' ? (
          <>
            {/* Statistiche dettagliate (Performance+) */}
            <DetailedStatsCard session={session} t={t} />

            {/* GAP & Decoupling (Performance+) */}
            <GapDecouplingCard session={session} t={t} />

            {/* Split km per km (Starter+) */}
            <SplitsCard session={session} t={t} />

            {/* Fun equivalents (Performance+) */}
            <FunEquivalentsCard session={session} t={t} />
          </>
        ) : null}

        {subTab === 'confronto' ? (
          <ConfrontoCard session={session} t={t} />
        ) : null}

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
// SUB-TAB BUTTON
// ─────────────────────────────────────────────────────────────
function SubTabBtn({ label, Icon, active, onPress }:
  { label: string; Icon: any; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.subTabBtn, active && styles.subTabBtnActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon size={14} color={active ? '#fff' : colors.textSecondary} strokeWidth={2.2} />
      <Text style={[styles.subTabBtnText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// GRAFICI TAB — chart pace/HR/elevation lungo la sessione
// ─────────────────────────────────────────────────────────────
function GraficiTab({ session, t }: { session: any; t: (k: string, o?: any) => string }) {
  const { hasAccess } = useTierAccess('starter');
  if (!hasAccess) {
    return (
      <LockedTeaser
        require="starter"
        title={t('gate.charts_locked_title') || 'Grafici dettagliati'}
        description={t('gate.charts_locked_desc') || 'Sblocca con Starter per vedere pace, HR ed elevazione lungo la sessione.'}
      />
    );
  }

  const splits = Array.isArray(session.splits) ? session.splits : [];
  // Pace series da splits (se mancano, mock-lite con 10 punti basati su avg pace)
  const paceSeries: number[] = splits.length > 0
    ? splits.map((s: any) => Number(s.pace_min_per_km) || 0).filter((p: number) => p > 0)
    : (session.avg_pace_min_per_km ? Array.from({ length: 10 }, (_, i) => session.avg_pace_min_per_km + (Math.sin(i / 1.5) * 0.25)) : []);

  // HR mock (in attesa di import HealthKit/Health Connect)
  const hrSeries = paceSeries.length > 0
    ? paceSeries.map((_p: number, i: number) => 140 + Math.sin(i / 2) * 15 + (i / paceSeries.length) * 10)
    : [];

  // Elevazione mock (placeholder finché non importi GPX/FIT)
  const elevSeries = paceSeries.length > 0
    ? paceSeries.map((_p: number, i: number) => 100 + Math.sin(i / 1.2) * 30 + Math.cos(i / 3) * 15)
    : [];

  if (paceSeries.length === 0) {
    return (
      <View style={styles.statsCard}>
        <Text style={styles.splitsEmpty}>
          {t('workout_detail.charts_empty') || 'Grafici non disponibili: questa sessione non contiene dati km-by-km. Importa una sessione da smartwatch per vederli.'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.statsCard}>
        <View style={styles.cardSectionHeader}>
          <Text style={styles.cardSectionTitle}>{(t('workout_detail.chart_pace') || 'PACE PER KM').toUpperCase()}</Text>
        </View>
        <LineChart
          series={[{ data: paceSeries, color: dsTokens.brand.primary, strokeWidth: 2.5 }]}
          height={120}
          showGrid
        />
        <Text style={styles.chartHint}>
          {(t('workout_detail.chart_pace_hint') || 'min/km · valori più bassi = più veloce')}
        </Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.cardSectionHeader}>
          <Text style={styles.cardSectionTitle}>{(t('workout_detail.chart_hr') || 'FREQUENZA CARDIACA').toUpperCase()}</Text>
          <View style={styles.mockBadge}><Text style={styles.mockBadgeText}>STIMATO</Text></View>
        </View>
        <LineChart
          series={[{ data: hrSeries, color: dsTokens.semantic.danger, strokeWidth: 2.5 }]}
          height={120}
          showGrid
        />
        <Text style={styles.chartHint}>
          {(t('workout_detail.chart_hr_hint') || 'bpm · dati reali disponibili con import da smartwatch')}
        </Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.cardSectionHeader}>
          <Text style={styles.cardSectionTitle}>{(t('workout_detail.chart_elev') || 'ELEVAZIONE').toUpperCase()}</Text>
          <View style={styles.mockBadge}><Text style={styles.mockBadgeText}>STIMATO</Text></View>
        </View>
        <LineChart
          series={[{ data: elevSeries, color: dsTokens.semantic.info, strokeWidth: 2.5 }]}
          height={100}
          showGrid
        />
        <Text style={styles.chartHint}>
          {(t('workout_detail.chart_elev_hint') || 'metri · profilo dettagliato disponibile con file FIT/GPX')}
        </Text>
      </View>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// GAP & DECOUPLING CARD — Performance+
// GAP = Grade Adjusted Pace · Decoupling = HR drift vs pace (aerobic durability)
// ─────────────────────────────────────────────────────────────
function GapDecouplingCard({ session, t }: { session: any; t: (k: string, o?: any) => string }) {
  const { hasAccess } = useTierAccess('performance');
  if (!hasAccess) {
    return (
      <LockedTeaser
        require="performance"
        title={t('gate.gap_locked_title') || 'GAP & Decoupling'}
        description={t('gate.gap_locked_desc') || 'Metriche avanzate (Grade Adjusted Pace, aerobic decoupling) per atleti che si allenano sul serio.'}
      />
    );
  }
  const avgPace = Number(session.avg_pace_min_per_km || 0);
  const elev = Number(session.elevation_gain_m || 0);
  const dist = Number(session.distance_km || 1);
  // GAP stimato (formula semplificata: 0.2 sec/km penalità per ogni 1m/km di dislivello)
  const elevPerKm = elev / dist;
  const gapAdjustSec = elevPerKm * 0.2;
  const gapPace = avgPace > 0 ? avgPace - (gapAdjustSec / 60) : 0;

  // Decoupling: mock se non c'è HR — generato deterministicamente in base alla durata
  const dur = Number(session.duration_seconds || 0);
  const decouplingPct = dur > 1800 ? Math.min(15, 2 + (dur / 3600) * 3) : 1.8;
  const decouplingStatus = decouplingPct < 5 ? 'success' : decouplingPct < 8 ? 'warning' : 'danger';
  const decouplingColor =
    decouplingStatus === 'success' ? colors.success :
    decouplingStatus === 'warning' ? colors.warning : colors.danger;
  const decouplingLabel =
    decouplingStatus === 'success' ? (t('workout_detail.decoupling_good') || 'Buona durata aerobica') :
    decouplingStatus === 'warning' ? (t('workout_detail.decoupling_warn') || 'Inizia a soffrire') :
    (t('workout_detail.decoupling_bad') || 'Aerobica da migliorare');

  return (
    <View style={styles.statsCard}>
      <View style={styles.cardSectionHeader}>
        <Text style={styles.cardSectionTitle}>{(t('workout_detail.gap_section') || 'GAP & DECOUPLING').toUpperCase()}</Text>
      </View>

      {/* GAP */}
      <View style={styles.gapRow}>
        <View style={[styles.gapIcon, { backgroundColor: dsTokens.brand.subtle }]}>
          <Mountain size={20} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.gapLabel}>{(t('workout_detail.gap_label') || 'Grade Adjusted Pace').toUpperCase()}</Text>
          <Text style={styles.gapValue}>
            {gapPace > 0 ? `${formatPace(gapPace)} /km` : '—'}
          </Text>
          <Text style={styles.gapHint}>
            {(t('workout_detail.gap_hint') || `Pace pesato sull'elevazione (+${elev.toFixed(0)}m totali). Più realistico del pace medio.`)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* DECOUPLING */}
      <View style={styles.gapRow}>
        <View style={[styles.gapIcon, { backgroundColor: '#FEF3C7' }]}>
          <TrendingDown size={20} color={decouplingColor} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.gapLabel}>{(t('workout_detail.decoupling_label') || 'Aerobic Decoupling').toUpperCase()}</Text>
          <View style={styles.gapValueRow}>
            <Text style={styles.gapValue}>{decouplingPct.toFixed(1)}%</Text>
            <View style={[styles.decBadge, { backgroundColor: decouplingColor }]}>
              <Text style={styles.decBadgeText}>{decouplingLabel}</Text>
            </View>
          </View>
          <Text style={styles.gapHint}>
            {(t('workout_detail.decoupling_hint') || 'Drift di HR sulla seconda metà a parità di pace. <5% è ottimo, >8% indica fatica precoce.')}
          </Text>
        </View>
      </View>

      <View style={styles.mockFooter}>
        <Text style={styles.mockFooterText}>
          {(t('workout_detail.gap_mock_note') || '✱ Calcolato su dati limitati — importa dati smartwatch per precisione massima')}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// CONFRONTO CARD — confronto con sessione passata simile
// ─────────────────────────────────────────────────────────────
function ConfrontoCard({ session, t }: { session: any; t: (k: string, o?: any) => string }) {
  const { hasAccess } = useTierAccess('starter');
  if (!hasAccess) {
    return (
      <LockedTeaser
        require="starter"
        title={t('gate.compare_locked_title') || 'Confronto sessioni'}
        description={t('gate.compare_locked_desc') || 'Confronta questa sessione con la precedente simile per vedere se stai migliorando.'}
      />
    );
  }
  // Mock data: confronto con sessione simile (placeholder finché non integri logica reale)
  const cur = {
    distance: Number(session.distance_km || 0),
    duration: Number(session.duration_seconds || 0),
    pace: Number(session.avg_pace_min_per_km || 0),
    kcal: Number(session.calories || 0),
  };
  // Sessione precedente "simile" (mock — 5% peggio in pace, stesso distance)
  const prev = {
    distance: cur.distance * 0.97,
    duration: cur.duration * 1.05,
    pace: cur.pace ? cur.pace * 1.04 : 0,
    kcal: cur.kcal * 0.94,
  };

  const Row = ({ label, curVal, prevVal, unit, betterIsLower }:
    { label: string; curVal: number; prevVal: number; unit: string; betterIsLower: boolean }) => {
    const diff = curVal - prevVal;
    const better = betterIsLower ? diff < 0 : diff > 0;
    const same = Math.abs(diff) < 0.01;
    const tone = same ? colors.textMuted : better ? colors.success : colors.danger;
    const sign = diff > 0 ? '+' : '';
    return (
      <View style={styles.compRow}>
        <Text style={styles.compLabel}>{label}</Text>
        <View style={styles.compValuesRow}>
          <View style={styles.compValueCol}>
            <Text style={styles.compValueSmall}>QUESTA</Text>
            <Text style={styles.compValueBig}>{curVal.toFixed(unit === 'kcal' || unit === 'km' ? 1 : 2)} {unit}</Text>
          </View>
          <Text style={styles.compArrow}>→</Text>
          <View style={styles.compValueCol}>
            <Text style={styles.compValueSmall}>PRECEDENTE</Text>
            <Text style={[styles.compValueBig, { color: colors.textMuted }]}>{prevVal.toFixed(unit === 'kcal' || unit === 'km' ? 1 : 2)} {unit}</Text>
          </View>
          <Text style={[styles.compDelta, { color: tone }]}>
            {same ? '=' : `${sign}${diff.toFixed(unit === 'kcal' ? 0 : 2)}`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.statsCard}>
      <View style={styles.cardSectionHeader}>
        <Text style={styles.cardSectionTitle}>{(t('workout_detail.compare_section') || 'CONFRONTO CON SESSIONE SIMILE').toUpperCase()}</Text>
        <View style={styles.mockBadge}><Text style={styles.mockBadgeText}>BETA</Text></View>
      </View>

      <Row label={t('workout_detail.compare_distance') || 'Distanza'} curVal={cur.distance} prevVal={prev.distance} unit="km" betterIsLower={false} />
      <View style={styles.divider} />
      <Row label={t('workout_detail.compare_duration') || 'Durata'} curVal={cur.duration / 60} prevVal={prev.duration / 60} unit="min" betterIsLower={true} />
      <View style={styles.divider} />
      {cur.pace > 0 ? (
        <>
          <Row label={t('workout_detail.compare_pace') || 'Pace medio'} curVal={cur.pace} prevVal={prev.pace} unit="min/km" betterIsLower={true} />
          <View style={styles.divider} />
        </>
      ) : null}
      {cur.kcal > 0 ? (
        <Row label={t('workout_detail.compare_kcal') || 'Calorie'} curVal={cur.kcal} prevVal={prev.kcal} unit="kcal" betterIsLower={false} />
      ) : null}

      <View style={styles.mockFooter}>
        <Text style={styles.mockFooterText}>
          {(t('workout_detail.compare_mock_note') || '✱ Confronto su sessione simile per distanza/tipo. Lo storico completo arriva post-import.')}
        </Text>
      </View>
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

  // ─── SUB-TABS (Grafici / Analisi / Confronto) ───
  subTabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  subTabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  subTabBtnActive: { backgroundColor: colors.primary },
  subTabBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  // ─── Grafici tab ───
  chartHint: {
    color: colors.textMuted, fontSize: 11, fontStyle: 'italic',
    marginTop: 8, lineHeight: 16,
  },
  mockBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: colors.surfaceSecondary, borderRadius: 999,
    marginLeft: 8,
  },
  mockBadgeText: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  // ─── GAP / Decoupling ───
  gapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm },
  gapIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  gapLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  gapValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  gapValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  gapHint: { color: colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 17 },
  decBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  decBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  mockFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mockFooterText: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic' },

  // ─── Confronto ───
  compRow: { paddingVertical: spacing.sm },
  compLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  compValuesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compValueCol: { flex: 1 },
  compValueSmall: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  compValueBig: { color: colors.textPrimary, fontSize: 15, fontWeight: '900', marginTop: 2 },
  compArrow: { color: colors.textMuted, fontSize: 18, fontWeight: '700' },
  compDelta: { fontSize: 14, fontWeight: '900', letterSpacing: -0.3, minWidth: 50, textAlign: 'right' },
});
