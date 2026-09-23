package ai.chernobog.companion

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

@Composable
fun CompanionScreen(
    state: CompanionUiState,
    onEndpointChange: (String) -> Unit,
    onPairingCodeChange: (String) -> Unit,
    onDisplayNameChange: (String) -> Unit,
    onEnroll: () -> Unit,
    onRefresh: () -> Unit,
) {
    Surface(
        modifier =
            Modifier.fillMaxSize(),
        color =
            ChernobogBackground,
    ) {
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .verticalScroll(
                        rememberScrollState(),
                    )
                    .padding(
                        horizontal = 18.dp,
                        vertical = 24.dp,
                    ),
            verticalArrangement =
                Arrangement.spacedBy(
                    16.dp,
                ),
        ) {
            Header()

            StatusCore(
                state = state,
            )

            if (
                state.deviceId.isNullOrBlank()
            ) {
                EnrollmentPanel(
                    state = state,
                    onEndpointChange =
                        onEndpointChange,
                    onPairingCodeChange =
                        onPairingCodeChange,
                    onDisplayNameChange =
                        onDisplayNameChange,
                    onEnroll =
                        onEnroll,
                )
            } else {
                DevicePanel(
                    state = state,
                    onRefresh =
                        onRefresh,
                )
            }

            BoundaryPanel(
                state = state,
            )

            NotificationAccessPanel()

            DeviceHealthPanel()

            Spacer(
                modifier =
                    Modifier.height(
                        24.dp,
                    ),
            )
        }
    }
}

@Composable
private fun Header() {
    Column(
        verticalArrangement =
            Arrangement.spacedBy(
                5.dp,
            ),
    ) {
        Text(
            text =
                "GOD PROGRAM INTERFACE",
            color =
                ChernobogMuted,
            style =
                MaterialTheme
                    .typography
                    .labelSmall,
        )

        Text(
            text =
                "CHERNOBOG // COMPANION",
            color =
                ChernobogText,
            style =
                MaterialTheme
                    .typography
                    .headlineSmall,
        )

        Text(
            text =
                "PRIVATE MOBILE SENSOR NODE",
            color =
                ChernobogAmber,
            style =
                MaterialTheme
                    .typography
                    .labelMedium,
        )
    }
}

@Composable
private fun StatusCore(
    state: CompanionUiState,
) {
    val connected =
        state.connectionState ==
            ConnectionState.CONNECTED

    HudCard {
        Column(
            modifier =
                Modifier.fillMaxWidth(),
            horizontalAlignment =
                Alignment.CenterHorizontally,
            verticalArrangement =
                Arrangement.spacedBy(
                    8.dp,
                ),
        ) {
            ChernobogEye(
                active =
                    connected,
            )

            Text(
                text =
                    when (
                        state.connectionState
                    ) {
                        ConnectionState.CONNECTED ->
                            "LINK ESTABLISHED"

                        ConnectionState.CONNECTING ->
                            "NEGOTIATING LINK"

                        ConnectionState.ERROR ->
                            "LINK FAULT"

                        ConnectionState.DISCONNECTED ->
                            "AWAITING ENROLLMENT"
                    },
                color =
                    when (
                        state.connectionState
                    ) {
                        ConnectionState.CONNECTED ->
                            ChernobogSuccess

                        ConnectionState.ERROR ->
                            ChernobogDanger

                        else ->
                            ChernobogAmber
                    },
                style =
                    MaterialTheme
                        .typography
                        .labelLarge,
            )

            Text(
                text =
                    when {
                        connected ->
                            "Authenticated Chernobog mobile identity"

                        state.connectionState ==
                            ConnectionState.CONNECTING ->
                            "Validating Tailnet endpoint and device credential"

                        else ->
                            "Enroll this installation with a one-time Chernobog pairing code"
                    },
                color =
                    ChernobogMuted,
                style =
                    MaterialTheme
                        .typography
                        .bodySmall,
            )

            state.errorMessage
                ?.takeIf {
                    it.isNotBlank()
                }
                ?.let {
                    Text(
                        text =
                            it,
                        color =
                            ChernobogDanger,
                        style =
                            MaterialTheme
                                .typography
                                .bodySmall,
                    )
                }
        }
    }
}

