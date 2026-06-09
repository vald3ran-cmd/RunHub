import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { neutral, text, semantic, brand, radius, spacing, typography } from '../tokens';

type Status = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

type Props = {
  label: string;             // KPI label (es. 'CARICO')
  value: string | number;    // KPI value (es. 74)
  unit?: string;             // suffix unità (es. 'km', 'bpm')
  helper?: string;           // riga secondaria (es. 'Tollerabile')
  progress?: number;         // 0-100 — disegna progress bar in basso
  status?: Status;
  style?: StyleProp<ViewStyle>;
};

const STATUS_COLOR: Record<Status, string> = {
  neutral: text.secondary,
  success: semantic.success,
  warning: semantic.warning,
  danger:  semantic.danger,
  brand:   brand.primary,
};

export function KpiTile({ label, value, unit, helper, progress, status = 'neutral', style }: Props) {
  const color = STATUS_COLOR[status];
  return (
    <View style={[styles.tile, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {helper ? <Text style={[styles.helper, { color }]} numberOfLines={1}>{helper}</Text> : null}
      {typeof progress === 'number' ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: neutral.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: neutral.border,
    padding: spacing.lg,
  },
  label: { ...typography.kpiLabel, color: text.muted },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  value: { ...typography.kpiValue, color: text.primary },
  unit:  { ...typography.caption, color: text.muted, marginLeft: 4 },
  helper: { ...typography.caption, marginTop: 2 },
  progressTrack: {
    marginTop: spacing.sm,
    height: 6,
    backgroundColor: neutral.surfaceSoft,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
});
