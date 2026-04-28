/**
 * /premium è deprecato. Punta al paywall unificato (/paywall) che usa
 * RevenueCat su iOS/Android (conforme Apple guideline 3.1.1) e Stripe solo su web.
 *
 * Questa route viene mantenuta solo per compatibilità con vecchi link/notifiche.
 */
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../src/theme';

export default function PremiumRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect immediato al paywall unificato
    router.replace('/paywall');
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
