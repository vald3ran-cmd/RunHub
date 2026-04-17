import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline } from 'react-native-svg';
import { api } from '../../src/api';
import { colors, spacing, radius } from '../../src/theme';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/workouts/${id}`);
        setSession(data);
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <View style={styles.loader}><ActivityIndicator color={colors.primary} /></View>;
  if (!session) return <View style={styles.loader}><Text style={{ color: colors.textSecondary }}>Sessione non trovata</Text></View>;

  const pace = session.avg_pace_min_per_km;
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.completedText}>COMPLETATO</Text>
        </View>
        <Text style={styles.title}>{session.title}</Text>
        <Text style={styles.date}>{new Date(session.completed_at).toLocaleString('it-IT')}</Text>

        <View style={styles.bigStat}>
          <Text style={styles.bigStatValue}>{session.distance_km.toFixed(2)}</Text>
          <Text style={styles.bigStatLabel}>CHILOMETRI</Text>
        </View>

        <View style={styles.statsRow}>
          <Stat label="DURATA" value={formatTime(session.duration_seconds)} />
          <Stat label="PASSO" value={pace ? `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, '0')}` : '--'} />
          <Stat label="KCAL" value={String(session.calories ?? '--')} />
        </View>

        {session.locations && session.locations.length > 1 ? <Route coords={session.locations} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function Route({ coords }: { coords: { lat: number; lng: number }[] }) {
  const lats = coords.map(c => c.lat); const lngs = coords.map(c => c.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const W = 340, H = 200, P = 12;
  const dLat = Math.max(maxLat - minLat, 0.0001);
  const dLng = Math.max(maxLng - minLng, 0.0001);
  const pts = coords.map(c => {
    const x = P + ((c.lng - minLng) / dLng) * (W - 2 * P);
    const y = H - P - ((c.lat - minLat) / dLat) * (H - 2 * P);
    return `${x},${y}`;
  }).join(' ');
  return (
    <View style={styles.routeBox}>
      <Text style={styles.routeLabel}>PERCORSO</Text>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Polyline points={pts} fill="none" stroke={colors.primary} strokeWidth={4} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  backBtn: { marginBottom: spacing.md },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  completedText: { color: colors.success, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', marginTop: spacing.sm },
  date: { color: colors.textSecondary, marginTop: 4 },
  bigStat: { alignItems: 'center', marginTop: spacing.xl },
  bigStatValue: { color: colors.textPrimary, fontSize: 88, fontWeight: '900', letterSpacing: -3, fontVariant: ['tabular-nums'] },
  bigStatLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 3 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  statBox: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.md, borderRadius: radius.lg, alignItems: 'center' },
  statVal: { color: colors.textPrimary, fontSize: 20, fontWeight: '900' },
  statLbl: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  routeBox: { marginTop: spacing.xl, backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  routeLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 2, padding: spacing.sm },
});
