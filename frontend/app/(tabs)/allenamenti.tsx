/**
 * Allenamenti — Toggle PIANO ↔ OBIETTIVI.
 * - PIANO: piano corrente (predefinito o AI) + sessione di oggi/settimana.
 * - OBIETTIVI: gare/target con probabilità raggiungimento.
 *
 * Per ora UI placeholder con dati mock + CTA verso le pagine esistenti
 * (plans, race-predictor, ai-generate). Verrà completamente collegata in 1.6.x.
 */
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Calendar, Target, Sparkles, ChevronRight, TrendingUp, Plus, Trophy,
} from 'lucide-react-native';
import { tokens, FontProvider, Card } from '../../src/design-system';
import { AdBanner } from '../../src/Ads';
import { useT } from '../../src/i18n';

const { brand, neutral, text, semantic, spacing, typography, radius } = tokens;

type Mode = 'piano' | 'obiettivi';

function AllenamentiInner() {
  const router = useRouter();
  const { t } = useT();
  const [mode, setMode] = useState<Mode>('piano');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('workouts.title')}</Text>
        <Text style={styles.subtitle}>{t('workouts.subtitle')}</Text>
      </View>

      {/* SEGMENTED CONTROL */}
      <View style={styles.segment}>
        <SegmentBtn label={t('workouts.seg_plan')} Icon={Calendar} active={mode === 'piano'} onPress={() => setMode('piano')} />
        <SegmentBtn label={t('workouts.seg_goals')} Icon={Target} active={mode === 'obiettivi'} onPress={() => setMode('obiettivi')} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {mode === 'piano' ? <PianoView router={router} t={t} /> : <ObiettiviView router={router} t={t} />}
        <AdBanner />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PianoView({ router, t }: { router: any; t: (k: string, opts?: any) => string }) {
  return (
    <>
      {/* TODAY CARD */}
      <Card>
        <Text style={styles.kicker}>{t('workouts.today_kicker')}</Text>
        <View style={styles.todayRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.todayTitle}>{t('workouts.today_title')}</Text>
            <Text style={styles.todayMeta}>{t('workouts.today_meta')}</Text>
          </View>
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>{t('workouts.today_badge')}</Text>
          </View>
        </View>
        <View style={styles.todayCtaRow}>
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={() => router.push('/(tabs)/run')}
          >
            <Text style={styles.primaryCtaText}>{t('workouts.start_session')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostCta}>
            <Text style={styles.ghostCtaText}>{t('workouts.skip')}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* WEEK OVERVIEW */}
      <Card>
        <View style={styles.weekHead}>
          <Text style={styles.sectionTitle}>{t('workouts.week_label')}</Text>
          <Text style={styles.sectionSub}>{t('workouts.week_done')}</Text>
        </View>
        <View style={styles.weekRow}>
          {['L','M','M','G','V','S','D'].map((d, i) => {
            const done = i < 3;
            const today = i === 1;
            const planned = !done && i % 2 === 1;
            return (
              <View key={i} style={styles.weekDay}>
                <Text style={styles.weekDayLabel}>{d}</Text>
                <View style={[
                  styles.weekDot,
                  done && { backgroundColor: semantic.success },
                  planned && { backgroundColor: brand.subtle, borderColor: brand.primary, borderWidth: 1.5 },
                  today && { borderColor: brand.primary, borderWidth: 2 },
                ]} />
              </View>
            );
          })}
        </View>
      </Card>

      {/* ACTIVE PLAN */}
      <Card>
        <View style={styles.planHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{t('workouts.plan_active_kicker')}</Text>
            <Text style={styles.planTitle}>{t('workouts.plan_active_title')}</Text>
            <Text style={styles.planMeta}>{t('workouts.plan_active_meta')}</Text>
          </View>
          <ChevronRight size={20} color={text.muted} strokeWidth={2} />
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
      </Card>

      {/* AI BANNER */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/ai-generate')}
        style={styles.aiBanner}
      >
        <View style={styles.aiIconWrap}>
          <Sparkles size={20} color={brand.primary} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiTitle}>{t('workouts.ai_title')}</Text>
          <Text style={styles.aiBody}>{t('workouts.ai_body')}</Text>
        </View>
        <ChevronRight size={18} color={brand.primary} strokeWidth={2.4} />
      </TouchableOpacity>

      {/* PREDEFINED PLANS */}
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.linkRow}
        onPress={() => router.push('/(tabs)/plans')}
      >
        <Text style={styles.linkRowText}>{t('workouts.browse_plans')}</Text>
        <ChevronRight size={16} color={text.muted} strokeWidth={2} />
      </TouchableOpacity>
    </>
  );
}

