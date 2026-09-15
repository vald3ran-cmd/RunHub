import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { tokens } from './design-system';

const { brand, neutral, radius } = tokens;

type Props = {
  lat: number;
  lng: number;
  address?: string;
  height?: number;
};

export function EventMap({ lat, lng, address, height = 200 }: Props) {
  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        pitchEnabled={false}
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} title={address} pinColor={brand.primary} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: neutral.border,
    backgroundColor: neutral.surfaceSoft,
  },
});
