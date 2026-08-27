package com.safecircleapp

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AlarmSoundModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var toneGenerator: ToneGenerator? = null
    private var handler: Handler? = null
    private var runnable: Runnable? = null
    private var isPlaying: Boolean = false

    override fun getName(): String {
        return "AlarmSoundModule"
    }

    @ReactMethod
    fun playSound(soundId: String) {
        stopSound() // Stop any active playback

        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

            // 1. Programmatically force STREAM_ALARM volume to 100% Max Volume
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)

            // 2. Initialize ToneGenerator on STREAM_ALARM with 100% volume
            toneGenerator = ToneGenerator(AudioManager.STREAM_ALARM, 100)
            isPlaying = true
            handler = Handler(Looper.getMainLooper())

            Log.d("AlarmSoundModule", "🔊 Playing physical alarm siren: $soundId at 100% volume")

            var step = 0
            val (toneA, toneB, intervalMs) = getToneConfig(soundId)

            runnable = object : Runnable {
                override fun run() {
                    if (!isPlaying) return

                    try {
                        val currentTone = if (step % 2 == 0) toneA else toneB
                        toneGenerator?.startTone(currentTone, intervalMs.toInt())
                        step++
                    } catch (e: Exception) {
                        Log.e("AlarmSoundModule", "Error in tone generator step: ${e.message}")
                    }

                    handler?.postDelayed(this, intervalMs)
                }
            }

            handler?.post(runnable!!)
        } catch (e: Exception) {
            Log.e("AlarmSoundModule", "Failed to start physical alarm sound: ${e.message}")
        }
    }

    @ReactMethod
    fun stopSound() {
        isPlaying = false
        if (runnable != null && handler != null) {
            handler?.removeCallbacks(runnable!!)
            runnable = null
        }

        try {
            toneGenerator?.stopTone()
            toneGenerator?.release()
            toneGenerator = null
            Log.d("AlarmSoundModule", "⏹️ Physical alarm siren stopped.")
        } catch (e: Exception) {
            Log.e("AlarmSoundModule", "Error stopping tone generator: ${e.message}")
        }
    }

    private fun getToneConfig(soundId: String): Triple<Int, Int, Long> {
        return when (soundId) {
            "tactical_alarm" -> Triple(ToneGenerator.TONE_CDMA_HIGH_L, ToneGenerator.TONE_SUP_ERROR, 120L)
            "warning_horn" -> Triple(ToneGenerator.TONE_SUP_CONGESTION, ToneGenerator.TONE_CDMA_NETWORK_BUSY, 350L)
            "security_buzzer" -> Triple(ToneGenerator.TONE_PROP_BEEP, ToneGenerator.TONE_SUP_PIP, 150L)
            "air_raid" -> Triple(ToneGenerator.TONE_SUP_RINGTONE, ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK, 450L)
            else -> Triple(ToneGenerator.TONE_SUP_INTERCEPT, ToneGenerator.TONE_CDMA_HIGH_L, 220L) // police_siren
        }
    }
}
