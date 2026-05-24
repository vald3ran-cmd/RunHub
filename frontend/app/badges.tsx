import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { colors, spacing, radius } from '../src/theme';
import { useT } from '../src/i18n';

type Badge = {
  id: string; title: string; description: string; icon: string;
  earned: boolean; awarded_at?: string;
};

export default function BadgesScreen() {
  const router = useRouter();
  const { t } = useT();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/badges');
      setBadges(data);
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const earned = badges.filter(b => b.earned).length;
  const total = badges.length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('badges.title')}</Text>
          <Text style={styles.sub}>{t('badges.unlocked', { earned, total })}</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
      >
        <View style={styles.grid}>
          {badges.map(b => (
            <View
              key={b.id}
              testID={`badge-${b.id}`}
              style={[styles.card, b.earned && styles.cardEarned]}
            >
              <View style={[styles.iconBox, b.earned && styles.iconBoxEarned]}>
                <Ionicons name={b.icon as any} size={32} color={b.earned ? '#fff' : colors.textMuted} />
              </View>
              <Text style={[styles.cardTitle, !b.earned && { color: colors.textSecondary }]}>{translateBadgeTitle(b, t)}</Text>
              <Text style={styles.cardDesc}>{translateBadgeDesc(b, t)}</Text>
              {b.earned ? (
                <View style={styles.earnedBadge}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                  <Text style={styles.earnedText}>{t('badges.earned')}</Text>
                </View>
              ) : (
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                  <Text style={styles.lockedText}>{t('badges.locked')}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  sub: { color: colors.textSecondary, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  card: {
    width: '47%', padding: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 6,
  },
  cardEarned: { borderColor: colors.primary },
  iconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  iconBoxEarned: { backgroundColor: colors.primary },
  cardTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', textAlign: 'center', marginTop: spacing.sm },
  cardDesc: { color: colors.textSecondary, fontSize: 10, textAlign: 'center', minHeight: 26 },
  earnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, marginTop: spacing.xs },
  earnedText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, marginTop: spacing.xs },
  lockedText: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});

// ─────────────────────────────────────────────────────────────
// Backend returns badge title/description in italian.
// We translate via a mapping using the badge id (slug) when available,
// falling back to a fuzzy match on the italian title.
// ─────────────────────────────────────────────────────────────
function translateBadgeTitle(b: Badge, t: (k: string, o?: any) => string): string {
  const key = badgeKeyFromBadge(b);
  if (!key) return b.title;
  const translated = t(`badge_names.${key}`);
  // If the i18n returns the raw key, fall back to backend title
  return translated.startsWith('badge_names.') ? b.title : translated;
}

function translateBadgeDesc(b: Badge, t: (k: string, o?: any) => string): string {
  const key = badgeKeyFromBadge(b);
  if (!key) return b.description;
  const translated = t(`badge_names.${key}_desc`);
  return translated.startsWith('badge_names.') ? b.description : translated;
}

function badgeKeyFromBadge(b: Badge): string | null {
  // Prefer the id (slug) if backend uses it
  const id = (b.id || '').toLowerCase().trim();
  if (id) return id.replace(/-/g, '_');
  // Fallback: map italian titles to keys
  const titleMap: Record<string, string> = {
    'primo passo': 'first_step',
    'runner regolare': 'regular_runner',
    'abitudine creata': 'habit_created',
    'primo 5k': 'first_5k',
    'primo 10k': 'first_10k',
    'mezza maratona': 'half_marathon',
    'maratona': 'marathon',
    'velocista': 'speed_demon',
    'mattiniero': 'early_bird',
    'nottambulo': 'night_owl',
  };
  const t = (b.title || '').toLowerCase().trim();
  return titleMap[t] || null;
}
