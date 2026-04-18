import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, ActivityIndicator, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { useAuth } from '../src/auth';
import { colors, spacing, radius } from '../src/theme';

const FEATURES = [
  'Piani personalizzati generati da AI',
  'Ginnastica da camera + stretching avanzato',
  'Programmi avanzati per mezza e maratona',
  'Traguardi e insight personalizzati',
  'Supporto prioritario',
];

export default function Premium() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const [loading, setLoading] = useState<null | 'monthly' | 'yearly'>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (session_id) { pollStatus(String(session_id)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session_id]);

  const pollStatus = async (sid: string, attempts = 0) => {
    if (attempts >= 8) { setPolling(false); return; }
    setPolling(true);
    try {
      const { data } = await api.get(`/stripe/status/${sid}`);
      if (data.payment_status === 'paid') {
        await refresh();
        setPolling(false);
        Alert.alert('Benvenuto Premium!', 'Ora puoi generare piani con AI.', [
          { text: 'Inizia', onPress: () => router.replace('/(tabs)/home') }
        ]);
        return;
      }
      if (data.status === 'expired') { setPolling(false); return; }
    } catch {}
    setTimeout(() => pollStatus(sid, attempts + 1), 2000);
  };

  const checkout = async (packageId: 'monthly' | 'yearly') => {
    setLoading(packageId);
    try {
      const origin = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.EXPO_PUBLIC_BACKEND_URL || '');
      const { data } = await api.post('/stripe/checkout', {
        package_id: packageId,
        origin_url: `${origin}/premium`,
      });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = data.url;
      } else {
        await Linking.openURL(data.url);
        // begin polling
        pollStatus(data.session_id);
      }
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      Alert.alert('Errore', typeof d === 'string' ? d : 'Checkout fallito');
    } finally { setLoading(null); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.star}>
          <Ionicons name="star" size={40} color="#fff" />
        </View>
        <Text style={styles.title}>PREMIUM</Text>
        <Text style={styles.sub}>Sblocca tutto il potenziale di RunHub</Text>

        {user?.is_premium ? (
          <View style={styles.activeBox}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.activeText}>Sei gia' Premium</Text>
          </View>
        ) : null}

        <View style={styles.featuresCard}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featRow}>
              <Ionicons name="checkmark" size={20} color={colors.primary} />
              <Text style={styles.featText}>{f}</Text>
            </View>
          ))}
        </View>

        <PlanCard
          testID="plan-yearly"
          label="ANNUALE · RISPARMI 33%"
          price="€79.99"
          sub="/anno · €6.67/mese"
          highlight
          onPress={() => checkout('yearly')}
          loading={loading === 'yearly'}
          disabled={!!user?.is_premium}
        />
        <PlanCard
          testID="plan-monthly"
          label="MENSILE"
          price="€9.99"
          sub="/mese · annulla quando vuoi"
          onPress={() => checkout('monthly')}
          loading={loading === 'monthly'}
          disabled={!!user?.is_premium}
        />

        {polling ? (
          <View style={styles.pollingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.pollingText}>Verifico pagamento...</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({ label, price, sub, highlight, onPress, loading, disabled, testID }: any) {
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.planCard, highlight && styles.planCardHighlight, disabled && { opacity: 0.5 }]}
      onPress={onPress} disabled={disabled || loading}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.planLabel, highlight && { color: '#fff' }]}>{label}</Text>
        <Text style={[styles.planPrice, highlight && { color: '#fff' }]}>{price}<Text style={styles.planSub}>{sub}</Text></Text>
      </View>
      {loading ? <ActivityIndicator color={highlight ? '#fff' : colors.primary} /> :
        <Ionicons name="chevron-forward" size={24} color={highlight ? '#fff' : colors.textPrimary} />
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: { alignItems: 'flex-end' },
  star: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  title: { color: colors.textPrimary, fontSize: 40, fontWeight: '900', textAlign: 'center', marginTop: spacing.md, letterSpacing: -1 },
  sub: { color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  featuresCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.xl, gap: spacing.md },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featText: { color: colors.textPrimary, flex: 1, fontSize: 14 },
  planCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  planCardHighlight: { backgroundColor: colors.primary, borderColor: colors.primary },
  planLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  planPrice: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', marginTop: 4 },
  planSub: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  activeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md },
  activeText: { color: colors.success, fontWeight: '800', letterSpacing: 1 },
  pollingBox: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  pollingText: { color: colors.textSecondary },
});
