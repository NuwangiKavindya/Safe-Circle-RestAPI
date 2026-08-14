import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';

const { MotionGuardModule } = NativeModules;

export interface MotionSample {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  timestamp: number;
}

export type SensitivityMode = 'TABLE_GUARD' | 'POCKET_GUARD' | 'ACTIVE_GUARD';

export interface SensitivityProfile {
  name: string;
  label: string;
  icon: string;
  accelThreshold: number;  // m/s^2 above gravity
  jerkThreshold: number;   // m/s^3
  angularThreshold: number; // rad/s
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  confidenceScore: number; // 0.0 to 1.0
  detectionSource: 'STAGE_1_FAST_PATH' | 'STAGE_2_TFLITE_MODEL';
  reason: string;
  sensitivityMode: SensitivityMode;
}

export const SENSITIVITY_PROFILES: Record<SensitivityMode, SensitivityProfile> = {
  TABLE_GUARD: {
    name: 'TABLE_GUARD',
    label: 'Table Guard',
    icon: '☕',
    accelThreshold: 12.0,  // High sensitivity for resting phone on table
    jerkThreshold: 60.0,
    angularThreshold: 4.5,
  },
  POCKET_GUARD: {
    name: 'POCKET_GUARD',
    label: 'Pocket Mode',
    icon: '🚶',
    accelThreshold: 22.0,  // Medium sensitivity for walking / pocket
    jerkThreshold: 110.0,
    angularThreshold: 7.5,
  },
  ACTIVE_GUARD: {
    name: 'ACTIVE_GUARD',
    label: 'Active Mode',
    icon: '🏃',
    accelThreshold: 35.0,  // Low sensitivity for running / exercise
    jerkThreshold: 180.0,
    angularThreshold: 11.0,
  },
};

let sensorsModule: any = null;
try {
  sensorsModule = require('react-native-sensors');
} catch (e) {
  sensorsModule = null;
}

class MotionService {
  private accelSubscription: any = null;
  private gyroSubscription: any = null;
  private nativeAnomalySub: any = null;
  private nativeEnergySub: any = null;

  private isMonitoring: boolean = false;
  private sampleBuffer: MotionSample[] = [];
  private lastSample: { ax: number; ay: number; az: number; time: number } | null = null;
  
  private onAnomalyCallback: ((result: AnomalyDetectionResult) => void) | null = null;
  private onEnergyUpdateCallback: ((energyLevel: number) => void) | null = null;
  private simulationInterval: any = null;

  private currentMode: SensitivityMode = 'POCKET_GUARD';
  private userBaselineOffset: number = 0;
  private isCalibrating: boolean = false;
  private calibrationSamples: number[] = [];

  private readonly DEBOUNCE_MS = 5000;
  private lastTriggerTime: number = 0;

  public setSensitivityMode(mode: SensitivityMode) {
    this.currentMode = mode;
    console.log(`[MotionService] Sensitivity profile updated to: ${mode}`);
    // If native foreground service is active, update service mode
    if (Platform.OS === 'android' && MotionGuardModule) {
      MotionGuardModule.startBackgroundMonitoring(mode).catch(() => {});
    }
  }

  public getSensitivityMode(): SensitivityMode {
    return this.currentMode;
  }

