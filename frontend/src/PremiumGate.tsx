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
import { useT } from './i18n';

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
  const { t } = useT();
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
          {t('gate.unlock_with', { tier: tierLabel })}
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
        {t('gate.current_plan', { tier: currentTier === 'free' ? t('gate.free_label') : currentTier })}
      </Text>
      <TouchableOpacity
        style={styles.cta}
        onPress={() => router.push('/paywall')}
        testID={`premium-gate-cta-${require}`}
      >
        <Text style={styles.ctaText}>{t('gate.unlock_with', { tier: tierLabel })}</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

/**
 * LockedTeaser: card teaser (compatta, in stile statsCard) per mostrare una
 * feature bloccata nel resoconto sessione, con titolo + descrizione + CTA.
 */
export function LockedTeaser({
  require, title, description,
}: { require: Tier; title: string; description: string }) {
  const router = useRouter();
  const { t } = useT();
  const { hasAccess } = useTierAccess(require);
  if (hasAccess) return null;
  const tierLabel = require === 'elite' ? 'Elite' : require === 'performance' ? 'Performance' : 'Starter';
  return (
    <TouchableOpacity
      style={lockedStyles.card}
      onPress={() => router.push('/paywall')}
      activeOpacity={0.9}
      testID={`locked-teaser-${require}`}
    >
      <View style={lockedStyles.iconRow}>
        <Ionicons name="lock-closed" size={18} color={colors.primary} />
        <Text style={lockedStyles.title}>{title}</Text>
      </View>
      <Text style={lockedStyles.desc}>{description}</Text>
      <View style={lockedStyles.cta}>
        <Text style={lockedStyles.ctaText}>{t('gate.unlock_with', { tier: tierLabel })}</Text>
        <Ionicons name="arrow-forward" size={14} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const lockedStyles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  title: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  desc: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: spacing.sm },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  ctaText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});

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