function ObiettiviView({ router, t }: { router: any; t: (k: string, opts?: any) => string }) {
  return (
    <>
      {/* MAIN GOAL */}
      <Card>
        <View style={styles.goalHeader}>
          <View style={styles.goalIcon}>
            <Trophy size={20} color={brand.primary} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{t('workouts.main_goal_kicker')}</Text>
            <Text style={styles.goalTitle}>{t('workouts.main_goal_title')}</Text>
            <Text style={styles.goalMeta}>{t('workouts.main_goal_meta')}</Text>
          </View>
        </View>

        <View style={styles.probaWrap}>
          <Text style={styles.probaLabel}>{t('workouts.proba_label')}</Text>
          <View style={styles.probaRow}>
            <Text style={styles.probaValue}>76<Text style={styles.probaUnit}>%</Text></Text>
            <View style={styles.probaBadge}>
              <TrendingUp size={12} color={semantic.success} strokeWidth={2.5} />
              <Text style={styles.probaBadgeText}>{t('workouts.proba_badge')}</Text>
            </View>
          </View>
          <View style={styles.probaTrack}>
            <View style={[styles.probaFill, { width: '76%' }]} />
          </View>
          <Text style={styles.probaHint}>
            {t('workouts.proba_hint')}
          </Text>
        </View>
      </Card>

      {/* RACE PREDICTOR LINK */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.predictorCard}
        onPress={() => router.push('/race-predictor')}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.predictorTitle}>{t('workouts.predictor_title')}</Text>
          <Text style={styles.predictorBody}>{t('workouts.predictor_body')}</Text>
        </View>
        <ChevronRight size={20} color={brand.primary} strokeWidth={2.4} />
      </TouchableOpacity>

      {/* GOAL LIST */}
      <Text style={styles.sectionLabel}>{t('workouts.other_goals')}</Text>
      <Card>
        <View style={styles.smallGoalRow}>
          <View style={[styles.smallGoalDot, { backgroundColor: semantic.success }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.smallGoalTitle}>{t('workouts.goal_5_week_title')}</Text>
            <Text style={styles.smallGoalMeta}>{t('workouts.goal_5_week_meta')}</Text>
          </View>
          <Text style={styles.smallGoalPct}>60%</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.smallGoalRow}>
          <View style={[styles.smallGoalDot, { backgroundColor: semantic.warning }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.smallGoalTitle}>{t('workouts.goal_volume_title')}</Text>
            <Text style={styles.smallGoalMeta}>{t('workouts.goal_volume_meta')}</Text>
          </View>
          <Text style={styles.smallGoalPct}>61%</Text>
        </View>
      </Card>

      {/* ADD GOAL */}
      <TouchableOpacity style={styles.addGoalBtn}>
        <Plus size={16} color={brand.primary} strokeWidth={2.4} />
        <Text style={styles.addGoalText}>{t('workouts.add_goal')}</Text>
      </TouchableOpacity>
    </>
  );
}

