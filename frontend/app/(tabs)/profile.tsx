import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Linking,
  Image, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Star, CreditCard, Trophy, Flag, Watch, Users, Map as MapIcon,
  Rocket, UserCircle, FileText, ShieldCheck, Settings, LogOut,
  Timer, Sparkles, ChevronRight, ExternalLink, Camera, Gift, Globe,
} from 'lucide-react-native';
import { useAuth } from '../../src/auth';
import { api } from '../../src/api';
import { colors, spacing, radius, fonts } from '../../src/theme';
import { showPrivacyOptionsForm } from '../../src/ConsentManager';
import { isAdMobAvailable } from '../../src/adMobConfig';
import { chooseAndUploadAvatar } from '../../src/avatar';
import { useT, SUPPORTED_LOCALES, SupportedLocale } from '../../src/i18n';

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const { t, locale, setLocale } = useT();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [goals, setGoals] = useState({ daily_km: '3', weekly_km: '15', monthly_km: '60' });
  const [showGoals, setShowGoals] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

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
      Alert.alert('Errore', 'Impossibile aggiornare i traguardi');
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
              <Text style={styles.premiumLabel}>SBLOCCA PREMIUM</Text>
              <Text style={styles.premiumTitle}>AI Coach, piani avanzati, analisi complete</Text>
            </View>
            <ChevronRight size={22} color="#fff" strokeWidth={2.4} />
          </TouchableOpacity>
        ) : null}

        {/* ── ACCOUNT ── */}
        <SectionLabel text="ACCOUNT" />
        <View style={styles.group}>
          {!isFree ? (
            <>
              <Row
                testID="manage-premium-button"
                icon={<Star size={18} color={colors.primary} strokeWidth={2.4} />}
                title="Cambia piano"
                onPress={() => router.push('/premium')}
              />
              <Row
                testID="billing-portal-button"
                icon={<CreditCard size={18} color={colors.primary} strokeWidth={2.4} />}
                title="Gestisci pagamento e fatture"
                rightIcon={<ExternalLink size={16} color={colors.textMuted} strokeWidth={2.4} />}
                onPress={async () => {
                  try {
                    const { data } = await api.post('/stripe/portal');
                    if (data?.url) Linking.openURL(data.url);
                  } catch (e: any) {
                    Alert.alert('Errore', e?.response?.data?.detail || 'Impossibile aprire il portale');
                  }
                }}
              />
            </>
          ) : null}
          <Row
            testID="account-button"
            icon={<UserCircle size={18} color={colors.primary} strokeWidth={2.4} />}
            title="Account & Privacy"
            onPress={() => router.push('/account')}
          />
          <Row
            testID="paywall-button"
            icon={<Rocket size={18} color={colors.primary} strokeWidth={2.4} />}
            title="Abbonamenti & Piani"
            onPress={() => router.push('/paywall')}
          />
        </View>

        {/* ── ALLENAMENTO ── */}
        <SectionLabel text="ALLENAMENTO" />
        <View style={styles.group}>
          <Row
            testID="edit-goals-button"
            icon={<Flag size={18} color={colors.primary} strokeWidth={2.4} />}
            title="Modifica traguardi"
            onPress={() => setShowGoals(true)}
          />
          <Row
            testID="badges-button"
            icon={<Trophy size={18} color={colors.primary} strokeWidth={2.4} />}
            title="Achievement & Badge"
            onPress={() => router.push('/badges')}
          />
          {(tier === 'performance' || tier === 'elite') ? (
            <Row
              testID="race-predictor-button"
              icon={<Timer size={18} color={colors.primary} strokeWidth={2.4} />}
              title="Proiezione tempi gara & VO2max"
              onPress={() => router.push('/race-predictor')}
            />
          ) : null}
          {tier === 'elite' ? (
            <Row
              testID="coach-dashboard-button"
              icon={<Users size={18} color={colors.primary} strokeWidth={2.4} />}
              title="Coach Dashboard"
              onPress={() => router.push('/coach')}
            />
          ) : null}
          <Row
            testID="wearables-button"
            icon={<Watch size={18} color={colors.primary} strokeWidth={2.4} />}
            title="Wearables (Apple Health / Google Fit)"
            onPress={() => router.push('/wearables')}
          />
        </View>

        {/* ── COMMUNITY ── */}
        <SectionLabel text="COMMUNITY" />
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
            title="Amici, feed e classifiche"
            onPress={() => router.push('/social')}
          />
          <Row
            testID="heatmap-button"
            icon={<MapIcon size={18} color={colors.primary} strokeWidth={2.4} />}
            title="La mia mappa corse (heatmap)"
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
                <Text style={[styles.rowText, { color: colors.primary }]}>Admin Panel</Text>
                <ChevronRight size={18} color={colors.primary} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* ── SUPPORTO ── */}
        <SectionLabel text="SUPPORTO E LEGALE" />
        <View style={styles.group}>
          <Row
            testID="terms-button"
            icon={<FileText size={18} color={colors.primary} strokeWidth={2.4} />}
            title="Termini di Servizio"
            onPress={() => router.push('/terms')}
          />
          <Row
            testID="privacy-button"
            icon={<ShieldCheck size={18} color={colors.primary} strokeWidth={2.4} />}
            title="Privacy Policy"
            onPress={() => router.push('/privacy')}
          />
          {isAdMobAvailable ? (
            <Row
              testID="privacy-options-button"
              icon={<Settings size={18} color={colors.primary} strokeWidth={2.4} />}
              title="Preferenze privacy ads (GDPR)"
              onPress={async () => {
                try {
                  await showPrivacyOptionsForm();
                  Alert.alert('Preferenze aggiornate', 'Le tue scelte sono state salvate.');
                } catch {
                  Alert.alert(
                    'Non disponibile',
                    'Le preferenze privacy per la pubblicità non sono disponibili su questo dispositivo.',
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
          <Text style={styles.logoutText}>Esci</Text>
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
            <Text style={styles.modalTitle}>Modifica traguardi (km)</Text>
            <Text style={styles.inputLabel}>GIORNALIERO</Text>
            <TextInput
              testID="goals-daily-input"
              style={styles.input} keyboardType="numeric"
              value={goals.daily_km} onChangeText={(v) => setGoals(g => ({ ...g, daily_km: v }))}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.inputLabel}>SETTIMANALE</Text>
            <TextInput
              testID="goals-weekly-input"
              style={styles.input} keyboardType="numeric"
              value={goals.weekly_km} onChangeText={(v) => setGoals(g => ({ ...g, weekly_km: v }))}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.inputLabel}>MENSILE</Text>
            <TextInput
              testID="goals-monthly-input"
              style={styles.input} keyboardType="numeric"
              value={goals.monthly_km} onChangeText={(v) => setGoals(g => ({ ...g, monthly_km: v }))}
              placeholderTextColor={colors.textMuted}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGoals(false)} activeOpacity={0.85}>
                <Text style={styles.cancelText}>ANNULLA</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="save-goals-button"
                style={styles.saveBtn} onPress={saveGoals} disabled={saving} activeOpacity={0.85}
              >
                <Text style={styles.saveText}>{saving ? 'SALVO...' : 'SALVA'}</Text>
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  avatarImg: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
    backgroundColor: colors.surface,
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
    borderColor: colors.background,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
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
    borderColor: 'rgba(239,68,68,0.35)',
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
