/**
 * Geofence Geometry Utilities for SafeCircle Map
 */

export interface CirclePolygonFeature {
  type: 'Feature';
  properties: {
    name?: string;
    radiusMeters?: number;
    isDraft?: boolean;
  };
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
}

/**
 * Generates a 32-vertex GeoJSON Polygon representing a circular geofence boundary.
 * Compensates for latitude compression to ensure accurate metric radius on spherical projections.
 *
 * @param centerLat Latitude in decimal degrees
 * @param centerLng Longitude in decimal degrees
 * @param radiusMeters Circle radius in meters
 * @param name Optional name for the zone
 * @param isDraft Whether this is a draft editing layer
 */
export const createGeofencePolygon = (
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  name: string = 'Safe Zone',
  isDraft: boolean = false
): CirclePolygonFeature => {
  const points = 32;
  const coords: [number, number][] = [];
  const radiusKm = radiusMeters / 1000;

  // Degrees per kilometer with latitude compression
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = lngDelta * Math.cos(theta);
    const y = latDelta * Math.sin(theta);
    coords.push([centerLng + x, centerLat + y]);
  }

  // Close polygon loop by connecting the last point to the first
  coords.push(coords[0]);

  return {
    type: 'Feature',
    properties: {
      name,
      radiusMeters,
      isDraft,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
};
