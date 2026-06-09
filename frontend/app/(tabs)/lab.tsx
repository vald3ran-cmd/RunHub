/**
 * Lab — Tab principale (RunHub 1.6.0 Lab Edition).
 * Dashboard analytics: Run Score · AI Insight · Carico · Recupero · Trend · Next workout.
 *
 * Per ora i dati sono mock; verranno collegati ad API reali quando i flussi
 * di import (HealthKit / Health Connect / file) saranno disponibili.
 */
import React from 'react';
import { ScrollView, View, Text, StyleSheet, Image, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, TrendingUp, ChevronRight } from 'lucide-react-native';
import {
  tokens, FontProvider,
  Card, KpiTile, InsightCard, ZoneBar, LineChart,
} from '../../src/design-system';

const { brand, neutral, text, semantic, spacing, typography, radius } = tokens;

// ─── MOCK DATA (sarà sostituito da API quando Lab data layer sarà pronto) ──
const runScoreTrend = [70, 72, 71, 75, 73, 78, 76, 79, 80, 78, 81, 80, 82];
const ctlData = [28, 30, 32, 33, 35, 36, 37, 38];
const atlData = [25, 28, 32, 38, 40, 42, 43, 42];
const tsbData = [3, 2, 0, -5, -5, -6, -6, -4];

