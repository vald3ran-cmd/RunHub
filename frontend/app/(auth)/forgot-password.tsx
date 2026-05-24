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
import { useT } from '../../src/i18n';

export default function ForgotPassword() {
  const router = useRouter();
  const { t } = useT();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!email.trim()) { Alert.alert(t('common.attention'), t('auth.enter_email')); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      Alert.alert(t('auth.code_sent_title'), t('auth.code_sent_msg'));
      setStep('reset');
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.detail || t('auth.cant_send_code'));
    } finally { setLoading(false); }
  };

  const resetPwd = async () => {
    if (code.length < 4) { Alert.alert(t('common.attention'), t('auth.code_too_short')); return; }
    if (password.length < 6) { Alert.alert(t('common.attention'), t('auth.password_too_short')); return; }
    if (password !== confirm) { Alert.alert(t('common.attention'), t('auth.passwords_dont_match')); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        new_password: password,
      });
      Alert.alert(t('common.done'), t('auth.password_updated'), [
        { text: t('common.ok'), onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.detail || t('auth.reset_failed'));
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('auth.forgot_title_block')}</Text>
          <Text style={styles.sub}>{t('auth.forgot_subtitle_long')}</Text>

          {step === 'email' ? (
            <>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                testID="forgot-email-input"
                value={email} onChangeText={setEmail} style={styles.input}
                autoCapitalize="none" keyboardType="email-address"
                placeholder={t('auth.email_placeholder')} placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity testID="send-code-btn" style={styles.button} onPress={sendCode} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.send_code')}</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>{t('auth.code_label')}</Text>
              <TextInput
                testID="otp-input"
                value={code} onChangeText={setCode} style={[styles.input, styles.codeInput]}
                keyboardType="number-pad" maxLength={6}
                placeholder="123456" placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.label}>{t('auth.new_password_label')}</Text>
              <TextInput
                testID="new-password-input"
                value={password} onChangeText={setPassword} style={styles.input}
                secureTextEntry
                placeholder="********" placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.label}>{t('auth.confirm_password_label')}</Text>
              <TextInput
                testID="confirm-password-input"
                value={confirm} onChangeText={setConfirm} style={styles.input}
                secureTextEntry
                placeholder="********" placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity testID="reset-pwd-btn" style={styles.button} onPress={resetPwd} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.reset_cta')}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('email')} style={{ marginTop: spacing.md }}>
                <Text style={styles.link}>{t('auth.didnt_receive_code')} <Text style={{ color: colors.primary }}>{t('auth.resend')}</Text></Text>
              </TouchableOpacity>
            </>
          )}

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={[styles.link, { marginTop: spacing.lg }]}>{t('auth.back_to_login')}</Text>
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
