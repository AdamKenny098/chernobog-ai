package ai.chernobog.companion

import android.content.Context

/**
 * Process-local binding truth. A persisted timestamp is diagnostic history only:
 * process death deliberately resets connected=false rather than claiming a live bind.
 */
object AlkimiiServiceBindingTracker {
    @Volatile
    var connected: Boolean = false
        private set

    fun markConnected(context: Context) {
        connected = true
        context.applicationContext.getSharedPreferences(
            "chernobog_alkimii_connection_diagnostics_v1", Context.MODE_PRIVATE,
        ).edit().putLong("last_connected_at", System.currentTimeMillis()).apply()
    }

    fun markDisconnected(context: Context) {
        connected = false
        context.applicationContext.getSharedPreferences(
            "chernobog_alkimii_connection_diagnostics_v1", Context.MODE_PRIVATE,
        ).edit().putLong("last_disconnected_at", System.currentTimeMillis()).apply()
    }

    fun lastConnectedAt(context: Context): Long? {
        val value = context.applicationContext.getSharedPreferences(
            "chernobog_alkimii_connection_diagnostics_v1", Context.MODE_PRIVATE,
        ).getLong("last_connected_at", 0L)
        return value.takeIf { it > 0L }
    }
}
