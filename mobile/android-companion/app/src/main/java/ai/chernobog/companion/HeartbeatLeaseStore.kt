package ai.chernobog.companion

import android.content.Context
import java.util.UUID

class HeartbeatLeaseStore(
    context: Context,
) {
    private val preferences =
        context.getSharedPreferences(
            PREFERENCES_NAME,
            Context.MODE_PRIVATE,
        )

    fun acquire():
        String =
        synchronized(
            lock,
        ) {
            val existing =
                preferences
                    .getString(
                        KEY_PENDING_HEARTBEAT_ID,
                        null,
                    )
                    ?.takeIf {
                        it.isNotBlank()
                    }

            if (
                existing != null
            ) {
                return@synchronized existing
            }

            val created =
                "android-heartbeat-${UUID.randomUUID()}"

            preferences
                .edit()
                .putString(
                    KEY_PENDING_HEARTBEAT_ID,
                    created,
                )
                .apply()

            created
        }

    fun complete(
        heartbeatId: String,
    ) {
        synchronized(
            lock,
        ) {
            val current =
                preferences
                    .getString(
                        KEY_PENDING_HEARTBEAT_ID,
                        null,
                    )

            if (
                current ==
                heartbeatId
            ) {
                preferences
                    .edit()
                    .remove(
                        KEY_PENDING_HEARTBEAT_ID,
                    )
                    .apply()
            }
        }
    }

    companion object {
        private const val PREFERENCES_NAME =
            "chernobog_heartbeat_lease_v1"

        private const val KEY_PENDING_HEARTBEAT_ID =
            "pending_heartbeat_id"

        private val lock =
            Any()
    }
}
