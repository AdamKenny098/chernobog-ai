package ai.chernobog.companion

import android.content.Context

data class NotificationCapturePolicy(
    val captureMode: String = "disabled",
    val notificationIngestEnabled: Boolean = false,
    val offlineSpoolUploadEnabled: Boolean = false,
    val storeBodies: Boolean = false,
    val redactSensitiveContent: Boolean = true,
    val storeSenderIdentity: Boolean = false,
) {
    fun canCaptureMetadata(): Boolean =
        captureMode != "disabled" &&
            notificationIngestEnabled

    fun capturesContent(): Boolean =
        captureMode == "redacted-content" ||
            captureMode == "full-content"

    fun usesRedactedContent(): Boolean =
        captureMode == "redacted-content" ||
            (
                captureMode == "full-content" &&
                    redactSensitiveContent
            )
}

class NotificationPolicyCache(
    context: Context,
) {
    private val preferences =
        context.getSharedPreferences(
            PREFERENCES_NAME,
            Context.MODE_PRIVATE,
        )

    fun updateFromSession(
        capabilities: SessionCapabilities,
    ) {
        preferences
            .edit()
            .putString(
                KEY_CAPTURE_MODE,
                capabilities.notificationCaptureMode,
            )
            .putBoolean(
                KEY_NOTIFICATION_INGEST,
                capabilities.notificationIngest,
            )
            .putBoolean(
                KEY_OFFLINE_SPOOL_UPLOAD,
                capabilities.offlineSpoolUpload,
            )
            .putBoolean(
                KEY_STORE_BODIES,
                capabilities.notificationStoreBodies,
            )
            .putBoolean(
                KEY_REDACT_SENSITIVE_CONTENT,
                capabilities.notificationRedactSensitiveContent,
            )
            .putBoolean(
                KEY_STORE_SENDER_IDENTITY,
                capabilities.notificationStoreSenderIdentity,
            )
            .putLong(
                KEY_UPDATED_AT,
                System.currentTimeMillis(),
            )
            .apply()
    }

    fun currentPolicy():
        NotificationCapturePolicy =
        NotificationCapturePolicy(
            captureMode =
                preferences.getString(
                    KEY_CAPTURE_MODE,
                    "disabled",
                ) ?: "disabled",
            notificationIngestEnabled =
                preferences.getBoolean(
                    KEY_NOTIFICATION_INGEST,
                    false,
                ),
            offlineSpoolUploadEnabled =
                preferences.getBoolean(
                    KEY_OFFLINE_SPOOL_UPLOAD,
                    false,
                ),
            storeBodies =
                preferences.getBoolean(
                    KEY_STORE_BODIES,
                    false,
                ),
            redactSensitiveContent =
                preferences.getBoolean(
                    KEY_REDACT_SENSITIVE_CONTENT,
                    true,
                ),
            storeSenderIdentity =
                preferences.getBoolean(
                    KEY_STORE_SENDER_IDENTITY,
                    false,
                ),
        )

    fun captureMode(): String =
        currentPolicy().captureMode

    fun notificationIngestEnabled(): Boolean =
        currentPolicy()
            .notificationIngestEnabled

    fun offlineSpoolUploadEnabled(): Boolean =
        currentPolicy()
            .offlineSpoolUploadEnabled

    fun updatedAtEpochMs(): Long =
        preferences.getLong(
            KEY_UPDATED_AT,
            0L,
        )

    fun canCaptureMetadata(): Boolean =
        currentPolicy()
            .canCaptureMetadata()

    companion object {
        private const val PREFERENCES_NAME =
            "chernobog_notification_policy_v1"

        private const val KEY_CAPTURE_MODE =
            "capture_mode"

        private const val KEY_NOTIFICATION_INGEST =
            "notification_ingest"

        private const val KEY_OFFLINE_SPOOL_UPLOAD =
            "offline_spool_upload"

        private const val KEY_STORE_BODIES =
            "store_bodies"

        private const val KEY_REDACT_SENSITIVE_CONTENT =
            "redact_sensitive_content"

        private const val KEY_STORE_SENDER_IDENTITY =
            "store_sender_identity"

        private const val KEY_UPDATED_AT =
            "updated_at_epoch_ms"
    }
}
