import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { colors, spacing, radius, fonts, activityMeta, ActivityType } from '../../src/theme';
import { RunIcon, WalkIcon, BikeIcon } from '../../src/icons/BrandIcons';
import { Footprints, ChevronRight } from 'lucide-react-native';
import { useT } from '../../src/i18n';

type Session = {
  session_id: string;
  title: string;
  duration_seconds: number;
  distance_km: number;
  avg_pace_min_per_km?: number | null;
  calories?: number | null;
  completed_at: string;
  activity_type?: string | null;
};

export default function History() {
  const { t, locale } = useT();
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('history.title')}</Text>
        <Text style={styles.subtitle}>
          {items.length} {items.length === 1 ? t('history.session_singular') : t('history.session_plural')}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.session_id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 140, paddingTop: spacing.sm }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Footprints size={36} color={colors.textMuted} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyText}>{t('history.empty')}</Text>
            <Text style={styles.emptySub}>{t('history.empty_subtitle')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const type = (item.activity_type as ActivityType) || 'run';
          const meta = activityMeta[type] || activityMeta.run;
          const Icon = type === 'walk' ? WalkIcon : type === 'bike' ? BikeIcon : RunIcon;
          return (
            <TouchableOpacity
              testID={`history-item-${item.session_id}`}
              style={styles.item}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/workout/[id]', params: { id: item.session_id } })}
            >
              <View style={[styles.iconBox, { backgroundColor: meta.colorMuted }]}>
                <Icon size={22} color={meta.color} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                  {formatDate(item.completed_at, locale)} · {meta.shortLabel}
                </Text>
              </View>
              <View style={styles.itemStats}>
                <Text style={styles.statNum}>
                  {item.distance_km.toFixed(2)}
                  <Text style={styles.statUnit}> km</Text>
                </Text>
                <Text style={styles.statSub}>{formatDur(item.duration_seconds)}</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

function formatDate(iso: string, locale: string = 'it') {
  try {
    const d = new Date(iso);
    const tag = locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'it-IT';
    return d.toLocaleDateString(tag, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
function formatDur(s: number) {
  const m = Math.floor(s / 60); const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontFamily: fonts.heading,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
    fontFamily: fonts.medium,
  },

  // Item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  itemMeta: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  itemStats: { alignItems: 'flex-end' },
  statNum: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: fonts.heading,
  },
  statUnit: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  statSub: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 1.5,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontFamily: fonts.bold,
    marginTop: spacing.md,
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.medium,
  },
});
