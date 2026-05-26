import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Image, Alert, Modal, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, MapPin, Users, Lock, Sparkles, X, UserPlus, Award,
} from 'lucide-react-native';
import { useAuth } from '../src/auth';
import { api } from '../src/api';
import { colors, spacing, radius, fonts } from '../src/theme';
import { useT } from '../src/i18n';
import {
  fetchNearbyCount, fetchNearbyRunners, fetchRunnerDetail,
  requestLocationPermission, getApproxLocation, type NearbyRunner,
} from '../src/nearby';
import { RouteMap } from '../src/RouteMap';

const RADII = [3, 5, 10, 15, 25];

export default function NearbyScreen() {
  const router = useRouter();
  const { t } = useT();
  const { user } = useAuth();
  const tier = (user?.tier || 'free').toLowerCase();
  const isPaidTier = tier !== 'free';

  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState<{ total: number; active: number; radius_km: number } | null>(null);
  const [runners, setRunners] = useState<NearbyRunner[]>([]);
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(10);
  const [selectedRunner, setSelectedRunner] = useState<NearbyRunner | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [runnerDetail, setRunnerDetail] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // ensure location permission
    const loc0 = await getApproxLocation();
    if (!loc0) {
      const granted = await requestLocationPermission();
      if (!granted) {
        setLoading(false);
        Alert.alert(
          t('nearby.gps_required_title'),
          t('nearby.gps_required_msg'),
        );
        return;
      }
    }
    const loc = await getApproxLocation();
    setMyCoords(loc);
    // For free → only counter; for paid → full list
    if (isPaidTier) {
      const r = await fetchNearbyRunners(radius);
      setRunners(r.runners);
      setCount({ total: r.runners.length, active: r.runners.filter(x => x.active).length, radius_km: r.radius_km });
    } else {
      const c = await fetchNearbyCount(radius);
      if (c) setCount(c);
    }
    setLoading(false);
  }, [radius, isPaidTier]);

  useEffect(() => { load(); }, [load]);

  const openRunner = async (r: NearbyRunner) => {
    setSelectedRunner(r);
    setDetailLoading(true);
    try {
      const detail = await fetchRunnerDetail(r.user_id);
      setRunnerDetail(detail);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.detail || t('common.unable_load_details'));
      setSelectedRunner(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!selectedRunner) return;
    try {
      await api.post('/social/friends/request', { to_user_id: selectedRunner.user_id });
      Alert.alert(t('common.request_sent'), t('common.request_sent_msg'));
      setRunnerDetail({ ...runnerDetail, request_pending: true });
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.detail || t('common.unable_send_request'));
    }
  };

  // Build coords for the map: my position as a single point, then a separate overlay for runners
  // The current RouteMap accepts a single polyline. To show runners we'd ideally add markers.
  // For the MVP we show a single dot for "me" and a list of runners below the map.
  const mapCoords = myCoords ? [{ lat: myCoords.lat, lng: myCoords.lng }] : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('nearby.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loaderText}>{t('nearby.loader')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          {/* Counter hero */}
          <View style={styles.heroBox}>
            <Text style={styles.heroNum}>{count?.total ?? 0}</Text>
            <Text style={styles.heroLabel}>{isPaidTier ? t('nearby.within_paid', { km: radius }) : t('nearby.within_free')}</Text>
            {count && count.active > 0 ? (
              <View style={styles.activeChip}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>{t('nearby.active_now', { n: count.active })}</Text>
              </View>
            ) : null}
          </View>

          {!isPaidTier ? (
            /* PAYWALL TEASER — Free users */
            <View style={styles.paywallCard}>
              {/* Blurred map preview */}
              <View style={styles.blurredMapWrap}>
                <View style={{ height: 200, opacity: 0.35 }}>
                  <RouteMap coords={mapCoords} height={200} showsUser />
                </View>
                <View style={styles.blurOverlay}>
                  <Lock size={36} color="#fff" strokeWidth={2} />
                  <Text style={styles.blurTitle}>{t('nearby.map_locked')}</Text>
                </View>
              </View>

              <View style={styles.paywallInner}>
                <View style={styles.paywallIconBox}>
                  <Sparkles size={20} color="#fff" strokeWidth={2.4} />
                </View>
                <Text style={styles.paywallEyebrow}>{t('nearby.unlock_starter_eyebrow')}</Text>
                <Text style={styles.paywallTitle}>{t('nearby.paywall_title')}</Text>
                <View style={styles.bullets}>
                  <Bullet text={t('nearby.bullet_map')} />
                  <Bullet text={t('nearby.bullet_radius')} />
                  <Bullet text={t('nearby.bullet_friends')} />
                  <Bullet text={t('nearby.bullet_stats')} />
                </View>
                <TouchableOpacity
                  testID="nearby-upgrade-button"
                  style={styles.upgradeBtn}
                  onPress={() => router.push('/premium')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.upgradeBtnText}>{t('nearby.upgrade_starter')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* MAP + LIST — Paid tiers */
            <>
              {/* Radius selector */}
              <View style={styles.radiusBar}>
                {RADII.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.radiusPill, radius === r && styles.radiusPillActive]}
                    onPress={() => setRadius(r)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.radiusText, radius === r && styles.radiusTextActive]}>{r} km</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Map */}
              <View style={styles.mapWrap}>
                <RouteMap coords={mapCoords} height={260} showsUser />
              </View>

              {/* List */}
              <View style={styles.sectionRow}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionLabel}>{t('nearby.section_nearby')}</Text>
              </View>
              {runners.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>{t('nearby.empty_title')}</Text>
                  <Text style={styles.emptySub}>{t('nearby.empty_sub')}</Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
                  {runners.map((r) => (
                    <TouchableOpacity
                      key={r.user_id}
                      style={styles.runnerRow}
                      onPress={() => openRunner(r)}
                      activeOpacity={0.85}
                    >
                      {r.avatar_base64 ? (
                        <Image source={{ uri: r.avatar_base64 }} style={styles.runnerAvatar} />
                      ) : (
                        <View style={[styles.runnerAvatar, styles.runnerAvatarFallback]}>
                          <Text style={styles.runnerAvatarText}>{r.name?.[0]?.toUpperCase() || 'R'}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.runnerName} numberOfLines={1}>{r.name}</Text>
                        <Text style={styles.runnerMeta}>
                          {r.distance_km} km
                          {r.active ? `  ·  ${t('nearby.running_now_inline')}` : ''}
                          {r.tier !== 'free' ? `  ·  ${r.tier.toUpperCase()}` : ''}
                        </Text>
                      </View>
                      {r.active ? <View style={styles.liveDot} /> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Runner detail modal (Starter+) */}
      <Modal visible={!!selectedRunner} transparent animationType="slide" onRequestClose={() => setSelectedRunner(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedRunner(null)} activeOpacity={0.7}>
              <X size={22} color={colors.textSecondary} strokeWidth={2.4} />
            </TouchableOpacity>

            {detailLoading || !runnerDetail ? (
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <>
                {runnerDetail.avatar_base64 ? (
                  <Image source={{ uri: runnerDetail.avatar_base64 }} style={styles.modalAvatar} />
                ) : (
                  <View style={[styles.modalAvatar, styles.runnerAvatarFallback]}>
                    <Text style={styles.modalAvatarText}>{runnerDetail.name?.[0]?.toUpperCase() || 'R'}</Text>
                  </View>
                )}
                <Text style={styles.modalName}>{runnerDetail.name}</Text>
                <Text style={styles.modalMeta}>
                  {(runnerDetail.level || 'beginner').toUpperCase()}
                  {runnerDetail.tier !== 'free' ? `  ·  ${runnerDetail.tier.toUpperCase()}` : ''}
                </Text>

                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{runnerDetail.total_distance_km}</Text>
                    <Text style={styles.statLabel}>{t('nearby.stat_km_total')}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{runnerDetail.total_workouts}</Text>
                    <Text style={styles.statLabel}>{t('nearby.stat_workouts')}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{runnerDetail.badges_count}</Text>
                    <Text style={styles.statLabel}>{t('nearby.stat_badges')}</Text>
                  </View>
                </View>

                {runnerDetail.is_friend ? (
                  <View style={styles.friendChip}>
                    <Text style={styles.friendChipText}>{t('nearby.already_friends')}</Text>
                  </View>
                ) : runnerDetail.request_pending ? (
                  <View style={styles.friendChip}>
                    <Text style={styles.friendChipText}>{t('nearby.request_pending')}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addFriendBtn}
                    onPress={sendFriendRequest}
                    activeOpacity={0.85}
                  >
                    <UserPlus size={18} color="#fff" strokeWidth={2.4} />
                    <Text style={styles.addFriendBtnText}>{t('nearby.add_friend_upper')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: 22, fontFamily: fonts.heading, letterSpacing: -0.4, flex: 1, textAlign: 'center' },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loaderText: { color: colors.textSecondary, fontFamily: fonts.medium },

  heroBox: { alignItems: 'center', paddingVertical: spacing.lg },
  heroNum: { color: colors.primary, fontSize: 60, fontFamily: fonts.heading, letterSpacing: -2 },
  heroLabel: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.bold, letterSpacing: 0.5, marginTop: -4 },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginTop: spacing.sm,
  },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  activeText: { color: '#22C55E', fontFamily: fonts.headingBold, fontSize: 11, letterSpacing: 1 },

  // Paywall
  paywallCard: { marginHorizontal: spacing.lg, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  blurredMapWrap: { position: 'relative' },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    gap: 8,
  },
  blurTitle: { color: '#fff', fontSize: 12, fontFamily: fonts.headingBold, letterSpacing: 2 },
  paywallInner: { padding: spacing.lg, alignItems: 'center', gap: 6 },
  paywallIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  paywallEyebrow: { color: colors.primary, fontSize: 11, fontFamily: fonts.headingBold, letterSpacing: 1.8 },
  paywallTitle: { color: colors.textPrimary, fontSize: 18, fontFamily: fonts.heading, letterSpacing: -0.3, textAlign: 'center', marginTop: 2 },
  bullets: { alignSelf: 'stretch', gap: 8, marginTop: spacing.md, marginBottom: spacing.md },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  bulletText: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.medium, flex: 1 },
  upgradeBtn: {
    backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: spacing.lg,
    borderRadius: radius.pill, marginTop: 4,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 6,
  },
  upgradeBtnText: { color: '#fff', fontFamily: fonts.headingBold, fontSize: 13, letterSpacing: 1.5 },

  // Radius
  radiusBar: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, marginVertical: spacing.sm },
  radiusPill: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  radiusPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  radiusText: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.bold },
  radiusTextActive: { color: '#fff' },

  // Map area
  mapWrap: { marginHorizontal: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },

  // Section
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm },
  sectionDot: { width: 4, height: 14, borderRadius: 2, backgroundColor: colors.primary },
  sectionLabel: { color: colors.primary, fontSize: 11, fontFamily: fonts.headingBold, letterSpacing: 1.6 },

  // Runner rows
  runnerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  runnerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary },
  runnerAvatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  runnerAvatarText: { color: '#fff', fontFamily: fonts.heading, fontSize: 18 },
  runnerName: { color: colors.textPrimary, fontSize: 15, fontFamily: fonts.bold },
  runnerMeta: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.4, marginTop: 2 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },

  empty: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, alignItems: 'center' },
  emptyTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 15 },
  emptySub: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 12, marginTop: 4, textAlign: 'center' },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg, paddingTop: spacing.md,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    alignItems: 'center',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  modalClose: { position: 'absolute', top: spacing.md, right: spacing.md, padding: 6, zIndex: 2 },
  modalAvatar: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  modalAvatarText: { color: '#fff', fontFamily: fonts.heading, fontSize: 30 },
  modalName: { color: colors.textPrimary, fontSize: 22, fontFamily: fonts.heading, letterSpacing: -0.4 },
  modalMeta: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.headingBold, letterSpacing: 1, marginTop: 4 },
  statsGrid: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, alignSelf: 'stretch' },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md },
  statValue: { color: colors.textPrimary, fontFamily: fonts.heading, fontSize: 20 },
  statLabel: { color: colors.textSecondary, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.5, marginTop: 2 },

  addFriendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14, paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    marginTop: spacing.lg, marginBottom: spacing.md,
    alignSelf: 'stretch',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 6,
  },
  addFriendBtnText: { color: '#fff', fontSize: 13, fontFamily: fonts.headingBold, letterSpacing: 1.5 },
  friendChip: {
    marginTop: spacing.lg, marginBottom: spacing.md, alignSelf: 'stretch',
    backgroundColor: colors.surfaceSecondary, paddingVertical: 14, borderRadius: radius.pill,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  friendChipText: { color: colors.textSecondary, fontFamily: fonts.headingBold, fontSize: 12, letterSpacing: 1.5 },
});
