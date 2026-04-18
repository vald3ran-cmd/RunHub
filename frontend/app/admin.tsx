import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { colors, spacing, radius } from '../src/theme';

type AdminUser = {
  user_id: string; email: string; name: string; level: string;
  tier?: string; is_premium: boolean; role?: string;
  workout_count: number; created_at: string;
};

export default function AdminPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      Alert.alert('Errore', typeof d === 'string' ? d : 'Caricamento fallito');
    } finally { setLoading(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const remove = (u: AdminUser) => {
    Alert.alert(
      'Eliminare account?',
      `${u.name} (${u.email})\n\nQuesta azione cancellera\' l'utente e tutti i suoi dati (corse, piani, badge).`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/admin/users/${u.user_id}`);
            await load();
          } catch (e: any) {
            const d = e?.response?.data?.detail;
            Alert.alert('Errore', typeof d === 'string' ? d : 'Eliminazione fallita');
          }
        }}
      ]
    );
  };

  const tierColor = (t?: string) => {
    if (t === 'elite') return '#F59E0B';
    if (t === 'performance') return colors.primary;
    if (t === 'starter') return '#10B981';
    return colors.textMuted;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>ADMIN PANEL</Text>
          <Text style={styles.sub}>{users.length} utenti totali</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
        >
          {users.map(u => (
            <View key={u.user_id} style={styles.card} testID={`admin-user-${u.user_id}`}>
              <View style={[styles.avatar, { backgroundColor: tierColor(u.tier) }]}>
                <Text style={styles.avatarText}>{u.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>{u.name}</Text>
                  {u.role === 'admin' ? (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminText}>ADMIN</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.email} numberOfLines={1}>{u.email}</Text>
                <View style={styles.meta}>
                  <View style={[styles.tierBadge, { backgroundColor: tierColor(u.tier) }]}>
                    <Text style={styles.tierText}>{(u.tier || 'free').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.metaText}>{u.workout_count} corse</Text>
                </View>
              </View>
              {u.role !== 'admin' ? (
                <TouchableOpacity
                  testID={`delete-user-${u.user_id}`}
                  style={styles.deleteBtn} onPress={() => remove(u)}
                >
                  <Ionicons name="trash" size={18} color={colors.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  sub: { color: colors.textSecondary, fontSize: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '800', flexShrink: 1 },
  adminBadge: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  adminText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  email: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  meta: { flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' },
  tierBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  tierText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  metaText: { color: colors.textSecondary, fontSize: 11 },
  deleteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
});
