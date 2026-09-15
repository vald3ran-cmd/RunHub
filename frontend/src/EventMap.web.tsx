import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { tokens } from './design-system';

const { brand, neutral, text, radius, spacing, typography } = tokens;

type Props = {
  lat: number;
  lng: number;
  address?: string;
  height?: number;
};

export function EventMap({ address, height = 200 }: Props) {
  return (
    <View style={[styles.box, { height }]}>
      <MapPin size={28} color={brand.primary} strokeWidth={2} />
      <Text style={styles.text}>{address || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: neutral.border,
    backgroundColor: neutral.surfaceSoft,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  text: { ...typography.body, color: text.secondary, textAlign: 'center' },
});
