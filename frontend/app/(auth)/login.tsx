import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ImageBackground, ActivityIndicator, ScrollView, Image
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth';
import { colors, spacing, radius } from '../../src/theme';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const onSubmit = async () => {
    setError('');
    if (!email || !password) { setError('Compila tutti i campi'); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Login fallito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=1200' }}
      style={styles.bg}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Image source={require('../../assets/images/logo-transparent.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.tagline}>OGNI KM. OGNI BATTITO. OGNI TRAGUARDO.</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.title}>BENTORNATO</Text>
              <Text style={styles.subtitle}>Accedi per continuare il tuo allenamento</Text>
              {error ? <Text style={styles.error} testID="login-error">{error}</Text> : null}
              <TextInput
                testID="login-email-input"
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={email} onChangeText={setEmail}
                autoCapitalize="none" keyboardType="email-address"
              />
              <TextInput
                testID="login-password-input"
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password} onChangeText={setPassword} secureTextEntry
              />
              <TouchableOpacity
                testID="login-submit-button"
                style={styles.button} onPress={onSubmit} disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ACCEDI</Text>}
              </TouchableOpacity>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity testID="goto-register-button">
                  <Text style={styles.link}>Non hai un account? <Text style={{ color: colors.primary }}>Registrati</Text></Text>
                </TouchableOpacity>
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9,9,11,0.78)' },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'space-between' },
  header: { marginTop: spacing.xl, alignItems: 'center' },
  logo: { width: 180, height: 180, marginBottom: spacing.sm },
  brand: { fontSize: 44, fontWeight: '900', color: colors.textPrimary, letterSpacing: -1 },
  tagline: { color: colors.textSecondary, fontSize: 12, letterSpacing: 2, marginTop: spacing.sm, fontWeight: '700', textAlign: 'center' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.surfaceSecondary, color: colors.textPrimary,
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, fontSize: 16,
  },
  button: {
    backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.pill,
    alignItems: 'center', marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  link: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
  error: { color: colors.primary, marginBottom: spacing.md, fontWeight: '600' },
});
