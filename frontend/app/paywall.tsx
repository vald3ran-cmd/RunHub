import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';
import { api } from '../src/api';
import {
  fetchOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatConfigured,
} from '../src/revenuecat';
import { useAuth } from '../src/auth';

type Period = 'monthly' | 'yearly';
type TierKey = 'starter' | 'performance' | 'elite';

interface TierDef {
  key: TierKey;
  name: string;
  tagline: string;
  color: string;
  popular?: boolean;
  features: string[];
  monthlyProductId: string;
  yearlyProductId: string;
  monthlyPrice: number;
  yearlyPrice: number;
}

const TIERS: TierDef[] = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'Allenati',
    color: '#3B82F6',
    features: [
      'Piani allenamento base',
      'Tracciamento GPS',
      'Storia allenamenti illimitata',
      'Senza pubblicità',
    ],
    monthlyProductId: 'com.runhub.app.sub.starter.monthly',
    yearlyProductId: 'com.runhub.app.sub.starter.yearly',
    monthlyPrice: 4.99,
    yearlyPrice: 39.99,
  },
  {
    key: 'performance',
    name: 'Performance',
    tagline: 'Competi',
    color: '#FF3B30',
    popular: true,
    features: [
      'Tutto di Starter',
      'AI Coach personalizzato (Claude 4.5)',
      'Heatmap percorsi avanzata',
      'Predizione tempi gara',
      'Obiettivi intelligenti',
    ],
    monthlyProductId: 'com.runhub.app.sub.performance.monthly',
    yearlyProductId: 'com.runhub.app.sub.performance.yearly',
    monthlyPrice: 9.99,
    yearlyPrice: 79.99,
  },
  {
    key: 'elite',
    name: 'Elite',
    tagline: 'Domina',
    color: '#F59E0B',
    features: [
      'Tutto di Performance',
      'Coach umano dedicato',
      'Apple Health / Google Fit sync',
      'Analytics avanzate',
      'Supporto prioritario',
      'Piani esclusivi',
    ],
    monthlyProductId: 'com.runhub.app.sub.elite.monthly',
    yearlyProductId: 'com.runhub.app.sub.elite.yearly',
    monthlyPrice: 14.99,
    yearlyPrice: 129.99,
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [period, setPeriod] = useState<Period>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);

  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const rcReady = isRevenueCatConfigured();

  useEffect(() => {
    if (rcReady) {
      fetchOfferings().then(setOfferings).catch(() => {});
    }
  }, [rcReady]);

  const getPackageForTier = useCallback(
    (tier: TierDef) => {
      if (!offerings?.availablePackages) return null;
      const targetId = period === 'monthly' ? tier.monthlyProductId : tier.yearlyProductId;
      return offerings.availablePackages.find(
        (p: any) => p.identifier === targetId || p.product?.identifier === targetId
      );
    },
    [offerings, period]
  );

  const handleSubscribe = async (tier: TierDef) => {
    setLoading(tier.key);
    try {
      // Preferenza: RevenueCat su iOS/Android nativi con key configurata
      if (isNative && rcReady) {
        const pkg = getPackageForTier(tier);
        if (!pkg) {
          Alert.alert(
            'Prodotto non disponibile',
            'Questo piano non è al momento disponibile. Riprova più tardi.'
          );
          return;
        }
        const result = await purchasePackage(pkg);
        if (result.success) {
          await refresh();
          Alert.alert('🎉 Abbonamento attivo!', `Benvenuto nel piano ${tier.name}.`);
          router.back();
        } else if (result.error !== 'cancelled') {
          Alert.alert('Errore', result.error || 'Acquisto fallito');
        }
        return;
      }

      // Fallback: Stripe Checkout (web o native senza RC)
      const pkgId = period === 'monthly' ? tier.monthlyProductId : tier.yearlyProductId;
      const res = await api.post('/stripe/checkout', { package_id: pkgId });
      const url = res.data?.url;
      if (url) {
        if (Platform.OS === 'web') {
          window.location.href = url;
        } else {
          const supported = await Linking.canOpenURL(url);
          if (supported) {
            await Linking.openURL(url);
          } else {
            Alert.alert('Errore', 'Impossibile aprire il link di pagamento');
          }
        }
      } else {
        Alert.alert('Errore', 'URL di checkout non ricevuto');
      }
    } catch (err: any) {
      Alert.alert('Errore', err?.response?.data?.detail || err?.message || 'Qualcosa è andato storto');
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    if (!rcReady || !isNative) {
      Alert.alert('Non disponibile', 'Ripristino acquisti disponibile solo su iOS/Android nativi.');
      return;
    }
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (info) {
        await refresh();
        Alert.alert('✅ Ripristinati', 'I tuoi acquisti sono stati sincronizzati.');
      }
    } catch (err: any) {
      Alert.alert('Errore', err?.message || 'Errore ripristino');
    } finally {
      setRestoring(false);
    }
  };

  const currentTier = (user?.tier || 'free') as TierKey | 'free';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scegli il tuo piano</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Sblocca tutto il potenziale di RunHub{'\n'}Annulla in qualsiasi momento
        </Text>

        {/* Toggle Mensile / Annuale */}
        <View style={styles.periodToggle}>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'monthly' && styles.periodBtnActive]}
            onPress={() => setPeriod('monthly')}
          >
            <Text style={[styles.periodBtnText, period === 'monthly' && styles.periodBtnTextActive]}>
              Mensile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'yearly' && styles.periodBtnActive]}
            onPress={() => setPeriod('yearly')}
          >
            <Text style={[styles.periodBtnText, period === 'yearly' && styles.periodBtnTextActive]}>
              Annuale
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>-30%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Cards tier */}
        {TIERS.map((tier) => {
          const fallbackPrice = period === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
          const pkg = getPackageForTier(tier);
          // Prezzo localizzato da RevenueCat (es. "4,99 €", "$4.99", "£3.99")
          // Fallback al prezzo hardcoded (€) se l'offering non è ancora caricata.
          const priceDisplay = pkg?.product?.priceString || `€${fallbackPrice.toFixed(2)}`;
          const priceNumeric = pkg?.product?.price ?? fallbackPrice;
          const pricePerMonth = period === 'yearly' ? (priceNumeric / 12).toFixed(2) : null;
          const currencySymbol = pkg?.product?.currencyCode
            ? (priceDisplay.match(/^[^\d\s]+|[^\d\s,.]+$/)?.[0] || '€')
            : '€';
          const isCurrent = currentTier === tier.key;
          const isLoadingThis = loading === tier.key;

          return (
            <View
              key={tier.key}
              style={[styles.card, tier.popular && styles.cardPopular, { borderColor: tier.color }]}
            >
              {tier.popular && (
                <View style={[styles.popularBadge, { backgroundColor: tier.color }]}>
                  <Text style={styles.popularBadgeText}>⭐ PIÙ SCELTO</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
                  <Text style={styles.tierTagline}>{tier.tagline}</Text>
                </View>
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>ATTUALE</Text>
                  </View>
                )}
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>{priceDisplay}</Text>
                <Text style={styles.priceUnit}>/{period === 'monthly' ? 'mese' : 'anno'}</Text>
              </View>
              {pricePerMonth && (
                <Text style={styles.pricePerMonth}>≈ {currencySymbol}{pricePerMonth}/mese</Text>
              )}

              <View style={styles.features}>
                {tier.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color={tier.color} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.cta,
                  { backgroundColor: tier.color },
                  isCurrent && styles.ctaDisabled,
                ]}
                onPress={() => !isCurrent && handleSubscribe(tier)}
                disabled={isCurrent || isLoadingThis}
                testID={`paywall-cta-${tier.key}`}
              >
                {isLoadingThis ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>
                    {isCurrent ? 'Piano attivo' : `Abbonati a ${tier.name}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Restore purchases (obbligatorio iOS App Store) */}
        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
          {restoring ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.restoreText}>
              <Ionicons name="refresh" size={14} color={colors.primary} /> Ripristina acquisti
            </Text>
          )}
        </TouchableOpacity>

        {/* Legal footer */}
        <Text style={styles.legal}>
          Gli abbonamenti si rinnovano automaticamente. Puoi annullare in qualsiasi momento dalle
          impostazioni del tuo account.
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.legalLink}>Termini</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>•</Text>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.legalLink}>Privacy</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },

  periodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  periodBtnActive: { backgroundColor: colors.primary },
  periodBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  periodBtnTextActive: { color: '#fff' },
  saveBadge: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  saveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
  },
  cardPopular: {
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  popularBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  tierName: { fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  tierTagline: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 2 },
  currentBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  currentBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  price: { color: colors.textPrimary, fontSize: 36, fontWeight: '900' },
  priceUnit: { color: colors.textSecondary, fontSize: 15, marginLeft: 4 },
  pricePerMonth: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  features: { marginTop: spacing.md, marginBottom: spacing.md, gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { color: colors.textPrimary, fontSize: 14, flex: 1 },

  cta: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  restoreBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  restoreText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  legal: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
    paddingHorizontal: spacing.md,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 8,
  },
  legalLink: { color: colors.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
  legalDot: { color: colors.textMuted, fontSize: 12 },
});
