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
    Alert.alert(t('workouts.delete_goal_title'), t('workouts.delete_goal_confirm'), [
      { text: t('workouts.cancel'), style: 'cancel' },
      {
        text: t('workouts.delete_confirm_btn'), style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/goals/${goal_id}`);
            setGoals(prev => prev.filter(g => g.goal_id !== goal_id));
          } catch {
            Alert.alert(t('workouts.error'), t('workouts.delete_goal_error'));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />

      <View style={styles.header}>
        <Text style={styles.title}>{t('workouts.title')}</Text>
        <Text style={styles.subtitle}>{t('workouts.subtitle')}</Text>
      </View>

      <View style={styles.segment}>
        <SegmentBtn label={t('workouts.seg_plan')} Icon={Calendar} active={mode === 'piano'} onPress={() => setMode('piano')} />
        <SegmentBtn label={t('workouts.seg_goals')} Icon={Target} active={mode === 'obiettivi'} onPress={() => setMode('obiettivi')} />
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
  const { t } = useT();
  return (
    <>
      <Card>
        <Text style={styles.kicker}>{t('workouts.your_plans_kicker')}</Text>
        <Text style={styles.todayTitle}>{t('workouts.plans_title')}</Text>
        <Text style={styles.todayMeta}>{t('workouts.plans_meta')}</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/plans')} activeOpacity={0.85}>
          <Text style={styles.ctaBtnText}>{t('workouts.view_plans')}</Text>
          <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </Card>

      <Card>
        <View style={styles.aiRow}>
          <Sparkles size={20} color={brand.primary} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>{t('workouts.ai_coach_title')}</Text>
            <Text style={styles.aiSub}>{t('workouts.ai_coach_sub')}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/ai-generate')} activeOpacity={0.85}>
          <Text style={styles.ctaBtnText}>{t('workouts.generate_ai_plan')}</Text>
          <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </Card>

      <Card>
        <View style={styles.aiRow}>
          <TrendingUp size={20} color={semantic.info} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>{t('workouts.race_predictor_title')}</Text>
            <Text style={styles.aiSub}>{t('workouts.race_predictor_sub')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: semantic.info }]}
          onPress={() => router.push('/race-predictor')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>{t('workouts.open_predictor')}</Text>
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
  const { t } = useT();

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
        <Text style={styles.addGoalBtnText}>{t('workouts.add_goal')}</Text>
      </TouchableOpacity>

      {goals.length === 0 ? (
        <Card>
          <View style={styles.emptyGoals}>
            <Flag size={32} color={text.muted} strokeWidth={1.5} />
            <Text style={styles.emptyGoalsTitle}>{t('workouts.no_goals_title')}</Text>
            <Text style={styles.emptyGoalsSub}>{t('workouts.no_goals_sub')}</Text>
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
  const { t } = useT();
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
        <Text style={styles.probLabel}>{t('workouts.probability')}</Text>
      </View>
      <View style={styles.probTrack}>
        <View style={[styles.probFill, { width: `${prob}%` as any, backgroundColor: probColor }]} />
      </View>

      <View style={styles.goalFooter}>
        <View style={styles.goalFooterItem}>
          <Clock size={12} color={text.muted} strokeWidth={2} />
          <Text style={styles.goalFooterText}>{daysLeft} {t('workouts.days_to_goal')}</Text>
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
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<GoalType>('race');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !targetDate.trim()) {
      Alert.alert(t('workouts.missing_fields_title'), t('workouts.missing_fields_body'));
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
      Alert.alert(t('workouts.error'), t('workouts.save_goal_error'));
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = (tp: GoalType) => {
    if (tp === 'race') return t('workouts.type_race');
    if (tp === 'pace') return t('workouts.type_pace');
    return t('workouts.type_distance');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('workouts.new_goal')}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>{t('workouts.cancel')}</Text></TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          <Text style={styles.fieldLabel}>{t('workouts.field_title')}</Text>
          <TextInput style={styles.fieldInput} value={title} onChangeText={setTitle}
            placeholder={t('workouts.field_title_placeholder')} placeholderTextColor={text.muted} />

          <Text style={styles.fieldLabel}>{t('workouts.field_type')}</Text>
          <View style={styles.typeRow}>
            {(['race', 'pace', 'distance'] as GoalType[]).map(tp => (
              <TouchableOpacity
                key={tp}
                style={[styles.typeBtn, type === tp && styles.typeBtnActive]}
                onPress={() => setType(tp)}
              >
                <Text style={[styles.typeBtnText, type === tp && styles.typeBtnTextActive]}>
                  {typeLabel(tp)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {type === 'pace' && (
            <>
              <Text style={styles.fieldLabel}>{t('workouts.field_pace_target')}</Text>
              <TextInput style={styles.fieldInput} value={targetValue} onChangeText={setTargetValue}
                placeholder="5.5" placeholderTextColor={text.muted} keyboardType="decimal-pad" />
            </>
          )}
          {type === 'distance' && (
            <>
              <Text style={styles.fieldLabel}>{t('workouts.field_distance_target')}</Text>
              <TextInput style={styles.fieldInput} value={targetValue} onChangeText={setTargetValue}
                placeholder="21.1" placeholderTextColor={text.muted} keyboardType="decimal-pad" />
            </>
          )}

          <Text style={styles.fieldLabel}>{t('workouts.field_date_target')}</Text>
          <TextInput style={styles.fieldInput} value={targetDate} onChangeText={setTargetDate}
            placeholder="2026-10-15" placeholderTextColor={text.muted} />

          <TouchableOpacity style={styles.saveGoalBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> :
              <Text style={styles.saveGoalBtnText}>{t('workouts.save_goal')}</Text>}
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
