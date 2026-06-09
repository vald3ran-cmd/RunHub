import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Linking,
  Image, ActivityIndicator, Switch,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Star, CreditCard, Trophy, Flag, Watch, Users, Map as MapIcon,
  Rocket, UserCircle, FileText, ShieldCheck, Settings, LogOut,
  Timer, Sparkles, ChevronRight, ExternalLink, Camera, Gift, Globe, Eye,
} from 'lucide-react-native';
import { useAuth } from '../../src/auth';
import { api } from '../../src/api';
import { tokens, FontProvider } from '../../src/design-system';
import { showPrivacyOptionsForm } from '../../src/ConsentManager';
import { isAdMobAvailable } from '../../src/adMobConfig';
import { chooseAndUploadAvatar } from '../../src/avatar';
import { useT, SUPPORTED_LOCALES, SupportedLocale } from '../../src/i18n';

// ── Scientific Light shim (mappa al design-system 1.6) ──
const colors = {
  primary: tokens.brand.primary,
  primaryMuted: tokens.brand.subtle,
  background: tokens.neutral.background,
  surface: tokens.neutral.card,
  surfaceSecondary: tokens.neutral.surfaceSoft,
  textPrimary: tokens.text.primary,
  textSecondary: tokens.text.secondary,
  textMuted: tokens.text.muted,
  border: tokens.neutral.border,
  danger: tokens.semantic.danger,
};
const spacing = {
  ...tokens.spacing,
};
const radius = {
  ...tokens.radius,
  lg: tokens.radius.card,
  xxl: tokens.radius.modal,
};
const fonts = {
  heading: tokens.fontFamily.sansBold,
  headingBold: tokens.fontFamily.sansBold,
  bold: tokens.fontFamily.sansBold,
  medium: tokens.fontFamily.sansMedium,
};

export default function Profile() {
  return (
    <FontProvider>
      <ProfileInner />
    </FontProvider>
  );
}