function SegmentBtn({ label, Icon, active, onPress }:
  { label: string; Icon: any; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.segBtn, active && styles.segBtnActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon size={15} color={active ? '#fff' : text.secondary} strokeWidth={2.2} />
      <Text style={[styles.segBtnText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AllenamentiScreen() {
  return (
    <FontProvider>
      <AllenamentiInner />
    </FontProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },
  header: { paddingHorizontal: spacing.marginApp, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { ...typography.sectionTitle, color: text.primary, fontSize: 28 },
  subtitle: { ...typography.caption, color: text.muted, marginTop: 2 },

  segment: {
    flexDirection: 'row',
    marginHorizontal: spacing.marginApp,
    backgroundColor: neutral.surfaceSoft,
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.md,
  },
  segBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  segBtnActive: { backgroundColor: brand.primary },
  segBtnText: { ...typography.kpiLabel, color: text.secondary, fontSize: 11 },

  scroll: { paddingHorizontal: spacing.marginApp, gap: spacing.md },

  kicker: { ...typography.kpiLabel, color: text.muted, fontSize: 10 },

  todayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  todayTitle: { ...typography.bodyBold, color: text.primary, fontSize: 18 },
  todayMeta: { ...typography.caption, color: text.secondary, marginTop: 2 },
  todayBadge: {
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: brand.subtle, borderRadius: 999,
  },
  todayBadgeText: { ...typography.kpiLabel, color: brand.dark, fontSize: 9 },
  todayCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md },
  primaryCta: {
    flex: 1, paddingVertical: 12,
    backgroundColor: brand.primary, borderRadius: radius.button,
    alignItems: 'center',
  },
  primaryCtaText: { ...typography.kpiLabel, color: '#fff', fontSize: 11 },
  ghostCta: { paddingHorizontal: 14, paddingVertical: 12 },
  ghostCtaText: { ...typography.body, color: text.muted, fontSize: 13 },

  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.md },
  sectionTitle: { ...typography.kpiLabel, color: text.primary },
  sectionSub: { ...typography.caption, color: text.muted },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 6 },
  weekDayLabel: { ...typography.kpiLabel, color: text.muted, fontSize: 10 },
  weekDot: {
    width: 24, height: 24, borderRadius: 999,
    backgroundColor: neutral.surfaceSoft,
  },

  planHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planTitle: { ...typography.bodyBold, color: text.primary, fontSize: 15, marginTop: 4 },
  planMeta: { ...typography.caption, color: text.muted, marginTop: 2 },
  progressTrack: {
    height: 6, backgroundColor: neutral.surfaceSoft, borderRadius: 999,
    marginTop: spacing.md, overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: brand.primary, borderRadius: 999 },

  aiBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: brand.subtle, borderRadius: radius.card,
    borderWidth: 1, borderColor: brand.light,
    padding: spacing.md,
  },
  aiIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  aiTitle: { ...typography.bodyBold, color: text.primary, fontSize: 14 },
  aiBody: { ...typography.caption, color: text.secondary, marginTop: 2, fontSize: 12 },

  linkRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: spacing.md,
    backgroundColor: neutral.card, borderRadius: 12,
    borderWidth: 1, borderColor: neutral.border,
  },
  linkRowText: { ...typography.body, color: text.primary, flex: 1, fontSize: 14 },

  // OBIETTIVI
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  goalIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: brand.subtle, alignItems: 'center', justifyContent: 'center',
  },
  goalTitle: { ...typography.kpiValue, color: text.primary, fontSize: 22, marginTop: 4 },
  goalMeta: { ...typography.caption, color: text.muted, marginTop: 2 },

  probaWrap: { gap: 6, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: neutral.border },
  probaLabel: { ...typography.kpiLabel, color: text.muted, fontSize: 10, marginTop: spacing.sm },
  probaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  probaValue: { ...typography.heroMetric, color: brand.primary, fontSize: 42 },
  probaUnit: { ...typography.body, color: text.muted, fontSize: 16 },
  probaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: '#ECFDF5', borderRadius: 999,
  },
  probaBadgeText: { ...typography.kpiLabel, color: semantic.success, fontSize: 9 },
  probaTrack: { height: 6, backgroundColor: neutral.surfaceSoft, borderRadius: 999, marginTop: 4 },
  probaFill: { height: 6, backgroundColor: brand.primary, borderRadius: 999 },
  probaHint: { ...typography.caption, color: text.secondary, marginTop: 6, fontSize: 12 },

  predictorCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: '#0F172A', borderRadius: radius.card,
    padding: spacing.lg,
  },
  predictorTitle: { ...typography.bodyBold, color: '#fff', fontSize: 16 },
  predictorBody: { ...typography.caption, color: '#94A3B8', marginTop: 4, fontSize: 12 },

  sectionLabel: {
    ...typography.kpiLabel, color: text.muted, fontSize: 10,
    marginTop: spacing.sm,
  },

  smallGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  smallGoalDot: { width: 10, height: 10, borderRadius: 999 },
  smallGoalTitle: { ...typography.body, color: text.primary, fontSize: 13 },
  smallGoalMeta: { ...typography.caption, color: text.muted, marginTop: 2 },
  smallGoalPct: { ...typography.monoInline, color: text.primary, fontSize: 13 },
  divider: { height: 1, backgroundColor: neutral.border, marginVertical: spacing.sm },

  addGoalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, backgroundColor: neutral.card,
    borderWidth: 1, borderStyle: 'dashed', borderColor: brand.primary,
    borderRadius: radius.card,
  },
  addGoalText: { ...typography.kpiLabel, color: brand.primary, fontSize: 11 },
});
