export interface Coordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Calculate Haversine distance in meters between two coordinates
 */
export function calculateDistanceMeters(start: Coordinate, end: Coordinate): number {
  const R = 6371000; // Earth radius in meters
  const phi1 = (start.latitude * Math.PI) / 180;
  const phi2 = (end.latitude * Math.PI) / 180;
  const deltaPhi = ((end.latitude - start.latitude) * Math.PI) / 180;
  const deltaLambda = ((end.longitude - start.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Linearly interpolate between start and end coordinates
 */
export function lerpCoordinate(
  start: Coordinate,
  end: Coordinate,
  fraction: number
): Coordinate {
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * clampedFraction,
    longitude: start.longitude + (end.longitude - start.longitude) * clampedFraction,
    accuracy: end.accuracy,
  };
}

/**
 * Calculate smooth trigonometric bearing angle (0 - 360 degrees)
 */
export function calculateBearingDegrees(start: Coordinate, end: Coordinate): number {
  if (
    Math.abs(start.latitude - end.latitude) < 0.00001 &&
    Math.abs(start.longitude - end.longitude) < 0.00001
  ) {
    return 0;
  }

  const phi1 = (start.latitude * Math.PI) / 180;
  const phi2 = (end.latitude * Math.PI) / 180;
  const deltaLambda = ((end.longitude - start.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);

  return ((theta * 180) / Math.PI + 360) % 360;
}

/**
 * Cubic Out Easing Curve for natural deceleration
 */
export function cubicOutEasing(t: number): number {
  const p = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - p, 3);
}
