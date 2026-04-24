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

type TierKey = 'free' | 'starter' | 'performance' | 'elite';

const TIERS: {
  key: TierKey; name: string; tag: string; monthly: number; yearly: number;
  color: string; features: string[]; target: string;
}[] = [
  {
    key: 'free', name: 'Corri', tag: 'FREE', monthly: 0, yearly: 0,
    color: colors.textMuted, target: 'Runner occasionali',
    features: [
      'Tracking GPS illimitato',
      '10 corse nello storico',
      'Mappa percorso base',
      'Grafici base',
    ],
  },
  {
    key: 'starter', name: 'Allenati', tag: 'STARTER', monthly: 4.99, yearly: 39.99,
    color: '#10B981', target: 'Principianti & abituali',
    features: [
      'Tutto di Free +',
      'Storico illimitato',
      '3 programmi base (5K, 10K, Mezza)',
      'Sync cloud backup',
    ],
  },
  {
    key: 'performance', name: 'Competi', tag: 'PERFORMANCE', monthly: 9.99, yearly: 79.99,
    color: colors.primary, target: 'Runner seri',
    features: [
      'Tutto di Starter +',
      '13+ programmi avanzati',
      'AI Coach: piani personalizzati',
      'Zone cardio, pace target, intervalli',
      'VO2max, carico, recupero',
      'Analisi dislivello e cadenza',
      'Esportazione GPX/FIT/CSV',
    ],
  },
  {
    key: 'elite', name: 'Coach', tag: 'ELITE', monthly: 14.99, yearly: 129.99,
    color: '#F59E0B', target: 'Professionisti & coach',
    features: [
      'Tutto di Performance +',
      'Gestione fino a 10 atleti',
      'Dashboard coach',
      'Supporto chat 24h',
      'Accesso funzionalita\' beta',
    ],
  },
];

