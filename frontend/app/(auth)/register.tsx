import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/auth';
import { colors, spacing, radius } from '../../src/theme';
import { SocialAuthButtons } from '../../src/SocialAuthButtons';
import { api } from '../../src/api';
import { useT } from '../../src/i18n';
import { lookupReferral } from '../../src/referral';

// Versioni dei documenti legali attualmente pubblicati (incrementare quando cambiano)
const TERMS_VERSION = '2026-04-21';
const PRIVACY_VERSION = '2026-04-21';
const MIN_AGE_YEARS = 14;

// Utility: calcola età dato un oggetto {day, month, year}
function calcAge(day: string, month: string, year: string): number | null {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!d || !m || !y) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  if (y < 1900 || y > new Date().getFullYear()) return null;
  const dob = new Date(y, m - 1, d);
  if (dob.getFullYear() !== y || dob.getMonth() !== m - 1 || dob.getDate() !== d) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const mDiff = now.getMonth() - dob.getMonth();
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

export default function Register() {
  const { register } = useAuth();
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedAge, setAcceptedAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const router = useRouter();

  // Pre-warm backend on register screen mount (Render free tier cold start fix)
  useEffect(() => {
    api.get('/health', { timeout: 5000 }).catch(() => {});
    // Load pending referral code from deep link, if any
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('runhub.pendingReferralCode');
        if (stored) {
          setReferralCode(stored.toUpperCase());
          const r = await lookupReferral(stored);
          if (r) setReferrerName(r.referrer_name);
        }
      } catch {}
    })();
  }, []);

  // Debounced referral code lookup
  useEffect(() => {
    const code = referralCode.trim().toUpperCase();
    if (!code || code.length < 6) { setReferrerName(null); return; }
    const handle = setTimeout(async () => {
      const r = await lookupReferral(code);
      setReferrerName(r ? r.referrer_name : null);
    }, 500);
    return () => clearTimeout(handle);
  }, [referralCode]);

  const age = calcAge(dobDay, dobMonth, dobYear);
  const ageValid = age !== null && age >= MIN_AGE_YEARS;
  const canSubmit =
    email && password && name && ageValid && acceptedLegal && acceptedAge && !loading;

  const onSubmit = async () => {
    setError('');
    if (!email || !password || !name) { setError(t('auth.fill_all_fields')); return; }
    if (password.length < 6) { setError(t('auth.password_too_short')); return; }
    if (age === null) { setError(t('auth.invalid_dob')); return; }
    if (age < MIN_AGE_YEARS) {
      setError(t('auth.must_be_age', { n: MIN_AGE_YEARS }));
      return;
    }
    if (!acceptedLegal) { setError(t('auth.must_accept_terms')); return; }
    if (!acceptedAge) { setError(t('auth.must_confirm_age', { n: MIN_AGE_YEARS })); return; }

    setLoading(true);
    try {
      const dobIso = `${dobYear.padStart(4, '0')}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
      await register(
        email.trim().toLowerCase(),
        password,
        name.trim(),
        {
          accepted_terms: true,
          accepted_privacy: true,
          accepted_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
        },
        dobIso,
        referralCode.trim().toUpperCase() || undefined
      );
      // Clear pending referral from storage
      try { await AsyncStorage.removeItem('runhub.pendingReferralCode'); } catch {}
      router.replace('/onboarding');
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      setError(typeof d === 'string' ? d : t('auth.register_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <Image source={require('../../assets/images/logo-transparent.png')} style={{ width: 140, height: 140 }} resizeMode="contain" />
          </View>
          <Text style={styles.title}>{t('auth.join_pack')}</Text>
          <Text style={styles.subtitle}>{t('auth.register_subtitle_long')}</Text>
          {error ? <Text style={styles.error} testID="register-error">{error}</Text> : null}

          <TextInput
            testID="register-name-input"
            style={styles.input} placeholder={t('auth.name')} placeholderTextColor={colors.textMuted}
            value={name} onChangeText={setName}
          />
          <TextInput
            testID="register-email-input"
            style={styles.input} placeholder={t('auth.email')} placeholderTextColor={colors.textMuted}
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
          />
          <TextInput
            testID="register-password-input"
            style={styles.input} placeholder={t('auth.password_min')} placeholderTextColor={colors.textMuted}
            value={password} onChangeText={setPassword} secureTextEntry
          />

          {/* Referral code (optional) */}
          <TextInput
            testID="register-referral-input"
            style={styles.input}
            placeholder={t('referral.register_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={referralCode}
            onChangeText={(v) => setReferralCode(v.toUpperCase().slice(0, 12))}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {referrerName ? (
            <View style={styles.referrerHint}>
              <Ionicons name="gift" size={14} color={colors.primary} />
              <Text style={styles.referrerHintText}>
                {t('referral.register_with', { name: referrerName })}
              </Text>
            </View>
          ) : null}

          {/* Data di nascita */}
          <Text style={styles.dobLabel}>{t('auth.date_of_birth')}</Text>
          <View style={styles.dobRow}>
            <TextInput
              testID="dob-day"
              style={[styles.dobInput, { flex: 1 }]}
              placeholder={t('auth.dob_day_short')} placeholderTextColor={colors.textMuted}
              value={dobDay} onChangeText={(v) => setDobDay(v.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad" maxLength={2}
            />
            <TextInput
              testID="dob-month"
              style={[styles.dobInput, { flex: 1 }]}
              placeholder={t('auth.dob_month_short')} placeholderTextColor={colors.textMuted}
              value={dobMonth} onChangeText={(v) => setDobMonth(v.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad" maxLength={2}
            />
            <TextInput
              testID="dob-year"
              style={[styles.dobInput, { flex: 1.4 }]}
              placeholder={t('auth.dob_year_short')} placeholderTextColor={colors.textMuted}
              value={dobYear} onChangeText={(v) => setDobYear(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad" maxLength={4}
            />
          </View>
          {age !== null && (
            <Text style={[styles.ageHint, !ageValid && { color: colors.primary }]}>
              {ageValid ? t('auth.age_valid', { age }) : t('auth.age_invalid', { min: MIN_AGE_YEARS, age })}
            </Text>
          )}

          {/* Checkbox Legal Consent (obbligatorio) - link testuali navigabili */}
          <View style={styles.consentRow}>
            <TouchableOpacity
              testID="consent-legal-checkbox"
              onPress={() => setAcceptedLegal(!acceptedLegal)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.checkbox, acceptedLegal && styles.checkboxChecked]}>
                {acceptedLegal && <Ionicons name="checkmark" size={18} color="#fff" />}
              </View>
            </TouchableOpacity>
            <Text style={styles.consentText} onPress={() => setAcceptedLegal(!acceptedLegal)}>
              {t('auth.tos_intro')}
              <Text
                testID="link-terms"
                style={styles.consentLink}
                onPress={(e: any) => { e?.stopPropagation?.(); router.push('/terms'); }}
              >
                {t('auth.tos_link')}
              </Text>
              {t('auth.tos_separator')}
              <Text
                testID="link-privacy"
                style={styles.consentLink}
                onPress={(e: any) => { e?.stopPropagation?.(); router.push('/privacy'); }}
              >
                {t('auth.tos_privacy_link')}
              </Text>
              {t('auth.tos_end')}
            </Text>
          </View>

          {/* Checkbox Age confirmation */}
          <View style={styles.consentRow}>
            <TouchableOpacity
              testID="consent-age-checkbox"
              onPress={() => setAcceptedAge(!acceptedAge)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.checkbox, acceptedAge && styles.checkboxChecked]}>
                {acceptedAge && <Ionicons name="checkmark" size={18} color="#fff" />}
              </View>
            </TouchableOpacity>
            <Text style={styles.consentText} onPress={() => setAcceptedAge(!acceptedAge)}>
              {t('auth.age_confirm_text', { n: MIN_AGE_YEARS })}
            </Text>
          </View>

          <TouchableOpacity
            testID="register-submit-button"
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{t('auth.create_account')}</Text>}
          </TouchableOpacity>

          <Text style={styles.gdprFooter}>
            {t('auth.gdpr_footer')}
          </Text>

          <SocialAuthButtons mode="register" />

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity testID="goto-login-button">
              <Text style={styles.link}>{t('auth.have_account_q')} <Text style={{ color: colors.primary }}>{t('auth.sign_in')}</Text></Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.surface, color: colors.textPrimary,
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border, fontSize: 16,
  },
  dobLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  dobRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  dobInput: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    textAlign: 'center',
  },
  ageHint: {
    color: colors.success,
    fontSize: 12,
    marginLeft: 4,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  referrerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,107,31,0.10)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,31,0.30)',
  },
  referrerHintText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  consentText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  consentLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.pill,
    alignItems: 'center', marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  link: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
  error: { color: colors.primary, marginBottom: spacing.md, fontWeight: '600' },
  gdprFooter: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
    paddingHorizontal: spacing.sm,
  },
});