@Composable
private fun EnrollmentPanel(
    state: CompanionUiState,
    onEndpointChange: (String) -> Unit,
    onPairingCodeChange: (String) -> Unit,
    onDisplayNameChange: (String) -> Unit,
    onEnroll: () -> Unit,
) {
    HudCard(
        title =
            "ENROLLMENT",
    ) {
        Column(
            verticalArrangement =
                Arrangement.spacedBy(
                    12.dp,
                ),
        ) {
            OutlinedTextField(
                modifier =
                    Modifier.fillMaxWidth(),
                value =
                    state.endpoint,
                onValueChange =
                    onEndpointChange,
                label = {
                    Text(
                        "Chernobog HTTPS endpoint",
                    )
                },
                supportingText = {
                    Text(
                        "Use the Tailnet-only Chernobog URL.",
                    )
                },
                singleLine =
                    true,
            )

            OutlinedTextField(
                modifier =
                    Modifier.fillMaxWidth(),
                value =
                    state.displayName,
                onValueChange =
                    onDisplayNameChange,
                label = {
                    Text(
                        "Device name",
                    )
                },
                singleLine =
                    true,
                keyboardOptions =
                    KeyboardOptions(
                        capitalization =
                            KeyboardCapitalization.Words,
                    ),
            )

            OutlinedTextField(
                modifier =
                    Modifier.fillMaxWidth(),
                value =
                    state.pairingCode,
                onValueChange =
                    onPairingCodeChange,
                label = {
                    Text(
                        "One-time pairing code",
                    )
                },
                visualTransformation =
                    PasswordVisualTransformation(),
                singleLine =
                    true,
            )

            Readout(
                label =
                    "INSTALLATION ID",
                value =
                    state.installationId,
            )

            Button(
                modifier =
                    Modifier.fillMaxWidth(),
                enabled =
                    state.endpoint.isNotBlank() &&
                        state.displayName.isNotBlank() &&
                        state.pairingCode.length >=
                            16 &&
                        state.connectionState !=
                            ConnectionState.CONNECTING,
                colors =
                    ButtonDefaults
                        .buttonColors(
                            containerColor =
                                ChernobogAmber,
                        ),
                onClick =
                    onEnroll,
            ) {
                if (
                    state.connectionState ==
                    ConnectionState.CONNECTING
                ) {
                    CircularProgressIndicator()
                } else {
                    Text(
                        "ENROLL DEVICE",
                    )
                }
            }
        }
    }
}

@Composable
private fun DevicePanel(
    state: CompanionUiState,
    onRefresh: () -> Unit,
) {
    val session =
        state.session

    HudCard(
        title =
            "DEVICE IDENTITY",
    ) {
        Column(
            verticalArrangement =
                Arrangement.spacedBy(
                    10.dp,
                ),
        ) {
            Readout(
                label =
                    "DEVICE",
                value =
                    state.displayName,
            )

            Readout(
                label =
                    "DEVICE ID",
                value =
                    state.deviceId
                        ?: "UNKNOWN",
            )

            Readout(
                label =
                    "INSTALLATION",
                value =
                    state.installationId,
            )

            Readout(
                label =
                    "ENDPOINT",
                value =
                    state.endpoint,
            )

            Readout(
                label =
                    "SERVER STATUS",
                value =
                    session?.status
                        ?.uppercase()
                        ?: "UNKNOWN",
            )

            Readout(
                label =
                    "NOTIFICATION CAPTURE",
                value =
                    session
                        ?.capabilities
                        ?.notificationCaptureMode
                        ?.uppercase()
                        ?: "UNKNOWN",
            )

            Button(
                modifier =
                    Modifier.fillMaxWidth(),
                enabled =
                    state.connectionState !=
                        ConnectionState.CONNECTING,
                colors =
                    ButtonDefaults
                        .buttonColors(
                            containerColor =
                                ChernobogPanelRaised,
                            contentColor =
                                ChernobogAmberBright,
                        ),
                onClick =
                    onRefresh,
            ) {
                Text(
                    "REFRESH SESSION",
                )
            }
        }
    }
}

