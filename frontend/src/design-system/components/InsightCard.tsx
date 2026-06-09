import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { brand, neutral, text, radius, spacing, typography } from '../tokens';

type Props = {
  title?: string;
  body: string;
  timestamp?: string;        // es. 'oggi, 09:14'
  confidence?: number;       // 0-100
};

export function InsightCard({ title = 'AI INSIGHT', body, timestamp, confidence }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Sparkles size={14} color={brand.primary} strokeWidth={2.4} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
      </View>
      <Text style={styles.body}>{body}</Text>
      {typeof confidence === 'number' ? (
        <View style={styles.confRow}>
          <View style={styles.confTrack}>
            <View style={[styles.confFill, { width: `${confidence}%` }]} />
          </View>
          <Text style={styles.confLabel}>Confidenza {confidence}%</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.subtle,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#FFE0C2',
    padding: spacing.lg,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { ...typography.kpiLabel, color: brand.primary, marginLeft: 4 },
  timestamp: { ...typography.caption, color: text.muted },
  body: { ...typography.body, color: text.primary, lineHeight: 22 },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  confTrack: { flex: 1, height: 4, backgroundColor: '#FFE0C2', borderRadius: 999, overflow: 'hidden' },
  confFill: { height: '100%', backgroundColor: brand.primary, borderRadius: 999 },
  confLabel: { ...typography.caption, color: brand.dark, fontFamily: typography.kpiLabel.fontFamily, fontSize: 10 },
});
