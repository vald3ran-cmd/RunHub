import React, { useState, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Calendar, Target, Sparkles, ChevronRight, Plus, Trash2,
  TrendingUp, Flag, Zap, Clock,
} from 'lucide-react-native';
import { tokens, FontProvider, Card } from '../../src/design-system';
import { AdBanner } from '../../src/Ads';
import { api } from '../../src/api';
import { useT } from '../../src/i18n';

const { brand, neutral, text, semantic, spacing, typography, radius } = tokens;

type GoalType = 'pace' | 'distance' | 'race';
type Goal = {
  goal_id: string;
  title: string;
  type: GoalType;
  target_value?: number;
  target_date: string;
  probability: number;
};
type Mode = 'piano' | 'obiettivi';

function AllenamentiInner() {
  const router = useRouter();
  const { t } = useT();
  const [mode, setMode] = useState<Mode>('piano');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoadingGoals(true);
    try {
      const { data } = await api.get('/goals');
      setGoals(data || []);
    } catch (e) {
      console.warn('[allenamenti] goals error:', e);
    } finally {
      setLoadingGoals(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchGoals();
  }, [fetchGoals]));

  const deleteGoal = async (goal_id: string) => {
    Alert.alert('Elimina obiettivo', 'Sei sicuro?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/goals/${goal_id}`);
            setGoals(prev => prev.filter(g => g.goal_id !== goal_id));
          } catch {
            Alert.alert('Errore', 'Impossibile eliminare obiettivo.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />

      <View style={styles.header}>
        <Text style={styles.title}>Allenamenti</Text>
        <Text style={styles.subtitle}>Il tuo piano. I tuoi obiettivi.</Text>
      </View>

      <View style={styles.segment}>
        <SegmentBtn label="PIANO" Icon={Calendar} active={mode === 'piano'} onPress={() => setMode('piano')} />
        <SegmentBtn label="OBIETTIVI" Icon={Target} active={mode === 'obiettivi'} onPress={() => setMode('obiettivi')} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {mode === 'piano' ? (
          <PianoView router={router} />
        ) : (
          <ObiettiviView
            goals={goals}
            loading={loadingGoals}
            onDelete={deleteGoal}
            onAdd={() => setShowAddModal(true)}
            router={router}
          />
        )}
        <AdBanner />
        <View style={{ height: 40 }} />
      </ScrollView>

      <AddGoalModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={() => { setShowAddModal(false); fetchGoals(); }}
      />
    </SafeAreaView>
  );
}

// ── PIANO VIEW ──
function PianoView({ router }: { router: any }) {
  return (
    <>
      <Card>
        <Text style={styles.kicker}>I TUOI PIANI</Text>
        <Text style={styles.todayTitle}>Piani di allenamento</Text>
        <Text style={styles.todayMeta}>Predefiniti o generati dall'AI Coach</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/plans')} activeOpacity={0.85}>
          <Text style={styles.ctaBtnText}>VEDI PIANI</Text>
          <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </Card>

      <Card>
        <View style={styles.aiRow}>
          <Sparkles size={20} color={brand.primary} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>AI Coach</Text>
            <Text style={styles.aiSub}>Genera un piano su misura basato sui tuoi dati reali</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/ai-generate')} activeOpacity={0.85}>
          <Text style={styles.ctaBtnText}>GENERA PIANO AI</Text>
          <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </Card>

      <Card>
        <View style={styles.aiRow}>
          <TrendingUp size={20} color={semantic.info} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>Previsione gara</Text>
            <Text style={styles.aiSub}>Stima i tuoi tempi su 5K, 10K, mezza e maratona</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: semantic.info }]}
          onPress={() => router.push('/race-predictor')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>APRI PREVISIONE</Text>
          <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </Card>
    </>
  );
}

// ── OBIETTIVI VIEW ──
function ObiettiviView({ goals, loading, onDelete, onAdd, router }: {
  goals: Goal[]; loading: boolean;
  onDelete: (id: string) => void;
  onAdd: () => void;
  router: any;
}) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity style={styles.addGoalBtn} onPress={onAdd} activeOpacity={0.85}>
        <Plus size={16} color="#fff" strokeWidth={2.5} />
        <Text style={styles.addGoalBtnText}>AGGIUNGI OBIETTIVO</Text>
      </TouchableOpacity>

      {goals.length === 0 ? (
        <Card>
          <View style={styles.emptyGoals}>
            <Flag size={32} color={text.muted} strokeWidth={1.5} />
            <Text style={styles.emptyGoalsTitle}>Nessun obiettivo</Text>
            <Text style={styles.emptyGoalsSub}>
              Aggiungi un obiettivo — gara, pace target o distanza — e vedrai la probabilità di raggiungerlo basata sui tuoi dati reali.
            </Text>
          </View>
        </Card>
      ) : (
        goals.map(goal => <GoalCard key={goal.goal_id} goal={goal} onDelete={onDelete} />)
      )}
    </>
  );
}

