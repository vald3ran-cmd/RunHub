import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Lock, Home, Play, Sparkles, Star } from 'lucide-react-native';
import { api } from '../../src/api';
import { colors, spacing, radius, fonts, stepTypeColors, stepTypeLabels } from '../../src/theme';

export default function PlanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/plans/${id}`);
        setPlan(data);
      } catch (e: any) {
        setPlan(null);
      } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }
  if (!plan) {
    return <View style={styles.loader}><Text style={{ color: colors.textSecondary }}>Piano non trovato</Text></View>;
  }

  const openWorkout = (w: any) => {
    router.push({
      pathname: '/workout-preview',
      params: {
        title: w.title || plan.title,
        subtitle: w.subtitle || '',
        workout_id: w.workout_id,
        plan_id: plan.plan_id,
        steps: JSON.stringify(w.steps),
        estimated_duration_min: String(w.estimated_duration_min || ''),
        estimated_distance_km: String(w.estimated_distance_km || ''),
      },
    });
  };

  const levelLabel = (l: string) =>
    l === 'beginner' ? 'PRINCIPIANTE' : l === 'intermediate' ? 'INTERMEDIO' : 'ESPERTO';
  const levelColor = (l: string) =>
    l === 'beginner' ? colors.success : l === 'intermediate' ? colors.warning : colors.primary;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground
          source={{ uri: plan.image_url || 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1200&q=70' }}
          style={styles.hero}
        >
          <View style={styles.heroTint} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.95)']}
            style={StyleSheet.absoluteFillObject}
          />
          <SafeAreaView edges={['top']} style={{ width: '100%', flex: 1 }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <ChevronLeft size={24} color="#fff" strokeWidth={2.4} />
            </TouchableOpacity>
            <View style={styles.heroContent}>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: levelColor(plan.level) }]}>
                  <Text style={styles.badgeText}>{levelLabel(plan.level)}</Text>
                </View>
                {plan.is_ai_generated ? (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Sparkles size={10} color="#fff" strokeWidth={2.4} />
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
              <Text style={styles.heroTitle}>{plan.title.toUpperCase()}</Text>
              <Text style={styles.heroMeta}>
                {plan.duration_weeks} settimane · {plan.workouts_per_week} sessioni/sett.
              </Text>
            </View>
          </SafeAreaView>
        </ImageBackground>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.desc}>{plan.description}</Text>
        </View>

        {/* Locked plan banner */}
        {plan.locked ? (
          <View style={styles.lockBox}>
            <View style={styles.lockIcon}><Lock size={20} color="#fff" strokeWidth={2.4} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lockTitle}>PIANO BLOCCATO</Text>
              <Text style={styles.lockSub}>
                Abbonati a Starter o superiore per avviare questo piano. Intanto puoi fare un run libero dalla Home.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  testID="locked-plan-home-button"
                  style={styles.homeBtn}
                  onPress={() => router.replace('/(tabs)/home')}
                  activeOpacity={0.85}
                >
                  <Home size={14} color={colors.textPrimary} strokeWidth={2.4} />
                  <Text style={styles.homeBtnText}>HOME</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.lockBtn}
                  onPress={() => router.push('/premium')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.lockBtnText}>UPGRADE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        {/* Allenamenti list */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionHeaderText}>ALLENAMENTI</Text>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {plan.workouts?.map((w: any, idx: number) => (
            <TouchableOpacity
              key={w.workout_id}
              testID={`workout-item-${idx}`}
              style={[styles.workoutCard, plan.locked && { opacity: 0.55 }]}
              disabled={plan.locked}
              onPress={() => plan.locked ? router.push('/premium') : openWorkout(w)}
              activeOpacity={0.85}
            >
              <View style={styles.dayBadge}>
                <Text style={styles.dayText}>{w.day}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.workoutTitle} numberOfLines={1}>{w.title}</Text>
                <Text style={styles.workoutMeta} numberOfLines={1}>
                  {w.estimated_duration_min} min · {w.estimated_distance_km} km
                </Text>
                <View style={styles.stepChips}>
                  {uniqueTypes(w.steps).slice(0, 4).map((t: string) => (
                    <View key={t} style={[styles.chip, { backgroundColor: (stepTypeColors[t] || colors.primary) + '22' }]}>
                      <Text style={[styles.chipText, { color: stepTypeColors[t] || colors.primary }]}>
                        {stepTypeLabels[t] || t}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.playWrap}>
                <Play size={18} color="#fff" fill="#fff" strokeWidth={2.4} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function uniqueTypes(steps: any[]): string[] {
  if (!steps) return [];
  const s = new Set<string>();
  steps.forEach((st) => s.add(st.type));
  return Array.from(s);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },

  // Hero
  hero: { height: 300, justifyContent: 'flex-end' },
  heroTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,107,31,0.16)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
    margin: spacing.md,
  },
  heroContent: { padding: spacing.lg, marginTop: 'auto' },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: fonts.headingBold, letterSpacing: 1 },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontFamily: fonts.heading,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontFamily: fonts.bold,
    marginTop: 4,
  },

  // Section
  section: { padding: spacing.lg },
  desc: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.medium,
    lineHeight: 22,
  },

  // Section header (▸ ALLENAMENTI)
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionDot: {
    width: 4, height: 14, borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionHeaderText: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: fonts.headingBold,
    letterSpacing: 1.6,
  },

  // Workout card
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayText: {
    color: colors.primary,
    fontSize: 18,
    fontFamily: fonts.heading,
  },
  workoutTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  workoutMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  stepChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  chipText: {
    fontSize: 9,
    fontFamily: fonts.headingBold,
    letterSpacing: 0.8,
  },
  playWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Lock box
  lockBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  lockIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  lockTitle: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: fonts.headingBold,
    letterSpacing: 1.6,
  },
  lockSub: {
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: fonts.medium,
    marginTop: 4,
    lineHeight: 18,
  },
  lockBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  lockBtnText: {
    color: '#fff',
    fontFamily: fonts.headingBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  homeBtnText: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 11,
    letterSpacing: 1,
  },
});
