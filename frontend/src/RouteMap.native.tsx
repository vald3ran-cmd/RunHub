import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Mapbox, {
  MapView,
  Camera,
  ShapeSource,
  LineLayer,
  CircleLayer,
  UserLocation,
  StyleURL,
} from '@rnmapbox/maps';
import { colors, radius } from './theme';

// ──────────────────────────────────────────────────────────────
// Mapbox access token initialization
// ──────────────────────────────────────────────────────────────
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
if (MAPBOX_TOKEN) {
  // setAccessToken returns a Promise; we don't need to await it on import
  try { Mapbox.setAccessToken(MAPBOX_TOKEN); } catch {}
}
// Performance tweak (Android): use a server-managed location indicator
Mapbox.setTelemetryEnabled?.(false);

// ──────────────────────────────────────────────────────────────
// Default RunHub map style (dark)
// We start with the official Mapbox Dark v11 — clean & modern.
// Later we can replace this with a custom RunHub style from Studio:
//   e.g. "mapbox://styles/valderan/runhub-dark"
// ──────────────────────────────────────────────────────────────
const RUNHUB_DARK_STYLE = StyleURL.Dark; // mapbox://styles/mapbox/dark-v11

type Coord = { lat: number; lng: number; timestamp?: number };
type Props = {
  coords: Coord[];
  height?: number;
  showsUser?: boolean;
  fullHeight?: boolean;
};

// ──────────────────────────────────────────────────────────────
// Native (iOS/Android) Mapbox route map for RunHub
// ──────────────────────────────────────────────────────────────
export function RouteMap({
  coords,
  height = 220,
  showsUser = true,
  fullHeight = false,
}: Props) {
  const cameraRef = useRef<Camera>(null);

  // ── Build the GeoJSON polyline of the run path ──
  const lineGeoJSON = useMemo(() => {
    if (coords.length < 2) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: coords.map((c) => [c.lng, c.lat]),
          },
          properties: {},
        },
      ],
    };
  }, [coords]);

  // Start marker (first GPS point)
  const startGeoJSON = useMemo(() => {
    if (coords.length === 0) return null;
    const p = coords[0];
    return {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: {},
    };
  }, [coords]);

  // Compute camera bounds when coords change (initial + during run)
  useEffect(() => {
    if (!cameraRef.current || coords.length === 0) return;
    const lats = coords.map((c) => c.lat);
    const lngs = coords.map((c) => c.lng);
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);
    const lngMin = Math.min(...lngs);
    const lngMax = Math.max(...lngs);
    if (coords.length === 1) {
      // single point: just center on user
      cameraRef.current.setCamera({
        centerCoordinate: [coords[0].lng, coords[0].lat],
        zoomLevel: 16,
        animationDuration: 600,
      });
    } else {
      // fit the polyline with some padding
      cameraRef.current.fitBounds(
        [lngMax, latMax],
        [lngMin, latMin],
        [60, 50, 80, 50], // [top, right, bottom, left] padding
        700,
      );
    }
  }, [coords.length]);

  // Empty state container (before the first GPS fix)
  if (coords.length === 0) {
    return (
      <View
        style={fullHeight ? styles.fillEmpty : [styles.empty, { height }]}
      />
    );
  }

  return (
    <View style={fullHeight ? styles.fill : [styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        styleURL={RUNHUB_DARK_STYLE}
        logoEnabled={false}
        attributionEnabled={true}
        scaleBarEnabled={false}
        compassEnabled={false}
        pitchEnabled={false}
        rotateEnabled={true}
        zoomEnabled={true}
        scrollEnabled={true}
      >
        <Camera
          ref={cameraRef}
          animationMode="easeTo"
          animationDuration={600}
          centerCoordinate={[coords[0].lng, coords[0].lat]}
          zoomLevel={16}
        />

        {/* User location puck (orange, pulse) */}
        {showsUser ? (
          <UserLocation
            visible
            showsUserHeadingIndicator
            androidRenderMode="gps"
            // The puck is styled via the default circle; @rnmapbox tints
            // it with the system accent. We rely on the visible halo.
          />
        ) : null}

        {/* Polyline route (orange glow) */}
        {lineGeoJSON ? (
          <ShapeSource id="route-source" shape={lineGeoJSON}>
            {/* Outer glow */}
            <LineLayer
              id="route-line-glow"
              style={{
                lineColor: colors.primary,
                lineWidth: 12,
                lineOpacity: 0.18,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Main orange line */}
            <LineLayer
              id="route-line-main"
              style={{
                lineColor: colors.primary,
                lineWidth: 5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </ShapeSource>
        ) : null}

        {/* Start marker (small green dot) */}
        {startGeoJSON ? (
          <ShapeSource id="start-source" shape={startGeoJSON}>
            <CircleLayer
              id="start-circle-outer"
              style={{
                circleRadius: 9,
                circleColor: '#FFFFFF',
                circleOpacity: 0.9,
              }}
            />
            <CircleLayer
              id="start-circle-inner"
              style={{
                circleRadius: 6,
                circleColor: colors.success,
              }}
            />
          </ShapeSource>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0A0A0A',
  },
  empty: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fill: { flex: 1, overflow: 'hidden', backgroundColor: '#0A0A0A' },
  fillEmpty: { flex: 1, backgroundColor: '#0A0A0A' },
});
