package com.fittrack.ai

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor plugin for automatic background step counting using the Android
 * hardware step sensor. Exposes start/stop/read methods to the web layer.
 */
@CapacitorPlugin(name = "StepCounter")
class StepCounterPlugin : Plugin() {

    companion object {
        private const val PERMISSION_REQUEST_CODE = 2001
    }

    private var pendingCall: PluginCall? = null

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val sensorManager = context.getSystemService(android.hardware.SensorManager::class.java)
        val hasSensor = sensorManager?.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_COUNTER) != null
        val result = JSObject()
        result.put("available", hasSensor)
        call.resolve(result)
    }

    @PluginMethod
    fun start(call: PluginCall) {
        // Android 10+ requires ACTIVITY_RECOGNITION permission for step sensor
        if (Build.VERSION.SDK_INT >= 29) {
            val permission = Manifest.permission.ACTIVITY_RECOGNITION
            if (ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED) {
                pendingCall = call
                ActivityCompat.requestPermissions(activity, arrayOf(permission), PERMISSION_REQUEST_CODE)
                return
            }
        }

        // Android 13+ requires POST_NOTIFICATIONS for foreground service notification
        if (Build.VERSION.SDK_INT >= 33) {
            val notifPermission = Manifest.permission.POST_NOTIFICATIONS
            if (ContextCompat.checkSelfPermission(context, notifPermission) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(activity, arrayOf(notifPermission), PERMISSION_REQUEST_CODE + 1)
            }
        }

        StepCounterService.start(context)
        val result = JSObject()
        result.put("started", true)
        call.resolve(result)
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        StepCounterService.stop(context)
        val result = JSObject()
        result.put("stopped", true)
        call.resolve(result)
    }

    @PluginMethod
    fun getSteps(call: PluginCall) {
        val steps = StepCounterService.getTodaySteps(context)
        val result = JSObject()
        result.put("steps", steps)
        result.put("date", java.time.LocalDate.now().toString())
        result.put("source", "device_sensor")
        result.put("measuredAt", java.time.Instant.now().toString())
        call.resolve(result)
    }

    @PluginMethod
    fun hasPermission(call: PluginCall) {
        val granted = if (Build.VERSION.SDK_INT >= 29) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED
        } else true

        val result = JSObject()
        result.put("granted", granted)
        call.resolve(result)
    }

    override fun handleRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val call = pendingCall ?: return
            pendingCall = null

            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            if (granted) {
                StepCounterService.start(context)
                val result = JSObject()
                result.put("started", true)
                call.resolve(result)
            } else {
                call.reject("Activity recognition permission is required for step counting.")
            }
        }
    }
}
