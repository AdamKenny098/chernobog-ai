package ai.chernobog.companion

data class EnrollmentRecord(
    val endpoint: String,
    val installationId: String,
    val deviceId: String,
    val displayName: String,
    val token: String,
)

data class SessionCapabilities(
    val identity: Boolean = false,
    val heartbeat: Boolean = false,
    val notificationApiAvailable: Boolean = false,
    val notificationCaptureMode: String = "disabled",
    val notificationStoreBodies: Boolean = false,
    val notificationRedactSensitiveContent: Boolean = true,
    val notificationStoreSenderIdentity: Boolean = false,
    val notificationIngest: Boolean = false,
    val offlineSpoolUpload: Boolean = false,
    val classification: Boolean = false,
    val importanceScoring: Boolean = false,
    val toolExecution: Boolean = false,
    val permissionGranting: Boolean = false,
)

data class SessionSnapshot(
    val deviceId: String,
    val installationId: String,
    val displayName: String,
    val status: String,
    val lastSeenAt: String?,
    val capabilities: SessionCapabilities,
)

enum class ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    ERROR,
}
