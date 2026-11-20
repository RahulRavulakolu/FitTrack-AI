package com.fittrack.ai

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import java.time.LocalDate
import java.time.ZoneId

/**
 * A foreground service that uses the hardware step counter sensor to count steps
 * continuously, even when the app is in the background or the screen is off.
 *
 * The TYPE_STEP_COUNTER sensor reports total steps since the last device reboot.
 * We track the baseline at the start of each day and compute the delta.
 */
class StepCounterService : Service(), SensorEventListener {
    companion object {
        private const val TAG = "StepCounter"
        private const val CHANNEL_ID = "fittrack_steps"
        private const val NOTIFICATION_ID = 1001
        private const val PREFS_NAME = "fittrack_steps"

        fun start(context: Context) {
            val intent = Intent(context, StepCounterService::class.java)
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent)
            else context.startService(intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, StepCounterService::class.java))
        }

        /** Read today's counted steps from SharedPreferences (callable from any thread). */
        fun getTodaySteps(context: Context): Int {
            val prefs = context.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            val savedDate = prefs.getString("date", null)
            val today = LocalDate.now().toString()
            return if (savedDate == today) prefs.getInt("steps", 0) else 0
        }
    }

    private var sensorManager: SensorManager? = null
    private var stepSensor: Sensor? = null
    private var initialStepCount: Int = -1
    private var currentDate: String = ""

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, buildNotification(0), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
        } else {
            startForeground(NOTIFICATION_ID, buildNotification(0))
        }

        sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

        if (stepSensor != null) {
            sensorManager?.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_UI)
            Log.i(TAG, "Step counter sensor registered")
        } else {
            Log.w(TAG, "No step counter sensor available on this device")
        }

        // Initialize date tracking
        currentDate = LocalDate.now().toString()
        loadState()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY // Restart if killed by the system
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        sensorManager?.unregisterListener(this)
        super.onDestroy()
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type != Sensor.TYPE_STEP_COUNTER) return

        val totalStepsSinceBoot = event.values[0].toInt()
        val today = LocalDate.now().toString()

        // Day rolled over — reset baseline
        if (today != currentDate) {
            currentDate = today
            initialStepCount = totalStepsSinceBoot
            saveState(0, totalStepsSinceBoot)
        }

        // First reading after service start
        if (initialStepCount < 0) {
            val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            val savedDate = prefs.getString("date", null)
            val savedBaseline = prefs.getInt("baseline", -1)

            if (savedDate == today && savedBaseline >= 0) {
                // Resuming same day — restore baseline
                initialStepCount = savedBaseline
            } else {
                // New day or first ever start
                initialStepCount = totalStepsSinceBoot
            }
        }

        val stepsToday = (totalStepsSinceBoot - initialStepCount).coerceAtLeast(0)
        saveState(stepsToday, initialStepCount)

        // Update notification every 50 steps to avoid too-frequent updates
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, buildNotification(stepsToday))
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun loadState() {
        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        val savedDate = prefs.getString("date", null)
        if (savedDate == currentDate) {
            initialStepCount = prefs.getInt("baseline", -1)
        }
    }

    private fun saveState(steps: Int, baseline: Int) {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
            .putString("date", currentDate)
            .putInt("steps", steps)
            .putInt("baseline", baseline)
            .apply()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Step Counter",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows your daily step count"
                setShowBadge(false)
            }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
    }

    private fun buildNotification(steps: Int): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FitTrack AI")
            .setContentText("$steps steps today")
            .setSmallIcon(android.R.drawable.ic_menu_directions)
            .setOngoing(true)
            .setSilent(true)
            .setContentIntent(pendingIntent)
            .build()
    }
}
