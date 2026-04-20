import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth';
import { colors, spacing, radius } from '../../src/theme';
import { SocialAuthButtons } from '../../src/SocialAuthButtons';

// Versioni dei documenti legali attualmente pubblicati (incrementare quando cambiano)
const TERMS_VERSION = '2026-04-20';
const PRIVACY_VERSION = '2026-04-20';

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedAge, setAcceptedAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const canSubmit = email && password && name && acceptedLegal && acceptedAge && !loading;

  const onSubmit = async () => {
    setError('');
    if (!email || !password || !name) { setError('Compila tutti i campi'); return; }
    if (password.length < 6) { setError('Password almeno 6 caratteri'); return; }
    if (!acceptedLegal) { setError('Devi accettare Termini e Privacy per continuare'); return; }
    if (!acceptedAge) { setError('Devi confermare di avere almeno 13 anni'); return; }

    setLoading(true);
    try {
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
        }
      );
      router.replace('/onboarding');
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Registrazione fallita');
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
          <Text style={styles.title}>UNISCITI AL BRANCO</Text>
          <Text style={styles.subtitle}>Crea il tuo profilo e inizia oggi</Text>
          {error ? <Text style={styles.error} testID="register-error">{error}</Text> : null}

          <TextInput
            testID="register-name-input"
            style={styles.input} placeholder="Nome" placeholderTextColor={colors.textMuted}
            value={name} onChangeText={setName}
          />
          <TextInput
            testID="register-email-input"
            style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted}
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
          />
          <TextInput
            testID="register-password-input"
            style={styles.input} placeholder="Password" placeholderTextColor={colors.textMuted}
            value={password} onChangeText={setPassword} secureTextEntry
          />

          {/* Checkbox Legal Consent (obbligatorio) */}
          <TouchableOpacity
            testID="consent-legal-checkbox"
            style={styles.consentRow}
            onPress={() => setAcceptedLegal(!acceptedLegal)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptedLegal && styles.checkboxChecked]}>
              {acceptedLegal && <Ionicons name="checkmark" size={18} color="#fff" />}
            </View>
            <Text style={styles.consentText}>
              Ho letto e accetto i{' '}
              <Link href="/terms" asChild>
                <Text style={styles.consentLink}>Termini di Servizio</Text>
              </Link>
              {' '}e la{' '}
              <Link href="/privacy" asChild>
                <Text style={styles.consentLink}>Privacy Policy</Text>
              </Link>
              .
            </Text>
          </TouchableOpacity>

          {/* Checkbox Age confirmation (COPPA / GDPR-K) */}
          <TouchableOpacity
            testID="consent-age-checkbox"
            style={styles.consentRow}
            onPress={() => setAcceptedAge(!acceptedAge)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptedAge && styles.checkboxChecked]}>
              {acceptedAge && <Ionicons name="checkmark" size={18} color="#fff" />}
            </View>
            <Text style={styles.consentText}>
              Confermo di avere almeno <Text style={{ fontWeight: '700' }}>13 anni</Text>.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="register-submit-button"
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>CREA ACCOUNT</Text>}
          </TouchableOpacity>

          <Text style={styles.gdprFooter}>
            I tuoi dati sono trattati secondo il GDPR. Puoi esportarli o cancellare l'account in qualsiasi
            momento dalla sezione <Text style={{ fontWeight: '700' }}>Account & Privacy</Text>.
          </Text>

          <SocialAuthButtons mode="register" />

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity testID="goto-login-button">
              <Text style={styles.link}>Hai gia' un account? <Text style={{ color: colors.primary }}>Accedi</Text></Text>
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
