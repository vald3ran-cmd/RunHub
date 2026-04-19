import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, Alert
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { colors, spacing, radius } from '../../src/theme';

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!email.trim()) { Alert.alert('Attenzione', 'Inserisci la tua email'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      Alert.alert('Codice inviato', 'Controlla la tua email (anche la cartella Spam). Il codice e\' valido per 15 minuti.');
      setStep('reset');
    } catch (e: any) {
      Alert.alert('Errore', e?.response?.data?.detail || 'Impossibile inviare il codice');
    } finally { setLoading(false); }
  };

  const resetPwd = async () => {
    if (code.length < 4) { Alert.alert('Attenzione', 'Inserisci il codice ricevuto'); return; }
    if (password.length < 6) { Alert.alert('Attenzione', 'Password troppo corta (min 6 caratteri)'); return; }
    if (password !== confirm) { Alert.alert('Attenzione', 'Le password non corrispondono'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        new_password: password,
      });
      Alert.alert('Fatto!', 'Password aggiornata. Accedi con la nuova password.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (e: any) {
      Alert.alert('Errore', e?.response?.data?.detail || 'Reset fallito');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            <Text style={styles.backText}>Indietro</Text>
          </TouchableOpacity>
          <Text style={styles.title}>PASSWORD{"\n"}DIMENTICATA?</Text>
          <Text style={styles.sub}>Ti invieremo un codice via email per reimpostarla.</Text>

          {step === 'email' ? (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                testID="forgot-email-input"
                value={email} onChangeText={setEmail} style={styles.input}
                autoCapitalize="none" keyboardType="email-address"
                placeholder="la-tua@email.com" placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity testID="send-code-btn" style={styles.button} onPress={sendCode} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>INVIA CODICE</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Codice ricevuto via email</Text>
              <TextInput
                testID="otp-input"
                value={code} onChangeText={setCode} style={[styles.input, styles.codeInput]}
                keyboardType="number-pad" maxLength={6}
                placeholder="123456" placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.label}>Nuova password (min 6 caratteri)</Text>
              <TextInput
                testID="new-password-input"
                value={password} onChangeText={setPassword} style={styles.input}
                secureTextEntry
                placeholder="********" placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.label}>Conferma password</Text>
              <TextInput
                testID="confirm-password-input"
                value={confirm} onChangeText={setConfirm} style={styles.input}
                secureTextEntry
                placeholder="********" placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity testID="reset-pwd-btn" style={styles.button} onPress={resetPwd} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>RESETTA PASSWORD</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('email')} style={{ marginTop: spacing.md }}>
                <Text style={styles.link}>Non hai ricevuto il codice? <Text style={{ color: colors.primary }}>Reinvia</Text></Text>
              </TouchableOpacity>
            </>
          )}

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={[styles.link, { marginTop: spacing.lg }]}>Torna al login</Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  backText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  title: { color: colors.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: spacing.sm },
  sub: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.lg },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: spacing.md, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface, color: colors.textPrimary,
    padding: spacing.md, borderRadius: radius.md, fontSize: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  codeInput: { fontSize: 24, fontWeight: '900', letterSpacing: 8, textAlign: 'center' },
  button: {
    backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.pill,
    alignItems: 'center', marginTop: spacing.lg, minHeight: 50, justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800', letterSpacing: 2 },
  link: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
});
