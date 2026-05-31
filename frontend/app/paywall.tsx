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
  rcDiagnostic,
} from '../src/revenuecat';
import { useAuth } from '../src/auth';
import { useT } from '../src/i18n';

type Period = 'monthly' | 'yearly';
type TierKey = 'starter' | 'performance' | 'elite';

interface TierDef {
  key: TierKey;
  name: string;
  taglineKey: string;
  color: string;
  popular?: boolean;
  featuresKeys: string[];
  monthlyProductId: string;
  yearlyProductId: string;
  monthlyPrice: number;
  yearlyPrice: number;
}

const TIERS: TierDef[] = [
  {
    key: 'starter',
    name: 'Starter',
    taglineKey: 'paywall.tier_starter_tagline',
    color: '#3B82F6',
    featuresKeys: ['paywall.starter_f1', 'paywall.starter_f2', 'paywall.starter_f3', 'paywall.starter_f4'],
    monthlyProductId: 'com.runhub.app.sub.starter.monthly',
    yearlyProductId: 'com.runhub.app.sub.starter.yearly',
    monthlyPrice: 4.99,
    yearlyPrice: 39.99,
  },
  {
    key: 'performance',
    name: 'Performance',
    taglineKey: 'paywall.tier_performance_tagline',
    color: '#FF3B30',
    popular: true,
    featuresKeys: ['paywall.perf_f1', 'paywall.perf_f2', 'paywall.perf_f3', 'paywall.perf_f4', 'paywall.perf_f5'],
    monthlyProductId: 'com.runhub.app.sub.performance.monthly.v2',
    yearlyProductId: 'com.runhub.app.sub.performance.yearly',
    monthlyPrice: 9.99,
    yearlyPrice: 79.99,
  },
  {
    key: 'elite',
    name: 'Elite',
    taglineKey: 'paywall.tier_elite_tagline',
    color: '#F59E0B',
    featuresKeys: ['paywall.elite_f1', 'paywall.elite_f2', 'paywall.elite_f3', 'paywall.elite_f4', 'paywall.elite_f5', 'paywall.elite_f6'],
    monthlyProductId: 'com.runhub.app.sub.elite.monthly',
    yearlyProductId: 'com.runhub.app.sub.elite.yearly',
    monthlyPrice: 14.99,
    yearlyPrice: 129.99,
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { t } = useT();
  const [period, setPeriod] = useState<Period>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);

  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const rcReady = isRevenueCatConfigured();

  useEffect(() => {
    if (!rcReady) return;
    let cancelled = false;

    const loadOfferings = async (attempt = 0) => {
      try {
        const o = await fetchOfferings();
        if (cancelled) return;
        if (o?.availablePackages?.length) {
          setOfferings(o);
          console.log('[Paywall] offerings loaded:', o.availablePackages.map((p: any) => p.product?.identifier).join(', '));
          return;
        }
        // retry con backoff fino a 3 tentativi: il sandbox Apple a volte
        // impiega qualche secondo a rispondere con i prodotti.
        if (attempt < 2) {
          console.log(`[Paywall] offerings vuote, retry in ${(attempt + 1) * 1500}ms...`);
          setTimeout(() => !cancelled && loadOfferings(attempt + 1), (attempt + 1) * 1500);
        } else {
          console.warn('[Paywall] offerings ancora vuote dopo 3 tentativi');
          setOfferings(o);
        }
      } catch (err) {
        console.error('[Paywall] fetchOfferings error:', err);
        if (attempt < 2 && !cancelled) {
          setTimeout(() => loadOfferings(attempt + 1), (attempt + 1) * 1500);
        }
      }
    };

    loadOfferings();
    return () => {
      cancelled = true;
    };
  }, [rcReady]);

  /**
   * Matching permissivo per il sandbox Apple: il reviewer a volte riceve
   * product identifier leggermente diversi (suffissi, case, bundle-id prefix
   * mancante). Proviamo nell'ordine:
   *   1. match esatto su package.identifier (es. "$rc_monthly")
   *   2. match esatto su product.identifier
   *   3. includes (suffix o prefix)
   *   4. match sul tier.key dentro l'identifier (es. "starter", "elite")
   *      + periodo corretto (monthly/yearly)
   */
  const findPackage = (
    availablePackages: any[],
    tier: TierDef,
    p: Period
  ) => {
    if (!availablePackages?.length) return null;
    const targetId = p === 'monthly' ? tier.monthlyProductId : tier.yearlyProductId;
    const targetIdLower = targetId.toLowerCase();

    // 1. match esatto
    let pkg = availablePackages.find(
      (x: any) => x.identifier === targetId || x.product?.identifier === targetId
    );
    if (pkg) return pkg;

    // 2. case-insensitive
    pkg = availablePackages.find(
      (x: any) =>
        x.identifier?.toLowerCase() === targetIdLower ||
        x.product?.identifier?.toLowerCase() === targetIdLower
    );
    if (pkg) return pkg;

    // 3. includes (utile se sandbox aggiunge suffissi tipo ".1" o cambia prefix)
    pkg = availablePackages.find(
      (x: any) =>
        x.product?.identifier?.toLowerCase().includes(targetIdLower) ||
        targetIdLower.includes(x.product?.identifier?.toLowerCase() || '___')
    );
    if (pkg) return pkg;

    // 4. match euristico: tier + periodo nel productId
    const periodKey = p === 'monthly' ? 'month' : 'year';
    pkg = availablePackages.find((x: any) => {
      const id = (x.product?.identifier || '').toLowerCase();
      return id.includes(tier.key) && id.includes(periodKey);
    });
    return pkg || null;
  };

  const getPackageForTier = useCallback(
    (tier: TierDef) => {
      if (!offerings?.availablePackages) return null;
      return findPackage(offerings.availablePackages, tier, period);
    },
    [offerings, period]
  );

  const handleSubscribe = async (tier: TierDef) => {
    setLoading(tier.key);
    try {
      // Su iOS/Android native: SOLO RevenueCat (policy Apple 3.1.1 — vietato Stripe per contenuti digitali)
      if (isNative) {
        if (!rcReady) {
          Alert.alert(
            t('paywall.service_unavailable'),
            t('paywall.service_unavailable_msg')
          );
          return;
        }

        // Step 1: prova con le offerte già caricate
        let pkg = getPackageForTier(tier);
        let currentOfferings = offerings;

        // Step 2: re-fetch fallback
        if (!pkg) {
          console.log('[Paywall] Package non trovato al primo tentativo, re-fetch offerings...');
          try {
            currentOfferings = await fetchOfferings();
            setOfferings(currentOfferings);
            if (currentOfferings?.availablePackages) {
              pkg = findPackage(currentOfferings.availablePackages, tier, period);
            }
          } catch (refetchErr) {
            console.error('[Paywall] re-fetch offerings fallito:', refetchErr);
          }
        }

        // Step 3: ancora niente -> alert con debug
        if (!pkg) {
          const targetId = period === 'monthly' ? tier.monthlyProductId : tier.yearlyProductId;
          const available = currentOfferings?.availablePackages
            ?.map((p: any) => p.product?.identifier || p.identifier)
            .filter(Boolean)
            .join('\n• ') || t('paywall_debug.no_offer_received');
          const d = rcDiagnostic;
          const debugInfo =
            `\n\n— DEBUG RC —\n` +
            `apiKey: ${d.apiKeyPrefix} (len=${d.apiKeyLen})\n` +
            `initCalled: ${d.initCalled}\n` +
            `initSuccess: ${d.initSuccess}\n` +
            `initError: ${d.initError || 'none'}\n` +
            `lastFetchTs: ${d.lastFetchTs}\n` +
            `lastFetchError: ${d.lastFetchError || 'none'}\n` +
            `allOfferings: [${d.lastOfferingsAllKeys.join(', ') || 'EMPTY'}]\n` +
            `currentId: ${d.lastCurrentId || 'NONE'}\n` +
            `currentPkgCount: ${d.lastCurrentPkgCount}\n` +
            `pkgIds: [${d.lastPkgIds.join(', ') || 'EMPTY'}]`;
          Alert.alert(
            t('paywall.product_unavailable'),
            t('paywall.product_unavailable_msg', { tier: tier.name }) +
              `\n\nID cercato:\n• ${targetId}\n\n` +
              `Offerte ricevute da RevenueCat:\n• ${available}` +
              debugInfo
          );
          return;
        }

        const result = await purchasePackage(pkg);
        if (result.success) {
          await refresh();
          Alert.alert(t('paywall.sub_active_title'), t('paywall.sub_active_msg', { tier: tier.name }));
          router.back();
        } else if (result.error && result.error !== 'cancelled') {
          Alert.alert(t('paywall.purchase_error'), result.error);
        }
        return;
      }

      // Stripe Checkout SOLO su web
      const pkgId = period === 'monthly' ? tier.monthlyProductId : tier.yearlyProductId;
      const res = await api.post('/stripe/checkout', { package_id: pkgId });
      const url = res.data?.url;
      if (url) {
        if (Platform.OS === 'web') {
          window.location.href = url;
        } else {
          Alert.alert(t('paywall.generic_error'), t('paywall.platform_unsupported'));
        }
      } else {
        Alert.alert(t('paywall.generic_error'), t('paywall.checkout_no_url'));
      }
    } catch (err: any) {
      Alert.alert(t('paywall.generic_error'), err?.response?.data?.detail || err?.message || t('paywall.something_wrong'));
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    if (!rcReady || !isNative) {
      Alert.alert(t('paywall.restore_unavailable'), t('paywall.restore_unavailable_msg'));
      return;
    }
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (info) {
        await refresh();
        Alert.alert(t('paywall.restore_ok_title'), t('paywall.restore_ok_msg'));
      }
    } catch (err: any) {
      Alert.alert(t('paywall.generic_error'), err?.message || t('paywall.restore_error'));
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
        <Text style={styles.headerTitle}>{t('paywall.header_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          {t('paywall.subtitle')}
        </Text>

        {/* Toggle Mensile / Annuale */}
        <View style={styles.periodToggle}>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'monthly' && styles.periodBtnActive]}
            onPress={() => setPeriod('monthly')}
          >
            <Text style={[styles.periodBtnText, period === 'monthly' && styles.periodBtnTextActive]}>
              {t('paywall.monthly')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'yearly' && styles.periodBtnActive]}
            onPress={() => setPeriod('yearly')}
          >
            <Text style={[styles.periodBtnText, period === 'yearly' && styles.periodBtnTextActive]}>
              {t('paywall.yearly')}
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>{t('paywall.save_badge')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Cards tier */}
        {TIERS.map((tier) => {
          const fallbackPrice = period === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
          const pkg = getPackageForTier(tier);
          const priceDisplay = `${fallbackPrice.toFixed(2).replace('.', ',')} €`;
          const pricePerMonth = period === 'yearly' ? (fallbackPrice / 12).toFixed(2).replace('.', ',') : null;
          const currencySymbol = '€';
          const isCurrent = currentTier === tier.key;
          const isLoadingThis = loading === tier.key;

          return (
            <View
              key={tier.key}
              style={[styles.card, tier.popular && styles.cardPopular, { borderColor: tier.color }]}
            >
              {tier.popular && (
                <View style={[styles.popularBadge, { backgroundColor: tier.color }]}>
                  <Text style={styles.popularBadgeText}>{t('paywall.popular')}</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
                  <Text style={styles.tierTagline}>{t(tier.taglineKey)}</Text>
                </View>
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>{t('paywall.current')}</Text>
                  </View>
                )}
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>{priceDisplay}</Text>
                <Text style={styles.priceUnit}>/{period === 'monthly' ? t('paywall.month') : t('paywall.year')}</Text>
              </View>
              {pricePerMonth && (
                <Text style={styles.pricePerMonth}>{t('paywall.approx_monthly', { symbol: currencySymbol, price: pricePerMonth })}</Text>
              )}

              <View style={styles.features}>
                {tier.featuresKeys.map((fk, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color={tier.color} />
                    <Text style={styles.featureText}>{t(fk)}</Text>
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
                    {isCurrent ? t('paywall.current_plan') : t('paywall.subscribe_to', { tier: tier.name })}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Restore purchases */}
        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
          {restoring ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.restoreText}>
              <Ionicons name="refresh" size={14} color={colors.primary} /> {t('paywall.restore')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Legal footer */}
        <Text style={styles.legal}>
          {t('paywall.legal')}
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.legalLink}>{t('paywall.legal_terms')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>•</Text>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.legalLink}>{t('paywall.legal_privacy')}</Text>
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