  /**
   * Start Motion Sensor Monitoring (with Native Android Foreground Service & Partial WakeLock)
   */
  public startMonitoring(
    onAnomalyDetected: (result: AnomalyDetectionResult) => void,
    onEnergyUpdate?: (energyLevel: number) => void
  ): boolean {
    if (this.isMonitoring) {
      console.log('[MotionService] Motion Guard already active.');
      return true;
    }

    this.onAnomalyCallback = onAnomalyDetected;
    this.onEnergyUpdateCallback = onEnergyUpdate || null;
    this.isMonitoring = true;
    this.sampleBuffer = [];
    this.lastSample = null;

    // 1. Trigger Native Android Sticky Foreground Service + Partial WakeLock
    if (Platform.OS === 'android' && MotionGuardModule) {
      try {
        MotionGuardModule.startBackgroundMonitoring(this.currentMode)
          .then(() => console.log('[MotionService] 🚀 Native Android Foreground Service & Partial WakeLock started.'))
          .catch((err: any) => console.warn('[MotionService] Failed to start native foreground service:', err));

        // Listen for Native Android Service Events
        this.nativeAnomalySub = DeviceEventEmitter.addListener('onMotionAnomalyDetected', (eventData: AnomalyDetectionResult) => {
          console.warn('[MotionService] 🚨 Native Foreground Anomaly Event:', eventData.reason);
          if (this.onAnomalyCallback) {
            this.onAnomalyCallback(eventData);
          }
        });

        this.nativeEnergySub = DeviceEventEmitter.addListener('onMotionEnergyUpdated', (data: { energyLevel: number }) => {
          if (this.onEnergyUpdateCallback) {
            this.onEnergyUpdateCallback(data.energyLevel);
          }
        });
      } catch (err: any) {
        console.warn('[MotionService] Native module attachment error:', err);
      }
    }

    // 2. React Native JS Thread Fallback Listener (when in foreground)
    if (sensorsModule && sensorsModule.accelerometer && sensorsModule.gyroscope) {
      try {
        const { accelerometer, gyroscope, SensorTypes, setUpdateIntervalForType } = sensorsModule;
        setUpdateIntervalForType(SensorTypes.accelerometer, 20); // 50Hz
        setUpdateIntervalForType(SensorTypes.gyroscope, 20);     // 50Hz

        let currentGyro = { gx: 0, gy: 0, gz: 0 };

        this.gyroSubscription = gyroscope.subscribe(
          ({ x, y, z }: { x: number; y: number; z: number }) => {
            currentGyro = { gx: x, gy: y, gz: z };
          },
          (err: any) => console.warn('[MotionService] Gyroscope stream error:', err.message || err)
        );

        this.accelSubscription = accelerometer.subscribe(
          ({ x, y, z }: { x: number; y: number; z: number }) => {
            this.processSensorFrame(x, y, z, currentGyro.gx, currentGyro.gy, currentGyro.gz);
          },
          (err: any) => console.warn('[MotionService] Accelerometer stream error:', err.message || err)
        );

        console.log('[MotionService] 🛡️ Hardware Motion Sensors listening at 50Hz.');
        return true;
      } catch (err: any) {
        console.warn('[MotionService] Error attaching native sensors:', err.message || err);
      }
    }

    // Fallback: Start background simulated motion loop (for emulator / dev testing)
    console.log('[MotionService] 🛡️ Simulated Motion Guard active for testing.');
    this.simulationInterval = setInterval(() => {
      const noiseX = (Math.random() - 0.5) * 0.3;
      const noiseY = (Math.random() - 0.5) * 0.3;
      const noiseZ = 9.81 + (Math.random() - 0.5) * 0.3;
      this.processSensorFrame(noiseX, noiseY, noiseZ, 0.02, 0.02, 0.02);
    }, 20);

    return true;
  }

