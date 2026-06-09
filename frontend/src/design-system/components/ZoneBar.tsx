/**
 * Segmented bar che mostra la distribuzione tempo nelle 5 zone HR.
 * Input: array di percentuali (z1..z5) sommanti a 100.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { hrZones, text, radius, spacing, typography } from '../tokens';

type Props = {
  z1: number;
  z2: number;
  z3: number;
  z4: number;
  z5: number;
  showLabels?: boolean;
};

export function ZoneBar({ z1, z2, z3, z4, z5, showLabels = true }: Props) {
  const zones = [
    { v: z1, color: hrZones.z1, label: 'Z1' },
    { v: z2, color: hrZones.z2, label: 'Z2' },
    { v: z3, color: hrZones.z3, label: 'Z3' },
    { v: z4, color: hrZones.z4, label: 'Z4' },
    { v: z5, color: hrZones.z5, label: 'Z5' },
  ];
  return (
    <View>
      <View style={styles.barRow}>
        {zones.map((z, i) =>
          z.v > 0 ? <View key={i} style={{ flex: z.v, height: 10, backgroundColor: z.color, marginRight: i < 4 ? 2 : 0, borderRadius: 4 }} /> : null
        )}
      </View>
      {showLabels ? (
        <View style={styles.labelsRow}>
          {zones.map((z, i) => (
            <View key={i} style={styles.labelItem}>
              <View style={[styles.dot, { backgroundColor: z.color }]} />
              <Text style={styles.zoneText}>{z.label} {Math.round(z.v)}%</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  barRow: { flexDirection: 'row', height: 10, borderRadius: 4, overflow: 'hidden' },
  labelsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, gap: spacing.md },
  labelItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  zoneText: { ...typography.caption, color: text.secondary },
});
