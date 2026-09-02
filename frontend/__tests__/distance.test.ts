import { calculateSpeedKmh, getSpeedColor, generateGradientRoute, RouteCoord } from '../src/utils/distance';

describe('Distance and Speed Gradient Logic', () => {
  it('calculates speed in km/h correctly', () => {
    // 1 km traveled in 10 minutes (1/6 hour) = 6 km/h
    // Latitude 0 to 0.009 ~= 1 km
    const lat1 = 0;
    const lon1 = 0;
    const time1 = new Date('2024-01-01T12:00:00Z');

    const lat2 = 0.009;
    const lon2 = 0;
    const time2 = new Date('2024-01-01T12:10:00Z');

    const speed = calculateSpeedKmh(lat1, lon1, time1, lat2, lon2, time2);
    expect(speed).toBeCloseTo(6, 0); // Roughly 6 km/h
  });

  it('maps speeds to correct colors', () => {
    expect(getSpeedColor(3)).toBe('#10B981'); // Walking
    expect(getSpeedColor(10)).toBe('#F59E0B'); // Running
    expect(getSpeedColor(30)).toBe('#F97316'); // City Driving
    expect(getSpeedColor(80)).toBe('#EF4444'); // Highway
  });

  it('generates a valid gradient route GeoJSON', () => {
    const logs: RouteCoord[] = [
      { latitude: 0, longitude: 0, timestamp: '2024-01-01T12:00:00Z' },
      { latitude: 0.001, longitude: 0, timestamp: '2024-01-01T12:01:00Z' }, // Walking
      { latitude: 0.010, longitude: 0, timestamp: '2024-01-01T12:02:00Z' }, // Driving Fast
    ];

    const route = generateGradientRoute(logs);
    
    expect(route.type).toBe('FeatureCollection');
    expect(route.features.length).toBe(2);

    const segment1 = route.features[0];
    expect(segment1.properties?.speedKmh).toBeGreaterThan(0);
    expect(segment1.properties?.speedKmh).toBeLessThan(15);
    expect(segment1.properties?.color).toBeDefined();
    
    const segment2 = route.features[1];
    expect(segment2.properties?.speedKmh).toBeGreaterThan(50);
    expect(segment2.properties?.color).toBe('#EF4444');
  });

  it('handles empty or insufficient logs safely', () => {
    const emptyRoute = generateGradientRoute([]);
    expect(emptyRoute.features.length).toBe(0);

    const singleRoute = generateGradientRoute([{ latitude: 0, longitude: 0 }]);
    expect(singleRoute.features.length).toBe(0);
  });
});
