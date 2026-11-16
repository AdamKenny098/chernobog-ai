package ai.chernobog.companion

import android.content.Context
import android.util.Log

/**
 * OH-6C-R2: bounded scheduling of existing, idempotent workers.
 * Does not handle credentials, grant permissions, send HTTP requests or touch the spool.
 */
internal object MobileRecoveryCoordinator {
    enum class Cause(val key: String) {
        APP_START("app-start"),
        BOOT_COMPLETED("boot-completed"),
        PACKAGE_REPLACED("package-replaced"),
        NETWORK_AVAILABLE("network-available"),
        NETWORK_VALIDATED("network-validated"),
    }

    data class Snapshot(
        val lastQueuedAt: Long?,
        val lastCause: String?,
        val lastBootAt: Long?,
        val lastNetworkAt: Long?,
        val enqueueCount: Int,
    )

    private const val PREFS = "chernobog_mobile_recovery_v1"
    private const val KEY_LAST_QUEUED_AT = "last_queued_at"
    private const val KEY_LAST_CAUSE = "last_cause"
    private const val KEY_LAST_BOOT_AT = "last_boot_at"
    private const val KEY_LAST_NETWORK_AT = "last_network_at"
    private const val KEY_ENQUEUE_COUNT = "enqueue_count"
    private const val NETWORK_COOLDOWN_MS = 20_000L
    private const val TAG = "ChernobogRecovery"

    private fun timestamp(value: Long): Long? = value.takeIf { it > 0L }

    fun snapshot(context: Context): Snapshot {
        val preferences = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return Snapshot(
            lastQueuedAt = timestamp(preferences.getLong(KEY_LAST_QUEUED_AT, 0L)),
            lastCause = preferences.getString(KEY_LAST_CAUSE, null),
            lastBootAt = timestamp(preferences.getLong(KEY_LAST_BOOT_AT, 0L)),
            lastNetworkAt = timestamp(preferences.getLong(KEY_LAST_NETWORK_AT, 0L)),
            enqueueCount = preferences.getInt(KEY_ENQUEUE_COUNT, 0),
        )
    }

    @Synchronized
    fun enqueue(context: Context, cause: Cause): Boolean {
        val app = context.applicationContext
        val enrolled = runCatching {
            !SecureCredentialStore(app).savedDeviceId().isNullOrBlank()
        }.getOrDefault(false)
        if (!enrolled) {
            // Never start work from a boot or network event for an unpaired installation.
            return false
        }

        val preferences = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val lastCauseAtKey = "last_queued_${cause.key}"
        val previous = preferences.getLong(lastCauseAtKey, 0L)
        val isNetwork = cause == Cause.NETWORK_AVAILABLE || cause == Cause.NETWORK_VALIDATED
        if (isNetwork && previous > 0L && now >= previous && now - previous < NETWORK_COOLDOWN_MS) {
            return false
        }

        return try {
            // Existing WorkManager unique-work policies prevent duplicate active jobs.
            if (cause != Cause.APP_START) {
                HeartbeatScheduler.ensurePeriodic(app)
                ReminderDeliveryScheduler.ensurePeriodic(app)
                HeartbeatScheduler.enqueueImmediate(app)
                ReminderDeliveryScheduler.enqueueNow(app)
            }
            // The application already schedules heartbeat and reminder jobs at startup.
            // This explicitly adds the offline spool drain without replacing that behavior.
            NotificationSyncScheduler.enqueueNow(app)

            val editor = preferences.edit()
                .putLong(lastCauseAtKey, now)
                .putLong(KEY_LAST_QUEUED_AT, now)
                .putString(KEY_LAST_CAUSE, cause.key)
                .putInt(KEY_ENQUEUE_COUNT, preferences.getInt(KEY_ENQUEUE_COUNT, 0).let { if (it >= Int.MAX_VALUE) Int.MAX_VALUE else it + 1 })

            when (cause) {
                Cause.BOOT_COMPLETED -> editor.putLong(KEY_LAST_BOOT_AT, now)
                Cause.NETWORK_AVAILABLE, Cause.NETWORK_VALIDATED -> editor.putLong(KEY_LAST_NETWORK_AT, now)
                else -> Unit
            }
            editor.apply()
            Log.i(TAG, "stage=workers-enqueued cause=${cause.key}")
            true
        } catch (error: Throwable) {
            // No sensitive payloads, endpoint URLs or tokens in logs.
            Log.w(TAG, "stage=schedule-failed cause=${cause.key} type=${error.javaClass.simpleName}")
            false
        }
    }
}
