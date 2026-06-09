/**
 * Diario — Lista cronologica delle sessioni importate / registrate.
 * Stile Scientific Light. Per ora mock; in 1.6.x si collegherà a:
 *   GET /api/workouts/history (sessioni esistenti) + futuro /api/imported_sessions.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, Filter, GitCompare } from 'lucide-react-native';
import { tokens, FontProvider, SessionCard, Chip } from '../../src/design-system';

const { brand, neutral, text, spacing, typography } = tokens;

type Source = 'apple_watch' | 'garmin' | 'phone' | 'file';
type SessionItem = {
  id: string;
  title: string;
  distanceKm: number;
  durationStr: string;
  paceStr: string;
  zoneChip: string;
  scoreLetter: string;
  scoreValue: number;
  dateLabel: string;
  monthKey: string; // 'Giugno 2026'
  source: Source;
};

const MOCK_SESSIONS: SessionItem[] = [
  { id: '1', title: 'Easy Run mattutino', distanceKm: 8.42, durationStr: '46:12', paceStr: '5:29/km', zoneChip: 'Z2 · Aerobica', scoreLetter: 'A-', scoreValue: 82, dateLabel: 'oggi', monthKey: 'Giugno 2026', source: 'apple_watch' },
  { id: '2', title: 'Tempo run 5K', distanceKm: 5.12, durationStr: '22:48', paceStr: '4:27/km', zoneChip: 'Z4 · Soglia', scoreLetter: 'A', scoreValue: 88, dateLabel: 'ieri', monthKey: 'Giugno 2026', source: 'apple_watch' },
  { id: '3', title: 'Long Run domenica', distanceKm: 16.05, durationStr: '1:28:34', paceStr: '5:31/km', zoneChip: 'Z2 · Aerobica', scoreLetter: 'B+', scoreValue: 78, dateLabel: '7 giu', monthKey: 'Giugno 2026', source: 'garmin' },
  { id: '4', title: 'Intervalli 6×800', distanceKm: 7.20, durationStr: '38:02', paceStr: '5:17/km', zoneChip: 'Z5 · VO2max', scoreLetter: 'A', scoreValue: 86, dateLabel: '5 giu', monthKey: 'Giugno 2026', source: 'apple_watch' },
  { id: '5', title: 'Recovery jog', distanceKm: 4.30, durationStr: '26:18', paceStr: '6:07/km', zoneChip: 'Z1 · Recupero', scoreLetter: 'B', scoreValue: 70, dateLabel: '3 giu', monthKey: 'Giugno 2026', source: 'phone' },
  { id: '6', title: 'Progression run', distanceKm: 12.18, durationStr: '1:02:44', paceStr: '5:09/km', zoneChip: 'Z3 · Tempo', scoreLetter: 'A-', scoreValue: 80, dateLabel: '28 mag', monthKey: 'Maggio 2026', source: 'garmin' },
  { id: '7', title: 'Strava import .fit', distanceKm: 10.04, durationStr: '52:11', paceStr: '5:12/km', zoneChip: 'Z2 · Aerobica', scoreLetter: 'B+', scoreValue: 76, dateLabel: '25 mag', monthKey: 'Maggio 2026', source: 'file' },
];

type FilterKey = 'all' | 'apple_watch' | 'garmin' | 'phone' | 'file';

function DiarioInner() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () => filter === 'all' ? MOCK_SESSIONS : MOCK_SESSIONS.filter(s => s.source === filter),
    [filter],
  );

  // Raggruppa per monthKey preservando l'ordine d'inserimento
  const grouped = useMemo(() => {
    const map = new Map<string, SessionItem[]>();
    filtered.forEach(s => {
      if (!map.has(s.monthKey)) map.set(s.monthKey, []);
      map.get(s.monthKey)!.push(s);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const totalKm = filtered.reduce((acc, s) => acc + s.distanceKm, 0);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 2) next.add(id);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Diario</Text>
          <Text style={styles.subtitle}>
            {filtered.length} sessioni · {totalKm.toFixed(1)} km totali
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.compareBtn, compareMode && styles.compareBtnActive]}
          onPress={() => { setCompareMode(v => !v); setSelected(new Set()); }}
        >
          <GitCompare size={16} color={compareMode ? '#fff' : text.primary} strokeWidth={2} />
          <Text style={[styles.compareBtnText, compareMode && { color: '#fff' }]}>Confronta</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR (visiva — funzione in roadmap) */}
      <View style={styles.searchBar}>
        <Search size={16} color={text.muted} strokeWidth={2} />
        <Text style={styles.searchPlaceholder}>Cerca sessione, distanza, data…</Text>
        <View style={styles.filterIconWrap}>
          <Filter size={14} color={text.muted} strokeWidth={2} />
        </View>
      </View>

      {/* FILTER CHIPS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <Chip label="Tutte" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Apple Watch" selected={filter === 'apple_watch'} onPress={() => setFilter('apple_watch')} />
        <Chip label="Garmin" selected={filter === 'garmin'} onPress={() => setFilter('garmin')} />
        <Chip label="Telefono" selected={filter === 'phone'} onPress={() => setFilter('phone')} />
        <Chip label="File" selected={filter === 'file'} onPress={() => setFilter('file')} />
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {grouped.map(([month, items]) => (
          <View key={month} style={styles.section}>
            <Text style={styles.monthLabel}>{month.toUpperCase()}</Text>
            <View style={{ gap: spacing.sm }}>
              {items.map(item => {
                const isSelected = selected.has(item.id);
                return (
                  <View key={item.id} style={[isSelected && styles.selectedWrap]}>
                    <SessionCard
                      title={item.title}
                      distanceKm={item.distanceKm}
                      durationStr={item.durationStr}
                      paceStr={item.paceStr}
                      zoneChip={item.zoneChip}
                      scoreLetter={item.scoreLetter}
                      scoreValue={item.scoreValue}
                      dateLabel={item.dateLabel}
                      source={item.source}
                      onPress={() => {
                        if (compareMode) toggleSelect(item.id);
                        else router.push(`/workout/${item.id}`);
                      }}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nessuna sessione</Text>
            <Text style={styles.emptyBody}>Connetti il tuo wearable dalla tab Importa per iniziare.</Text>
            <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/(tabs)/importa')}>
              <Text style={styles.emptyCtaText}>VAI A IMPORTA</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* COMPARE BAR (sticky bottom) */}
      {compareMode && selected.size > 0 ? (
        <View style={styles.compareBar}>
          <Text style={styles.compareBarText}>
            {selected.size === 1 ? '1 selezionata · scegline ancora una' : '2 selezionate'}
          </Text>
          <TouchableOpacity
            disabled={selected.size !== 2}
            style={[styles.compareBarBtn, selected.size !== 2 && { opacity: 0.5 }]}
          >
            <Text style={styles.compareBarBtnText}>CONFRONTA</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function DiarioScreen() {
  return (
    <FontProvider>
      <DiarioInner />
    </FontProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.marginApp, paddingTop: spacing.sm, paddingBottom: spacing.md,
    gap: spacing.md,
  },
  title: { ...typography.sectionTitle, color: text.primary, fontSize: 26 },
  subtitle: { ...typography.caption, color: text.muted, marginTop: 2 },
  compareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: neutral.border,
    backgroundColor: neutral.card,
  },
  compareBtnActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  compareBtnText: { ...typography.kpiLabel, color: text.primary, fontSize: 10 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.marginApp,
    backgroundColor: neutral.card,
    borderRadius: 12, borderWidth: 1, borderColor: neutral.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchPlaceholder: { ...typography.body, color: text.muted, flex: 1, fontSize: 14 },
  filterIconWrap: { padding: 4 },

  chipsRow: { paddingHorizontal: spacing.marginApp, paddingVertical: spacing.md, gap: 8 },

  scroll: { paddingHorizontal: spacing.marginApp, gap: spacing.lg },
  section: { gap: spacing.sm },
  monthLabel: { ...typography.kpiLabel, color: text.muted, fontSize: 10, marginTop: spacing.sm },
  selectedWrap: {
    borderRadius: 22,
    borderWidth: 2, borderColor: brand.primary,
  },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { ...typography.bodyBold, color: text.primary, fontSize: 16 },
  emptyBody: { ...typography.caption, color: text.muted, marginTop: 6, textAlign: 'center' },
  emptyCta: {
    marginTop: 16, paddingHorizontal: 18, paddingVertical: 10,
    backgroundColor: brand.primary, borderRadius: 999,
  },
  emptyCtaText: { ...typography.kpiLabel, color: '#fff', fontSize: 11 },

  compareBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: neutral.card, borderTopWidth: 1, borderTopColor: neutral.border,
    paddingHorizontal: spacing.marginApp, paddingVertical: 14, paddingBottom: 22,
  },
  compareBarText: { ...typography.body, color: text.primary, fontSize: 14 },
  compareBarBtn: {
    backgroundColor: brand.primary, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 999,
  },
  compareBarBtnText: { ...typography.kpiLabel, color: '#fff', fontSize: 11 },
});
