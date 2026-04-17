import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground, RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { colors, spacing, radius } from '../../src/theme';

type Plan = {
  plan_id: string; title: string; description: string; level: string;
  duration_weeks: number; workouts_per_week: number; is_premium: boolean;
  is_ai_generated?: boolean; image_url?: string;
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
        <View>
          <Text style={styles.h1}>PIANI</Text>
          <Text style={styles.sub}>Scegli il tuo programma di allenamento</Text>
        </View>
        <TouchableOpacity
          testID="open-ai-generate"
          style={styles.aiBtn} onPress={() => router.push('/ai-generate')}
        >
          <Ionicons name="sparkles" size={16} color="#fff" />
          <Text style={styles.aiBtnText}>AI</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={all}
        keyExtractor={(i) => i.plan_id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`plan-card-${item.plan_id}`}
            onPress={() => router.push({ pathname: '/plan/[id]', params: { id: item.plan_id } })}
          >
            <ImageBackground
              source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1765914448187-ee93dd13e1e6?w=800' }}
              style={styles.card} imageStyle={{ borderRadius: radius.lg }}
            >
              <View style={styles.cardOverlay} />
              <View style={styles.cardContent}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: levelColor(item.level) }]}>
                    <Text style={styles.badgeText}>{levelLabel(item.level)}</Text>
                  </View>
                  {item.is_ai_generated ? (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="sparkles" size={10} color="#fff" />
                      <Text style={[styles.badgeText, { marginLeft: 4 }]}>AI</Text>
                    </View>
                  ) : null}
                  {item.is_premium && !item.is_ai_generated ? (
                    <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                      <Ionicons name="star" size={10} color="#000" />
                      <Text style={[styles.badgeText, { color: '#000', marginLeft: 4 }]}>PREMIUM</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{item.duration_weeks} sett.</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.meta}>{item.workouts_per_week} allenamenti/sett.</Text>
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
  header: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { color: colors.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  sub: { color: colors.textSecondary, marginTop: 2 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.pill,
  },
  aiBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 1 },
  card: { minHeight: 180, justifyContent: 'flex-end' },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9,9,11,0.65)', borderRadius: radius.lg },
  cardContent: { padding: spacing.lg },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cardTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  cardDesc: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm, alignItems: 'center' },
  meta: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  metaDot: { color: colors.textMuted },
});
