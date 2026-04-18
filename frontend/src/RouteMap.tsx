import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { colors, radius } from './theme';

type Coord = { lat: number; lng: number; timestamp?: number };
type Props = { coords: Coord[]; height?: number; showsUser?: boolean };

// Dynamically require react-native-maps only on native (it crashes on web)
let MapView: any = null;
let Marker: any = null;
let PolylineMap: any = null;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    PolylineMap = maps.Polyline;
  } catch {}
}

export function RouteMap({ coords, height = 220, showsUser = true }: Props) {
  if (coords.length === 0) {
    return <View style={[styles.empty, { height }]} />;
  }
  const last = coords[coords.length - 1];

  // NATIVE: real map with Apple Maps (iOS) / Google Maps (Android)
  if (Platform.OS !== 'web' && MapView) {
    const lats = coords.map(c => c.lat);
    const lngs = coords.map(c => c.lng);
    const latMin = Math.min(...lats), latMax = Math.max(...lats);
    const lngMin = Math.min(...lngs), lngMax = Math.max(...lngs);
    const latDelta = Math.max(latMax - latMin, 0.005) * 1.4;
    const lngDelta = Math.max(lngMax - lngMin, 0.005) * 1.4;
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
          region={{
            latitude: last.lat,
            longitude: last.lng,
            latitudeDelta: latDelta,
            longitudeDelta: lngDelta,
          }}
          showsUserLocation={showsUser}
          followsUserLocation={showsUser}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
        >
          {coords.length > 1 ? (
            <PolylineMap
              coordinates={coords.map(c => ({ latitude: c.lat, longitude: c.lng }))}
              strokeColor={colors.primary}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          ) : null}
          <Marker
            coordinate={{ latitude: coords[0].lat, longitude: coords[0].lng }}
            title="Partenza"
            pinColor={colors.success}
          />
          {coords.length > 1 ? (
            <Marker
              coordinate={{ latitude: last.lat, longitude: last.lng }}
              title="Attuale"
              pinColor={colors.primary}
            />
          ) : null}
        </MapView>
      </View>
    );
  }

  // WEB / fallback: SVG polyline on dark background
  if (coords.length < 2) return <View style={[styles.empty, { height }]} />;
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
