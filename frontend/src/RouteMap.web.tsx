import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { colors, radius } from './theme';

type Coord = { lat: number; lng: number; timestamp?: number };
type Props = { coords: Coord[]; height?: number; showsUser?: boolean };

// Web-only fallback: SVG polyline, no react-native-maps import
export function RouteMap({ coords, height = 220 }: Props) {
  if (coords.length < 2) {
    return <View style={[styles.empty, { height }]} />;
  }
  const lats = coords.map(c => c.lat);
  const lngs = coords.map(c => c.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const W = 340, H = height, P = 12;
  const dLat = Math.max(maxLat - minLat, 0.0001);
  const dLng = Math.max(maxLng - minLng, 0.0001);
  const points = coords.map(c => {
    const x = P + ((c.lng - minLng) / dLng) * (W - 2 * P);
    const y = H - P - ((c.lat - minLat) / dLat) * (H - 2 * P);
    return `${x},${y}`;
  }).join(' ');
  return (
    <View style={[styles.wrap, { height, backgroundColor: colors.surface }]}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  empty: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
