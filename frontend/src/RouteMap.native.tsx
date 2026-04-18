import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline as MapPolyline } from 'react-native-maps';
import { colors, radius } from './theme';

type Coord = { lat: number; lng: number; timestamp?: number };
type Props = { coords: Coord[]; height?: number; showsUser?: boolean };

// Native (iOS/Android) with real map tiles via Apple Maps / Google Maps
export function RouteMap({ coords, height = 220, showsUser = true }: Props) {
  if (coords.length === 0) {
    return <View style={[styles.empty, { height }]} />;
  }
  const last = coords[coords.length - 1];
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
        showsCompass
        showsScale
      >
        {coords.length > 1 ? (
          <MapPolyline
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

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  empty: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
