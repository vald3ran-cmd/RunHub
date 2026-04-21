import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth';
import { colors } from '../src/theme';
import { initializeAdMob } from '../src/adMobReal';
import { isAdMobAvailable } from '../src/adMobConfig';
import { initNotifications, registerForPushNotifications } from '../src/notifications';
import { initRevenueCat, identifyRevenueCatUser, logoutRevenueCat } from '../src/revenuecat';

function RootNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize AdMob (only on native dev/prod builds, skipped in Expo Go)
  useEffect(() => {
    if (isAdMobAvailable) {
      initializeAdMob().catch(() => {});
    }
  }, []);

  // Initialize notifications handler
  useEffect(() => {
    initNotifications().catch(() => {});
  }, []);

  // Initialize RevenueCat SDK (no-op on web)
  useEffect(() => {
    initRevenueCat().catch(() => {});
  }, []);

  // Register for push notifications AFTER user logs in
  useEffect(() => {
    if (user?.user_id) {
      registerForPushNotifications().catch(() => {});
    }
  }, [user?.user_id]);

  // Identify user in RevenueCat after login / logout
  useEffect(() => {
    if (user?.user_id) {
      identifyRevenueCatUser(user.user_id).catch(() => {});
    } else {
      logoutRevenueCat().catch(() => {});
    }
  }, [user?.user_id]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    // Public routes accessible without auth (legal documents must be readable pre-signup)
    const PUBLIC_ROUTES = ['terms', 'privacy'];
    const isPublic = PUBLIC_ROUTES.includes(String(segments[0] || ''));
    if (!user && !inAuth && !isPublic) {
      router.replace('/(auth)/login');
    } else if (user && !user.onboarding_completed && !inOnboarding && !inAuth && !isPublic) {
      // Force new users to go through onboarding
      router.replace('/onboarding');
    } else if (user && inAuth) {
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
