import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { apiService } from './api';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  timestamp: string;
}

class LocationService {
  private watchId: number | null = null;
  private isTracking: boolean = false;

  /**
   * 1. ANDROID & IOS RUNTIME PERMISSION CHECK & REQUEST
   * Explicitly checks and requests native location permissions:
   * - Android: ACCESS_FINE_LOCATION and ACCESS_COARSE_LOCATION (plus ACCESS_BACKGROUND_LOCATION on API 29+)
   * - iOS: NSLocationWhenInUseUsageDescription / NSLocationAlwaysAndWhenInUseUsageDescription
   */
  async checkLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      try {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        return auth === 'granted';
      } catch (err) {
        console.warn('[LocationService] iOS Geolocation Permission Error:', err);
        return false;
      }
    }

    if (Platform.OS === 'android') {
      try {
        const hasFine = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        const hasCoarse = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        );

        if (hasFine && hasCoarse) {
          return true;
        }

        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const fineGranted =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const coarseGranted =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;

        if (!fineGranted && !coarseGranted) {
          Alert.alert(
            'Location Permission Denied',
            'SafeCircle requires location permissions to track your device safety in real-time. Please enable location permissions in app settings.'
          );
          return false;
        }

        // Background location check for Android 10+ (API 29+)
        if (Platform.Version >= 29 && fineGranted) {
          try {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
              {
                title: 'SafeCircle Background Location Access',
                message:
                  'SafeCircle needs background location access to broadcast emergency alerts to your safety circle even when minimized.',
                buttonPositive: 'Grant',
                buttonNegative: 'Cancel',
              }
            );
          } catch (bgErr) {
            console.warn('[LocationService] Background location permission skipped:', bgErr);
          }
        }

        return true;
      } catch (err) {
        console.warn('[LocationService] Android Permission Request Error:', err);
        return false;
      }
    }

    return false;
  }

  /**
   * 2. ANDROID FUSED LOCATION PROVIDER INTEGRATION
   * - Obtains immediate initial position fix via getCurrentPosition() with high accuracy settings
   * - Starts continuous watchPosition() tracking
   */
  async startLocationTracking(
    deviceId: string,
    token: string,
    socket: any,
    onLocationUpdate?: (location: LocationCoordinates) => void
  ): Promise<boolean> {
    if (this.isTracking) {
      console.log('[LocationService] Location tracking already active.');
      return true;
    }

    const hasPermission = await this.checkLocationPermission();
    if (!hasPermission) {
      console.warn('[LocationService] Cannot start tracking: Location permissions denied.');
      return false;
    }

    this.isTracking = true;

    // Step A: Fetch immediate current location fix
    const initialLocation = await this.getCurrentLocation();
    if (initialLocation) {
      console.log(
        `[LocationService] Initial Fused GPS Fix: ${initialLocation.latitude}, ${initialLocation.longitude}`
      );
      if (onLocationUpdate) {
        onLocationUpdate(initialLocation);
      }
      if (socket && socket.connected) {
        socket.emit('location_update', {
          deviceId,
          ...initialLocation,
        });
      }
      apiService.logLocation(token, {
        deviceId,
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        accuracy: initialLocation.accuracy,
      }).catch(err => console.warn('[LocationService] Initial log failed:', err.message));
    }

    // Step B: Continuous real-time coordinate streaming via watchPosition()
    try {
      this.watchId = Geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;
          const timestamp = new Date(position.timestamp).toISOString();

          const locationData: LocationCoordinates = {
            latitude,
            longitude,
            accuracy: accuracy || 5.0,
            speed: speed || 0,
            heading: heading || 0,
            altitude: altitude || 0,
            timestamp,
          };

          console.log(
            `[Android Fused Location] Live update for device ${deviceId}: ${latitude}, ${longitude} (±${accuracy}m)`
          );

          if (socket && socket.connected) {
            socket.emit('location_update', {
              deviceId,
              latitude,
              longitude,
              accuracy: accuracy || 5.0,
              speed: speed || 0,
              heading: heading || 0,
              altitude: altitude || 0,
              timestamp,
            });
          }

          apiService.logLocation(token, {
            deviceId,
            latitude,
            longitude,
            accuracy: accuracy || 5.0,
          }).catch(err => console.warn('[LocationService] Log location error:', err.message));

          if (onLocationUpdate) {
            onLocationUpdate(locationData);
          }
        },
        (error) => {
          this.handleLocationError(error);
        },
        {
          enableHighAccuracy: true,   // High Accuracy GPS / Fused Provider
          distanceFilter: 0,           // Immediate updates on movement
          interval: 3000,              // 3 second interval
          fastestInterval: 1500,       // 1.5 second fastest interval
          forceRequestLocation: true,
          forceLocationManager: false, // Use Fused Location Provider API on Android
          showsBackgroundLocationIndicator: true,
          useSignificantChanges: false,
        }
      );

      return true;
    } catch (err: any) {
      console.warn('[LocationService] Error starting watchPosition:', err.message || err);
      this.isTracking = false;
      return false;
    }
  }

  /**
   * Stop location tracking watcher
   */
  stopLocationTracking() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    console.log('[LocationService] Location tracking stopped.');
  }

  /**
   * Single immediate location fix method via getCurrentPosition()
   * Configured with enableHighAccuracy: true, timeout: 15000, maximumAge: 10000
   */
  getCurrentLocation(): Promise<LocationCoordinates | null> {
    return new Promise(async (resolve) => {
      const hasPerm = await this.checkLocationPermission();
      if (!hasPerm) {
        resolve(null);
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || 5.0,
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0,
            altitude: position.coords.altitude || 0,
            timestamp: new Date(position.timestamp).toISOString(),
          });
        },
        (error) => {
          this.handleLocationError(error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
          forceRequestLocation: true,
        }
      );
    });
  }

  /**
   * FALLBACK HANDLING FOR DISABLED GPS / LOCATION SERVICES
   */
  private handleLocationError(error: Geolocation.GeoError) {
    console.warn(`[LocationService Error] Code ${error.code}: ${error.message}`);

    switch (error.code) {
      case 1: // PERMISSION_DENIED
        Alert.alert(
          'Location Permission Required',
          'SafeCircle requires location permissions to track your device. Please grant location permissions in device settings.'
        );
        break;
      case 2: // POSITION_UNAVAILABLE
        Alert.alert(
          'Location Services Disabled',
          'GPS / Location Services are turned off on your Android device. Please turn on Location in Quick Settings or Device Settings.'
        );
        break;
      case 3: // TIMEOUT
        console.warn('[LocationService] Location request timed out. Retrying...');
        break;
      default:
        console.warn('[LocationService] Location error:', error.message);
        break;
    }
  }
}

export const locationService = new LocationService();
