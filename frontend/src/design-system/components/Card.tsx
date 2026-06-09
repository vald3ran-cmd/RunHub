import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { neutral, radius, spacing, shadow } from '../tokens';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padding?: keyof typeof spacing | number;
  background?: string;
};

export function Card({ children, style, elevated = false, padding = 'paddingCard', background }: Props) {
  const pad = typeof padding === 'number' ? padding : spacing[padding];
  return (
    <View
      style={[
        styles.card,
        { padding: pad },
        background ? { backgroundColor: background } : null,
        elevated ? shadow.md : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: neutral.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: neutral.border,
  },
});
