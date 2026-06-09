/**
 * Card riepilogativa di una sessione (Diario list, Lab recent sessions).
 * Mostra: tipo, distanza, tempo, pace, zona, Run Score, source chip, data.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Watch, Smartphone, FileText, Activity } from 'lucide-react-native';
import { neutral, text, brand, radius, spacing, typography } from '../tokens';

type Source = 'apple_watch' | 'garmin' | 'polar' | 'coros' | 'phone' | 'file';

type Props = {
  title: string;
  distanceKm: number;
  durationStr: string;        // pre-formatted 'm:ss' or 'h:mm:ss'
  paceStr: string;            // '5:29/km'
  zoneChip: string;           // 'Z2 · Aerobica'
  scoreLetter: string;        // 'A-'
  scoreValue: number;         // 82
  dateLabel: string;          // 'ieri' / '5 giu'
  source?: Source;
  onPress?: () => void;
};

const SOURCE_ICON: Record<Source, { Icon: any; label: string }> = {
  apple_watch: { Icon: Watch, label: 'Apple Watch' },
  garmin:      { Icon: Watch, label: 'Garmin' },
  polar:       { Icon: Watch, label: 'Polar' },
  coros:       { Icon: Watch, label: 'Coros' },
  phone:       { Icon: Smartphone, label: 'Phone' },
  file:        { Icon: FileText, label: 'File' },
};

export function SessionCard({
  title, distanceKm, durationStr, paceStr, zoneChip,
  scoreLetter, scoreValue, dateLabel, source, onPress,
}: Props) {
  const SourceItem = source ? SOURCE_ICON[source] : null;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      <View style={styles.iconBox}>
        <Activity size={20} color={brand.primary} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {SourceItem ? (
            <View style={styles.sourceWrap}>
              <SourceItem.Icon size={11} color={text.muted} strokeWidth={2} />
            </View>
          ) : null}
        </View>
        <Text style={styles.stats}>
          {distanceKm.toFixed(2)} km · {durationStr} · {paceStr}
        </Text>
        <Text style={styles.zone}>{zoneChip}</Text>
      </View>
      <View style={styles.scoreCol}>
        <Text style={styles.scoreLetter}>{scoreLetter}</Text>
        <Text style={styles.scoreValue}>{scoreValue}</Text>
        <Text style={styles.date}>{dateLabel}</Text>
      </View>
      <ChevronRight size={16} color={text.muted} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: neutral.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: neutral.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: brand.subtle, alignItems: 'center', justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { ...typography.bodyBold, color: text.primary, flexShrink: 1 },
  sourceWrap: { padding: 2, borderRadius: 4, backgroundColor: neutral.surfaceSoft },
  stats: { ...typography.monoInline, color: text.secondary, marginTop: 2 },
  zone: { ...typography.caption, color: text.muted, marginTop: 2 },
  scoreCol: { alignItems: 'flex-end' },
  scoreLetter: { ...typography.bodyBold, color: brand.primary, fontFamily: typography.kpiValue.fontFamily, fontSize: 18 },
  scoreValue: { ...typography.monoInline, color: text.muted, fontSize: 11 },
  date: { ...typography.caption, color: text.muted, marginTop: 2 },
});
