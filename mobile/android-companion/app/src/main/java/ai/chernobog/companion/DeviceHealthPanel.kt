package ai.chernobog.companion

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

@Composable
fun DeviceHealthPanel() {
    val context =
        LocalContext.current

    val store =
        remember {
            HeartbeatStatusStore(
                context,
            )
        }

    var status by
        remember {
            mutableStateOf(
                store.read(),
            )
        }

    fun refresh() {
        status =
            store.read()
    }

    LaunchedEffect(
        Unit,
    ) {
        refresh()
    }

    Card(
        modifier =
            Modifier.fillMaxWidth(),
        shape =
            RoundedCornerShape(
                2.dp,
            ),
        colors =
            CardDefaults.cardColors(
                containerColor =
                    ChernobogPanel,
            ),
        border =
            BorderStroke(
                1.dp,
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
                    10.dp,
                ),
        ) {
            Text(
                text =
                    "DEVICE HEALTH",
                color =
                    ChernobogAmber,
                style =
                    MaterialTheme
                        .typography
                        .labelLarge,
            )

            HealthRow(
                label =
                    "BATTERY",
                value =
                    status
                        .batteryPercent
                        ?.let {
                            "$it%"
                        }
                        ?: "UNKNOWN",
            )

            HealthRow(
                label =
                    "CHARGING",
                value =
                    when (
                        status.charging
                    ) {
                        true -> "YES"
                        false -> "NO"
                        null -> "UNKNOWN"
                    },
            )

            HealthRow(
                label =
                    "POWER SAVE",
                value =
                    when (
                        status.lowPowerMode
                    ) {
                        true -> "ON"
                        false -> "OFF"
                        null -> "UNKNOWN"
                    },
            )

            HealthRow(
                label =
                    "NETWORK",
                value =
                    status
                        .networkType
                        .uppercase(),
            )

            HealthRow(
                label =
                    "APP STATE",
                value =
                    status
                        .appState
                        .uppercase(),
            )

            HealthRow(
                label =
                    "LISTENER",
                value =
                    if (
                        status.notificationListenerEnabled
                    ) {
                        "ENABLED"
                    } else {
                        "DISABLED"
                    },
            )

            HealthRow(
                label =
                    "SPOOL",
                value =
                    status
                        .spoolPendingCount
                        .toString(),
            )

            HealthRow(
                label =
                    "LAST HEARTBEAT",
                value =
                    status
                        .lastSuccessAt
                        ?: "NEVER",
            )

            status
                .lastError
                ?.takeIf {
                    it.isNotBlank()
                }
                ?.let {
                    error ->
                    Text(
                        text =
                            error,
                        color =
                            ChernobogDanger,
                        style =
                            MaterialTheme
                                .typography
                                .bodySmall,
                    )
                }

            Button(
                modifier =
                    Modifier.fillMaxWidth(),
                colors =
                    ButtonDefaults
                        .buttonColors(
                            containerColor =
                                ChernobogPanelRaised,
                            contentColor =
                                ChernobogAmberBright,
                        ),
                onClick = {
                    HeartbeatScheduler
                        .enqueueImmediate(
                            context,
                        )

                    NotificationSyncScheduler
                        .enqueueNow(
                            context,
                        )

                    refresh()
                },
            ) {
                Text(
                    "HEARTBEAT + SYNC NOW",
                )
            }

            Button(
                modifier =
                    Modifier.fillMaxWidth(),
                colors =
                    ButtonDefaults
                        .buttonColors(
                            containerColor =
                                ChernobogPanelRaised,
                            contentColor =
                                ChernobogAmberBright,
                        ),
                onClick = {
                    refresh()
                },
            ) {
                Text(
                    "REFRESH HEALTH",
                )
            }
        }
    }
}

@Composable
private fun HealthRow(
    label: String,
    value: String,
) {
    Row(
        modifier =
            Modifier.fillMaxWidth(),
        horizontalArrangement =
            Arrangement.SpaceBetween,
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
                value,
            color =
                ChernobogText,
            style =
                MaterialTheme
                    .typography
                    .labelMedium,
        )
    }
}
