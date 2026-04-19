import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polyline as MapPolyline } from 'react-native-maps';
import { colors, radius } from './theme';

type Coord = { lat: number; lng: number };
type Route = { session_id: string; coords: Coord[]; completed_at?: string };
type Props = { routes: Route[]; height?: number };

/**
 * Heatmap-style map: overlays all user's route polylines on a single native map.
 * Each polyline uses red-orange-yellow gradient by recency.
 */
export function HeatmapView({ routes, height = 400 }: Props) {
  if (!routes || routes.length === 0) {
    return <View style={[styles.empty, { height }]} />;
  }

  // Compute bounding box over all coords
  const allCoords = routes.flatMap(r => r.coords);
  if (allCoords.length === 0) {
    return <View style={[styles.empty, { height }]} />;
  }
  const lats = allCoords.map(c => c.lat);
  const lngs = allCoords.map(c => c.lng);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs), lngMax = Math.max(...lngs);
  const latDelta = Math.max(latMax - latMin, 0.005) * 1.35;
  const lngDelta = Math.max(lngMax - lngMin, 0.005) * 1.35;

  // Generate color for each route based on recency index
  const colorFor = (idx: number) => {
    if (idx === 0) return '#FF3B30';
    if (idx <= 2) return '#FF6B6B';
    if (idx <= 5) return '#FF9500';
    if (idx <= 10) return '#FFD60A';
    return 'rgba(255, 149, 0, 0.55)';
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: (latMin + latMax) / 2,
          longitude: (lngMin + lngMax) / 2,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }}
        showsUserLocation
        showsCompass
      >
        {routes.map((r, idx) => (
          r.coords.length > 1 ? (
            <MapPolyline
              key={r.session_id}
              coordinates={r.coords.map(c => ({ latitude: c.lat, longitude: c.lng }))}
              strokeColor={colorFor(idx)}
              strokeWidth={idx < 3 ? 5 : 4}
              lineCap="round"
              lineJoin="round"
            />
          ) : null
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  empty: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
