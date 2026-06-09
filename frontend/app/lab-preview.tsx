/**
 * Lab Preview — demo del nuovo design system 1.6 Lab Edition.
 * Accessibile via /lab-preview (non rompe la 1.5 live).
 * Mostra come tutti i nuovi componenti si combinano nello stile Scientific Light.
 */
import React from 'react';
import { ScrollView, View, Text, StyleSheet, Image, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, TrendingUp } from 'lucide-react-native';
import {
  tokens, FontProvider,
  Card, Chip, KpiTile, InsightCard, Button, ZoneBar, SessionCard,
} from '../src/design-system';

const { brand, neutral, text, spacing, typography, semantic } = tokens;

function PreviewInner() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={26} color={text.primary} />
        </TouchableOpacity>
        <View style={styles.brandRow}>
          <Image source={require('../assets/lab/logo-symbol.png')} style={styles.brandLogo} />
          <Text style={styles.brandText}>RunHub <Text style={{ color: brand.primary }}>LAB</Text></Text>
        </View>
        <TouchableOpacity>
          <Bell size={22} color={text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* HERO RUN SCORE */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>RUN SCORE</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroLetter}>A-</Text>
            <Text style={styles.heroValue}>82</Text>
            <Text style={styles.heroOver}>/100</Text>
          </View>
          <View style={styles.heroTrend}>
            <TrendingUp size={14} color={semantic.success} strokeWidth={2.4} />
            <Text style={styles.heroTrendText}>IN CRESCITA <Text style={{ color: semantic.success }}>+7%</Text>  ·  Ultimi 30 giorni</Text>
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

        {/* HR ZONES */}
        <Card>
          <Text style={styles.sectionLabel}>HR ZONES  ·  ultimi 30 giorni</Text>
          <View style={{ height: spacing.md }} />
          <ZoneBar z1={22} z2={41} z3={24} z4={9} z5={4} />
        </Card>

        {/* RECENT SESSIONS */}
        <View>
          <Text style={styles.sectionLabel}>SESSIONI RECENTI</Text>
          <View style={{ height: spacing.sm }} />
          <View style={{ gap: spacing.sm }}>
            <SessionCard
              title="Easy Run"
              distanceKm={8.24}
              durationStr="45:12"
              paceStr="5:29/km"
              zoneChip="Z2 · Aerobica"
              scoreLetter="A-"
              scoreValue={82}
              dateLabel="ieri"
              source="apple_watch"
            />
            <SessionCard
              title="Ripetute 6x800"
              distanceKm={11.42}
              durationStr="56:18"
              paceStr="4:55/km"
              zoneChip="Z4 · Soglia"
              scoreLetter="B+"
              scoreValue={78}
              dateLabel="5 giu"
              source="garmin"
            />
            <SessionCard
              title="Lungo Domenicale"
              distanceKm={18.60}
              durationStr="1:42:31"
              paceStr="5:31/km"
              zoneChip="Z2 · Aerobica"
              scoreLetter="B"
              scoreValue={74}
              dateLabel="3 giu"
              source="phone"
            />
          </View>
        </View>

        {/* CHIPS demo */}
        <Card>
          <Text style={styles.sectionLabel}>CHIPS · LINGUAGGIO VISIVO</Text>
          <View style={{ height: spacing.sm }} />
          <View style={styles.chipsWrap}>
            <Chip label="Z2" tone="info" />
            <Chip label="Aerobica" tone="neutral" />
            <Chip label="PR" tone="success" />
            <Chip label="Ramping" tone="warning" />
            <Chip label="Overload" tone="danger" />
            <Chip label="Brand" tone="brand" />
          </View>
        </Card>

        {/* BUTTONS */}
        <View style={{ gap: spacing.sm }}>
          <Button title="Importa una nuova sessione" onPress={() => {}} fullWidth />
          <Button title="Vedi tutti i dettagli" variant="secondary" onPress={() => {}} fullWidth />
          <Button title="Modifica preferenze" variant="ghost" onPress={() => {}} fullWidth />
        </View>

        {/* EMPTY STATE PREVIEW */}
        <Card>
          <View style={styles.emptyWrap}>
            <Image source={require('../assets/lab/illustration-empty-flask.png')} style={styles.emptyImg} resizeMode="contain" />
            <Text style={styles.emptyTitle}>Nessun dato disponibile</Text>
            <Text style={styles.emptySub}>Connetti il tuo smartwatch o carica un file .fit per iniziare a vedere le tue analisi.</Text>
            <Button title="Importa i tuoi dati" onPress={() => {}} />
          </View>
        </Card>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function LabPreviewScreen() {
  return (
    <FontProvider>
      <PreviewInner />
    </FontProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.marginApp, paddingVertical: spacing.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandLogo: { width: 26, height: 26 },
  brandText: { ...typography.bodyBold, color: text.primary, fontSize: 16, letterSpacing: 0.5 },
  scroll: { padding: spacing.marginApp, gap: spacing.gapSection },

  hero: {
    backgroundColor: '#0F172A',
    borderRadius: tokens.radius.card,
    padding: spacing.xl,
  },
  heroLabel: { ...typography.kpiLabel, color: '#94A3B8' },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm, gap: 8 },
  heroLetter: { ...typography.heroMetric, color: brand.primary, fontSize: 64 },
  heroValue: { ...typography.heroMetric, color: text.inverse, fontSize: 56 },
  heroOver: { ...typography.body, color: '#94A3B8', fontSize: 18 },
  heroTrend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  heroTrendText: { ...typography.caption, color: '#94A3B8', letterSpacing: 0.5 },

  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  sectionLabel: { ...typography.kpiLabel, color: text.muted },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  emptyWrap: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  emptyImg: { width: 120, height: 120 },
  emptyTitle: { ...typography.bodyBold, color: text.primary, fontSize: 18 },
  emptySub: { ...typography.body, color: text.secondary, textAlign: 'center' },
});
