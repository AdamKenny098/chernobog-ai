package ai.chernobog.companion

import android.content.Context
import android.content.Intent
import android.net.Uri
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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner

private fun openSettings(context: Context, intent: Intent) {
    runCatching { context.startActivity(intent) }
        .onFailure {
            runCatching {
                context.startActivity(
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                        .setData(Uri.parse("package:${context.packageName}")),
                )
            }
        }
}

/** Owner-directed recovery only; intentionally no permission-granting or credential mutation. */
@Composable
fun MobileReliabilityPanel() {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var detailsExpanded by remember { mutableStateOf(false) }
    var status by remember(context) { mutableStateOf(MobileReliabilityReader.read(context)) }

    var recovery by remember(context) { mutableStateOf(MobileRecoveryCoordinator.snapshot(context)) }

    fun refresh() {
        status = MobileReliabilityReader.read(context)
        recovery = MobileRecoveryCoordinator.snapshot(context)
    }

    DisposableEffect(lifecycleOwner, context) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) refresh()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(2.dp),
        colors = CardDefaults.cardColors(containerColor = ChernobogPanel),
        border = BorderStroke(1.dp, ChernobogBorder),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                "MOBILE RELIABILITY / OH-6C-R1 + R2",
                color = ChernobogAmber,
                style = MaterialTheme.typography.labelLarge,
            )
            ReliabilitySignal("SERVER HEARTBEAT", status.heartbeat)
            ReliabilitySignal(
                "ALKIMII ACCESSIBILITY",
                when {
                    !status.accessibilityEnabled -> "ACCESS OFF"
                    status.accessibilityBound -> "BOUND"
                    else -> "ENABLED / BIND NOT OBSERVED"
                },
            )
            ReliabilitySignal("NOTIFICATION LISTENER", if (status.listenerGranted) "GRANTED" else "ACCESS OFF")
            ReliabilitySignal("PHONE NOTIFICATIONS", if (status.canPostNotifications) "ALLOWED" else "BLOCKED")
            Text(
                "A healthy heartbeat does not prove Tailscale will survive a future outage. Android force-stop requires manual app relaunch.",
                color = ChernobogMuted,
                style = MaterialTheme.typography.bodySmall,
            )
            ReliabilityAction("REFRESH RELIABILITY") { refresh() }
            ReliabilityAction(if (detailsExpanded) "HIDE RECOVERY DETAILS" else "RECOVERY DETAILS") {
                detailsExpanded = !detailsExpanded
                refresh()
            }
            if (detailsExpanded) {
                ReliabilitySignal(
                    "HEARTBEAT AGE",
                    status.heartbeatAgeMinutes?.let { "$it MINUTES" } ?: "NOT RECORDED",
                )
                ReliabilitySignal("HEARTBEAT ERROR", if (status.heartbeatLastError) "RECORDED" else "NONE REPORTED")
                ReliabilitySignal("LAST OBSERVED NETWORK", status.lastNetworkType.uppercase())
                ReliabilitySignal(
                    "RECOVERY LAST QUEUED",
                    recovery.lastQueuedAt?.let { java.time.Instant.ofEpochMilli(it).toString() }
                        ?: "NOT RECORDED",
                )
                ReliabilitySignal("RECOVERY SOURCE", recovery.lastCause?.uppercase() ?: "NONE RECORDED")
                ReliabilitySignal(
                    "LAST BOOT RECOVERY",
                    recovery.lastBootAt?.let { java.time.Instant.ofEpochMilli(it).toString() }
                        ?: "NOT OBSERVED",
                )
                ReliabilitySignal(
                    "LAST NETWORK RECOVERY",
                    recovery.lastNetworkAt?.let { java.time.Instant.ofEpochMilli(it).toString() }
                        ?: "NOT OBSERVED",
                )
                ReliabilitySignal(
                    "ROSTER UPLOAD AGE",
                    if (status.rosterCaptureObserved) {
                        "${status.rosterCaptureAgeHours} HOURS"
                    } else {
                        "NO SUCCESSFUL CAPTURE RECORDED"
                    },
                )
                ReliabilitySignal(
                    "BATTERY OPTIMIZATION",
                    when (status.batteryUnrestricted) {
                        true -> "UNRESTRICTED"
                        false -> "RESTRICTED"
                        null -> "UNKNOWN"
                    },
                )
                ReliabilitySignal(
                    "ACCESSIBILITY LAST BIND",
                    status.lastAccessibilityBindAt?.let { java.time.Instant.ofEpochMilli(it).toString() }
                        ?: "NOT RECORDED",
                )
                Text(
                    "Roster age describes the last successful observed capture, not guaranteed Alkimii freshness. A permission enabled in Settings does not guarantee an active service binding. VPN reachability cannot be confirmed from these local flags.",
                    color = ChernobogMuted,
                    style = MaterialTheme.typography.bodySmall,
                )
                ReliabilityAction("OPEN ACCESSIBILITY SETTINGS") {
                    openSettings(context, Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                }
                ReliabilityAction("OPEN NOTIFICATION ACCESS") {
                    openSettings(context, Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                }
                ReliabilityAction("OPEN APP NOTIFICATIONS") {
                    openSettings(
                        context,
                        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                            .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName),
                    )
                }
                ReliabilityAction("OPEN BATTERY OPTIMIZATION SETTINGS") {
                    openSettings(context, Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
                }
                ReliabilityAction("OPEN VPN SETTINGS") {
                    openSettings(context, Intent(Settings.ACTION_VPN_SETTINGS))
                }
                ReliabilityAction("REQUEST HEARTBEAT + SPOOL SYNC") {
                    HeartbeatScheduler.enqueueImmediate(context)
                    NotificationSyncScheduler.enqueueNow(context)
                    ReminderDeliveryScheduler.enqueueNow(context)
                    refresh()
                }
                Text(
                    "Settings must be changed by you. No access is granted automatically; queued events and paired credentials are never cleared by this panel.",
                    color = ChernobogMuted,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@Composable
private fun ReliabilitySignal(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = ChernobogMuted, style = MaterialTheme.typography.labelSmall)
        Text(value, color = ChernobogText, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun ReliabilityAction(label: String, action: () -> Unit) {
    Button(
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.buttonColors(
            containerColor = ChernobogPanelRaised,
            contentColor = ChernobogAmberBright,
        ),
        onClick = action,
    ) {
        Text(label)
    }
}
