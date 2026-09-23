package ai.chernobog.companion

import android.content.Context

class HeartbeatStatusStore(
    context: Context,
) {
    private val preferences =
        context.getSharedPreferences(
            PREFERENCES_NAME,
            Context.MODE_PRIVATE,
        )

    fun recordAttempt(
        snapshot: MobileHeartbeatSnapshot,
    ) {
        preferences
            .edit()
            .putString(
                KEY_LAST_ATTEMPT_AT,
                snapshot.clientObservedAt,
            )
            .putInt(
                KEY_BATTERY_PERCENT,
                snapshot.batteryPercent
                    ?: -1,
            )
            .putInt(
                KEY_CHARGING_STATE,
                nullableBooleanToInt(
                    snapshot.charging,
                ),
            )
            .putInt(
                KEY_LOW_POWER_STATE,
                nullableBooleanToInt(
                    snapshot.lowPowerMode,
                ),
            )
            .putString(
                KEY_NETWORK_TYPE,
                snapshot.networkType,
            )
            .putString(
                KEY_APP_STATE,
                snapshot.appState,
            )
            .putBoolean(
                KEY_LISTENER_ENABLED,
                snapshot.notificationListenerEnabled,
            )
            .putInt(
                KEY_SPOOL_PENDING,
                snapshot.spoolPendingCount,
            )
            .apply()
    }

    fun recordSuccess(
        snapshot: MobileHeartbeatSnapshot,
        receipt: HeartbeatReceipt,
    ) {
        recordAttempt(
            snapshot,
        )

        preferences
            .edit()
            .putString(
                KEY_LAST_SUCCESS_AT,
                snapshot.clientObservedAt,
            )
            .putString(
                KEY_LAST_SERVER_TIME,
                receipt.serverTime,
            )
            .putBoolean(
                KEY_LAST_DUPLICATE,
                receipt.duplicate,
            )
            .remove(
                KEY_LAST_ERROR,
            )
            .apply()
    }

    fun recordError(
        message: String,
    ) {
        preferences
            .edit()
            .putString(
                KEY_LAST_ERROR,
                message.take(
                    500,
                ),
            )
            .apply()
    }

    fun read():
        HeartbeatUiStatus {
        val battery =
            preferences.getInt(
                KEY_BATTERY_PERCENT,
                -1,
            )

        return HeartbeatUiStatus(
            lastAttemptAt =
                preferences
                    .getString(
                        KEY_LAST_ATTEMPT_AT,
                        null,
                    ),
            lastSuccessAt =
                preferences
                    .getString(
                        KEY_LAST_SUCCESS_AT,
                        null,
                    ),
            lastServerTime =
                preferences
                    .getString(
                        KEY_LAST_SERVER_TIME,
                        null,
                    ),
            lastDuplicate =
                preferences
                    .getBoolean(
                        KEY_LAST_DUPLICATE,
                        false,
                    ),
            lastError =
                preferences
                    .getString(
                        KEY_LAST_ERROR,
                        null,
                    ),
            batteryPercent =
                battery.takeIf {
                    it >= 0
                },
            charging =
                intToNullableBoolean(
                    preferences.getInt(
                        KEY_CHARGING_STATE,
                        -1,
                    ),
                ),
            lowPowerMode =
                intToNullableBoolean(
                    preferences.getInt(
                        KEY_LOW_POWER_STATE,
                        -1,
                    ),
                ),
            networkType =
                preferences
                    .getString(
                        KEY_NETWORK_TYPE,
                        "unknown",
                    )
                    ?: "unknown",
            appState =
                preferences
                    .getString(
                        KEY_APP_STATE,
                        "unknown",
                    )
                    ?: "unknown",
            notificationListenerEnabled =
                preferences
                    .getBoolean(
                        KEY_LISTENER_ENABLED,
                        false,
                    ),
            spoolPendingCount =
                preferences
                    .getInt(
                        KEY_SPOOL_PENDING,
                        0,
                    ),
        )
    }

    private fun nullableBooleanToInt(
        value: Boolean?,
    ): Int =
        when (
            value
        ) {
            true -> 1
            false -> 0
            null -> -1
        }

    private fun intToNullableBoolean(
        value: Int,
    ): Boolean? =
        when (
            value
        ) {
            1 -> true
            0 -> false
            else -> null
        }

    companion object {
        private const val PREFERENCES_NAME =
            "chernobog_heartbeat_status_v1"

        private const val KEY_LAST_ATTEMPT_AT =
            "last_attempt_at"

        private const val KEY_LAST_SUCCESS_AT =
            "last_success_at"

        private const val KEY_LAST_SERVER_TIME =
            "last_server_time"

        private const val KEY_LAST_DUPLICATE =
            "last_duplicate"

        private const val KEY_LAST_ERROR =
            "last_error"

        private const val KEY_BATTERY_PERCENT =
            "battery_percent"

        private const val KEY_CHARGING_STATE =
            "charging_state"

        private const val KEY_LOW_POWER_STATE =
            "low_power_state"

        private const val KEY_NETWORK_TYPE =
            "network_type"

        private const val KEY_APP_STATE =
            "app_state"

        private const val KEY_LISTENER_ENABLED =
            "listener_enabled"

        private const val KEY_SPOOL_PENDING =
            "spool_pending"
    }
}
