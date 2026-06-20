import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/api';
import { colors as oldColors, spacing, radius, fonts } from '../../src/theme';
import { tokens as dsTokens, FontProvider } from '../../src/design-system';

// ── Scientific Light shim (RunHub 1.6.4) ──────────────
const colors = {
  primary: dsTokens.brand.primary,
  primaryDark: dsTokens.brand.dark,
  background: dsTokens.neutral.background,
  surface: dsTokens.neutral.card,
  surfaceSoft: dsTokens.neutral.surfaceSoft,
  border: dsTokens.neutral.border,
  textPrimary: dsTokens.text.primary,
  textSecondary: dsTokens.text.secondary,
  textMuted: dsTokens.text.muted,
  success: dsTokens.semantic.success,
  warning: dsTokens.semantic.warning,
  danger: dsTokens.semantic.danger,
};
import { SparklesIcon } from '../../src/icons/BrandIcons';
import { useT } from '../../src/i18n';
import { tBackend } from '../../src/i18n/backendStrings';
import { Star, Calendar, Repeat, Sparkles } from 'lucide-react-native';

type Plan = {
  plan_id: string;
  title: string;
  description: string;
  level: string;
  duration_weeks: number;
  workouts_per_week: number;
  is_premium: boolean;
  is_ai_generated?: boolean;
  image_url?: string;
};

// Fallback runner images (high-quality stock) – used when plan has no image_url
const FALLBACK_IMAGES: Record<string, string> = {
  '10k':       'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1000&q=70',
  'half':      'https://images.unsplash.com/photo-1486218119243-13883505764c?w=1000&q=70',
  'marathon':  'https://images.unsplash.com/photo-1502904550040-7534597429ae?w=1000&q=70',
  'beginner':  'https://images.unsplash.com/photo-1530137073265-95cad7c61e1d?w=1000&q=70',
  'default':   'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1000&q=70',
};

function pickFallback(title: string, level: string): string {
  const t = (title || '').toLowerCase();
  if (t.includes('10k') || t.includes('10 k')) return FALLBACK_IMAGES['10k'];
  if (t.includes('mezza') || t.includes('half') || t.includes('21')) return FALLBACK_IMAGES['half'];
  if (t.includes('maratona') || t.includes('marathon') || t.includes('42')) return FALLBACK_IMAGES['marathon'];
  if (level === 'beginner' || t.includes('principia')) return FALLBACK_IMAGES['beginner'];
  return FALLBACK_IMAGES['default'];
}

type Tab = 'forYou' | 'all';

export default function Plans() {
  return (
    <FontProvider>
      <PlansInner />
    </FontProvider>
  );
}

function PlansInner() {
  const { t, locale } = useT();
  const [predefined, setPredefined] = useState<Plan[]>([]);
  const [custom, setCustom] = useState<Plan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('forYou');
  const router = useRouter();

  const load = async () => {
    try {
      const { data } = await api.get('/plans');
      setPredefined(data.predefined || []);
      setCustom(data.custom || []);
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // "Per te" = custom (AI/active) first + suggested predefined (beginner + a popular one)
  // "Tutti i piani" = predefined complete
  const data = useMemo(() => {
    if (tab === 'all') return predefined;
    const suggested: Plan[] = [];
    const seen = new Set<string>();
    custom.forEach((p) => { suggested.push(p); seen.add(p.plan_id); });
    // pick one beginner if present
    const beg = predefined.find(p => p.level === 'beginner' && !seen.has(p.plan_id));
    if (beg) { suggested.push(beg); seen.add(beg.plan_id); }
    // pick first non-beginner not yet added
    const others = predefined.filter(p => !seen.has(p.plan_id));
    suggested.push(...others.slice(0, 3));
    return suggested;
  }, [tab, predefined, custom]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.h1}>{t('plans.title')}</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'forYou' && styles.tabBtnActive]}
          onPress={() => setTab('forYou')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, tab === 'forYou' && styles.tabTextActive]}>{t('plans.tab_for_you')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'all' && styles.tabBtnActive]}
          onPress={() => setTab('all')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>{t('plans.tab_all')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(i) => i.plan_id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 140 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          tab === 'forYou' ? (
            <TouchableOpacity
              testID="ai-coach-cta"
              style={styles.aiBanner}
              onPress={() => router.push('/ai-generate')}
              activeOpacity={0.9}
            >
              <View style={styles.aiBannerIcon}>
                <Sparkles size={18} color="#fff" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiBannerTitle}>{t('plans.ai_banner_title')}</Text>
                <Text style={styles.aiBannerSub}>{t('plans.ai_banner_sub')}</Text>
              </View>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('plans.empty_title')}</Text>
            <Text style={styles.emptySub}>{t('plans.empty_sub')}</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <PlanCard
            plan={item}
            highlight={index === 0 && tab === 'forYou'}
            t={t}
            locale={locale}
            onPress={() => router.push({ pathname: '/plan/[id]', params: { id: item.plan_id } })}
          />
        )}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
