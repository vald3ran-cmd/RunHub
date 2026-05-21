// Referral screen — code, share, stats, friends list.

import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  Share, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { colors, spacing, radius, fonts } from '../src/theme';
import { useT } from '../src/i18n';
import { getMyReferral, ReferralStats } from '../src/referral';

export default function ReferralScreen() {
  const { t } = useT();
  const router = useRouter();
  const [data, setData] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await getMyReferral();
      setData(r);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Errore caricamento referral';
      Alert.alert(t('common.error'), detail);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const onCopy = async () => {
    if (!data) return;
    await Clipboard.setStringAsync(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onShare = async () => {
    if (!data) return;
    const msg = t('referral.share_message', { code: data.code, link: data.share_link });
    try {
      await Share.share({ message: msg, url: data.share_link });
    } catch {}
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} testID="referral-back">
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('referral.title')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl tintColor="#fff" refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={styles.heroTitle}>{t('referral.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('referral.subtitle')}</Text>
        </View>

        {/* Code card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('referral.your_code')}</Text>
          <TouchableOpacity onPress={onCopy} activeOpacity={0.7} style={styles.codeBox} testID="referral-code">
            <Text style={styles.codeText}>{data.code}</Text>
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={22}
              color={copied ? '#34D399' : 'rgba(255,255,255,0.6)'}
            />
          </TouchableOpacity>
          <Text style={styles.tapHint}>{copied ? t('common.copied') : t('referral.tap_to_copy')}</Text>

          <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.85} testID="referral-share">
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={styles.shareBtnText}>{t('referral.share_cta')}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCell value={data.invited_total} label={t('referral.stats_invited')} />
          <StatCell value={data.qualified} label={t('referral.stats_qualified')} highlight />
          <StatCell value={data.rewards_count} label={t('referral.stats_rewards')} />
        </View>

        {/* Bonus active info */}
        {data.bonus_premium_until ? (
          <View style={styles.bonusBanner}>
            <Ionicons name="flash" size={18} color={colors.primary} />
            <Text style={styles.bonusText}>
              {t('referral.bonus_until')}: {formatDate(data.bonus_premium_until)}
            </Text>
          </View>
        ) : null}

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('referral.how_it_works')}</Text>
          <Step n={1} text={t('referral.how_step_1')} />
          <Step n={2} text={t('referral.how_step_2')} />
          <Step n={3} text={t('referral.how_step_3')} />
        </View>

        {/* Friends list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('referral.friends_title')}</Text>
          {data.friends.length === 0 ? (
            <Text style={styles.emptyText}>{t('referral.friends_empty')}</Text>
          ) : (
            data.friends.map((f, i) => (
              <View key={i} style={styles.friendRow}>
                <View style={styles.friendAvatar}>
                  <Text style={styles.friendInitial}>{(f.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>{f.name}</Text>
                  <Text style={[styles.friendStatus, f.rewarded && styles.friendStatusOk]}>
                    {f.rewarded ? t('referral.friend_qualified') : t('referral.friend_pending')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={styles.disclaimer}>{t('referral.disclaimer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCell({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <View style={[styles.statCell, highlight && styles.statCellHighlight]}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{n}</Text></View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1115' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorText: { color: '#fff', fontSize: 14, marginBottom: spacing.md, fontFamily: fonts.medium },
  retryBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.pill,
  },
  retryText: { color: '#fff', fontFamily: fonts.headingBold, fontSize: 13 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontFamily: fonts.headingBold, letterSpacing: 0.5 },

  hero: { alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.md },
  heroEmoji: { fontSize: 56, marginBottom: spacing.sm },
  heroTitle: {
    color: '#fff', fontSize: 26, textAlign: 'center',
    fontFamily: fonts.heading, letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', lineHeight: 20,
    fontFamily: fonts.medium, marginTop: spacing.xs, paddingHorizontal: spacing.md,
  },

  codeCard: {
    backgroundColor: '#1a1d23', borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.lg,
  },
  codeLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 1.5,
    fontFamily: fonts.headingBold, marginBottom: spacing.sm,
  },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5, borderColor: 'rgba(255,107,31,0.4)',
    borderStyle: 'dashed',
  },
  codeText: {
    color: colors.primary, fontSize: 26, letterSpacing: 2,
    fontFamily: fonts.headingBold, fontVariant: ['tabular-nums'],
  },
  tapHint: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center',
    fontFamily: fonts.medium, marginTop: spacing.xs, marginBottom: spacing.md,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, backgroundColor: colors.primary, borderRadius: radius.pill,
  },
  shareBtnText: {
    color: '#fff', fontSize: 14, letterSpacing: 0.5,
    fontFamily: fonts.headingBold,
  },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCell: {
    flex: 1, backgroundColor: '#1a1d23', borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statCellHighlight: { borderColor: 'rgba(255,107,31,0.4)', backgroundColor: 'rgba(255,107,31,0.08)' },
  statValue: { color: '#fff', fontSize: 26, fontFamily: fonts.heading, fontVariant: ['tabular-nums'] },
  statValueHighlight: { color: colors.primary },
  statLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 1, marginTop: 4,
    fontFamily: fonts.headingBold, textAlign: 'center',
  },

  bonusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,107,31,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,107,31,0.30)',
    borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bonusText: { color: '#fff', fontSize: 13, fontFamily: fonts.medium, flex: 1 },

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    color: '#fff', fontSize: 14, letterSpacing: 1.2,
    fontFamily: fonts.headingBold, marginBottom: spacing.md,
  },

  step: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,107,31,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,107,31,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBadgeText: { color: colors.primary, fontSize: 12, fontFamily: fonts.headingBold },
  stepText: {
    color: 'rgba(255,255,255,0.75)', fontSize: 13, flex: 1, lineHeight: 20,
    fontFamily: fonts.medium, paddingTop: 3,
  },

  emptyText: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center',
    fontFamily: fonts.medium, padding: spacing.lg,
    backgroundColor: '#1a1d23', borderRadius: radius.md,
  },

  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: '#1a1d23', borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  friendAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,107,31,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  friendInitial: {
    color: colors.primary, fontSize: 16, fontFamily: fonts.headingBold,
  },
  friendName: { color: '#fff', fontSize: 14, fontFamily: fonts.medium },
  friendStatus: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2, fontFamily: fonts.medium },
  friendStatusOk: { color: '#34D399' },

  disclaimer: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 16,
    textAlign: 'center', fontFamily: fonts.medium,
    paddingHorizontal: spacing.md,
  },
});