@Composable
private fun BoundaryPanel(
    state: CompanionUiState,
) {
    val capabilities =
        state.session
            ?.capabilities

    HudCard(
        title =
            "CAPABILITY BOUNDARY",
    ) {
        Column(
            verticalArrangement =
                Arrangement.spacedBy(
                    8.dp,
                ),
        ) {
            CapabilityRow(
                label =
                    "IDENTITY",
                enabled =
                    capabilities?.identity ==
                        true,
            )

            CapabilityRow(
                label =
                    "HEARTBEAT",
                enabled =
                    capabilities?.heartbeat ==
                        true,
            )

            CapabilityRow(
                label =
                    "NOTIFICATION API",
                enabled =
                    capabilities
                        ?.notificationApiAvailable ==
                        true,
            )

            CapabilityRow(
                label =
                    "NOTIFICATION INGEST",
                enabled =
                    capabilities
                        ?.notificationIngest ==
                        true,
            )

            CapabilityRow(
                label =
                    "OFFLINE SPOOL",
                enabled =
                    capabilities
                        ?.offlineSpoolUpload ==
                        true,
            )

            HorizontalDivider(
                color =
                    ChernobogBorder,
            )

            CapabilityRow(
                label =
                    "TOOL EXECUTION",
                enabled =
                    capabilities
                        ?.toolExecution ==
                        true,
                safeWhenDisabled =
                    true,
            )

            CapabilityRow(
                label =
                    "PERMISSION GRANTING",
                enabled =
                    capabilities
                        ?.permissionGranting ==
                        true,
                safeWhenDisabled =
                    true,
            )

            Text(
                text =
                    "PA-2D1 authenticates the phone only. Notification listener, local spool, reconciliation workers, and heartbeat workers are added in the next Android slices.",
                color =
                    ChernobogMuted,
                style =
                    MaterialTheme
                        .typography
                        .bodySmall,
            )
        }
    }
}

@Composable
private fun CapabilityRow(
    label: String,
    enabled: Boolean,
    safeWhenDisabled: Boolean = false,
) {
    Row(
        modifier =
            Modifier.fillMaxWidth(),
        horizontalArrangement =
            Arrangement.SpaceBetween,
        verticalAlignment =
            Alignment.CenterVertically,
    ) {
        Text(
            text =
                label,
            color =
                ChernobogMuted,
            style =
                MaterialTheme
                    .typography
                    .labelMedium,
        )

        Text(
            text =
                if (enabled) {
                    "ENABLED"
                } else {
                    "DISABLED"
                },
            color =
                when {
                    safeWhenDisabled &&
                        !enabled ->
                        ChernobogSuccess

                    enabled ->
                        ChernobogAmberBright

                    else ->
                        ChernobogMuted
                },
            style =
                MaterialTheme
                    .typography
                    .labelMedium,
        )
    }
}

@Composable
private fun Readout(
    label: String,
    value: String,
) {
    Row(
        modifier =
            Modifier.fillMaxWidth(),
        horizontalArrangement =
            Arrangement.SpaceBetween,
        verticalAlignment =
            Alignment.Top,
    ) {
        Text(
            modifier =
                Modifier.weight(
                    0.34f,
                ),
            text =
                label,
            color =
                ChernobogMuted,
            style =
                MaterialTheme
                    .typography
                    .labelSmall,
        )

        Text(
            modifier =
                Modifier.weight(
                    0.66f,
                ),
            text =
                value,
            color =
                ChernobogText,
            maxLines =
                3,
            overflow =
                TextOverflow.Ellipsis,
            style =
                MaterialTheme
                    .typography
                    .bodySmall,
        )
    }
}

@Composable
private fun HudCard(
    title: String? = null,
    content:
        @Composable () -> Unit,
) {
    Card(
        modifier =
            Modifier.fillMaxWidth(),
        shape =
            RoundedCornerShape(
                2.dp,
            ),
        colors =
            CardDefaults
                .cardColors(
                    containerColor =
                        ChernobogPanel,
                ),
        border =
            BorderStroke(
                width = 1.dp,
                color =
                    ChernobogBorder,
            ),
    ) {
        Column(
            modifier =
                Modifier.padding(
                    16.dp,
                ),
            verticalArrangement =
                Arrangement.spacedBy(
                    12.dp,
                ),
        ) {
            if (
                !title.isNullOrBlank()
            ) {
                Text(
                    text =
                        title,
                    color =
                        ChernobogAmber,
                    style =
                        MaterialTheme
                            .typography
                            .labelLarge,
                )
            }

            Box(
                modifier =
                    Modifier.fillMaxWidth(),
            ) {
                content()
            }
        }
    }
}
