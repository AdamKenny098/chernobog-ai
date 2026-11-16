package ai.chernobog.companion

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.os.PowerManager
import android.view.accessibility.AccessibilityManager
import androidx.core.app.NotificationManagerCompat
import java.time.Instant

/** On-device, read-only signal snapshot. Never reads or exposes bearer tokens. */
data class MobileReliabilityStatus(
    val listenerGranted: Boolean,
    val accessibilityEnabled: Boolean,
    val accessibilityBound: Boolean,
    val lastAccessibilityBindAt: Long?,
    val canPostNotifications: Boolean,
    val batteryUnrestricted: Boolean?,
    val heartbeat: String,
    val heartbeatAgeMinutes: Long?,
    val heartbeatLastError: Boolean,
    val lastNetworkType: String,
    val rosterCaptureAgeHours: Long?,
    val rosterCaptureObserved: Boolean,
)

object MobileReliabilityReader {
    private const val HEARTBEAT_STALE_MINUTES = 45L
    private const val MINUTE_MS = 60_000L
    private const val HOUR_MS = 3_600_000L

    fun read(context: Context): MobileReliabilityStatus {
        val application = context.applicationContext
        val previous = HeartbeatStatusStore(application).read()
        val now = System.currentTimeMillis()
        val lastHeartbeatAt = runCatching {
            previous.lastSuccessAt?.let { Instant.parse(it).toEpochMilli() }
        }.getOrNull()
        val ageMinutes = lastHeartbeatAt?.takeIf { it <= now }?.let {
            (now - it) / MINUTE_MS
        }
        val hasError = !previous.lastError.isNullOrBlank()
        val heartbeat = when {
            hasError -> "DEGRADED"
            ageMinutes == null -> "UNKNOWN"
            ageMinutes > HEARTBEAT_STALE_MINUTES -> "STALE"
            else -> "RECENT"
        }

        val accessibilityManager = application.getSystemService(AccessibilityManager::class.java)
        val accessibilityEnabled = accessibilityManager
            ?.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            ?.any { service ->
                val info = service.resolveInfo?.serviceInfo
                info?.packageName == application.packageName &&
                    info?.name?.let { name ->
                        name == AlkimiiRosterAccessibilityService::class.java.name ||
                            name.endsWith(".AlkimiiRosterAccessibilityService")
                    } == true
            } == true

        val power = application.getSystemService(PowerManager::class.java)
        val rosterPreferences = application.getSharedPreferences(
            "chernobog_alkimii_roster_v2", Context.MODE_PRIVATE,
        )
        val lastRosterUpload = rosterPreferences.getLong("last_upload_at", 0L)
            .takeIf { it > 0L && it <= now }

        return MobileReliabilityStatus(
            listenerGranted = NotificationManagerCompat.getEnabledListenerPackages(application)
                .contains(application.packageName),
            accessibilityEnabled = accessibilityEnabled,
            accessibilityBound = AlkimiiServiceBindingTracker.connected,
            lastAccessibilityBindAt = AlkimiiServiceBindingTracker.lastConnectedAt(application),
            canPostNotifications = NotificationManagerCompat.from(application).areNotificationsEnabled(),
            batteryUnrestricted = power?.isIgnoringBatteryOptimizations(application.packageName),
            heartbeat = heartbeat,
            heartbeatAgeMinutes = ageMinutes,
            heartbeatLastError = hasError,
            lastNetworkType = previous.networkType,
            rosterCaptureAgeHours = lastRosterUpload?.let { (now - it) / HOUR_MS },
            rosterCaptureObserved = lastRosterUpload != null,
        )
    }
}
