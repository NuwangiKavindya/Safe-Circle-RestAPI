import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Map,
  Camera,
  Marker,
  GeoJSONSource,
  Layer,
} from '@maplibre/maplibre-react-native';
import { COLORS } from '../styles/theme';

interface LocationLog {
  latitude: number | string;
  longitude: number | string;
  accuracy?: number | string;
  timestamp?: string;
}

interface MapViewComponentProps {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  logs?: LocationLog[];
  targetName?: string;
  height?: number;
}

export const MapViewComponent: React.FC<MapViewComponentProps> = ({
  latitude,
  longitude,
  accuracy,
  logs = [],
  targetName = 'Target Device',
  height = 320,
}) => {
  if (latitude === null || longitude === null || isNaN(latitude) || isNaN(longitude)) {
    return (
      <View style={[styles.placeholderContainer, { height }]}>
        <Text style={styles.placeholderIcon}>🛰️</Text>
        <Text style={styles.placeholderTitle}>Acquiring Geolocation Fix...</Text>
        <Text style={styles.placeholderSubtitle}>
          Connecting to device GPS & WebSocket channel
        </Text>
      </View>
    );
  }

  // Construct GeoJSON FeatureCollection for route polyline from historical logs
  const routeCoordinates: [number, number][] = logs
    .map(log => [parseFloat(String(log.longitude)), parseFloat(String(log.latitude))] as [number, number])
    .filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));

  const routeGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoordinates.length > 0 ? routeCoordinates : [[longitude, latitude]],
        },
      },
    ],
  };

  return (
    <View style={[styles.container, { height }]}>
      <Map
        style={styles.map}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        logo={false}
        attribution={false}
      >
        <Camera
          center={[longitude, latitude]}
          zoom={15}
          duration={1500}
        />

        {/* Live Target Location Marker Pin */}
        <Marker id="target-device-pin" lngLat={[longitude, latitude]}>
          <View style={styles.markerCircle}>
            <Text style={styles.markerIcon}>📍</Text>
          </View>
        </Marker>

        {/* Historical Route Line Layer */}
        {routeCoordinates.length > 1 && (
          <GeoJSONSource id="route-source" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                'line-color': COLORS.accentCyan,
                'line-width': 4,
                'line-opacity': 0.85,
              }}
            />
          </GeoJSONSource>
        )}
      </Map>

      <View style={styles.mapOverlayBadge}>
        <View style={styles.livePulseDot} />
        <Text style={styles.mapOverlayText}>
          LIVE GPS • {targetName} • {latitude.toFixed(5)}, {longitude.toFixed(5)} ({accuracy ? accuracy.toFixed(1) : '10'}m)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginVertical: 16,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  placeholderContainer: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginVertical: 16,
  },
  placeholderIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  placeholderTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  placeholderSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  markerCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  markerIcon: {
    fontSize: 18,
  },
  mapOverlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accentGreen,
    marginRight: 8,
  },
  mapOverlayText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
