import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, Image
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth';
import { colors, spacing, radius } from '../../src/theme';

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const onSubmit = async () => {
    setError('');
    if (!email || !password || !name) { setError('Compila tutti i campi'); return; }
    if (password.length < 6) { setError('Password almeno 6 caratteri'); return; }
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim());
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
          <TouchableOpacity
            testID="register-submit-button"
            style={styles.button} onPress={onSubmit} disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>CREA ACCOUNT</Text>}
          </TouchableOpacity>
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
  brand: { fontSize: 38, fontWeight: '900', color: colors.textPrimary, letterSpacing: -1, marginBottom: spacing.xl },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.surface, color: colors.textPrimary,
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border, fontSize: 16,
  },
  button: {
    backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.pill,
    alignItems: 'center', marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  link: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
  error: { color: colors.primary, marginBottom: spacing.md, fontWeight: '600' },
});
