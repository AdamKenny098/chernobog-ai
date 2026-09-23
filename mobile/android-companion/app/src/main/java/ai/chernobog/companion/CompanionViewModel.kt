package ai.chernobog.companion

import android.app.Application
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class CompanionUiState(
    val endpoint: String = "",
    val pairingCode: String = "",
    val displayName: String = "",
    val installationId: String = "",
    val deviceId: String? = null,
    val connectionState: ConnectionState =
        ConnectionState.DISCONNECTED,
    val session: SessionSnapshot? = null,
    val errorMessage: String? = null,
)

class CompanionViewModel(
    application: Application,
) : AndroidViewModel(
    application,
) {
    private val credentialStore =
        SecureCredentialStore(
            application,
        )

    private val api =
        ChernobogApiClient()

    private val _state =
        MutableStateFlow(
            initialState(),
        )

    val state:
        StateFlow<CompanionUiState> =
        _state.asStateFlow()

    init {
        refreshSessionIfEnrolled()
    }

    fun updateEndpoint(
        value: String,
    ) {
        _state.value =
            _state.value.copy(
                endpoint = value,
                errorMessage = null,
            )

        credentialStore
            .saveEndpoint(
                value.trim(),
            )
    }

    fun updatePairingCode(
        value: String,
    ) {
        _state.value =
            _state.value.copy(
                pairingCode = value,
                errorMessage = null,
            )
    }

    fun updateDisplayName(
        value: String,
    ) {
        _state.value =
            _state.value.copy(
                displayName = value,
                errorMessage = null,
            )

        credentialStore
            .saveDisplayName(
                value.trim(),
            )
    }

    fun enroll() {
        val current =
            _state.value

        if (
            current.connectionState ==
            ConnectionState.CONNECTING
        ) {
            return
        }

        _state.value =
            current.copy(
                connectionState =
                    ConnectionState.CONNECTING,
                errorMessage =
                    null,
            )

        viewModelScope.launch {
            try {
                val record =
                    withContext(
                        Dispatchers.IO,
                    ) {
                        api.enroll(
                            endpoint =
                                current.endpoint,
                            pairingCode =
                                current.pairingCode,
                            installationId =
                                current.installationId,
                            displayName =
                                current.displayName,
                            appVersion =
                                BuildConfig.VERSION_NAME,
                        )
                    }

                withContext(
                    Dispatchers.IO,
                ) {
                    credentialStore
                        .saveEnrollment(
                            record,
                        )
                }

                _state.value =
                    _state.value.copy(
                        endpoint =
                            record.endpoint,
                        pairingCode =
                            "",
                        displayName =
                            record.displayName,
                        deviceId =
                            record.deviceId,
                        connectionState =
                            ConnectionState.CONNECTING,
                        errorMessage =
                            null,
                    )

                refreshSession()
            } catch (
                error: Throwable,
            ) {
                fail(error)
            }
        }
    }

    fun refreshSessionIfEnrolled() {
        val token =
            try {
                credentialStore
                    .savedToken()
            } catch (
                error: Throwable,
            ) {
                fail(error)
                return
            }

        val deviceId =
            credentialStore
                .savedDeviceId()

        if (
            token.isNullOrBlank() ||
            deviceId.isNullOrBlank()
        ) {
            return
        }

        _state.value =
            _state.value.copy(
                deviceId =
                    deviceId,
            )

        refreshSession()
    }

    fun refreshSession() {
        val endpoint =
            _state.value
                .endpoint
                .trim()

        val token =
            try {
                credentialStore
                    .savedToken()
            } catch (
                error: Throwable,
            ) {
                fail(error)
                return
            }

        if (
            endpoint.isBlank() ||
            token.isNullOrBlank()
        ) {
            _state.value =
                _state.value.copy(
                    connectionState =
                        ConnectionState.DISCONNECTED,
                    session =
                        null,
                )
            return
        }

        _state.value =
            _state.value.copy(
                connectionState =
                    ConnectionState.CONNECTING,
                errorMessage =
                    null,
            )

        viewModelScope.launch {
            try {
                val session =
                    withContext(
                        Dispatchers.IO,
                    ) {
                        api.session(
                            endpoint =
                                endpoint,
                            token =
                                token,
                        )
                    }

                require(
                    !session
                        .capabilities
                        .toolExecution,
                ) {
                    "Server exposed an unexpected mobile tool-execution capability."
                }

                require(
                    !session
                        .capabilities
                        .permissionGranting,
                ) {
                    "Server exposed an unexpected mobile permission-granting capability."
                }

                NotificationPolicyCache(
                    getApplication<Application>(),
                ).updateFromSession(
                    session.capabilities,
                )

                if (
                    session
                        .capabilities
                        .offlineSpoolUpload
                ) {
                    NotificationSyncScheduler
                        .enqueueNow(
                            getApplication<Application>(),
                        )
                }

                if (
                    session
                        .capabilities
                        .heartbeat
                ) {
                    HeartbeatScheduler
                        .ensurePeriodic(
                            getApplication<Application>(),
                        )

                    HeartbeatScheduler
                        .enqueueImmediate(
                            getApplication<Application>(),
                        )
                }

                _state.value =
                    _state.value.copy(
                        deviceId =
                            session.deviceId,
                        displayName =
                            session.displayName,
                        connectionState =
                            ConnectionState.CONNECTED,
                        session =
                            session,
                        errorMessage =
                            null,
                    )
            } catch (
                error: Throwable,
            ) {
                fail(error)
            }
        }
    }

    private fun initialState():
        CompanionUiState {
        val savedName =
            credentialStore
                .savedDisplayName()

        return CompanionUiState(
            endpoint =
                credentialStore
                    .savedEndpoint(),
            displayName =
                savedName.ifBlank {
                    defaultDeviceName()
                },
            installationId =
                credentialStore
                    .installationId(),
            deviceId =
                credentialStore
                    .savedDeviceId(),
        )
    }

    private fun defaultDeviceName():
        String {
        val manufacturer =
            Build.MANUFACTURER
                .orEmpty()
                .trim()

        val model =
            Build.MODEL
                .orEmpty()
                .trim()

        return listOf(
            manufacturer,
            model,
        )
            .filter {
                it.isNotBlank()
            }
            .joinToString(
                separator = " ",
            )
            .ifBlank {
                "Android Companion"
            }
    }

    private fun fail(
        error: Throwable,
    ) {
        _state.value =
            _state.value.copy(
                connectionState =
                    ConnectionState.ERROR,
                errorMessage =
                    error.message
                        ?: "Chernobog Companion request failed.",
            )
    }
}
