import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../src/auth';
import { colors } from '../src/theme';
import { initializeAdMob } from '../src/adMobReal';
import { isAdMobAvailable } from '../src/adMobConfig';
import { initConsentFlow } from '../src/ConsentManager';
import { initNotifications, registerForPushNotifications } from '../src/notifications';
import { initRevenueCat, identifyRevenueCatUser, logoutRevenueCat } from '../src/revenuecat';
import { initCrashReporting, setUser as setCrashUser, setAttribute as setCrashAttribute, addBreadcrumb } from '../src/crashReporting';
import { loadStoredLocale } from '../src/i18n';
import { ReferralModal } from '../src/ReferralModal';
import { redeemReferral } from '../src/referral';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';

// 🔍 DIAGNOSTICA — RIMUOVERE DOPO IL FIX
console.log('🏁 [LAYOUT] _layout.tsx caricato');

function RootNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize Crash Reporting (Firebase Crashlytics) — deve essere il PRIMO useEffect per catturare crash di startup
  useEffect(() => {
    initCrashReporting().catch(() => {});
    // Init i18n (loads stored locale or detects device locale)
    loadStoredLocale().catch(() => {});
  }, []);

  // Deep link handler — runhub://r/CODE and https://apprunhub.com/r/CODE
  // If user is logged in and has not used a code yet, redeem it automatically.
  // If logged out, store the code for use at register-time.
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        // Match /r/CODE or runhub://r/CODE
        const pathParts = (parsed.path || '').split('/').filter(Boolean);
        let code: string | null = null;
        if (pathParts[0] === 'r' && pathParts[1]) {
          code = pathParts[1].toUpperCase();
        } else if ((parsed.queryParams as any)?.code) {
          code = String((parsed.queryParams as any).code).toUpperCase();
        }
        if (!code) return;
        // Save the pending code for use at register
        await AsyncStorage.setItem('runhub.pendingReferralCode', code);
        // If user already logged in (and no referrer yet), redeem now
        if (user && !user.referred_by_user_id && !user.referral_rewarded) {
          try {
            await redeemReferral(code);
          } catch {}
        }
      } catch {}
    };
    // Cold start
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    // While running
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => { try { (sub as any)?.remove?.(); } catch {} };
  }, [user?.user_id]);

  // ─────────────────────────────────────────────────────────────
  // PRIVACY CONSENT FLOW — sequenziale, ordine corretto:
  //   1) UMP / GDPR Consent Form (se utente EEA)
  //   2) App Tracking Transparency (ATT, iOS)
  //   3) Inizializzazione AdMob SDK (solo se UMP autorizza)
  //
  // ORDINE FONDAMENTALE per Apple Review Guideline 5.1.1(iv):
  // se ATT viene mostrato PRIMA del prompt GDPR e l'utente sceglie
  // "Ask App Not to Track", il prompt GDPR successivo sembra
  // re-chiedere il tracking → rejection.
  // Mostrando GDPR PRIMA di ATT, Apple non flagga (loro stessi lo dicono).
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // 1) UMP/GDPR Consent (se utente EEA/UK)
      let snapshot: any = null;
      if (isAdMobAvailable) {
        try {
          snapshot = await initConsentFlow(
            __DEV__ ? { debugAsEea: true } : undefined,
          );
          console.log('[CONSENT] UMP snapshot:', snapshot?.status, 'canRequestAds=', snapshot?.canRequestAds);
        } catch (e) {
          console.warn('[CONSENT] UMP flow error:', e);
        }
      }

      // 2) iOS App Tracking Transparency — DOPO UMP, una sola volta
      if (Platform.OS === 'ios') {
        try {
          // piccolo delay per dare tempo al precedente sheet UMP di chiudersi
          await new Promise((r) => setTimeout(r, 400));
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const tt = require('expo-tracking-transparency');
          if (typeof tt.requestTrackingPermissionsAsync === 'function') {
            await tt.requestTrackingPermissionsAsync();
          }
        } catch (e) {
          console.warn('[ATT] permission request failed:', e);
        }
      }

      // 3) AdMob SDK init - solo se UMP autorizza (o nessun UMP richiesto)
      if (isAdMobAvailable) {
        try {
          if (!snapshot || snapshot.canRequestAds) {
            await initializeAdMob();
          } else {
            console.log('[CONSENT] Ads non autorizzati - utente ha rifiutato consenso');
          }
        } catch (e) {
          console.warn('[ADMOB] init error, fallback:', e);
          initializeAdMob().catch(() => {});
        }
      }
    })();
  }, []);

  // Initialize notifications handler
  useEffect(() => {
    initNotifications().catch(() => {});
  }, []);

  // Initialize RevenueCat SDK (no-op on web)
  useEffect(() => {
    // 🔍 DIAGNOSTICA — RIMUOVERE DOPO IL FIX
    console.log('🏁 [LAYOUT] useEffect initRevenueCat triggered');
    initRevenueCat()
      .then(() => {
        console.log('✅ [LAYOUT] initRevenueCat resolved');
      })
      .catch((err) => {
        console.error('❌ [LAYOUT] initRevenueCat fallita:', err);
        try {
          console.error('❌ [LAYOUT] Errore stringified:', JSON.stringify(err));
        } catch {}
      });
  }, []);

  // Register for push notifications AFTER user logs in
  useEffect(() => {
    if (user?.user_id) {
      registerForPushNotifications().catch(() => {});
    }
  }, [user?.user_id]);

  // Identify user in RevenueCat after login / logout
  useEffect(() => {
    // 🔍 DIAGNOSTICA — RIMUOVERE DOPO IL FIX
    console.log('🏁 [LAYOUT] useEffect identify, user_id:', user?.user_id || 'NESSUNO');
    if (user?.user_id) {
      // Associa l'user_id ai crash report (NON usare email per GDPR)
      setCrashUser(user.user_id).catch(() => {});
      setCrashAttribute('tier', user.tier || 'free').catch(() => {});
      addBreadcrumb(`User logged in · tier=${user.tier || 'free'}`, 'auth');
      identifyRevenueCatUser(user.user_id)
        .then(() => console.log('✅ [LAYOUT] identifyRevenueCatUser resolved'))
        .catch((err) => {
          console.error('❌ [LAYOUT] identifyRevenueCatUser fallita:', err);
          try {
            console.error('❌ [LAYOUT] Errore stringified:', JSON.stringify(err));
          } catch {}
        });
    } else {
      setCrashUser(null).catch(() => {});
      addBreadcrumb('User logged out', 'auth');
      logoutRevenueCat()
        .then(() => console.log('✅ [LAYOUT] logoutRevenueCat resolved'))
        .catch((err) => {
          console.error('❌ [LAYOUT] logoutRevenueCat fallita:', err);
        });
    }
  }, [user?.user_id]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inCompleteProfile = String(segments[1] || '') === 'complete-profile';
    // Public routes accessible without auth (legal documents must be readable pre-signup)
    const PUBLIC_ROUTES = ['terms', 'privacy'];
    const isPublic = PUBLIC_ROUTES.includes(String(segments[0] || ''));
    if (!user && !inAuth && !isPublic) {
      router.replace('/(auth)/login');
    } else if (user && user.needs_profile_completion && !inCompleteProfile && !isPublic) {
      // Utenti OAuth (Google/Apple) senza DOB/consenso: forza completamento profilo (GDPR + Apple guidelines)
      router.replace('/(auth)/complete-profile');
    } else if (user && !user.needs_profile_completion && !user.onboarding_completed && !inOnboarding && !inAuth && !isPublic) {
      // Force new users to go through onboarding
      router.replace('/onboarding');
    } else if (user && !user.needs_profile_completion && inAuth) {
      // Auth completata (anche appena terminato /complete-profile) → onboarding o home
      if (!user.onboarding_completed) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plan/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="workout/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="run-active" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
        <Stack.Screen name="ai-generate" options={{ presentation: 'modal' }} />
        <Stack.Screen name="race-predictor" options={{ presentation: 'modal' }} />
        <Stack.Screen name="coach" options={{ presentation: 'card' }} />
        <Stack.Screen name="gps-test" options={{ presentation: 'card' }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'card', gestureEnabled: false }} />
        <Stack.Screen name="badges" options={{ presentation: 'card' }} />
        <Stack.Screen name="admin" options={{ presentation: 'card' }} />
        <Stack.Screen name="social" options={{ presentation: 'card' }} />
        <Stack.Screen name="heatmap" options={{ presentation: 'card' }} />
        <Stack.Screen name="wearables" options={{ presentation: 'card' }} />
        <Stack.Screen name="terms" options={{ presentation: 'card' }} />
        <Stack.Screen name="privacy" options={{ presentation: 'card' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="account" options={{ presentation: 'card' }} />
        <Stack.Screen name="referral" options={{ presentation: 'card' }} />
      </Stack>
      {/* Modale post-onboarding: si mostra una sola volta, solo a utenti loggati e che hanno completato l'onboarding */}
      {user && user.onboarding_completed && !user.needs_profile_completion ? <ReferralModal /> : null}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  // Render dell'app anche se font non pronti (fallback al system font, evita schermo bianco infinito)
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
