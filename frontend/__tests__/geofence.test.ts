import { createGeofencePolygon } from '../src/utils/geofenceHelper';

describe('Geofence Helper Utility', () => {
  it('should generate a valid 32-point closed polygon GeoJSON feature', () => {
    const lat = 6.9271;
    const lng = 79.8612;
    const radiusMeters = 250;
    const name = 'Campus Safe Zone';

    const feature = createGeofencePolygon(lat, lng, radiusMeters, name, true);

    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('Polygon');
    expect(feature.properties.name).toBe(name);
    expect(feature.properties.radiusMeters).toBe(radiusMeters);
    expect(feature.properties.isDraft).toBe(true);

    const coords = feature.geometry.coordinates[0];
    // 32 points + 1 closing point = 33 points
    expect(coords.length).toBe(33);

    // Verify polygon loop is closed (first coord === last coord)
    expect(coords[0][0]).toBeCloseTo(coords[32][0], 6);
    expect(coords[0][1]).toBeCloseTo(coords[32][1], 6);
  });

  it('should scale polygon coordinate offsets proportionally with radius', () => {
    const lat = 6.9271;
    const lng = 79.8612;

    const smallZone = createGeofencePolygon(lat, lng, 100);
    const largeZone = createGeofencePolygon(lat, lng, 500);

    const smallMaxLng = Math.max(...smallZone.geometry.coordinates[0].map(c => c[0]));
    const largeMaxLng = Math.max(...largeZone.geometry.coordinates[0].map(c => c[0]));

    // Offset from center should be ~5x larger for 500m vs 100m
    const smallDelta = smallMaxLng - lng;
    const largeDelta = largeMaxLng - lng;

    expect(largeDelta / smallDelta).toBeCloseTo(5, 1);
  });
});
