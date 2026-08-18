package com.safecircleapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    createEmergencyNotificationChannel()
  }

  private fun createEmergencyNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channelId = "safecircle_emergency_channel"
      val channel = NotificationChannel(
        channelId,
        "SafeCircle Emergency Alerts",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Delivers high-priority emergency SOS and theft anomaly alerts"
        enableVibration(true)
      }
      val manager = getSystemService(NotificationManager::class.java)
      manager?.createNotificationChannel(channel)
    }
  }

  override fun getMainComponentName(): String = "SafeCircleApp"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
