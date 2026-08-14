package com.safecircleapp

import android.app.*
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.abs
import kotlin.math.sqrt

class MotionForegroundService : Service(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    private var gyroscope: Sensor? = null
    private var wakeLock: PowerManager.WakeLock? = null

    private var lastSampleTime: Long = 0
    private var lastNetAccel: Float = 0f

    private var currentGx: Float = 0f
    private var currentGy: Float = 0f
    private var currentGz: Float = 0f

    private var sensitivityProfile: String = "POCKET_GUARD"
    private var lastTriggerTime: Long = 0

    companion object {
        const val CHANNEL_ID = "safecircle_motion_guard_channel"
        const val NOTIFICATION_ID = 28867
        const val ACTION_START = "ACTION_START_MOTION_GUARD"
        const val ACTION_STOP = "ACTION_STOP_MOTION_GUARD"
        const val EXTRA_SENSITIVITY_MODE = "EXTRA_SENSITIVITY_MODE"
        var isServiceRunning = false
        var activeReactContext: ReactContext? = null
    }

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SafeCircle::MotionGuardWakeLock")
        try {
            wakeLock?.acquire(60 * 60 * 1000L) // 1 Hour Partial WakeLock
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null && intent.action == ACTION_STOP) {
            stopForegroundService()
            return START_NOT_STICKY
        }

        sensitivityProfile = intent?.getStringExtra(EXTRA_SENSITIVITY_MODE) ?: "POCKET_GUARD"

        createNotificationChannel()
        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        startSensorListeners()
        isServiceRunning = true

        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SafeCircle Security Active",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitoring device motion for theft detection"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val profileLabel = when (sensitivityProfile) {
            "TABLE_GUARD" -> "Table Guard (High)"
            "ACTIVE_GUARD" -> "Active Mode (Low)"
            else -> "Pocket Mode (Medium)"
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🛡️ SafeCircle Security Active")
            .setContentText("24/7 Motion Theft Guard ($profileLabel)")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()
    }

    private fun startSensorListeners() {
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
        gyroscope?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
    }

    private fun stopForegroundService() {
        sensorManager.unregisterListener(this)
        if (wakeLock?.isHeld == true) {
            try {
                wakeLock?.release()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        isServiceRunning = false
        stopForeground(true)
        stopSelf()
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null) return
        val now = System.currentTimeMillis()

        if (event.sensor.type == Sensor.TYPE_GYROSCOPE) {
            currentGx = event.values[0]
            currentGy = event.values[1]
            currentGz = event.values[2]
            return
        }

        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            val ax = event.values[0]
            val ay = event.values[1]
            val az = event.values[2]

            val rawMagnitude = sqrt((ax * ax + ay * ay + az * az).toDouble()).toFloat()
            val netAccel = Math.max(0f, rawMagnitude - 9.81f)

            var jerk = 0f
            if (lastSampleTime > 0) {
                val dt = (now - lastSampleTime) / 1000f
                if (dt > 0) {
                    jerk = abs(netAccel - lastNetAccel) / dt
                }
            }

            val angularVelocity = sqrt((currentGx * currentGx + currentGy * currentGy + currentGz * currentGz).toDouble()).toFloat()

            val (accelLimit, jerkLimit, gyroLimit) = when (sensitivityProfile) {
                "TABLE_GUARD" -> Triple(12.0f, 60.0f, 4.5f)
                "ACTIVE_GUARD" -> Triple(35.0f, 180.0f, 11.0f)
                else -> Triple(22.0f, 110.0f, 7.5f)
            }

            val energyPct = Math.min(100, Math.round((netAccel / accelLimit) * 100))
            emitJsEvent("onMotionEnergyUpdated", Arguments.createMap().apply {
                putInt("energyLevel", energyPct)
            })

            if (netAccel > accelLimit && jerk > jerkLimit && angularVelocity > gyroLimit) {
                if (now - lastTriggerTime > 5000) {
                    lastTriggerTime = now

                    val reason = "Violent Snatch Anomaly (Accel: ${String.format("%.1f", netAccel)} m/s², Jerk: ${String.format("%.1f", jerk)} m/s³)"

                    val params = Arguments.createMap().apply {
                        putBoolean("isAnomaly", true)
                        putDouble("confidenceScore", 0.96)
                        putString("detectionSource", "STAGE_1_FAST_PATH")
                        putString("reason", reason)
                        putString("sensitivityMode", sensitivityProfile)
                    }

                    emitJsEvent("onMotionAnomalyDetected", params)
                }
            }

            lastSampleTime = now
            lastNetAccel = netAccel
        }
    }

    private fun emitJsEvent(eventName: String, params: Any?) {
        activeReactContext?.let { context ->
            if (context.hasActiveCatalystInstance()) {
                context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    override fun onBind(intent: Intent?): IBinder? = null
}
