import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { colors, spacing, radius } from '../../src/theme';

type Session = {
  session_id: string; title: string; duration_seconds: number; distance_km: number;
  avg_pace_min_per_km?: number | null; calories?: number | null; completed_at: string;
};

export default function History() {
  const [items, setItems] = useState<Session[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = async () => {
    try {
      const { data } = await api.get('/workouts/history');
      setItems(data);
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.h1}>STORICO</Text>
        <Text style={styles.sub}>Le tue corse passate</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.session_id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="footsteps" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nessuna corsa ancora. Inizia ora!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`history-item-${item.session_id}`}
            style={styles.item}
            onPress={() => router.push({ pathname: '/workout/[id]', params: { id: item.session_id } })}
          >
            <View style={styles.iconBox}>
              <Ionicons name="flash" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.itemMeta}>
                {formatDate(item.completed_at)}
              </Text>
            </View>
            <View style={styles.itemStats}>
              <Text style={styles.statNum}>{item.distance_km.toFixed(2)}<Text style={styles.statUnit}> km</Text></Text>
              <Text style={styles.statSub}>{formatDur(item.duration_seconds)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
function formatDur(s: number) {
  const m = Math.floor(s / 60); const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg },
  h1: { color: colors.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  sub: { color: colors.textSecondary, marginTop: 2 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center',
  },
  itemTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  itemMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  itemStats: { alignItems: 'flex-end' },
  statNum: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  statUnit: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  statSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emptyText: { color: colors.textSecondary },
});
