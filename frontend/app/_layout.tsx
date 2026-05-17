import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth';
import { colors } from '../src/theme';
import { initializeAdMob } from '../src/adMobReal';
import { isAdMobAvailable } from '../src/adMobConfig';
import { initConsentFlow } from '../src/ConsentManager';
import { initNotifications, registerForPushNotifications } from '../src/notifications';
import { initRevenueCat, identifyRevenueCatUser, logoutRevenueCat } from '../src/revenuecat';
import { initCrashReporting, setUser as setCrashUser, setAttribute as setCrashAttribute, addBreadcrumb } from '../src/crashReporting';

// 🔍 DIAGNOSTICA — RIMUOVERE DOPO IL FIX
console.log('🏁 [LAYOUT] _layout.tsx caricato');

function RootNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize Crash Reporting (Firebase Crashlytics) — deve essere il PRIMO useEffect per catturare crash di startup
  useEffect(() => {
    initCrashReporting().catch(() => {});
  }, []);

  // iOS App Tracking Transparency - MUST be requested at boot, regardless of AdMob status.
  // Apple Review (Guideline 2.1) flagged us when this prompt did not appear.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    (async () => {
      try {
        // Tiny delay to ensure UI is mounted before showing native prompt
        await new Promise((r) => setTimeout(r, 800));
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const tt = require('expo-tracking-transparency');
        if (typeof tt.requestTrackingPermissionsAsync === 'function') {
          await tt.requestTrackingPermissionsAsync();
        }
      } catch (e) {
        console.warn('[ATT] permission request failed:', e);
      }
    })();
  }, []);

  // Initialize UMP Consent Flow + AdMob (GDPR-compliant)
  // 1) Mostra form di consenso GDPR (UMP) → 2) Solo se canRequestAds=true → inizializza Mobile Ads SDK
  // Senza UMP, in EU il fill rate AdMob crolla al ~7%.
  useEffect(() => {
    if (!isAdMobAvailable) return;
    (async () => {
      try {
        // 1) Gather consent (mostra il form solo se utente EEA/UK e necessario)
        const snapshot = await initConsentFlow(
          __DEV__
            ? { debugAsEea: true } // Forza geografia EEA in dev/TestFlight per testare flow
            : undefined,
        );
        console.log('[CONSENT] snapshot:', snapshot.status, 'canRequestAds=', snapshot.canRequestAds);

        // 2) Inizializza Mobile Ads SDK SOLO se UMP dice ok
        if (snapshot.canRequestAds) {
          await initializeAdMob();
        } else {
          console.log('[CONSENT] Ads non autorizzati - utente ha rifiutato o consenso non ancora completato');
        }
      } catch (e) {
        console.warn('[CONSENT] flow error, fallback init AdMob:', e);
        // Fallback: meglio inizializzare per non perdere monetizzazione fuori EU
        initializeAdMob().catch(() => {});
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
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