function ProfileInner() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const { t, locale, setLocale } = useT();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [goals, setGoals] = useState({ daily_km: '3', weekly_km: '15', monthly_km: '60' });
  const [showGoals, setShowGoals] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [nearbyVisible, setNearbyVisible] = useState<boolean>(false);
  const [togglingNearby, setTogglingNearby] = useState(false);

  // Sync nearby_visible from user object
  useEffect(() => {
    if (user) setNearbyVisible(!!(user as any).nearby_visible);
  }, [(user as any)?.nearby_visible]);

  const onToggleNearby = async (next: boolean) => {
    setNearbyVisible(next); // optimistic
    setTogglingNearby(true);
    try {
      await api.put('/users/me/nearby-visibility', { visible: next });
      await refresh();
    } catch (e: any) {
      // revert on failure
      setNearbyVisible(!next);
      Alert.alert(t('common.error'), e?.response?.data?.detail || t('common.retry'));
    } finally {
      setTogglingNearby(false);
    }
  };

  const handleEditAvatar = () => {
    chooseAndUploadAvatar({
      hasExisting: !!user?.avatar_base64,
      onProgress: (state) => setAvatarBusy(state === 'picking' || state === 'uploading'),
      onDone: async () => {
        setAvatarBusy(false);
        await refresh();
      },
    });
  };

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const { data } = await api.get('/stats/progress');
        setGoals({
          daily_km: String(data.goals.daily_km),
          weekly_km: String(data.goals.weekly_km),
          monthly_km: String(data.goals.monthly_km),
        });
      } catch {}
      await refresh();
    })();
  }, []));

  const saveGoals = async () => {
    setSaving(true);
    try {
      await api.put('/stats/goals', {
        daily_km: parseFloat(goals.daily_km) || 0,
        weekly_km: parseFloat(goals.weekly_km) || 0,
        monthly_km: parseFloat(goals.monthly_km) || 0,
      });
      setShowGoals(false);
    } catch {
      Alert.alert(t('common.error'), t('common.retry'));
    } finally { setSaving(false); }
  };

  const tier = user?.tier || (user?.is_premium ? 'performance' : 'free');
  const isFree = tier === 'free';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <TouchableOpacity
          testID="edit-avatar-button"
          activeOpacity={0.85}
          onPress={handleEditAvatar}
          style={styles.avatarTouch}
        >
          {user?.avatar_base64 ? (
            <Image source={{ uri: user.avatar_base64 }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? 'R'}</Text>
            </View>
          )}
          {/* Camera badge overlay */}
          <View style={styles.avatarCameraBadge}>
            {avatarBusy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Camera size={14} color="#fff" strokeWidth={2.4} />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.name} testID="profile-name">{user?.name ?? 'Runner'}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: tierColor(tier) }]}>
            <Star size={11} color="#fff" fill="#fff" />
            <Text style={styles.badgeText}>{tierLabel(tier)}</Text>
          </View>
          <View style={[styles.badge, styles.badgeNeutral]}>
            <Text style={styles.badgeTextNeutral}>{(user?.level ?? 'beginner').toUpperCase()}</Text>
          </View>
        </View>

        {/* Premium banner */}
        {isFree ? (
          <TouchableOpacity
            testID="goto-premium-button"
            style={styles.premiumCard}
            onPress={() => router.push('/premium')}
            activeOpacity={0.9}
          >
            <View style={styles.premiumIcon}>
              <Sparkles size={20} color="#fff" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumLabel}>{t('profile.premium_card_label')}</Text>
              <Text style={styles.premiumTitle}>{t('profile.premium_card_title')}</Text>
            </View>
            <ChevronRight size={22} color="#fff" strokeWidth={2.4} />
          </TouchableOpacity>
        ) : null}

        {/* ── ACCOUNT ── */}
        <SectionLabel text={t('profile.section_account')} />
        <View style={styles.group}>
          {!isFree ? (
            <>
              <Row
                testID="manage-premium-button"
                icon={<Star size={18} color={colors.primary} strokeWidth={2.4} />}
                title={t('profile.change_plan')}
                onPress={() => router.push('/premium')}
              />
              <Row
                testID="billing-portal-button"
                icon={<CreditCard size={18} color={colors.primary} strokeWidth={2.4} />}
                title={t('profile.manage_billing')}
                rightIcon={<ExternalLink size={16} color={colors.textMuted} strokeWidth={2.4} />}
                onPress={async () => {
                  try {
                    const { data } = await api.post('/stripe/portal');
                    if (data?.url) Linking.openURL(data.url);
                  } catch (e: any) {
                    Alert.alert(t('common.error'), e?.response?.data?.detail || t('profile.unable_open_portal'));
                  }
                }}
              />
            </>
          ) : null}
          <Row
            testID="account-button"
            icon={<UserCircle size={18} color={colors.primary} strokeWidth={2.4} />}
            title={t('profile.account_privacy')}
            onPress={() => router.push('/account')}
          />
          <Row
            testID="paywall-button"
            icon={<Rocket size={18} color={colors.primary} strokeWidth={2.4} />}
            title={t('profile.subscriptions_plans')}
            onPress={() => router.push('/paywall')}
          />
        </View>

        {/* ── ALLENAMENTO ── */}
        <SectionLabel text={t('profile.section_training')} />
        <View style={styles.group}>
          <Row
            testID="edit-goals-button"
            icon={<Flag size={18} color={colors.primary} strokeWidth={2.4} />}
            title={t('profile.edit_goals')}
            onPress={() => setShowGoals(true)}
          />
          <Row
            testID="badges-button"
            icon={<Trophy size={18} color={colors.primary} strokeWidth={2.4} />}
            title={t('profile.badges')}
            onPress={() => router.push('/badges')}
          />
          {(tier === 'performance' || tier === 'elite') ? (
            <Row
              testID="race-predictor-button"
              icon={<Timer size={18} color={colors.primary} strokeWidth={2.4} />}
              title={t('profile.race_predictor')}
              onPress={() => router.push('/race-predictor')}
            />
          ) : null}
          {tier === 'elite' ? (
            <Row
              testID="coach-dashboard-button"
              icon={<Users size={18} color={colors.primary} strokeWidth={2.4} />}
              title={t('profile.coach_dashboard')}
              onPress={() => router.push('/coach')}
            />
          ) : null}
          <Row
            testID="wearables-button"
            icon={<Watch size={18} color={colors.primary} strokeWidth={2.4} />}
            title={t('profile.wearables')}
            onPress={() => router.push('/wearables')}
          />
        </View>

        {/* ── COMMUNITY ── */}
        <SectionLabel text={t('profile.section_community')} />
        <View style={styles.group}>
          {/* Referral card — gradient highlight */}
          <TouchableOpacity
            testID="referral-card"
            style={styles.referralCard}
            onPress={() => router.push('/referral' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.referralIconWrap}>
              <Gift size={20} color={colors.primary} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.referralTitle}>{t('referral.card_title')}</Text>
              <Text style={styles.referralSubtitle}>{t('referral.card_subtitle')}</Text>
            </View>
            <ChevronRight size={18} color={colors.primary} />
          </TouchableOpacity>
          <Row
            testID="community-button"
            icon={<Users size={18} color={colors.primary} strokeWidth={2.4} />}
            title={t('profile.community_feed')}
            onPress={() => router.push('/social')}
          />
          {/* Nearby visibility toggle (P0 privacy control) */}
          <View style={styles.toggleRow} testID="nearby-visibility-row">
            <View style={styles.rowIcon}>
              <Eye size={18} color={colors.primary} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>{t('profile.nearby_visibility')}</Text>
              <Text style={styles.toggleSub}>
                {nearbyVisible ? t('profile.nearby_visibility_on') : t('profile.nearby_visibility_off')}
              </Text>
            </View>
            <Switch
              testID="nearby-visibility-switch"
              value={nearbyVisible}
              onValueChange={onToggleNearby}
              disabled={togglingNearby}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
              ios_backgroundColor={colors.border}
            />
          </View>
          <Row
            testID="heatmap-button"
            icon={<MapIcon size={18} color={colors.primary} strokeWidth={2.4} />}
            title={t('profile.heatmap')}
            onPress={() => router.push('/heatmap')}
          />
          <Row
            testID="language-button"
            icon={<Globe size={18} color={colors.primary} strokeWidth={2.4} />}
            title={`${t('settings.language')} · ${SUPPORTED_LOCALES.find(l => l.code === locale)?.flag || ''} ${SUPPORTED_LOCALES.find(l => l.code === locale)?.label || ''}`}
            onPress={() => setShowLangPicker(true)}
          />
        </View>

        {/* ── ADMIN ── (visibile solo agli admin) */}
        {user?.role === 'admin' ? (
          <>
            <SectionLabel text="ADMIN" />
            <View style={styles.group}>
              <TouchableOpacity
                testID="admin-panel-button"
                style={styles.rowAdmin}
                onPress={() => router.push('/admin')}
                activeOpacity={0.85}
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.primary }]}>
                  <ShieldCheck size={18} color="#fff" strokeWidth={2.4} />
                </View>
                <Text style={[styles.rowText, { color: colors.primary }]}>{t('profile.admin_panel')}</Text>
                <ChevronRight size={18} color={colors.primary} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* ── SUPPORTO ── */}
        <SectionLabel text={t('profile.section_support')} />
        <View style={styles.group}>
          <Row
            testID="terms-button"
            icon={<FileText size={18} color={colors.primary} strokeWidth={2.4} />}
            title={t('profile.terms')}
            onPress={() => router.push('/terms')}
          />
          <Row
            testID="privacy-button"
            icon={<ShieldCheck size={18} color={colors.primary} strokeWidth={2.4} />}
            title={t('profile.privacy')}
            onPress={() => router.push('/privacy')}
          />
          {isAdMobAvailable ? (
            <Row
              testID="privacy-options-button"
              icon={<Settings size={18} color={colors.primary} strokeWidth={2.4} />}
              title={t('profile.privacy_ads')}
              onPress={async () => {
                try {
                  await showPrivacyOptionsForm();
                  Alert.alert(t('profile.prefs_updated'), t('profile.prefs_updated_msg'));
                } catch {
                  Alert.alert(
                    t('common.not_available'),
                    t('profile.prefs_unavailable'),
                  );
                }
              }}
            />
          ) : null}
        </View>

        {/* Logout */}
        <TouchableOpacity
          testID="logout-button"
          style={styles.logoutBtn}
          onPress={async () => { await logout(); router.replace('/(auth)/login'); }}
          activeOpacity={0.85}
        >
          <LogOut size={18} color={colors.danger} strokeWidth={2.4} />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Language picker modal */}
      <Modal visible={showLangPicker} transparent animationType="fade" onRequestClose={() => setShowLangPicker(false)}>
        <TouchableOpacity
          style={styles.langBackdrop}
          activeOpacity={1}
          onPress={() => setShowLangPicker(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.langCard} onPress={() => {}}>
            <Text style={styles.langTitle}>{t('settings.language')}</Text>
            <Text style={styles.langSubtitle}>{t('settings.language_subtitle')}</Text>
            {SUPPORTED_LOCALES.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langRow, locale === l.code && styles.langRowActive]}
                onPress={async () => { await setLocale(l.code as SupportedLocale); setShowLangPicker(false); }}
                activeOpacity={0.7}
                testID={`lang-${l.code}`}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langLabel, locale === l.code && styles.langLabelActive]}>{l.label}</Text>
                {locale === l.code ? <ChevronRight size={18} color={colors.primary} /> : null}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Goals Modal */}
      <Modal visible={showGoals} transparent animationType="slide" onRequestClose={() => setShowGoals(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('profile.goals_modal_title')}</Text>
            <Text style={styles.inputLabel}>{t('profile.goals_daily')}</Text>
            <TextInput
              testID="goals-daily-input"
              style={styles.input} keyboardType="numeric"
              value={goals.daily_km} onChangeText={(v) => setGoals(g => ({ ...g, daily_km: v }))}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.inputLabel}>{t('profile.goals_weekly')}</Text>
            <TextInput
              testID="goals-weekly-input"
              style={styles.input} keyboardType="numeric"
              value={goals.weekly_km} onChangeText={(v) => setGoals(g => ({ ...g, weekly_km: v }))}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.inputLabel}>{t('profile.goals_monthly')}</Text>
            <TextInput
              testID="goals-monthly-input"
              style={styles.input} keyboardType="numeric"
              value={goals.monthly_km} onChangeText={(v) => setGoals(g => ({ ...g, monthly_km: v }))}
              placeholderTextColor={colors.textMuted}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGoals(false)} activeOpacity={0.85}>
                <Text style={styles.cancelText}>{t('common.cancel_upper')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="save-goals-button"
                style={styles.saveBtn} onPress={saveGoals} disabled={saving} activeOpacity={0.85}
              >
                <Text style={styles.saveText}>{saving ? t('common.saving_upper') : t('common.save_upper')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <View style={styles.sectionLabelDot} />
      <Text style={styles.sectionLabelText}>{text}</Text>
    </View>
  );
}

