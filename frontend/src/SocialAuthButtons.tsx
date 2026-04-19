import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from './auth';
import { colors, spacing, radius } from './theme';
import { isSocialAuthAvailable } from './socialAuthConfig';
import { signInWithGoogle, signInWithApple, isAppleAuthAvailable } from './socialAuth';

type Props = {
  mode?: 'login' | 'register';
};

export function SocialAuthButtons({ mode = 'login' }: Props) {
  const router = useRouter();
  const { loginWithSocial } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  const afterLogin = (user: any) => {
    if (!user?.onboarding_completed) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const handleGoogle = async () => {
    if (loadingProvider) return;
    setLoadingProvider('google');
    try {
      const res = await signInWithGoogle();
      if (res) {
        await loginWithSocial(res);
        afterLogin(res.user);
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleApple = async () => {
    if (loadingProvider) return;
    setLoadingProvider('apple');
    try {
      const res = await signInWithApple();
      if (res) {
        await loginWithSocial(res);
        afterLogin(res.user);
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  // Hide whole block if no provider is available (web)
  if (!isSocialAuthAvailable) return null;

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OPPURE</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        testID="google-signin-btn"
        style={styles.googleBtn}
        onPress={handleGoogle}
        disabled={loadingProvider !== null}
        activeOpacity={0.8}
      >
        {loadingProvider === 'google' ? (
          <ActivityIndicator color="#000" />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#000" />
            <Text style={styles.googleBtnText}>
              {mode === 'register' ? 'Registrati con Google' : 'Continua con Google'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {Platform.OS === 'ios' && appleAvailable && (
        <TouchableOpacity
          testID="apple-signin-btn"
          style={styles.appleBtn}
          onPress={handleApple}
          disabled={loadingProvider !== null}
          activeOpacity={0.8}
        >
          {loadingProvider === 'apple' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={22} color="#fff" />
              <Text style={styles.appleBtnText}>
                {mode === 'register' ? 'Registrati con Apple' : 'Accedi con Apple'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md, gap: spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: '#fff', paddingVertical: spacing.md, borderRadius: radius.pill,
    minHeight: 50,
  },
  googleBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  appleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: '#000', paddingVertical: spacing.md, borderRadius: radius.pill,
    minHeight: 50, borderWidth: 1, borderColor: '#222',
  },
  appleBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
