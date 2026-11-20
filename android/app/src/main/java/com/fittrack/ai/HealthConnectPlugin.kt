package com.fittrack.ai

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

@CapacitorPlugin(name = "FitTrackHealth")
class HealthConnectPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val requiredPermissions = setOf(HealthPermission.getReadPermission(StepsRecord::class))
    private var permissionCall: PluginCall? = null
    private var permissionLauncher: ActivityResultLauncher<Set<String>>? = null

    override fun load() {
        if (Build.VERSION.SDK_INT >= 28) {
            permissionLauncher = bridge.registerForActivityResult(PermissionController.createRequestPermissionResultContract()) {
                val pending = permissionCall
                permissionCall = null
                if (pending != null) resolveStatus(pending)
            }
        }
    }
    private fun sdkStatus(): Int = if (Build.VERSION.SDK_INT < 28) HealthConnectClient.SDK_UNAVAILABLE else HealthConnectClient.getSdkStatus(context)
    private fun resolveStatus(call: PluginCall) {
        scope.launch {
            try {
                val availability = sdkStatus()
                val granted = availability == HealthConnectClient.SDK_AVAILABLE && HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions().containsAll(requiredPermissions)
                val result = JSObject()
                result.put("available", availability == HealthConnectClient.SDK_AVAILABLE)
                result.put("needsUpdate", availability == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED)
                result.put("granted", granted)
                call.resolve(result)
            } catch (e: Exception) { call.reject("Could not check Health Connect. Open Android settings and try again.") }
        }
    }
    @PluginMethod fun status(call: PluginCall) { resolveStatus(call) }
    @PluginMethod fun requestAccess(call: PluginCall) {
        activity.runOnUiThread {
            try {
                if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) { call.reject("Install or update Health Connect before connecting."); return@runOnUiThread }
                if (permissionCall != null) { call.reject("A permission request is already open."); return@runOnUiThread }
                permissionCall = call
                permissionLauncher!!.launch(requiredPermissions)
            } catch (e: Exception) { permissionCall = null; call.reject("Could not open Health Connect permissions. Update Health Connect and try again.") }
        }
    }
    @PluginMethod fun readSteps(call: PluginCall) {
        scope.launch {
            try {
                if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) { call.reject("Health Connect is unavailable."); return@launch }
                val client = HealthConnectClient.getOrCreate(context)
                if (!client.permissionController.getGrantedPermissions().containsAll(requiredPermissions)) { call.reject("Step permission was removed. Reconnect Health Connect to continue."); return@launch }
                val zone = ZoneId.of(call.getString("timezone") ?: ZoneId.systemDefault().id)
                val date = LocalDate.parse(call.getString("date"))
                val today = LocalDate.now(zone)
                require(!date.isAfter(today) && !date.isBefore(today.minusDays(29))) { "Choose a day within the last 30 days." }
                val start = date.atStartOfDay(zone).toInstant()
                val end = minOf(date.plusDays(1).atStartOfDay(zone).toInstant(), Instant.now())
                val aggregate = client.aggregate(AggregateRequest(metrics = setOf(StepsRecord.COUNT_TOTAL), timeRangeFilter = TimeRangeFilter.between(start, end)))
                val total = aggregate[StepsRecord.COUNT_TOTAL]
                val result = JSObject()
                result.put("date", date.toString())
                result.put("steps", total ?: 0L)
                result.put("hasData", total != null)
                result.put("measuredAt", Instant.now().toString())
                call.resolve(result)
            } catch (e: SecurityException) { call.reject("Step permission was removed. Reconnect Health Connect to continue.") }
            catch (e: Exception) { call.reject("Could not read steps. Open Health Connect to check permissions and data, then try again.") }
        }
    }
    @PluginMethod fun openSettings(call: PluginCall) {
        activity.runOnUiThread {
            try {
                val intent = if (sdkStatus() == HealthConnectClient.SDK_AVAILABLE) Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS) else Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata"))
                activity.startActivity(intent)
                call.resolve()
            } catch (e: Exception) { call.reject("Open Health Connect in your phone's Settings or Play Store.") }
        }
    }
    override fun handleOnDestroy() {
        permissionCall?.reject("The permission screen was closed. Please reconnect Health Connect.")
        permissionCall = null
        scope.cancel()
        super.handleOnDestroy()
    }
}