// ── GOAL CARD ──
function GoalCard({ goal, onDelete }: { goal: Goal; onDelete: (id: string) => void }) {
  const prob = goal.probability;
  const probColor = prob >= 70 ? semantic.success : prob >= 40 ? semantic.warning : semantic.danger;
  const Icon = goal.type === 'pace' ? Zap : goal.type === 'distance' ? TrendingUp : Flag;

  const daysLeft = (() => {
    try {
      const d = Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000);
      return d > 0 ? d : 0;
    } catch { return 0; }
  })();

  const targetLabel = (() => {
    if (goal.type === 'pace' && goal.target_value) {
      const m = Math.floor(goal.target_value);
      const s = Math.round((goal.target_value - m) * 60);
      return `Pace ${m}:${String(s).padStart(2, '0')} /km`;
    }
    if (goal.type === 'distance' && goal.target_value) return `${goal.target_value} km`;
    return goal.title;
  })();

  return (
    <Card>
      <View style={styles.goalHeader}>
        <View style={[styles.goalIconBox, { backgroundColor: brand.subtle }]}>
          <Icon size={18} color={brand.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalTarget}>{targetLabel}</Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(goal.goal_id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Trash2 size={16} color={text.muted} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.probRow}>
        <Text style={[styles.probValue, { color: probColor }]}>{prob}%</Text>
        <Text style={styles.probLabel}>probabilità</Text>
      </View>
      <View style={styles.probTrack}>
        <View style={[styles.probFill, { width: `${prob}%` as any, backgroundColor: probColor }]} />
      </View>

      <View style={styles.goalFooter}>
        <View style={styles.goalFooterItem}>
          <Clock size={12} color={text.muted} strokeWidth={2} />
          <Text style={styles.goalFooterText}>{daysLeft} giorni al traguardo</Text>
        </View>
        <Text style={styles.goalDate}>
          {new Date(goal.target_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      </View>
    </Card>
  );
}

// ── ADD GOAL MODAL ──
function AddGoalModal({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<GoalType>('race');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !targetDate.trim()) {
      Alert.alert('Campi mancanti', 'Inserisci almeno titolo e data target.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/goals', {
        title: title.trim(),
        type,
        target_value: targetValue ? parseFloat(targetValue) : undefined,
        target_date: targetDate,
      });
      setTitle(''); setType('race'); setTargetValue(''); setTargetDate('');
      onSaved();
    } catch {
      Alert.alert('Errore', 'Impossibile salvare obiettivo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Nuovo obiettivo</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>Annulla</Text></TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          <Text style={styles.fieldLabel}>TITOLO</Text>
          <TextInput style={styles.fieldInput} value={title} onChangeText={setTitle}
            placeholder="es. Maratona di Roma" placeholderTextColor={text.muted} />

          <Text style={styles.fieldLabel}>TIPO</Text>
          <View style={styles.typeRow}>
            {(['race', 'pace', 'distance'] as GoalType[]).map(tp => (
              <TouchableOpacity
                key={tp}
                style={[styles.typeBtn, type === tp && styles.typeBtnActive]}
                onPress={() => setType(tp)}
              >
                <Text style={[styles.typeBtnText, type === tp && styles.typeBtnTextActive]}>
                  {tp === 'race' ? 'GARA' : tp === 'pace' ? 'PACE' : 'DISTANZA'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {type === 'pace' && (
            <>
              <Text style={styles.fieldLabel}>PACE TARGET (min/km, es. 5.5 = 5:30)</Text>
              <TextInput style={styles.fieldInput} value={targetValue} onChangeText={setTargetValue}
                placeholder="5.5" placeholderTextColor={text.muted} keyboardType="decimal-pad" />
            </>
          )}
          {type === 'distance' && (
            <>
              <Text style={styles.fieldLabel}>DISTANZA TARGET (km)</Text>
              <TextInput style={styles.fieldInput} value={targetValue} onChangeText={setTargetValue}
                placeholder="21.1" placeholderTextColor={text.muted} keyboardType="decimal-pad" />
            </>
          )}

          <Text style={styles.fieldLabel}>DATA TARGET (YYYY-MM-DD)</Text>
          <TextInput style={styles.fieldInput} value={targetDate} onChangeText={setTargetDate}
            placeholder="2026-10-15" placeholderTextColor={text.muted} />

          <TouchableOpacity style={styles.saveGoalBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> :
              <Text style={styles.saveGoalBtnText}>SALVA OBIETTIVO</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── HELPERS ──
function SegmentBtn({ label, Icon, active, onPress }: { label: string; Icon: any; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.segBtn, active && styles.segBtnActive]} onPress={onPress} activeOpacity={0.8}>
      <Icon size={14} color={active ? '#fff' : text.secondary} strokeWidth={2.2} />
      <Text style={[styles.segBtnText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AllenamentiScreen() {
  return <FontProvider><AllenamentiInner /></FontProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },
  header: { paddingHorizontal: spacing.marginApp, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.sectionTitle, color: text.primary, fontSize: 26 },
  subtitle: { ...typography.caption, color: text.muted, marginTop: 2 },
  segment: {
    flexDirection: 'row', marginHorizontal: spacing.marginApp,
    backgroundColor: neutral.surfaceSoft, borderRadius: 999,
    padding: 4, gap: 4, marginBottom: spacing.sm,
  },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 999 },
  segBtnActive: { backgroundColor: brand.primary },
  segBtnText: { ...typography.kpiLabel, color: text.secondary, fontSize: 11 },
  scroll: { padding: spacing.marginApp, paddingTop: spacing.sm, gap: spacing.gapSection },
  center: { padding: 40, alignItems: 'center' },

  kicker: { ...typography.kpiLabel, color: text.muted, fontSize: 10, marginBottom: 6 },
  todayTitle: { ...typography.bodyBold, color: text.primary, fontSize: 18 },
  todayMeta: { ...typography.caption, color: text.secondary, marginTop: 4 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: brand.primary,
    paddingVertical: 12, borderRadius: 999, marginTop: spacing.md,
  },
  ctaBtnText: { color: '#fff', ...typography.kpiLabel, fontSize: 11 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  aiTitle: { ...typography.bodyBold, color: text.primary },
  aiSub: { ...typography.caption, color: text.secondary, marginTop: 2 },

  addGoalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: brand.primary,
    paddingVertical: 14, borderRadius: 999,
  },
  addGoalBtnText: { color: '#fff', ...typography.kpiLabel, fontSize: 12 },

  emptyGoals: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyGoalsTitle: { ...typography.bodyBold, color: text.primary, fontSize: 18 },
  emptyGoalsSub: { ...typography.body, color: text.secondary, textAlign: 'center', lineHeight: 21 },

  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  goalIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { ...typography.bodyBold, color: text.primary },
  goalTarget: { ...typography.caption, color: text.secondary, marginTop: 2 },

  probRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6 },
  probValue: { ...typography.kpiValue, fontSize: 28 },
  probLabel: { ...typography.caption, color: text.muted },
  probTrack: { height: 6, borderRadius: 999, backgroundColor: neutral.surfaceSoft, overflow: 'hidden', marginBottom: spacing.md },
  probFill: { height: '100%', borderRadius: 999 },

  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalFooterItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  goalFooterText: { ...typography.caption, color: text.muted },
  goalDate: { ...typography.caption, color: text.muted },

  modalSafe: { flex: 1, backgroundColor: neutral.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.marginApp, borderBottomWidth: 1, borderBottomColor: neutral.border },
  modalTitle: { ...typography.bodyBold, color: text.primary, fontSize: 18 },
  modalClose: { color: brand.primary, fontSize: 16, fontWeight: '600' },
  modalBody: { padding: spacing.marginApp },
  fieldLabel: { ...typography.kpiLabel, color: text.muted, fontSize: 10, marginBottom: 6, marginTop: spacing.md },
  fieldInput: { borderWidth: 1, borderColor: neutral.border, borderRadius: 10, padding: 12, color: text.primary, fontSize: 15, backgroundColor: neutral.card },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: neutral.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  typeBtnText: { ...typography.kpiLabel, color: text.secondary, fontSize: 10 },
  typeBtnTextActive: { color: '#fff' },
  saveGoalBtn: { backgroundColor: brand.primary, paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  saveGoalBtnText: { color: '#fff', ...typography.kpiLabel, fontSize: 12 },
});
