package ai.chernobog.companion

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.PowerManager
import androidx.core.app.NotificationManagerCompat
import java.time.Instant

class DeviceHealthCollector(
    private val context: Context,
) {
    suspend fun collect(
        heartbeatId: String,
    ): MobileHeartbeatSnapshot {
        val batteryIntent =
            context.registerReceiver(
                null,
                IntentFilter(
                    Intent.ACTION_BATTERY_CHANGED,
                ),
            )

        val batteryLevel =
            batteryIntent
                ?.getIntExtra(
                    BatteryManager.EXTRA_LEVEL,
                    -1,
                )
                ?: -1

        val batteryScale =
            batteryIntent
                ?.getIntExtra(
                    BatteryManager.EXTRA_SCALE,
                    -1,
                )
                ?: -1

        val batteryPercent =
            if (
                batteryLevel >= 0 &&
                batteryScale > 0
            ) {
                (
                    batteryLevel *
                        100 /
                        batteryScale
                ).coerceIn(
                    0,
                    100,
                )
            } else {
                null
            }

        val batteryStatus =
            batteryIntent
                ?.getIntExtra(
                    BatteryManager.EXTRA_STATUS,
                    -1,
                )
                ?: -1

        val charging =
            if (
                batteryStatus ==
                    -1
            ) {
                null
            } else {
                batteryStatus ==
                    BatteryManager.BATTERY_STATUS_CHARGING ||
                    batteryStatus ==
                        BatteryManager.BATTERY_STATUS_FULL
            }

        val powerManager =
            context.getSystemService(
                PowerManager::class.java,
            )

        val lowPowerMode =
            powerManager
                ?.isPowerSaveMode

        val listenerEnabled =
            NotificationManagerCompat
                .getEnabledListenerPackages(
                    context,
                )
                .contains(
                    context.packageName,
                )

        val spoolPendingCount =
            NotificationSpoolDatabase
                .get(
                    context,
                )
                .notifications()
                .count()

        return MobileHeartbeatSnapshot(
            heartbeatId =
                heartbeatId,
            batteryPercent =
                batteryPercent,
            charging =
                charging,
            lowPowerMode =
                lowPowerMode,
            networkType =
                networkType(),
            appState =
                AppVisibilityTracker
                    .appState(),
            notificationListenerEnabled =
                listenerEnabled,
            spoolPendingCount =
                spoolPendingCount,
            clientObservedAt =
                Instant
                    .now()
                    .toString(),
        )
    }

    private fun networkType():
        String {
        val connectivity =
            context.getSystemService(
                ConnectivityManager::class.java,
            )
                ?: return "unknown"

        val active =
            connectivity
                .activeNetwork

        if (
            active == null
        ) {
            return "offline"
        }

        val activeCapabilities =
            connectivity
                .getNetworkCapabilities(
                    active,
                )

        if (
            activeCapabilities == null ||
            !activeCapabilities
                .hasCapability(
                    NetworkCapabilities
                        .NET_CAPABILITY_INTERNET,
                )
        ) {
            return "offline"
        }

        classifyPhysicalTransport(
            activeCapabilities,
        )?.let {
            return it
        }

        connectivity
            .allNetworks
            .asSequence()
            .mapNotNull {
                network ->
                connectivity
                    .getNetworkCapabilities(
                        network,
                    )
            }
            .filter {
                capabilities ->
                capabilities
                    .hasCapability(
                        NetworkCapabilities
                            .NET_CAPABILITY_INTERNET,
                    )
            }
            .mapNotNull(
                ::classifyPhysicalTransport,
            )
            .firstOrNull()
            ?.let {
                return it
            }

        return "unknown"
    }

    private fun classifyPhysicalTransport(
        capabilities:
            NetworkCapabilities,
    ): String? =
        when {
            capabilities
                .hasTransport(
                    NetworkCapabilities
                        .TRANSPORT_WIFI,
                ) ->
                "wifi"

            capabilities
                .hasTransport(
                    NetworkCapabilities
                        .TRANSPORT_CELLULAR,
                ) ->
                "cellular"

            capabilities
                .hasTransport(
                    NetworkCapabilities
                        .TRANSPORT_ETHERNET,
                ) ->
                "ethernet"

            else ->
                null
        }
}
