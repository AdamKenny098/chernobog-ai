package ai.chernobog.companion

import org.json.JSONObject

data class MobileHeartbeatSnapshot(
    val heartbeatId: String,
    val batteryPercent: Int?,
    val charging: Boolean?,
    val lowPowerMode: Boolean?,
    val networkType: String,
    val appState: String,
    val notificationListenerEnabled: Boolean,
    val spoolPendingCount: Int,
    val clientObservedAt: String,
) {
    fun toJson():
        JSONObject =
        JSONObject()
            .put(
                "heartbeatId",
                heartbeatId,
            )
            .put(
                "batteryPercent",
                batteryPercent
                    ?: JSONObject.NULL,
            )
            .put(
                "charging",
                charging
                    ?: JSONObject.NULL,
            )
            .put(
                "lowPowerMode",
                lowPowerMode
                    ?: JSONObject.NULL,
            )
            .put(
                "networkType",
                networkType,
            )
            .put(
                "appState",
                appState,
            )
            .put(
                "notificationListenerEnabled",
                notificationListenerEnabled,
            )
            .put(
                "spoolPendingCount",
                spoolPendingCount,
            )
            .put(
                "clientObservedAt",
                clientObservedAt,
            )
}

data class HeartbeatReceipt(
    val accepted: Boolean,
    val duplicate: Boolean,
    val serverTime: String?,
)

data class HeartbeatUiStatus(
    val lastAttemptAt: String?,
    val lastSuccessAt: String?,
    val lastServerTime: String?,
    val lastDuplicate: Boolean,
    val lastError: String?,
    val batteryPercent: Int?,
    val charging: Boolean?,
    val lowPowerMode: Boolean?,
    val networkType: String,
    val appState: String,
    val notificationListenerEnabled: Boolean,
    val spoolPendingCount: Int,
)
