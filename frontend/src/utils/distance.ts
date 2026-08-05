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
