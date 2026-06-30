/**
 * Run · "Scegli l'attività" (RunHub 1.6 Lab Edition)
 * - Color-shift dinamico (Corsa arancione · Camminata verde · Bici blu)
 * - Icone custom: /assets/lab/activity/* + /assets/lab/icons/*
 * - Settings modal (unità · countdown · auto-pausa · schermo · audio · vibrazione)
 *   persistiti in AsyncStorage 'runhub.run.settings.v1'
 * - Diagnostica GPS → naviga a /gps-test esistente
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, StatusBar, Modal, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Settings, Target, ChevronRight, X, Check } from 'lucide-react-native';
import { tokens, FontProvider } from '../../src/design-system';
import { useT } from '../../src/i18n';

const { brand, neutral, text, semantic, spacing, typography, radius } = tokens;

type ActivityKey = 'run' | 'walk' | 'bike';

const THEMES: Record<ActivityKey, { primary: string; subtle: string; light: string }> = {
  run:  { primary: brand.primary, subtle: brand.subtle, light: brand.light },
  walk: { primary: '#16A34A',     subtle: '#D1FAE5',    light: '#A7F3D0' },
  bike: { primary: '#2563EB',     subtle: '#DBEAFE',    light: '#BFDBFE' },
};

const ACTIVITIES: Array<{
  key: ActivityKey;
  nameKey: string;
  icon: any;
  ctaKey: string;
  descKey: string;
}> = [
  { key: 'run',  nameKey: 'run.act_run_name',  icon: require('../../assets/lab/activity/corsa.png'),
    ctaKey: 'run.act_run_cta',  descKey: 'run.act_run_desc' },
  { key: 'walk', nameKey: 'run.act_walk_name', icon: require('../../assets/lab/activity/camminata.png'),
    ctaKey: 'run.act_walk_cta', descKey: 'run.act_walk_desc' },
  { key: 'bike', nameKey: 'run.act_bike_name', icon: require('../../assets/lab/activity/bici.png'),
    ctaKey: 'run.act_bike_cta', descKey: 'run.act_bike_desc' },
];

const ICON_GPS         = require('../../assets/lab/icons/gps.png');
const ICON_PERCORSO    = require('../../assets/lab/icons/percorso.png');
const ICON_TEMPO       = require('../../assets/lab/icons/tempo.png');
const ICON_VELOCITA    = require('../../assets/lab/icons/velocita.png');
const ICON_POSIZIONE   = require('../../assets/lab/icons/posizione.png');
const ICON_SETTINGS    = require('../../assets/lab/icons/impostazioni.png');
const ICON_DIAGNOSTICA = require('../../assets/lab/icons/diagnostica.png');

// ── Settings ─────────────────────────────────────────────
type RunSettings = {
  unit: 'km' | 'mi';
  countdown: 0 | 3 | 5;
  autoPause: boolean;
  screenOn: boolean;
  audioCue: boolean;
  vibration: boolean;
};
const SETTINGS_KEY = 'runhub.run.settings.v1';
const DEFAULT_SETTINGS: RunSettings = {
  unit: 'km', countdown: 3, autoPause: true, screenOn: true, audioCue: true, vibration: true,
};

function RunInner() {
  const router = useRouter();
  const { t } = useT();
  const [selected, setSelected] = useState<ActivityKey>('run');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<RunSettings>(DEFAULT_SETTINGS);
  const theme = THEMES[selected];
  const current = ACTIVITIES.find(a => a.key === selected)!;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch {}
    })();
  }, []);

  const saveSettings = async (next: RunSettings) => {
    setSettings(next);
    try { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
  };

  const startSession = () => {
    const title = t(current.nameKey) || 'Corsa';
    router.push({
      pathname: '/run-active',
      params: { title, activity_type: selected },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={text.primary} strokeWidth={2.2} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setSettingsOpen(true)}>
          <Image source={ICON_SETTINGS} style={styles.iconBtnImg} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* BRAND + KICKER */}
        <View style={styles.brandRow}>
          <Image source={require('../../assets/lab/logo-symbol.png')} style={styles.logo} />
          <Text style={styles.brandText}>RUNHUB <Text style={{ color: brand.primary }}>LAB</Text></Text>
        </View>
        <Text style={[styles.kicker, { color: theme.primary }]}>{t('run.tab_eyebrow')}</Text>

        {/* TITLE */}
        <Text style={styles.title}>{t('run.tab_title')}</Text>
        <Text style={styles.subtitle}>{t('run.tab_subtitle')}</Text>

        {/* ACTIVITY GRID 3 columns */}
        <View style={styles.grid}>
          {ACTIVITIES.map(act => {
            const isSel = act.key === selected;
            const actTheme = THEMES[act.key];
            return (
              <TouchableOpacity
                key={act.key}
                style={[
                  styles.actCard,
                  isSel && { borderColor: actTheme.primary, borderWidth: 2 },
                ]}
                onPress={() => setSelected(act.key)}
                activeOpacity={0.85}
              >
                <View style={[styles.actIconWrap, { backgroundColor: actTheme.subtle }]}>
                  <Image source={act.icon} style={styles.actIcon} resizeMode="contain" />
                </View>
                <Text style={[styles.actName, isSel && { color: actTheme.primary }]}>{t(act.nameKey)}</Text>
                {isSel ? <View style={[styles.actUnderline, { backgroundColor: actTheme.primary }]} /> : null}
                {isSel ? (
                  <View style={[styles.actCheck, { backgroundColor: actTheme.primary }]}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* DETAIL CARD */}
        <View style={[styles.detailCard, { borderLeftColor: theme.primary, backgroundColor: theme.subtle + '40' }]}>
          <View style={styles.detailHead}>
            <View style={[styles.detailIconWrap, { backgroundColor: theme.subtle }]}>
              <Image source={current.icon} style={styles.detailIcon} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailName, { color: theme.primary }]}>{t(current.nameKey)}</Text>
              <Text style={styles.detailDesc}>{t(current.descKey)}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCol icon={ICON_GPS}      label={t('run.stat_tracking')}      value={t('run.stat_gps')} />
            <StatCol icon={ICON_PERCORSO} label={t('run.stat_distance_label')} value={t('run.stat_time_label')} />
            <StatCol icon={ICON_VELOCITA} label={t('run.stat_pace_label')}     value={t('run.stat_live')} />
          </View>

          <View style={styles.permCard}>
            <Image source={ICON_POSIZIONE} style={styles.permIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.permTitle}>{t('run.perm_title')}</Text>
              <Text style={styles.permDesc}>{t('run.perm_desc')}</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: theme.primary }]}
          onPress={startSession}
          activeOpacity={0.88}
        >
          <Image source={current.icon} style={styles.ctaIcon} resizeMode="contain" />
          <Text style={styles.ctaText}>{t(current.ctaKey)}</Text>
        </TouchableOpacity>

        {/* DIAGNOSTICA */}
        <TouchableOpacity style={styles.diagLink} onPress={() => router.push('/gps-test')}>
          <Image source={ICON_DIAGNOSTICA} style={styles.diagIcon} />
          <Text style={styles.diagText}>{t('run.diag_gps')}</Text>
          <ChevronRight size={14} color={text.muted} strokeWidth={2} />
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* SETTINGS MODAL */}
      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={saveSettings}
      />
    </SafeAreaView>
  );
}

