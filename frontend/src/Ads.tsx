import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from './theme';
import { useAuth } from './auth';

// ============ BANNER AD (Free tier, Home) ============
export function AdBanner() {
  const { user } = useAuth();
  const tier = user?.tier || (user?.is_premium ? 'performance' : 'free');
  if (tier !== 'free') return null;
  return (
    <View style={bannerStyles.container} testID="ad-banner-free">
      <View style={bannerStyles.badge}>
        <Text style={bannerStyles.badgeText}>AD</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={bannerStyles.title}>Passa a Starter — addio pubblicita\'</Text>
        <Text style={bannerStyles.sub}>€4.99/mese · primi 7 giorni gratis</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  badge: { backgroundColor: colors.warning, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  sub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
});

// ============ INTERSTITIAL AD MODAL (Free tier, post-run) ============
type InterstitialProps = {
  visible: boolean;
  onClose: () => void;
  skipAfter?: number; // seconds
};

export function InterstitialAd({ visible, onClose, skipAfter = 5 }: InterstitialProps) {
  const [countdown, setCountdown] = useState(skipAfter);

  useEffect(() => {
    if (!visible) { setCountdown(skipAfter); return; }
    const id = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [visible, skipAfter]);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={() => {}}>
      <View style={adStyles.container}>
        <View style={adStyles.header}>
          <View style={adStyles.adBadge}>
            <Text style={adStyles.adBadgeText}>ANNUNCIO</Text>
          </View>
          <TouchableOpacity
            testID="skip-ad-button"
            style={[adStyles.skipBtn, countdown > 0 && { opacity: 0.4 }]}
            onPress={countdown === 0 ? onClose : undefined}
            disabled={countdown > 0}
          >
            <Text style={adStyles.skipText}>
              {countdown > 0 ? `SALTA TRA ${countdown}s` : 'SALTA ✕'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={adStyles.content}>
          <View style={adStyles.videoBox}>
            <Ionicons name="play-circle" size={80} color="rgba(255,255,255,0.35)" />
            <Text style={adStyles.videoPlaceholder}>VIDEO PUBBLICITARIO</Text>
            <ActivityIndicator color="rgba(255,255,255,0.5)" style={{ marginTop: spacing.md }} />
          </View>
          <Text style={adStyles.brandTag}>Simulazione placeholder · su build nativa sara\' AdMob</Text>
        </View>

        <View style={adStyles.upgradeBox}>
          <Ionicons name="star" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={adStyles.upgradeTitle}>Stanco della pubblicita\'?</Text>
            <Text style={adStyles.upgradeSub}>Passa a Starter per rimuovere tutti gli annunci</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const adStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, paddingTop: spacing.xl },
  adBadge: { backgroundColor: colors.warning, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
  adBadgeText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  skipBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  skipText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  videoBox: {
    width: '100%', aspectRatio: 16 / 9, backgroundColor: '#1a1a1a',
    justifyContent: 'center', alignItems: 'center', borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  videoPlaceholder: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '800', letterSpacing: 3, marginTop: spacing.sm },
  brandTag: { color: colors.textMuted, fontSize: 10, marginTop: spacing.lg, fontStyle: 'italic' },
  upgradeBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, padding: spacing.md, margin: spacing.lg,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary,
  },
  upgradeTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  upgradeSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
});

// ============ Helper hook ============
export function useShouldShowAds() {
  const { user } = useAuth();
  const tier = user?.tier || (user?.is_premium ? 'performance' : 'free');
  return tier === 'free';
}
