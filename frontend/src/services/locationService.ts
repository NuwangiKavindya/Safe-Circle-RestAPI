import { Platform, PermissionsAndroid } from 'react-native';
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
   * Request location permissions for Android & iOS
   */
  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      try {
        const status = await Geolocation.requestAuthorization('always');
        return status === 'granted';
      } catch (err) {
        console.warn('iOS Geolocation Permission Error:', err);
        return false;
      }
    }

    if (Platform.OS === 'android') {
      try {
        const grantedFine = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'SafeCircle Location Permission',
            message: 'SafeCircle requires high-accuracy GPS location permission to track device safety in real-time.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Grant',
          }
        );

        if (grantedFine !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('Fine Location permission denied');
          return false;
        }

        // Request Background location on Android 10+ (API 29+)
        if (Platform.Version >= 29) {
          const grantedBackground = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: 'SafeCircle Background Tracking Permission',
              message: 'SafeCircle needs background location access so trusted contacts can receive live updates during emergency SOS.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'Grant',
            }
          );
          if (grantedBackground !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Background Location permission denied; continuing with in-app tracking');
          }
        }

        return true;
      } catch (err) {
        console.warn('Android Permission Request Error:', err);
        return false;
      }
    }

    return false;
  }

  /**
   * Start real-time location tracking using watchPosition and Fused Location Provider API
   */
  async startLocationTracking(
    deviceId: string,
    token: string,
    socket: any,
    onLocationUpdate?: (location: LocationCoordinates) => void
  ): Promise<boolean> {
    if (this.isTracking) {
      console.log('Location tracking already active.');
      return true;
    }

    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      console.warn('Cannot start tracking: Location permissions not granted.');
    }

    this.isTracking = true;

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
            `[GPS Fused Provider] Live location update for device ${deviceId}: ${latitude}, ${longitude} (Accuracy: ±${accuracy}m)`
          );

          // 1. Send via Socket.IO WebSocket for sub-second latency to tracking screen
          if (socket && socket.connected) {
            socket.emit('location_update', {
              deviceId,
              latitude,
              longitude,
              accuracy,
              speed,
              heading,
              altitude,
              timestamp,
            });
          }

          // 2. Persist to Backend API Database
          apiService.logLocation(token, {
            deviceId,
            latitude,
            longitude,
            accuracy: accuracy || 5.0,
          }).catch(err => {
            console.warn('Failed to log location to backend API:', err.message);
          });

          // 3. Optional local callback
          if (onLocationUpdate) {
            onLocationUpdate(locationData);
          }
        },
        (error) => {
          console.warn(`[GPS Watch Position Error] Code ${error.code}: ${error.message}`);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 5, // Send update whenever device moves ~5 meters
          interval: 3000,    // Receive coordinate updates every 3 seconds
          fastestInterval: 2000,
          forceRequestLocation: true,
          showsBackgroundLocationIndicator: true,
          useSignificantChanges: false,
        }
      );

      return true;
    } catch (err: any) {
      console.warn('Error launching Geolocation.watchPosition:', err.message || err);
      this.isTracking = false;
      return false;
    }
  }

  /**
   * Stop location tracking and clear position watcher
   */
  stopLocationTracking() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    console.log('[GPS Fused Provider] Location tracking stopped.');
  }

  /**
   * Get single current location fix
   */
  getCurrentLocation(): Promise<LocationCoordinates | null> {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || 10,
            timestamp: new Date(position.timestamp).toISOString(),
          });
        },
        (error) => {
          console.warn('getCurrentPosition error:', error.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }
}

export const locationService = new LocationService();