function StatCol({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.statCol}>
      <Image source={icon} style={styles.statIcon} resizeMode="contain" />
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// SETTINGS MODAL
// ─────────────────────────────────────────────────────────
function SettingsModal({
  visible, onClose, settings, onChange,
}: { visible: boolean; onClose: () => void; settings: RunSettings; onChange: (s: RunSettings) => void }) {
  const { t } = useT();
  const set = <K extends keyof RunSettings>(k: K, v: RunSettings[K]) =>
    onChange({ ...settings, [k]: v });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('run.settings_title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={20} color={text.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.modalSection}>{t('run.settings_section_session')}</Text>

            <Row label={t('run.settings_unit')}>
              <SegmentedControl
                value={settings.unit}
                options={[{ v: 'km', l: t('run.settings_unit_km') }, { v: 'mi', l: t('run.settings_unit_mi') }]}
                onChange={(v) => set('unit', v as 'km' | 'mi')}
              />
            </Row>

            <Row label={t('run.settings_countdown')}>
              <SegmentedControl
                value={String(settings.countdown)}
                options={[{ v: '0', l: t('run.settings_off') }, { v: '3', l: '3s' }, { v: '5', l: '5s' }]}
                onChange={(v) => set('countdown', Number(v) as 0 | 3 | 5)}
              />
            </Row>

            <SwitchRow label={t('run.settings_autopause')} desc={t('run.settings_autopause_desc')}
              value={settings.autoPause} onChange={(v) => set('autoPause', v)} />

            <SwitchRow label={t('run.settings_screen_on')} desc={t('run.settings_screen_on_desc')}
              value={settings.screenOn} onChange={(v) => set('screenOn', v)} />

            <Text style={styles.modalSection}>{t('run.settings_section_feedback')}</Text>

            <SwitchRow label={t('run.settings_audio_cue')} desc={t('run.settings_audio_cue_desc')}
              value={settings.audioCue} onChange={(v) => set('audioCue', v)} />

            <SwitchRow label={t('run.settings_vibration')} desc={t('run.settings_vibration_desc')}
              value={settings.vibration} onChange={(v) => set('vibration', v)} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function SwitchRow({ label, desc, value, onChange }:
  { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: neutral.surfaceSoft, true: brand.subtle }}
        thumbColor={value ? brand.primary : '#fff'} />
    </View>
  );
}

function SegmentedControl<T extends string>({ value, options, onChange }:
  { value: T; options: Array<{ v: T; l: string }>; onChange: (v: T) => void }) {
  return (
    <View style={styles.segControl}>
      {options.map(opt => {
        const active = opt.v === value;
        return (
          <TouchableOpacity
            key={opt.v}
            style={[styles.segBtn, active && styles.segBtnActive]}
            onPress={() => onChange(opt.v)}
          >
            <Text style={[styles.segBtnText, active && { color: '#fff' }]}>{opt.l}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function RunScreen() {
  return (
    <FontProvider>
      <RunInner />
    </FontProvider>
  );
}

// ─────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginApp, paddingTop: spacing.sm, paddingBottom: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: neutral.card,
    borderWidth: 1, borderColor: neutral.border, alignItems: 'center', justifyContent: 'center' },
  iconBtnImg: { width: 18, height: 18 },

  scroll: { paddingHorizontal: spacing.marginApp, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  logo: { width: 24, height: 24 },
  brandText: { ...typography.bodyBold, color: text.primary, fontSize: 14, letterSpacing: 0.8 },

  kicker: { ...typography.kpiLabel, fontSize: 11, marginTop: spacing.lg, letterSpacing: 1.2 },
  title: { ...typography.sectionTitle, color: text.primary, fontSize: 32, marginTop: 4, letterSpacing: -0.5 },
  subtitle: { ...typography.body, color: text.secondary, fontSize: 14, marginTop: 6, lineHeight: 21 },

  grid: { flexDirection: 'row', gap: 10, marginTop: spacing.xl },
  actCard: { flex: 1, backgroundColor: neutral.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: neutral.border, paddingVertical: 18, alignItems: 'center', position: 'relative' },
  actIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actIcon: { width: 40, height: 40 },
  actName: { ...typography.bodyBold, color: text.primary, fontSize: 13 },
  actUnderline: { width: 24, height: 3, borderRadius: 999, marginTop: 6 },
  actCheck: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center' },

  detailCard: { borderRadius: radius.card, borderLeftWidth: 4, padding: spacing.md, marginTop: spacing.lg, gap: spacing.md },
  detailHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  detailIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  detailIcon: { width: 38, height: 38 },
  detailName: { ...typography.bodyBold, fontSize: 18 },
  detailDesc: { ...typography.caption, color: text.secondary, marginTop: 4, fontSize: 13, lineHeight: 18 },

  statsRow: { flexDirection: 'row', backgroundColor: neutral.card, borderRadius: 12,
    paddingVertical: 12, borderWidth: 1, borderColor: neutral.border },
  statCol: { flex: 1, alignItems: 'center', gap: 4 },
  statIcon: { width: 22, height: 22 },
  statLabel: { ...typography.kpiLabel, color: text.muted, fontSize: 9, letterSpacing: 0.5 },
  statValue: { ...typography.bodyBold, color: text.primary, fontSize: 12 },

  permCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: neutral.card,
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: neutral.border },
  permIcon: { width: 28, height: 28 },
  permTitle: { ...typography.bodyBold, color: text.primary, fontSize: 13 },
  permDesc: { ...typography.caption, color: text.muted, fontSize: 11, marginTop: 2 },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 18, borderRadius: radius.button, marginTop: spacing.xl },
  ctaIcon: { width: 24, height: 24 },
  ctaText: { ...typography.kpiLabel, color: '#fff', fontSize: 13 },

  diagLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, marginTop: 4 },
  diagIcon: { width: 16, height: 16 },
  diagText: { ...typography.body, color: text.muted, fontSize: 13 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: neutral.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 6, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: neutral.border },
  modalTitle: { ...typography.bodyBold, color: text.primary, fontSize: 17 },
  modalClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: neutral.surfaceSoft },
  modalSection: { ...typography.kpiLabel, color: text.muted, fontSize: 11,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 4 },

  settingRow: { paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral.border },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: neutral.border },
  settingLabel: { ...typography.bodyBold, color: text.primary, fontSize: 14 },
  settingDesc: { ...typography.caption, color: text.muted, fontSize: 11, marginTop: 2 },

  segControl: { flexDirection: 'row', backgroundColor: neutral.surfaceSoft, borderRadius: 10, padding: 3, gap: 2 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  segBtnActive: { backgroundColor: brand.primary },
  segBtnText: { ...typography.kpiLabel, color: text.secondary, fontSize: 11 },
});
