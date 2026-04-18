import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  Modal, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { colors, spacing, radius } from '../src/theme';

type Athlete = {
  athlete_id: string; name: string; email: string; status: string; created_at: string;
};

export default function CoachDashboard() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/coach/athletes');
      setAthletes(data);
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      if (typeof d === 'string') Alert.alert('Accesso negato', d);
    } finally { setLoading(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const addAthlete = async () => {
    if (!name.trim() || !email.trim()) { Alert.alert('Errore', 'Compila tutti i campi'); return; }
    setSaving(true);
    try {
      await api.post('/coach/athletes', { name: name.trim(), email: email.trim().toLowerCase() });
      setName(''); setEmail(''); setShowAdd(false);
      await load();
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      Alert.alert('Errore', typeof d === 'string' ? d : 'Aggiunta fallita');
    } finally { setSaving(false); }
  };

  const removeAthlete = (a: Athlete) => {
    Alert.alert('Rimuovere atleta?', `${a.name} (${a.email})`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rimuovi', style: 'destructive', onPress: async () => {
        try { await api.delete(`/coach/athletes/${a.athlete_id}`); await load(); } catch {}
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>COACH DASHBOARD</Text>
          <Text style={styles.sub}>I tuoi atleti · {athletes.length}/10</Text>
        </View>
        <TouchableOpacity
          testID="add-athlete-button"
          style={styles.addBtn} onPress={() => setShowAdd(true)} disabled={athletes.length >= 10}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
          {athletes.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nessun atleta ancora.</Text>
              <Text style={styles.emptySub}>Aggiungi fino a 10 atleti per monitorarne i progressi.</Text>
            </View>
          ) : (
            athletes.map(a => (
              <View key={a.athlete_id} style={styles.card} testID={`athlete-card-${a.athlete_id}`}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{a.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{a.name}</Text>
                  <Text style={styles.cardEmail}>{a.email}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: a.status === 'linked' ? colors.success : colors.warning }]}>
                    <Text style={styles.statusText}>{a.status === 'linked' ? 'COLLEGATO' : 'INVITATO'}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeAthlete(a)} testID={`remove-athlete-${a.athlete_id}`}>
                  <Ionicons name="trash" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>AGGIUNGI ATLETA</Text>
            <Text style={styles.label}>NOME</Text>
            <TextInput
              testID="athlete-name-input"
              style={styles.input} value={name} onChangeText={setName}
            />
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              testID="athlete-email-input"
              style={styles.input} value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>ANNULLA</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="submit-add-athlete"
                style={styles.saveBtn} onPress={addAthlete} disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>AGGIUNGI</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  sub: { color: colors.textSecondary, fontSize: 12 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  cardName: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  cardEmail: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm, marginTop: 6 },
  statusText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  emptySub: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.background, padding: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 1, borderColor: colors.border },
  modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: spacing.md },
  label: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: spacing.sm, marginBottom: 4 },
  input: { backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.md, borderRadius: radius.md, fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center' },
  saveBtn: { flex: 1, padding: spacing.md, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center' },
  cancelText: { color: colors.textPrimary, fontWeight: '800', letterSpacing: 1 },
  saveText: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
});