export default function Premium() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const [loading, setLoading] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');

  useEffect(() => {
    if (session_id) pollStatus(String(session_id));
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
        Alert.alert('Abbonamento attivato!', 'Benvenuto nel tuo nuovo piano.', [
          { text: 'Inizia', onPress: () => router.replace('/(tabs)/home') }
        ]);
        return;
      }
      if (data.status === 'expired') { setPolling(false); return; }
    } catch {}
    setTimeout(() => pollStatus(sid, attempts + 1), 2000);
  };

  const checkout = async (tierKey: TierKey) => {
    if (tierKey === 'free') return;
    // Product ID allineato ad App Store Connect + RevenueCat (reverse-DNS)
    const packageId = `com.runhub.app.sub.${tierKey}.${cycle}`;
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
        pollStatus(data.session_id);
      }
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      Alert.alert('Errore', typeof d === 'string' ? d : 'Checkout fallito');
    } finally { setLoading(null); }
  };

  const currentTier = (user?.tier || (user?.is_premium ? 'performance' : 'free')) as TierKey;
  const tierOrder: TierKey[] = ['free', 'starter', 'performance', 'elite'];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.h1}>SCEGLI IL TUO RITMO</Text>
        <Text style={styles.sub}>Piani progettati per ogni runner, dal principiante al coach pro</Text>

        <View style={styles.cycleToggle}>
          <TouchableOpacity
            testID="cycle-monthly"
            style={[styles.cycleBtn, cycle === 'monthly' && styles.cycleBtnActive]}
            onPress={() => setCycle('monthly')}
          >
            <Text style={[styles.cycleText, cycle === 'monthly' && styles.cycleTextActive]}>MENSILE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="cycle-yearly"
            style={[styles.cycleBtn, cycle === 'yearly' && styles.cycleBtnActive]}
            onPress={() => setCycle('yearly')}
          >
            <Text style={[styles.cycleText, cycle === 'yearly' && styles.cycleTextActive]}>ANNUALE</Text>
            <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>-33%</Text></View>
          </TouchableOpacity>
        </View>

        {TIERS.map((t) => {
          const isCurrent = t.key === currentTier;
          const currentIdx = tierOrder.indexOf(currentTier);
          const tierIdx = tierOrder.indexOf(t.key);
          const isLower = tierIdx < currentIdx;
          const price = cycle === 'monthly' ? t.monthly : t.yearly;
          const priceLabel = t.key === 'free' ? 'GRATIS' : `€${price.toFixed(2)}`;
          const priceSub = t.key === 'free' ? 'per sempre' : (cycle === 'monthly' ? '/mese' : '/anno');
          const pkgId = `${t.key}_${cycle}`;

          return (
            <View
              key={t.key}
              testID={`tier-card-${t.key}`}
              style={[styles.tierCard, { borderColor: t.color },
                t.key === 'performance' && styles.tierHighlight,
                isCurrent && styles.tierCurrent]}
            >
              <View style={[styles.tierTagRow, { backgroundColor: t.color }]}>
                <Text style={styles.tierTag}>{t.tag}</Text>
                {t.key === 'performance' ? <Text style={styles.mostPopular}>★ PIU\' POPOLARE</Text> : null}
                {isCurrent ? <Text style={styles.currentBadge}>✓ ATTIVO</Text> : null}
              </View>
              <View style={styles.tierHeader}>
                <Text style={styles.tierName}>{t.name}</Text>
                <Text style={styles.tierTarget}>{t.target}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceBig}>{priceLabel}</Text>
                  <Text style={styles.priceSub}>{priceSub}</Text>
                </View>
              </View>
              <View style={styles.featList}>
                {t.features.map((f, i) => (
                  <View key={i} style={styles.featRow}>
                    <Ionicons name="checkmark" size={18} color={t.color} />
                    <Text style={styles.featText}>{f}</Text>
                  </View>
                ))}
              </View>
              {t.key !== 'free' ? (
                <TouchableOpacity
                  testID={`subscribe-${t.key}`}
                  style={[styles.ctaBtn, { backgroundColor: t.color }, (isCurrent || isLower) && { opacity: 0.4 }]}
                  disabled={isCurrent || isLower || loading === pkgId}
                  onPress={() => checkout(t.key)}
                >
                  {loading === pkgId ? <ActivityIndicator color="#fff" /> : (
                    <Text style={styles.ctaBtnText}>
                      {isCurrent ? 'PIANO ATTUALE' : isLower ? 'GIA\' ATTIVO' : 'SOTTOSCRIVI'}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={[styles.ctaBtn, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.ctaBtnText, { color: colors.textSecondary }]}>
                    {isCurrent ? 'PIANO ATTUALE' : 'DOWNGRADE AL FREE'}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: { alignItems: 'flex-end', marginBottom: spacing.md },
  h1: { color: colors.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: -1, textAlign: 'center' },
  sub: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.md },
  cycleToggle: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill,
    padding: 4, marginTop: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  cycleBtn: { flex: 1, padding: spacing.sm, borderRadius: radius.pill, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  cycleBtnActive: { backgroundColor: colors.surfaceSecondary },
  cycleText: { color: colors.textSecondary, fontWeight: '800', letterSpacing: 1, fontSize: 12 },
  cycleTextActive: { color: colors.textPrimary },
  saveBadge: { backgroundColor: colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  saveBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  tierCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 2,
    marginBottom: spacing.lg, overflow: 'hidden',
  },
  tierHighlight: { borderWidth: 3 },
  tierCurrent: { },
  tierTagRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: 6, alignItems: 'center', gap: spacing.sm },
  tierTag: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 2, flex: 1 },
  mostPopular: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  currentBadge: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  tierHeader: { padding: spacing.lg, paddingBottom: spacing.md },
  tierName: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  tierTarget: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.md },
  priceBig: { color: colors.textPrimary, fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  priceSub: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  featList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featText: { color: colors.textPrimary, flex: 1, fontSize: 13 },
  ctaBtn: {
    margin: spacing.lg, marginTop: spacing.sm, padding: spacing.md,
    borderRadius: radius.pill, alignItems: 'center',
  },
  ctaBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 14 },
  pollingBox: { alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm },
  pollingText: { color: colors.textSecondary },
});