function LabInner() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={require('../../assets/lab/logo-symbol.png')} style={styles.brandLogo} />
          <Text style={styles.brandText}>RunHub <Text style={{ color: brand.primary }}>LAB</Text></Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Bell size={20} color={text.primary} strokeWidth={2} />
            <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>2</Text></View>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.lastUpdate}>Ultimo aggiornamento: oggi, 06:42</Text>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* HERO RUN SCORE */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>RUN SCORE</Text>
          <View style={styles.heroBody}>
            <View>
              <Text style={styles.heroLetter}>A-</Text>
              <Text style={styles.heroValue}>82<Text style={styles.heroOver}>/100</Text></Text>
            </View>
            <View style={styles.heroChartWrap}>
              <LineChart
                series={[{ data: runScoreTrend, color: brand.primary, strokeWidth: 2.5 }]}
                height={70}
              />
            </View>
          </View>
          <View style={styles.heroTrend}>
            <TrendingUp size={14} color={semantic.success} strokeWidth={2.4} />
            <Text style={styles.heroTrendText}>IN CRESCITA <Text style={{ color: semantic.success, fontFamily: typography.kpiLabel.fontFamily }}>+7%</Text>  ·  Ultimi 30 giorni</Text>
          </View>
        </View>

        {/* AI INSIGHT */}
        <InsightCard
          body="Questa settimana hai corso 38 km, +18% vs scorsa. Il tuo HR a riposo è salito di 5 bpm: oggi suggerisco una sessione Z2 leggera invece di tempo run."
          timestamp="oggi, 06:42"
          confidence={83}
        />

        {/* 3 KPI */}
        <View style={styles.kpiRow}>
          <KpiTile label="CARICO" value={74} helper="Tollerabile" status="warning" progress={74} />
          <KpiTile label="RECUPERO" value={74} helper="Buono" status="success" progress={74} />
          <KpiTile label="FATICA" value={61} helper="Gestibile" status="success" progress={61} />
        </View>

        {/* TRAINING LOAD */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TRAINING LOAD</Text>
            <Text style={styles.sectionSub}>ultime 8 settimane</Text>
          </View>
          <LineChart
            series={[
              { data: ctlData, color: brand.primary, strokeWidth: 3 },
              { data: atlData, color: semantic.danger, strokeWidth: 2.5 },
              { data: tsbData, color: semantic.info, strokeWidth: 2.5 },
            ]}
            height={140}
            showGrid
          />
          <View style={styles.legend}>
            <LegendDot color={brand.primary} label="CTL · forma" value="38" />
            <LegendDot color={semantic.danger} label="ATL · fatica" value="42" />
            <LegendDot color={semantic.info} label="TSB · forma netta" value="−4" />
          </View>
        </Card>

        {/* RECOVERY BOX 2x2 */}
        <Card>
          <Text style={styles.sectionTitle}>RECUPERO</Text>
          <View style={styles.recoveryGrid}>
            <View style={styles.recItem}>
              <Text style={styles.recValue}>7:24</Text>
              <Text style={styles.recLabel}>SONNO MEDIO</Text>
            </View>
            <View style={[styles.recItem, styles.recItemBorderLeft]}>
              <Text style={styles.recValue}>52</Text>
              <Text style={styles.recLabel}>HR RIPOSO</Text>
            </View>
            <View style={[styles.recItem, styles.recItemBorderTop]}>
              <Text style={styles.recValue}>68</Text>
              <Text style={styles.recLabel}>HRV (ms)</Text>
            </View>
            <View style={[styles.recItem, styles.recItemBorderTop, styles.recItemBorderLeft]}>
              <Text style={styles.recValue}>54</Text>
              <Text style={styles.recLabel}>VO2MAX</Text>
            </View>
          </View>
        </Card>

        {/* PROSSIMO ALLENAMENTO */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.nextWorkout}
          onPress={() => router.push('/(tabs)/allenamenti')}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.nextLabel}>PROSSIMO ALLENAMENTO</Text>
            <Text style={styles.nextTitle}>Easy Run 8 km</Text>
            <Text style={styles.nextMeta}>Z2 · Aerobica · ~45 min</Text>
          </View>
          <View style={styles.nextCta}>
            <Text style={styles.nextCtaText}>VEDI DETTAGLI</Text>
            <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* PREVISIONE PRESTAZIONI */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PREVISIONE PRESTAZIONI</Text>
            <Text style={styles.sectionSub}>basata sul trend attuale</Text>
          </View>
          <View style={styles.predRow}>
            <PredCol distance="5K" time="22:14" delta="−12s" />
            <PredCol distance="10K" time="46:20" delta="−18s" />
            <PredCol distance="21K" time="1:42:08" delta="−47s" />
            <PredCol distance="42K" time="3:38:12" delta="−2:14" />
          </View>
        </Card>

        {/* HR ZONES */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>HR ZONES</Text>
            <Text style={styles.sectionSub}>ultimi 30 giorni</Text>
          </View>
          <View style={{ height: spacing.md }} />
          <ZoneBar z1={22} z2={41} z3={24} z4={9} z5={4} />
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────
function LegendDot({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

function PredCol({ distance, time, delta }: { distance: string; time: string; delta: string }) {
  return (
    <View style={styles.predCol}>
      <Text style={styles.predDistance}>{distance}</Text>
      <Text style={styles.predTime}>{time}</Text>
      <Text style={styles.predDelta}>{delta}</Text>
    </View>
  );
}

export default function LabScreen() {
  return (
    <FontProvider>
      <LabInner />
    </FontProvider>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.marginApp, paddingTop: spacing.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { width: 30, height: 30 },
  brandText: { ...typography.bodyBold, color: text.primary, fontSize: 17, letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { padding: 8, position: 'relative' },
  bellBadge: {
    position: 'absolute', top: 4, right: 4, backgroundColor: brand.primary,
    borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  lastUpdate: { ...typography.caption, color: text.muted, paddingHorizontal: spacing.marginApp, paddingBottom: spacing.sm },

  scroll: { padding: spacing.marginApp, paddingTop: spacing.sm, gap: spacing.gapSection },

  hero: {
    backgroundColor: '#0F172A',
    borderRadius: radius.card,
    padding: spacing.xl,
  },
  heroLabel: { ...typography.kpiLabel, color: '#94A3B8' },
  heroBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  heroLetter: { ...typography.heroMetric, color: brand.primary, fontSize: 56 },
  heroValue: { ...typography.heroMetric, color: text.inverse, fontSize: 44, marginTop: -8 },
  heroOver: { ...typography.body, color: '#94A3B8', fontSize: 16 },
  heroChartWrap: { flex: 1, marginLeft: spacing.md },
  heroTrend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  heroTrendText: { ...typography.caption, color: '#94A3B8', letterSpacing: 0.5 },

  kpiRow: { flexDirection: 'row', gap: spacing.sm },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.md },
  sectionTitle: { ...typography.kpiLabel, color: text.primary },
  sectionSub: { ...typography.caption, color: text.muted },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendLabel: { ...typography.caption, color: text.secondary },
  legendValue: { ...typography.monoInline, color: text.primary, fontSize: 12 },

  recoveryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  recItem: { width: '50%', paddingVertical: spacing.md, alignItems: 'center' },
  recItemBorderTop: { borderTopWidth: 1, borderTopColor: neutral.border },
  recItemBorderLeft: { borderLeftWidth: 1, borderLeftColor: neutral.border },
  recValue: { ...typography.kpiValue, color: text.primary, fontSize: 26 },
  recLabel: { ...typography.kpiLabel, color: text.muted, marginTop: 4, fontSize: 10 },

  nextWorkout: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: brand.primary, borderRadius: radius.card,
    padding: spacing.lg,
  },
  nextLabel: { ...typography.kpiLabel, color: '#FFD9BA' },
  nextTitle: { ...typography.bodyBold, color: '#fff', fontSize: 18, marginTop: 2 },
  nextMeta: { ...typography.caption, color: '#FFD9BA', marginTop: 2 },
  nextCta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  nextCtaText: { color: '#fff', ...typography.kpiLabel, fontSize: 10 },

  predRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  predCol: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  predDistance: { ...typography.kpiLabel, color: text.muted, fontSize: 10 },
  predTime: { ...typography.kpiValue, color: text.primary, fontSize: 18, marginTop: 4 },
  predDelta: { ...typography.caption, color: semantic.success, marginTop: 2, fontFamily: typography.monoInline.fontFamily, fontSize: 11 },
});
