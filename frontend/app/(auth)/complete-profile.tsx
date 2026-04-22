import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, Alert, BackHandler,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { useAuth } from '../../src/auth';
import { colors, spacing, radius } from '../../src/theme';

// Versioni dei documenti legali attualmente pubblicati (incrementare quando cambiano)
const TERMS_VERSION = '2026-04-21';
const PRIVACY_VERSION = '2026-04-21';
const MIN_AGE_YEARS = 14;

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

export default function CompleteProfile() {
  const { user, completeProfile, logout } = useAuth();
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedAge, setAcceptedAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const age = calcAge(dobDay, dobMonth, dobYear);
  const ageValid = age !== null && age >= MIN_AGE_YEARS;
  const canSubmit = ageValid && acceptedLegal && acceptedAge && !loading;

  // Android hardware back: blocca back e proponi logout invece
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Uscire senza completare?',
          'Per usare RunHub devi completare il profilo. Vuoi disconnetterti e usare un altro metodo?',
          [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Disconnetti', style: 'destructive', onPress: async () => { await logout(); } },
          ]
        );
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [logout])
  );

  const onSubmit = async () => {
    setError('');
    if (age === null) { setError('Inserisci una data di nascita valida'); return; }
    if (age < MIN_AGE_YEARS) { setError(`Devi avere almeno ${MIN_AGE_YEARS} anni per usare RunHub`); return; }
    if (!acceptedLegal) { setError('Devi accettare Termini e Privacy per continuare'); return; }
    if (!acceptedAge) { setError(`Devi confermare di avere almeno ${MIN_AGE_YEARS} anni`); return; }

    setLoading(true);
    try {
      const dobIso = `${dobYear.padStart(4, '0')}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
      await completeProfile({
        date_of_birth: dobIso,
        accepted_terms: true,
        accepted_privacy: true,
        accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
      });
      // Il routing in _layout.tsx reindirizzerà in base a onboarding_completed
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Salvataggio fallito. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Disconnettere?',
      'I dati del tuo account social resteranno collegati. Potrai rifare login in qualsiasi momento.',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Disconnetti', style: 'destructive', onPress: async () => { await logout(); } },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.headerBadge}>
            <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>COMPLETA IL TUO PROFILO</Text>
          <Text style={styles.subtitle}>
            Ciao {user?.name || 'atleta'}! Per conformità GDPR e policy italiane, abbiamo bisogno di 2 informazioni veloci prima di continuare.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Data di nascita */}
          <Text style={styles.label}>Data di nascita</Text>
          <View style={styles.dobRow}>
            <TextInput
              style={[styles.dobInput, { flex: 1 }]}
              placeholder="GG" placeholderTextColor={colors.textMuted}
              value={dobDay} onChangeText={(v) => setDobDay(v.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad" maxLength={2}
            />
            <TextInput
              style={[styles.dobInput, { flex: 1 }]}
              placeholder="MM" placeholderTextColor={colors.textMuted}
              value={dobMonth} onChangeText={(v) => setDobMonth(v.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad" maxLength={2}
            />
            <TextInput
              style={[styles.dobInput, { flex: 1.4 }]}
              placeholder="AAAA" placeholderTextColor={colors.textMuted}
              value={dobYear} onChangeText={(v) => setDobYear(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad" maxLength={4}
            />
          </View>
          {age !== null && (
            <Text style={[styles.ageHint, !ageValid && { color: colors.primary }]}>
              {ageValid ? `✓ Età: ${age} anni` : `❌ Devi avere almeno ${MIN_AGE_YEARS} anni (hai ${age})`}
            </Text>
          )}

          {/* Checkbox Legal Consent */}
          <View style={styles.consentRow}>
            <TouchableOpacity
              onPress={() => setAcceptedLegal(!acceptedLegal)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.checkbox, acceptedLegal && styles.checkboxChecked]}>
                {acceptedLegal && <Ionicons name="checkmark" size={18} color="#fff" />}
              </View>
            </TouchableOpacity>
            <Text style={styles.consentText} onPress={() => setAcceptedLegal(!acceptedLegal)}>
              Ho letto e accetto i{' '}
              <Text style={styles.consentLink} onPress={(e: any) => { e?.stopPropagation?.(); router.push('/terms'); }}>
                Termini di Servizio
              </Text>
              {' '}e la{' '}
              <Text style={styles.consentLink} onPress={(e: any) => { e?.stopPropagation?.(); router.push('/privacy'); }}>
                Privacy Policy
              </Text>
              .
            </Text>
          </View>

          {/* Checkbox Age confirmation */}
          <View style={styles.consentRow}>
            <TouchableOpacity
              onPress={() => setAcceptedAge(!acceptedAge)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.checkbox, acceptedAge && styles.checkboxChecked]}>
                {acceptedAge && <Ionicons name="checkmark" size={18} color="#fff" />}
              </View>
            </TouchableOpacity>
            <Text style={styles.consentText} onPress={() => setAcceptedAge(!acceptedAge)}>
              Confermo di avere almeno <Text style={{ fontWeight: '700' }}>{MIN_AGE_YEARS} anni</Text>.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>CONTINUA</Text>}
          </TouchableOpacity>

          <Text style={styles.gdprFooter}>
            I tuoi dati sono trattati secondo il GDPR. Puoi esportarli o cancellare l'account in qualsiasi
            momento dalla sezione <Text style={{ fontWeight: '700' }}>Account & Privacy</Text>.
          </Text>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutLink}>
            <Text style={styles.logoutLinkText}>Annulla e disconnetti</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  headerBadge: {
    alignSelf: 'center',
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
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
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 10,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
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
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  error: {
    color: colors.primary,
    marginBottom: spacing.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  gdprFooter: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
    paddingHorizontal: spacing.sm,
  },
  logoutLink: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  logoutLinkText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
