import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { calculateDistanceMeters, calculateBearingDegrees } from '../utils/distance';
import { COLORS } from '../styles/theme';

interface ARViewComponentProps {
  userLatitude: number | null;
  userLongitude: number | null;
  targetLatitude: number | null;
  targetLongitude: number | null;
  targetName?: string;
  onBack: () => void;
}

export const ARViewComponent: React.FC<ARViewComponentProps> = ({
  userLatitude,
  userLongitude,
  targetLatitude,
  targetLongitude,
  targetName = 'Target Device',
  onBack,
}) => {
  // Manual heading angle in degrees (0 - 360) for testing compass orientation
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  
  // Pulse animation for target reticle lock
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const arrowRotateAnim = useRef(new Animated.Value(0)).current;

  // Calculate real-time distance & bearing
  const hasUserCoords = userLatitude !== null && userLongitude !== null;
  const hasTargetCoords = targetLatitude !== null && targetLongitude !== null;

  const lat1 = hasUserCoords ? userLatitude! : 0;
  const lon1 = hasUserCoords ? userLongitude! : 0;
  const lat2 = hasTargetCoords ? targetLatitude! : 0;
  const lon2 = hasTargetCoords ? targetLongitude! : 0;

  const distanceMeters = (hasUserCoords && hasTargetCoords) ? calculateDistanceMeters(lat1, lon1, lat2, lon2) : 0;
  const targetBearing = (hasUserCoords && hasTargetCoords) ? calculateBearingDegrees(lat1, lon1, lat2, lon2) : 0;

  // Relative arrow rotation angle (Target bearing minus current phone compass heading)
  const relativeAngle = (targetBearing - deviceHeading + 360) % 360;

  // Animate reticle pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Smoothly rotate arrow to relativeAngle
  useEffect(() => {
    Animated.timing(arrowRotateAnim, {
      toValue: relativeAngle,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [relativeAngle, arrowRotateAnim]);

  const rotateInterpolation = arrowRotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate signal bar percentage based on distance (< 15 meters)
  const signalPercent = Math.max(10, Math.min(100, Math.round((1 - distanceMeters / 30) * 100)));

  return (
    <View style={styles.container}>
      {/* Simulated Live Camera Viewfinder Background Feed */}
      <View style={styles.cameraViewfinder}>
        {/* Simulated Camera Grain & Grid Lines */}
        <View style={styles.gridLineHorizontal} />
        <View style={styles.gridLineVertical} />
        <Text style={styles.cameraWatermarkText}>📷 LIVE AR CAMERA FEED • 1080P HD</Text>

        {/* Top AR Header Bar */}
        <View style={styles.topHeaderBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>← Back to Map</Text>
          </TouchableOpacity>
          <View style={styles.arStatusBadge}>
            <View style={styles.pulseDotRed} />
            <Text style={styles.arStatusText}>AR GUIDANCE ACTIVE</Text>
          </View>
        </View>

        {/* Central 3D HUD Reticle & Directional Pointer */}
        <View style={styles.hudCenterWrapper}>
          {/* Outer Pulsing Reticle Ring */}
          <Animated.View
            style={[
              styles.targetReticleRing,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />

          {/* Inner Rotating 3D Compass Arrow */}
          <Animated.View
            style={[
              styles.arrowWrapper,
              { transform: [{ rotate: rotateInterpolation }] },
            ]}
          >
            <Text style={styles.arrowIcon}>⬆️</Text>
          </Animated.View>

          {/* Target HUD Information Overlay Card */}
          <View style={styles.targetInfoBadge}>
            <Text style={styles.targetNameText}>📍 {targetName}</Text>
            <Text style={styles.targetDistanceText}>
              {distanceMeters.toFixed(1)}m AWAY
            </Text>
            <Text style={styles.targetHeadingText}>
              Heading: {Math.round(targetBearing)}° • Pointer Relative: {Math.round(relativeAngle)}°
            </Text>
          </View>
        </View>

        {/* Bottom AR Diagnostics & Signal Strength Panel */}
        <View style={styles.bottomHudPanel}>
          <View style={styles.signalRow}>
            <Text style={styles.signalLabelText}>📡 Proximity Signal Strength:</Text>
            <Text style={styles.signalValueText}>{signalPercent}%</Text>
          </View>

          <View style={styles.signalBarBg}>
            <View style={[styles.signalBarFill, { width: `${signalPercent}%` }]} />
          </View>

          {/* Compass Steering Control Buttons for Simulation / Calibration */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.simControlBtn}
              onPress={() => setDeviceHeading((prev) => (prev - 30 + 360) % 360)}
            >
              <Text style={styles.simControlText}>↺ Turn Left (-30°)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simControlBtn}
              onPress={() => setDeviceHeading(targetBearing)}
            >
              <Text style={[styles.simControlText, { color: COLORS.accentGreen }]}>🎯 Lock Target</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simControlBtn}
              onPress={() => setDeviceHeading((prev) => (prev + 30) % 360)}
            >
              <Text style={styles.simControlText}>Turn Right (+30°) ↻</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  cameraViewfinder: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#090D16',
    position: 'relative',
    justifyContent: 'space-between',
  },
  gridLineHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  gridLineVertical: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  cameraWatermarkText: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 16,
    right: 16,
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    zIndex: 99,
  },
  backBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.accentCyan,
  },
  backBtnText: {
    color: COLORS.accentCyan,
    fontSize: 14,
    fontWeight: '800',
  },
  arStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 29, 29, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accentRed,
  },
  pulseDotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accentRed,
    marginRight: 8,
  },
  arStatusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudCenterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 'auto',
  },
  targetReticleRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: COLORS.accentCyan,
    borderStyle: 'dashed',
    position: 'absolute',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  arrowWrapper: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  arrowIcon: {
    fontSize: 54,
  },
  targetInfoBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: COLORS.accentCyan,
    elevation: 10,
    shadowColor: COLORS.accentCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  targetNameText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  targetDistanceText: {
    color: COLORS.accentRed,
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4,
  },
  targetHeadingText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  bottomHudPanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  signalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  signalLabelText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  signalValueText: {
    color: COLORS.accentGreen,
    fontSize: 14,
    fontWeight: '800',
  },
  signalBarBg: {
    height: 8,
    backgroundColor: COLORS.bgDark,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  signalBarFill: {
    height: '100%',
    backgroundColor: COLORS.accentGreen,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  simControlBtn: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  simControlText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
});
