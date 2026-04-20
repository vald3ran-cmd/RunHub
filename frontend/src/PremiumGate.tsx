/**
 * PremiumGate: wrapper che mostra un contenuto solo se l'utente ha il tier minimo richiesto.
 * Altrimenti mostra un banner con CTA verso la paywall.
 *
 * Uso:
 *   <PremiumGate require="performance" title="AI Coach" description="Sblocca piani personalizzati">
 *     <AICoachView />
 *   </PremiumGate>
 */
import { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from './theme';
import { useAuth } from './auth';

export type Tier = 'free' | 'starter' | 'performance' | 'elite';

const TIER_ORDER: Record<Tier, number> = {
  free: 0,
  starter: 1,
  performance: 2,
  elite: 3,
};

export function hasTierAccess(userTier: Tier | string | undefined, requiredTier: Tier): boolean {
  if (!userTier) return requiredTier === 'free';
  const ut = (userTier as Tier) in TIER_ORDER ? (userTier as Tier) : 'free';
  return TIER_ORDER[ut] >= TIER_ORDER[requiredTier];
}

export function useTierAccess(required: Tier) {
  const { user } = useAuth();
  const tier = (user?.tier || 'free') as Tier;
  return useMemo(
    () => ({
      hasAccess: hasTierAccess(tier, required),
      currentTier: tier,
    }),
    [tier, required]
  );
}

interface PremiumGateProps {
  require: Tier;
  title: string;
  description?: string;
  children: React.ReactNode;
  compact?: boolean;
}

export function PremiumGate({ require, title, description, children, compact }: PremiumGateProps) {
  const router = useRouter();
  const { hasAccess, currentTier } = useTierAccess(require);

  if (hasAccess) return <>{children}</>;

  const tierLabel = require === 'elite' ? 'Elite' : require === 'performance' ? 'Performance' : 'Starter';

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactBanner}
        onPress={() => router.push('/paywall')}
        testID={`premium-gate-${require}`}
      >
        <Ionicons name="lock-closed" size={16} color={colors.primary} />
        <Text style={styles.compactBannerText}>
          Sblocca con {tierLabel}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container} testID={`premium-gate-${require}`}>
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed" size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <Text style={styles.currentBadge}>
        Piano attuale: <Text style={{ fontWeight: '700' }}>{currentTier === 'free' ? 'Gratuito' : currentTier}</Text>
      </Text>
      <TouchableOpacity
        style={styles.cta}
        onPress={() => router.push('/paywall')}
        testID={`premium-gate-cta-${require}`}
      >
        <Text style={styles.ctaText}>Sblocca {tierLabel}</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    margin: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  currentBadge: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: 'flex-start',
  },
  compactBannerText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});