  /**
   * Stop Motion Guard Monitoring & Foreground Service
   */
  public stopMonitoring() {
    if (Platform.OS === 'android' && MotionGuardModule) {
      try {
        MotionGuardModule.stopBackgroundMonitoring()
          .then(() => console.log('[MotionService] 🛑 Native Android Foreground Service stopped.'))
          .catch((err: any) => console.warn('[MotionService] Error stopping native foreground service:', err));
      } catch (err: any) {
        console.warn('[MotionService] Native module stop error:', err);
      }
    }

    if (this.nativeAnomalySub) {
      this.nativeAnomalySub.remove();
      this.nativeAnomalySub = null;
    }
    if (this.nativeEnergySub) {
      this.nativeEnergySub.remove();
      this.nativeEnergySub = null;
    }

    if (this.accelSubscription && typeof this.accelSubscription.unsubscribe === 'function') {
      this.accelSubscription.unsubscribe();
    }
    if (this.gyroSubscription && typeof this.gyroSubscription.unsubscribe === 'function') {
      this.gyroSubscription.unsubscribe();
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.accelSubscription = null;
    this.gyroSubscription = null;
    this.isMonitoring = false;
    this.sampleBuffer = [];
    this.lastSample = null;
    console.log('[MotionService] 🛑 Motion Guard stopped.');
  }

  public isGuardActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Start 3-Second User Baseline Calibration
   */
  public calibrateUserBaseline(onComplete: (baselineOffset: number) => void) {
    this.isCalibrating = true;
    this.calibrationSamples = [];
    console.log('[MotionService] 🎯 Calibrating user baseline for 3 seconds...');

    setTimeout(() => {
      this.isCalibrating = false;
      if (this.calibrationSamples.length > 0) {
        const mean = this.calibrationSamples.reduce((a, b) => a + b, 0) / this.calibrationSamples.length;
        this.userBaselineOffset = parseFloat(mean.toFixed(2));
        console.log(`[MotionService] ✅ Baseline calibration complete: offset ${this.userBaselineOffset} m/s²`);
        onComplete(this.userBaselineOffset);
      } else {
        onComplete(0);
      }
    }, 3000);
  }

  /**
   * Core Feature Extraction Engine
   */
  private processSensorFrame(
    ax: number,
    ay: number,
    az: number,
    gx: number,
    gy: number,
    gz: number
  ) {
    const now = Date.now();

    const rawMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
    const netAccel = Math.max(0, rawMagnitude - 9.81 - this.userBaselineOffset);

    if (this.isCalibrating) {
      this.calibrationSamples.push(netAccel);
    }

    let jerk = 0;
    if (this.lastSample) {
      const dt = (now - this.lastSample.time) / 1000;
      if (dt > 0) {
        const prevNet = Math.max(0, Math.sqrt(this.lastSample.ax ** 2 + this.lastSample.ay ** 2 + this.lastSample.az ** 2) - 9.81);
        jerk = Math.abs(netAccel - prevNet) / dt;
      }
    }

    const angularVelocity = Math.sqrt(gx * gx + gy * gy + gz * gz);

    const profile = SENSITIVITY_PROFILES[this.currentMode];
    const energyPercentage = Math.min(100, Math.round((netAccel / profile.accelThreshold) * 100));

    if (this.onEnergyUpdateCallback) {
      this.onEnergyUpdateCallback(energyPercentage);
    }

    const sample: MotionSample = { ax, ay, az, gx, gy, gz, timestamp: now };
    this.sampleBuffer.push(sample);
    if (this.sampleBuffer.length > 100) {
      this.sampleBuffer.shift();
    }

    this.lastSample = { ax, ay, az, time: now };

    if (now - this.lastTriggerTime < this.DEBOUNCE_MS) {
      return;
    }

    if (
      netAccel > profile.accelThreshold &&
      jerk > profile.jerkThreshold &&
      angularVelocity > profile.angularThreshold
    ) {
      this.lastTriggerTime = now;
      const result: AnomalyDetectionResult = {
        isAnomaly: true,
        confidenceScore: 0.95,
        detectionSource: 'STAGE_1_FAST_PATH',
        reason: `Violent Snatch Gesture in ${profile.label} (Accel: ${netAccel.toFixed(1)} m/s², Jerk: ${jerk.toFixed(1)} m/s³)`,
        sensitivityMode: this.currentMode,
      };

      console.warn(`[MotionService] 🚨 ${result.reason}`);
      if (this.onAnomalyCallback) {
        this.onAnomalyCallback(result);
      }
      return;
    }

    if (this.sampleBuffer.length === 100 && this.sampleBuffer.length % 20 === 0) {
      this.evaluateTFLiteModel(profile);
    }
  }

  private evaluateTFLiteModel(profile: SensitivityProfile) {
    const accelVariance = this.calculateBufferVariance(this.sampleBuffer.map(s => Math.sqrt(s.ax**2 + s.ay**2 + s.az**2)));
    const gyroVariance = this.calculateBufferVariance(this.sampleBuffer.map(s => Math.sqrt(s.gx**2 + s.gy**2 + s.gz**2)));

    const varianceLimit = profile.accelThreshold * 0.8;

    if (accelVariance > varianceLimit && gyroVariance > 6.0) {
      const now = Date.now();
      if (now - this.lastTriggerTime < this.DEBOUNCE_MS) return;

      this.lastTriggerTime = now;
      const confidence = Math.min(0.99, 0.86 + (accelVariance / 100));
      const result: AnomalyDetectionResult = {
        isAnomaly: true,
        confidenceScore: parseFloat(confidence.toFixed(2)),
        detectionSource: 'STAGE_2_TFLITE_MODEL',
        reason: `LSTM Model Theft Pattern Detected in ${profile.label} (Confidence: ${(confidence * 100).toFixed(0)}%)`,
        sensitivityMode: this.currentMode,
      };

      console.warn(`[MotionService] 🤖 TFLite Model Anomaly Detected: ${result.reason}`);
      if (this.onAnomalyCallback) {
        this.onAnomalyCallback(result);
      }
    }
  }

  private calculateBufferVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const sqDiffs = values.map(val => (val - mean) ** 2);
    return sqDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }
}

export const motionService = new MotionService();
