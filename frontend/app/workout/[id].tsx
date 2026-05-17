import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { colors, spacing, radius, shadows, typography, activityMeta, ActivityType } from '../../src/theme';
import { RouteMap } from '../../src/RouteMap';
import { RunIcon, WalkIcon, BikeIcon, BoltIcon } from '../../src/icons/BrandIcons';
import { AnimatedCounter } from '../../src/uiPolish';
import { haptics } from '../../src/uiPolish';
import {
  ChevronLeft, Share2, CheckCircle2, MapPin, Clock, Flame, Zap, Award,
} from 'lucide-react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
            setIsNewPB('Distanza Massima');
            haptics.success();
          } else if (pb?.best_pace?.session_id === data.session_id) {
            setIsNewPB('Passo Migliore');
            haptics.success();
          }
        } catch {}
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <View style={styles.loader}><ActivityIndicator color={colors.primary} /></View>;
  if (!session) return <View style={styles.loader}><Text style={{ color: colors.textSecondary }}>Sessione non trovata</Text></View>;

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
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Condividi la tua corsa' });
          return;
        }
      } catch {}
      // Fallback su Share API testuale
      onShareText();
    } catch (e: any) {
      console.warn('Share error:', e?.message);
      Alert.alert('Errore condivisione', 'Riprova tra poco.');
    }
  };

  const onShareText = async () => {
    try {
      const paceStr = pace ? `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, '0')}/km` : '';
      const emoji = activityType === 'walk' ? '🚶' : activityType === 'bike' ? '🚴' : '🏃';
      const msg = `${emoji} Ho appena completato una ${activity.shortLabel.toLowerCase()} con RunHub!\n\n` +
        `📍 ${session.distance_km.toFixed(2)} km\n` +
        `⏱️ ${formatTime(session.duration_seconds)}\n` +
        (paceStr ? `⚡ Passo ${paceStr}\n` : '') +
        (session.calories ? `🔥 ${session.calories} kcal\n` : '') +
        `\nScarica RunHub: https://runhub.app`;
      await Share.share({ message: msg, title: 'La mia attività' });
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
                <Text style={styles.activityBadgeText}>{activity.label}</Text>
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
                <Text style={styles.pbBannerText}>NUOVO RECORD · {isNewPB}</Text>
              </View>
            ) : null}

            {/* Stats grid */}
            <View style={styles.cardStats}>
              <CardStat
                icon={<Clock size={14} color="rgba(255,255,255,0.6)" strokeWidth={2.4} />}
                label="DURATA"
                value={formatTime(session.duration_seconds)}
              />
              <View style={styles.cardDivider} />
              <CardStat
                icon={<Zap size={14} color="rgba(255,255,255,0.6)" strokeWidth={2.4} />}
                label={activityType === 'bike' ? 'KM/H' : 'PASSO'}
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
                label="KCAL"
                value={String(session.calories ?? '--')}
              />
            </View>

            {/* Date footer */}
            <Text style={styles.cardDate}>{formatDate(session.completed_at)}</Text>

            {/* Decorative blobs */}
            <View style={[styles.blobBig, { backgroundColor: activity.color, opacity: 0.18 }]} />
            <View style={[styles.blobSmall, { backgroundColor: activity.color, opacity: 0.10 }]} />
          </View>
        </ViewShot>

        {/* Completed badge */}
        <View style={styles.metaSection}>
          <View style={styles.completedBadge}>
            <CheckCircle2 size={18} color={colors.success} strokeWidth={2.4} />
            <Text style={styles.completedText}>COMPLETATO</Text>
          </View>
          <Text style={styles.title}>{session.title}</Text>
          <Text style={styles.date}>{new Date(session.completed_at).toLocaleString('it-IT')}</Text>
        </View>

        {/* Mappa */}
        {session.locations && session.locations.length > 1 ? (
          <View style={styles.mapSection}>
            <View style={styles.mapHeader}>
              <MapPin size={16} color={colors.primary} strokeWidth={2.4} />
              <Text style={styles.mapHeaderText}>PERCORSO</Text>
            </View>
            <RouteMap coords={session.locations} height={260} showsUser={false} />
          </View>
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
            <Text style={styles.shareBtnText}>Condividi card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="share-text-button"
            style={styles.shareBtnSecondary}
            onPress={onShareText}
            activeOpacity={0.9}
          >
            <Text style={styles.shareBtnSecondaryText}>Solo testo</Text>
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

function formatTime(s: number) {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
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
});