function Row({
  icon, title, rightIcon, onPress, testID,
}: { icon: React.ReactNode; title: string; rightIcon?: React.ReactNode; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity testID={testID} style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowText}>{title}</Text>
      {rightIcon || <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.4} />}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
function tierColor(t: string) {
  if (t === 'elite') return '#F59E0B';
  if (t === 'performance') return colors.primary;
  if (t === 'starter') return '#22C55E';
  return '#6B7280';
}
function tierLabel(t: string) {
  if (t === 'elite') return 'ELITE';
  if (t === 'performance') return 'PERFORMANCE';
  if (t === 'starter') return 'STARTER';
  return 'FREE';
}

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header / avatar
  avatarTouch: {
    alignSelf: 'center',
    position: 'relative',
  },
  avatar: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    ...tokens.shadow.md,
  },
  avatarImg: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: colors.surface,
    ...tokens.shadow.md,
  },
  avatarCameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 38,
    fontFamily: fonts.heading,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 24,
    fontFamily: fonts.heading,
    textAlign: 'center',
    marginTop: spacing.md,
    letterSpacing: -0.4,
  },
  email: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontSize: 13,
    fontFamily: fonts.medium,
  },

  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: fonts.headingBold,
    letterSpacing: 1,
  },
  badgeNeutral: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeTextNeutral: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: fonts.headingBold,
    letterSpacing: 1,
  },

  // Premium banner
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
    ...tokens.shadow.md,
  },
  premiumIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  premiumLabel: {
    color: '#fff',
    fontSize: 10,
    fontFamily: fonts.headingBold,
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  premiumTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: fonts.bold,
    marginTop: 4,
  },

  // Section label
  sectionLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionLabelDot: {
    width: 4, height: 14, borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionLabelText: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: fonts.headingBold,
    letterSpacing: 1.6,
  },

  // Row group
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowAdmin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
  },

  // Toggle row (e.g. nearby visibility)
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  toggleTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  toggleSub: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
  },
  logoutText: {
    color: colors.danger,
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
  },

  // Referral card (gradient-like highlight)
  referralCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(255,107,31,0.10)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,31,0.35)',
    marginBottom: spacing.xs,
  },
  referralIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,107,31,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  referralTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.headingBold,
  },
  referralSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },

  // Language picker modal
  langBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  langCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%', maxWidth: 380,
    borderWidth: 1, borderColor: colors.border,
  },
  langTitle: {
    color: colors.textPrimary, fontSize: 18,
    fontFamily: fonts.headingBold,
  },
  langSubtitle: {
    color: colors.textSecondary, fontSize: 12,
    fontFamily: fonts.medium, marginTop: 4, marginBottom: spacing.md,
  },
  langRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  langRowActive: {
    backgroundColor: 'rgba(255,107,31,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,31,0.35)',
  },
  langFlag: { fontSize: 22 },
  langLabel: {
    color: colors.textPrimary, fontSize: 14, flex: 1,
    fontFamily: fonts.medium,
  },
  langLabelActive: {
    fontFamily: fonts.headingBold,
    color: colors.primary,
  },

  // Modal goals
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontFamily: fonts.heading,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: fonts.headingBold,
    letterSpacing: 1.5,
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    color: colors.textPrimary,
    padding: spacing.md,
    borderRadius: radius.md,
    fontSize: 16,
    fontFamily: fonts.bold,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  saveText: {
    color: '#fff',
    fontFamily: fonts.headingBold,
    fontSize: 12,
    letterSpacing: 1,
  },
});