function PlanCard({
  plan, highlight, onPress, t, locale,
}: { plan: Plan; highlight?: boolean; onPress: () => void; t: (k: string, o?: any) => string; locale: string }) {
  const imageUri = plan.image_url || pickFallback(plan.title, plan.level);
  const weeksShort = t('plans.weeks_short');
  const perWeekShort = t('plans.per_week_short');
  const title = tBackend(plan.title, locale);
  const desc = tBackend(plan.description, locale);
  return (
    <TouchableOpacity
      testID={`plan-card-${plan.plan_id}`}
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.cardWrap, highlight && styles.cardWrapHighlight]}
    >
      <ImageBackground
        source={{ uri: imageUri }}
        style={styles.card}
        imageStyle={{ borderRadius: radius.lg - 1 }}
      >
        {/* Orange tint overlay (sepia/orange duotone effect) */}
        <View style={styles.cardTintOrange} />
        {/* Dark gradient bottom for readability */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.85)']}
          style={styles.cardGradient}
        />

        <View style={styles.cardContent}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: levelColor(plan.level) }]}>
              <Text style={styles.badgeText}>{levelLabel(plan.level, t)}</Text>
            </View>
            {plan.is_ai_generated ? (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <SparklesIcon size={10} color="#fff" />
                <Text style={[styles.badgeText, { marginLeft: 4 }]}>AI</Text>
              </View>
            ) : null}
            {plan.is_premium && !plan.is_ai_generated ? (
              <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                <Star size={10} color="#fff" fill="#fff" />
                <Text style={[styles.badgeText, { marginLeft: 4 }]}>PREMIUM</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {title.toUpperCase()}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{desc}</Text>

          <View style={styles.metaRow}>
            <Calendar size={12} color="rgba(255,255,255,0.9)" strokeWidth={2.4} />
            <Text style={styles.meta}>{plan.duration_weeks} {weeksShort}</Text>
            <View style={styles.metaDot} />
            <Repeat size={12} color="rgba(255,255,255,0.9)" strokeWidth={2.4} />
            <Text style={styles.meta}>{plan.workouts_per_week}{perWeekShort}</Text>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

function levelLabel(l: string, t: (k: string, o?: any) => string) {
  if (l === 'beginner') return t('plans.level_beginner_upper');
  if (l === 'intermediate') return t('plans.level_intermediate_upper');
  return t('plans.level_advanced_upper');
}
function levelColor(l: string) {
  return l === 'beginner' ? colors.success : l === 'intermediate' ? colors.warning : colors.primary;
}

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  h1: {
    color: colors.textPrimary,
    fontSize: 28,
    fontFamily: fonts.heading,
    letterSpacing: -0.6,
  },

  // Tab switcher (pill style)
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  tabTextActive: {
    color: '#fff',
  },

  // AI banner (header above list, on "Per te")
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  aiBannerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  aiBannerTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  aiBannerSub: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },

  // Plan card
  cardWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardWrapHighlight: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  card: {
    minHeight: 220,
    justifyContent: 'flex-end',
  },
  cardTintOrange: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,107,31,0.18)',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: { padding: spacing.lg },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: fonts.headingBold,
    letterSpacing: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: fonts.heading,
    letterSpacing: -0.5,
    lineHeight: 27,
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontFamily: fonts.medium,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  meta: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },

  // Empty
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.medium,
    marginTop: 4,
  },
});
