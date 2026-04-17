import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { colors, spacing, radius, stepTypeColors, stepTypeLabels } from '../../src/theme';

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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <ImageBackground
          source={{ uri: plan.image_url || 'https://images.unsplash.com/photo-1765914448187-ee93dd13e1e6?w=1200' }}
          style={styles.hero}
        >
          <View style={styles.heroOverlay} />
          <SafeAreaView edges={['top']} style={{ width: '100%' }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroContent}>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: colors.surface }]}>
                  <Text style={styles.badgeText}>{plan.level.toUpperCase()}</Text>
                </View>
                {plan.is_ai_generated ? (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="sparkles" size={10} color="#fff" />
                    <Text style={styles.badgeText}>AI</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.heroTitle}>{plan.title}</Text>
              <Text style={styles.heroMeta}>{plan.duration_weeks} settimane · {plan.workouts_per_week} sessioni/sett.</Text>
            </View>
          </SafeAreaView>
        </ImageBackground>

        <View style={styles.section}>
          <Text style={styles.desc}>{plan.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ALLENAMENTI</Text>
          {plan.workouts.map((w: any, idx: number) => (
            <TouchableOpacity
              key={w.workout_id}
              testID={`workout-item-${idx}`}
              style={styles.workoutCard}
              onPress={() => router.push({
                pathname: '/run-active',
                params: {
                  title: `${plan.title} — ${w.title}`,
                  workout_id: w.workout_id,
                  plan_id: plan.plan_id,
                  steps: JSON.stringify(w.steps),
                }
              })}
            >
              <View style={styles.dayBadge}><Text style={styles.dayText}>{w.day}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.workoutTitle}>{w.title}</Text>
                <Text style={styles.workoutMeta}>{w.estimated_duration_min} min · {w.estimated_distance_km} km</Text>
                <View style={styles.stepChips}>
                  {uniqueTypes(w.steps).slice(0, 4).map((t: string) => (
                    <View key={t} style={[styles.chip, { backgroundColor: (stepTypeColors[t] || colors.primary) + '33' }]}>
                      <Text style={[styles.chipText, { color: stepTypeColors[t] || colors.primary }]}>
                        {stepTypeLabels[t] || t}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <Ionicons name="play-circle" size={32} color={colors.primary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function uniqueTypes(steps: any[]): string[] {
  const s = new Set<string>();
  steps.forEach((st) => s.add(st.type));
  return Array.from(s);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  hero: { height: 280, justifyContent: 'flex-end' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9,9,11,0.6)' },
  backBtn: { padding: spacing.md, alignSelf: 'flex-start' },
  heroContent: { padding: spacing.lg },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -1, marginTop: spacing.sm },
  heroMeta: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  section: { padding: spacing.lg },
  sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', letterSpacing: 2, marginBottom: spacing.md },
  desc: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
  workoutCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  dayBadge: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  dayText: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  workoutTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  workoutMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  stepChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  chipText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});
