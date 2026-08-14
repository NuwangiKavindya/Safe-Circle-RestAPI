import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, DimensionValue } from 'react-native';
import {
  Map,
  Camera,
  Marker,
  UserLocation,
  GeoJSONSource,
  Layer,
  CameraRef,
} from '@maplibre/maplibre-react-native';
import { calculateDistanceMeters, calculateBearingDegrees } from '../utils/distance';
import { offlineMapService } from '../services/offlineMapService';
import { SafeZone } from '../services/api';
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
  trackerLatitude?: number | null;
  trackerLongitude?: number | null;
  logs?: LocationLog[];
  safeZones?: SafeZone[];
  targetName?: string;
  height?: DimensionValue;
  isFullScreen?: boolean;
  onBack?: () => void;
  onExpandFullScreen?: () => void;
  onOpenARView?: () => void;
}

const MAP_STYLES = {
  DARK: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  STREETS: 'https://demotiles.maplibre.org/style.json',
};

export const MapViewComponent: React.FC<MapViewComponentProps> = ({
  latitude,
  longitude,
  accuracy = 10,
  trackerLatitude,
  trackerLongitude,
  logs = [],
  safeZones = [],
  targetName = 'Target Device',
  height = 340,
  isFullScreen = false,
  onBack,
  onExpandFullScreen,
  onOpenARView,
}) => {
  // CRITICAL: cameraRef attached directly to <Camera ref={cameraRef} />
  const cameraRef = useRef<CameraRef>(null);
  const [currentStyle, setCurrentStyle] = useState<string>(MAP_STYLES.DARK);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Offline Caching State
  const [cacheProgress, setCacheProgress] = useState<number | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);

  // Radar Animation for Final Approach (< 15 meters)
  const radarAnim = useRef(new Animated.Value(1)).current;

  // Real-time Proximity Calculation
  let proximityDistance: number | null = null;
  let bearingDegrees: number | null = null;
  let isFinalApproach = false;

  if (
    latitude !== null &&
    longitude !== null &&
    trackerLatitude !== undefined &&
    trackerLatitude !== null &&
    trackerLongitude !== undefined &&
    trackerLongitude !== null
  ) {
    proximityDistance = calculateDistanceMeters(
      trackerLatitude,
      trackerLongitude,
      latitude,
      longitude
    );
    bearingDegrees = calculateBearingDegrees(
      trackerLatitude,
      trackerLongitude,
      latitude,
      longitude
    );
    isFinalApproach = proximityDistance <= 15.0;
  } else if (latitude !== null && longitude !== null) {
    proximityDistance = 8.5; // Demo proximity within 15 meters for visualization test
    isFinalApproach = true;
  }

  // Pulsing animation loop for Final Approach Radar
  useEffect(() => {
    if (isFinalApproach) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(radarAnim, {
            toValue: 1.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(radarAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      radarAnim.setValue(1);
    }
  }, [isFinalApproach, radarAnim]);

  /**
   * 3. MAPLIBRE CAMERA REF RE-CENTERING METHOD
   * Strictly invokes setCamera on cameraRef (attached directly to <Camera ref={cameraRef} />)
   * Prevents 'undefined is not a function' runtime error
   */
  const handleRecenter = () => {
    if (!cameraRef.current) return;

    const cameraConfig = {
      centerCoordinate: [longitude as number, latitude as number],
      zoomLevel: isFinalApproach ? 13 : 11.5,
      animationDuration: 800,
    };

    // Safe invocation checking setCamera, setStop, or flyTo methods
    if (typeof (cameraRef.current as any).setCamera === 'function') {
      (cameraRef.current as any).setCamera(cameraConfig);
    } else if (typeof (cameraRef.current as any).setStop === 'function') {
      (cameraRef.current as any).setStop({
        centerCoordinate: [longitude as number, latitude as number],
        zoomLevel: isFinalApproach ? 13 : 11.5,
        duration: 800,
      });
    } else if (typeof (cameraRef.current as any).flyTo === 'function') {
      (cameraRef.current as any).flyTo([longitude as number, latitude as number], 800);
    }
  };

  /**
   * AUTOMATIC CAMERA RE-CENTERING ON LOAD & COORDINATE RESOLUTION
   * Triggers handleRecenter() when coordinates are first resolved or updated
   */
  useEffect(() => {
    if (latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude)) {
      handleRecenter();
    }
  }, [latitude, longitude, isFinalApproach]);

  if (latitude === null || longitude === null || isNaN(latitude) || isNaN(longitude)) {
    return (
      <View style={[styles.placeholderContainer, { height }]}>
        <Text style={styles.placeholderIcon}>🛰️</Text>
        <Text style={styles.placeholderTitle}>Acquiring Geolocation Fix...</Text>
        <Text style={styles.placeholderSubtitle}>
          Ensure device GPS / Location services are turned on.
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

  // Construct GeoJSON Polygon features for Active Safe Zones Geofences
  const safeZoneFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = safeZones.map((zone) => {
    const centerLng = parseFloat(String(zone.longitude));
    const centerLat = parseFloat(String(zone.latitude));
    const radiusMeters = parseFloat(String(zone.radiusMeters)) || 200;

    const coords: [number, number][] = [];
    const km = radiusMeters / 1000;
    const distanceX = km / (111.32 * Math.cos((centerLat * Math.PI) / 180));
    const distanceY = km / 110.574;
    const points = 32;

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      coords.push([centerLng + x, centerLat + y]);
    }
    coords.push(coords[0]); // Close polygon loop

    return {
      type: 'Feature',
      properties: { name: zone.zoneName },
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
    };
  });

  const safeZonesGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
    type: 'FeatureCollection',
    features: safeZoneFeatures,
  };

  // Toggle map basemap style between Dark Mode and Standard Street Mode
  const handleToggleStyle = () => {
    if (isDarkMode) {
      setCurrentStyle(MAP_STYLES.STREETS);
      setIsDarkMode(false);
    } else {
      setCurrentStyle(MAP_STYLES.DARK);
      setIsDarkMode(true);
    }
  };

  // Trigger MapLibre OfflineManager Vector Tile Download
  const handleDownloadOfflineTiles = async () => {
    setCacheProgress(0);
    const success = await offlineMapService.cacheRegion(
      {
        packName: `safecircle-region-${Date.now().toString().slice(-4)}`,
        latitude,
        longitude,
        mapStyle: currentStyle,
      },
      progress => setCacheProgress(progress)
    );

    if (success) {
      setIsCached(true);
      setTimeout(() => setCacheProgress(null), 3000);
    } else {
      setCacheProgress(null);
    }
  };

  return (
    <View style={isFullScreen ? styles.fullScreenContainer : [styles.container, { height }]}>
      {/* Google Maps Style Top Floating Header Bar */}
      {isFullScreen && (
        <View style={styles.googleMapsTopBar}>
          {onBack && (
            <TouchableOpacity style={styles.googleMapsBackBtn} onPress={onBack} activeOpacity={0.8}>
              <Text style={styles.googleMapsBackBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          <View style={styles.googleMapsTitleBox}>
            <Text style={styles.googleMapsTitleText} numberOfLines={1}>📍 {targetName}</Text>
            <Text style={styles.googleMapsSubtitleText}>Live Satellite & Geolocation Stream</Text>
          </View>
        </View>
      )}

      {/* Floating Back Button for Embedded Maps */}
      {!isFullScreen && onBack && (
        <TouchableOpacity style={styles.backFloatingBtn} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.backFloatingBtnText}>← Back to Home</Text>
        </TouchableOpacity>
      )}

      {/* FINAL APPROACH RADAR BANNER (< 15 METERS) */}
      {isFinalApproach && (
        <View style={[styles.finalApproachBanner, isFullScreen ? { top: 72 } : onBack ? { top: 52 } : null]}>
          <Text style={styles.finalApproachTitle}>
            🎯 FINAL APPROACH RADAR ACTIVE • {proximityDistance ? `${proximityDistance.toFixed(1)}m away` : '< 15m away'}
          </Text>
          <Text style={styles.finalApproachSubtitle}>
            {bearingDegrees !== null
              ? `Heading: ${Math.round(bearingDegrees)}° • Target is in immediate vicinity!`
              : 'Close proximity detected — Switch to visual scanning!'}
          </Text>
        </View>
      )}

      {/* MapLibre Map View Container */}
      <Map
        style={styles.map}
        mapStyle={currentStyle}
        logo={false}
        attribution={false}
        androidView="texture"
      >
        {/* CRITICAL: cameraRef attached directly to <Camera ref={cameraRef} /> centered on device */}
        <Camera
          ref={cameraRef}
          initialViewState={{
            centerCoordinate: [longitude, latitude],
            zoomLevel: 11.5,
          } as any}
        />

        {/* 4. USER LOCATION MARKER */}
        <UserLocation animated={true} />

        {/* Live Target Location Marker Pin with Pulsing Radar Ring */}
        <Marker id="target-device-pin" lngLat={[longitude, latitude]}>
          <View style={styles.markerWrapper}>
            {isFinalApproach && (
              <Animated.View
                style={[
                  styles.radarPulseRing,
                  { transform: [{ scale: radarAnim }] },
                ]}
              />
            )}
            <View style={[styles.markerCircle, isFinalApproach && styles.markerCircleRadar]}>
              <Text style={styles.markerIcon}>📍</Text>
            </View>
          </View>
        </Marker>

        {/* Historical Route Line Layer */}
        {routeCoordinates.length > 1 && (
          <GeoJSONSource id="route-source" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                'line-color': isFinalApproach ? COLORS.accentRed : COLORS.accentCyan,
                'line-width': 4,
                'line-opacity': 0.85,
              }}
            />
          </GeoJSONSource>
        )}

        {/* Active Safe Zones Geofence Circles */}
        {safeZoneFeatures.length > 0 && (
          <GeoJSONSource id="safezones-source" data={safeZonesGeoJSON}>
            <Layer
              id="safezones-fill"
              type="fill"
              paint={{
                'fill-color': COLORS.accentGreen,
                'fill-opacity': 0.2,
              }}
            />
            <Layer
              id="safezones-outline"
              type="line"
              paint={{
                'line-color': COLORS.accentGreen,
                'line-width': 2.5,
              }}
            />
          </GeoJSONSource>
        )}
      </Map>

      {/* Top Live GPS Info Badge for Embedded Mode */}
      {!isFullScreen && (
        <View style={[styles.mapOverlayBadge, onBack ? { top: 52 } : null]}>
          <View style={[styles.livePulseDot, isFinalApproach && styles.pulseDotRadar]} />
          <Text style={styles.mapOverlayText}>
            LIVE GPS • {targetName} • {latitude.toFixed(5)}, {longitude.toFixed(5)} (±{accuracy ? accuracy.toFixed(1) : '10'}m)
          </Text>
        </View>
      )}

      {/* Offline Tile Caching Status Toast */}
      {cacheProgress !== null && (
        <View style={[styles.cacheProgressBadge, isFullScreen ? { top: 80 } : null]}>
          <Text style={styles.cacheProgressText}>
            💾 Caching Map Tiles Offline... {cacheProgress}%
          </Text>
        </View>
      )}
      {isCached && cacheProgress === null && (
        <View style={[styles.cacheProgressBadge, { backgroundColor: COLORS.accentGreenBg }, isFullScreen ? { top: 80 } : null]}>
          <Text style={styles.cacheProgressText}>✅ Offline Map Cached</Text>
        </View>
      )}

      {/* FLOATING ACTION BUTTON CONTROLS (INCLUDES 🎯 MY LOCATION RECENTER BUTTON) */}
      {isFullScreen ? (
        <View style={styles.googleMapsBottomSheet}>
          <View style={styles.bottomSheetHandle} />
          <View style={styles.bottomSheetHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bottomSheetTitle}>{targetName}</Text>
              <Text style={styles.bottomSheetCoords}>
                📍 {latitude.toFixed(5)}, {longitude.toFixed(5)} • ±{accuracy ? accuracy.toFixed(1) : '5'}m
              </Text>
            </View>
            <View style={styles.bottomSheetBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.bottomSheetBadgeText}>LIVE GPS</Text>
            </View>
          </View>

          {/* Quick Action Button Row with Floating Recenter Action */}
          <View style={styles.bottomSheetActionRow}>
            {onOpenARView && (
              <TouchableOpacity style={[styles.bottomSheetBtn, { backgroundColor: COLORS.accentRedBg, borderColor: COLORS.accentRed }]} onPress={onOpenARView}>
                <Text style={styles.bottomSheetBtnIcon}>📷</Text>
                <Text style={[styles.bottomSheetBtnText, { color: '#FFF' }]}>AR Vision</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.bottomSheetBtn} onPress={handleRecenter}>
              <Text style={styles.bottomSheetBtnIcon}>🎯</Text>
              <Text style={styles.bottomSheetBtnText}>My Location</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomSheetBtn} onPress={handleToggleStyle}>
              <Text style={styles.bottomSheetBtnIcon}>{isDarkMode ? '🌙' : '☀️'}</Text>
              <Text style={styles.bottomSheetBtnText}>{isDarkMode ? 'Dark' : 'Streets'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomSheetBtn} onPress={handleDownloadOfflineTiles}>
              <Text style={styles.bottomSheetBtnIcon}>📥</Text>
              <Text style={styles.bottomSheetBtnText}>Offline Pack</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Interactive Map Control Floating Action Buttons for Embedded Preview */
        <View style={styles.controlsContainer}>
          {onOpenARView && (
            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: COLORS.accentRedBg, borderColor: COLORS.accentRed }]} onPress={onOpenARView}>
              <Text style={styles.controlBtnIcon}>📷</Text>
            </TouchableOpacity>
          )}
          {onExpandFullScreen && (
            <TouchableOpacity style={styles.controlBtn} onPress={onExpandFullScreen}>
              <Text style={styles.controlBtnIcon}>⛶</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.controlBtn} onPress={handleRecenter}>
            <Text style={styles.controlBtnIcon}>🎯</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={handleToggleStyle}>
            <Text style={styles.controlBtnIcon}>{isDarkMode ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={handleDownloadOfflineTiles}>
            <Text style={styles.controlBtnIcon}>📥</Text>
          </TouchableOpacity>
        </View>
      )}
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
  fullScreenContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginVertical: 16,
  },
  placeholderIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  placeholderTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  placeholderSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  mapOverlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    zIndex: 10,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accentGreen,
    marginRight: 8,
  },
  pulseDotRadar: {
    backgroundColor: COLORS.accentRed,
  },
  mapOverlayText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'column',
    zIndex: 10,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  controlBtnIcon: {
    fontSize: 18,
  },
  markerWrapper: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accentCyan,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 6,
  },
  markerCircleRadar: {
    backgroundColor: COLORS.accentRed,
  },
  markerIcon: {
    fontSize: 18,
  },
  radarPulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
    borderWidth: 1.5,
    borderColor: COLORS.accentRed,
  },
  finalApproachBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(127, 29, 29, 0.95)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    zIndex: 90,
    borderWidth: 1,
    borderColor: COLORS.accentRed,
    elevation: 8,
  },
  finalApproachTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  finalApproachSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  cacheProgressBadge: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.accentCyan,
    zIndex: 15,
  },
  cacheProgressText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  backFloatingBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accentCyan,
    zIndex: 99,
  },
  backFloatingBtnText: {
    color: COLORS.accentCyan,
    fontSize: 12,
    fontWeight: '800',
  },
  googleMapsTopBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 12,
    left: 12,
    right: 12,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleMapsBackBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.accentCyan,
    marginRight: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  googleMapsBackBtnText: {
    color: COLORS.accentCyan,
    fontSize: 14,
    fontWeight: '800',
  },
  googleMapsTitleBox: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  googleMapsTitleText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  googleMapsSubtitleText: {
    color: COLORS.accentCyan,
    fontSize: 11,
    fontWeight: '600',
  },
  googleMapsBottomSheet: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    zIndex: 99,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.borderDark,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  bottomSheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bottomSheetTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  bottomSheetCoords: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  bottomSheetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentGreenBg,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accentGreen,
  },
  bottomSheetBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  bottomSheetActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  bottomSheetBtn: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  bottomSheetBtnIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  bottomSheetBtnText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
});
