/**
 * Distance & Bearing Utilities for SafeCircle Geolocation Radar
 */

// Convert degrees to radians
const toRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

// Convert radians to degrees
const toDegrees = (radians: number): number => {
  return (radians * 180) / Math.PI;
};

/**
 * Calculates distance between two GPS coordinates in meters using Haversine formula
 */
export const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const EARTH_RADIUS_METERS = 6371000; // Earth's mean radius in meters

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

/**
 * Calculates compass bearing from point 1 to point 2 in degrees (0-360)
 */
export const calculateBearingDegrees = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dLon = toRadians(lon2 - lon1);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);

  const initialBearing = toDegrees(Math.atan2(y, x));
  return (initialBearing + 360) % 360;
};

/**
 * Calculates speed in km/h between two points given their timestamps
 */
export const calculateSpeedKmh = (
  lat1: number,
  lon1: number,
  time1: string | Date,
  lat2: number,
  lon2: number,
  time2: string | Date
): number => {
  const d1 = new Date(time1).getTime();
  const d2 = new Date(time2).getTime();
  const timeDiffMs = Math.abs(d2 - d1);

  if (timeDiffMs === 0) return 0; // Avoid division by zero

  const distanceMeters = calculateDistanceMeters(lat1, lon1, lat2, lon2);
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

  return (distanceMeters / 1000) / timeDiffHours;
};

/**
 * Maps speed in km/h to a corresponding theme color.
 * Green (< 5 km/h) -> Yellow (5-15) -> Orange (15-50) -> Red (> 50)
 */
export const getSpeedColor = (speedKmh: number): string => {
  if (speedKmh < 5) return '#10B981'; // Green (Walking/Stationary)
  if (speedKmh < 15) return '#F59E0B'; // Yellow (Running/Cycling)
  if (speedKmh < 50) return '#F97316'; // Orange (City Driving)
  return '#EF4444'; // Red (Highway/Speeding)
};

export interface RouteCoord {
  latitude: number | string;
  longitude: number | string;
  timestamp?: string;
}

/**
 * Converts an array of route coordinates into a GeoJSON FeatureCollection
 * of individual LineString segments, each annotated with speed, color, and heading.
 */
export const generateGradientRoute = (
  logs: RouteCoord[]
): GeoJSON.FeatureCollection<GeoJSON.LineString> => {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

  // Need at least 2 points to form a segment
  if (!logs || logs.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  // Sort logs by timestamp ascending (oldest first) to accurately calculate speed
  const sortedLogs = [...logs].sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  for (let i = 0; i < sortedLogs.length - 1; i++) {
    const current = sortedLogs[i];
    const next = sortedLogs[i + 1];

    const lat1 = parseFloat(String(current.latitude));
    const lon1 = parseFloat(String(current.longitude));
    const lat2 = parseFloat(String(next.latitude));
    const lon2 = parseFloat(String(next.longitude));

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) continue;

    let speed = 0;
    if (current.timestamp && next.timestamp) {
      speed = calculateSpeedKmh(lat1, lon1, current.timestamp, lat2, lon2, next.timestamp);
    }

    const heading = calculateBearingDegrees(lat1, lon1, lat2, lon2);
    const color = getSpeedColor(speed);

    features.push({
      type: 'Feature',
      properties: {
        speedKmh: speed,
        color: color,
        heading: heading,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [lon1, lat1],
          [lon2, lat2],
        ],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
};
