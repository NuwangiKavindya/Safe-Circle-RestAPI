package com.safecircleapp

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MotionGuardModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        MotionForegroundService.activeReactContext = reactContext
    }

    override fun getName(): String {
        return "MotionGuardModule"
    }

    @ReactMethod
    fun startBackgroundMonitoring(sensitivityMode: String, promise: Promise) {
        try {
            MotionForegroundService.activeReactContext = reactApplicationContext
            val intent = Intent(reactApplicationContext, MotionForegroundService::class.java).apply {
                action = MotionForegroundService.ACTION_START
                putExtra(MotionForegroundService.EXTRA_SENSITIVITY_MODE, sensitivityMode)
            }
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_FOREGROUND_SERVICE_START", e.message, e)
        }
    }

    @ReactMethod
    fun stopBackgroundMonitoring(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, MotionForegroundService::class.java).apply {
                action = MotionForegroundService.ACTION_STOP
            }
            reactApplicationContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_FOREGROUND_SERVICE_STOP", e.message, e)
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(MotionForegroundService.isServiceRunning)
    }
}
