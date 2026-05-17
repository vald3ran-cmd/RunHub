import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { colors, spacing, radius, shadows, typography } from '../../src/theme';
import { SparklesIcon } from '../../src/icons/BrandIcons';
import { Star, Calendar, Repeat } from 'lucide-react-native';

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

export default function Plans() {
  const [predefined, setPredefined] = useState<Plan[]>([]);
  const [custom, setCustom] = useState<Plan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
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

  const all: Plan[] = [...custom, ...predefined];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>ALLENAMENTI</Text>
          <Text style={styles.h1}>Piani</Text>
          <Text style={styles.sub}>Scegli il tuo programma</Text>
        </View>
        <TouchableOpacity
          testID="open-ai-generate"
          style={styles.aiBtn}
          onPress={() => router.push('/ai-generate')}
          activeOpacity={0.85}
        >
          <SparklesIcon size={16} color="#fff" />
          <Text style={styles.aiBtnText}>AI Coach</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={all}
        keyExtractor={(i) => i.plan_id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`plan-card-${item.plan_id}`}
            onPress={() => router.push({ pathname: '/plan/[id]', params: { id: item.plan_id } })}
            activeOpacity={0.9}
          >
            <ImageBackground
              source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1765914448187-ee93dd13e1e6?w=800' }}
              style={styles.card}
              imageStyle={{ borderRadius: radius.lg }}
            >
              <View style={styles.cardOverlay} />
              <View style={styles.cardContent}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: levelColor(item.level) }]}>
                    <Text style={styles.badgeText}>{levelLabel(item.level)}</Text>
                  </View>
                  {item.is_ai_generated ? (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <SparklesIcon size={10} color="#fff" />
                      <Text style={[styles.badgeText, { marginLeft: 4 }]}>AI</Text>
                    </View>
                  ) : null}
                  {item.is_premium && !item.is_ai_generated ? (
                    <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                      <Star size={10} color="#fff" fill="#fff" />
                      <Text style={[styles.badgeText, { marginLeft: 4 }]}>PREMIUM</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.metaRow}>
                  <Calendar size={12} color="rgba(255,255,255,0.85)" strokeWidth={2.4} />
                  <Text style={styles.meta}>{item.duration_weeks} sett.</Text>
                  <View style={styles.metaDot} />
                  <Repeat size={12} color="rgba(255,255,255,0.85)" strokeWidth={2.4} />
                  <Text style={styles.meta}>{item.workouts_per_week}× sett.</Text>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function levelLabel(l: string) {
  return l === 'beginner' ? 'PRINCIPIANTE' : l === 'intermediate' ? 'INTERMEDIO' : 'ESPERTO';
}
function levelColor(l: string) {
  return l === 'beginner' ? colors.success : l === 'intermediate' ? colors.warning : colors.primary;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  eyebrow: { ...typography.eyebrow, color: colors.textSecondary, marginBottom: 6 },
  h1: { ...typography.displayMd, color: colors.textPrimary },
  sub: { color: colors.textSecondary, marginTop: 2, fontSize: 13 },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    ...shadows.sm,
  },
  aiBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  card: {
    minHeight: 200,
    justifyContent: 'flex-end',
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,17,21,0.55)',
    borderRadius: radius.lg,
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
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cardTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  cardDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  meta: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
});
