package ai.chernobog.companion

import android.content.Intent
import android.provider.Settings
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationManagerCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun NotificationAccessPanel() {
    val context =
        LocalContext.current

    val scope =
        rememberCoroutineScope()

    var listenerGranted by
        remember {
            mutableStateOf(
                NotificationManagerCompat
                    .getEnabledListenerPackages(
                        context,
                    )
                    .contains(
                        context.packageName,
                    ),
            )
        }

    var pendingCount by
        remember {
            mutableIntStateOf(
                -1,
            )
        }

    fun refresh() {
        listenerGranted =
            NotificationManagerCompat
                .getEnabledListenerPackages(
                    context,
                )
                .contains(
                    context.packageName,
                )

        scope.launch {
            pendingCount =
                withContext(
                    Dispatchers.IO,
                ) {
                    NotificationSpoolDatabase
                        .get(
                            context,
                        )
                        .notifications()
                        .count()
                }
        }
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
                    12.dp,
                ),
        ) {
            Text(
                text =
                    "NOTIFICATION SENSOR",
                color =
                    ChernobogAmber,
                style =
                    MaterialTheme
                        .typography
                        .labelLarge,
            )

            Row(
                modifier =
                    Modifier.fillMaxWidth(),
                horizontalArrangement =
                    Arrangement.SpaceBetween,
            ) {
                Text(
                    text =
                        "LISTENER ACCESS",
                    color =
                        ChernobogMuted,
                    style =
                        MaterialTheme
                            .typography
                            .labelMedium,
                )

                Text(
                    text =
                        if (
                            listenerGranted
                        ) {
                            "GRANTED"
                        } else {
                            "NOT GRANTED"
                        },
                    color =
                        if (
                            listenerGranted
                        ) {
                            ChernobogSuccess
                        } else {
                            ChernobogMuted
                        },
                    style =
                        MaterialTheme
                            .typography
                            .labelMedium,
                )
            }

            Row(
                modifier =
                    Modifier.fillMaxWidth(),
                horizontalArrangement =
                    Arrangement.SpaceBetween,
            ) {
                Text(
                    text =
                        "LOCAL SPOOL",
                    color =
                        ChernobogMuted,
                    style =
                        MaterialTheme
                            .typography
                            .labelMedium,
                )

                Text(
                    text =
                        if (
                            pendingCount >= 0
                        ) {
                            pendingCount
                                .toString()
                        } else {
                            "UNCHECKED"
                        },
                    color =
                        ChernobogText,
                    style =
                        MaterialTheme
                            .typography
                            .labelMedium,
                )
            }

            Text(
                text =
                    "Notification capture follows the Personal Assistance profile. Content is stored only when explicitly enabled, and queued items are re-sanitized against the latest cached policy before upload.",
                color =
                    ChernobogMuted,
                style =
                    MaterialTheme
                        .typography
                        .bodySmall,
            )

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
                    context.startActivity(
                        Intent(
                            Settings
                                .ACTION_NOTIFICATION_LISTENER_SETTINGS,
                        ),
                    )
                },
            ) {
                Text(
                    "OPEN NOTIFICATION ACCESS",
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
                    NotificationSyncScheduler
                        .enqueueRecovery(
                            context,
                        )
                },
            ) {
                Text(
                    "CHECK ACCESS + SYNC",
                )
            }
        }
    }
}
