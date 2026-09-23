package ai.chernobog.companion

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network

object ConnectivityReconnectObserver {
    @Volatile
    private var started =
        false

    private var callback:
        ConnectivityManager.NetworkCallback? =
        null

    fun start(
        context: Context,
    ) {
        if (
            started
        ) {
            return
        }

        synchronized(
            this,
        ) {
            if (
                started
            ) {
                return
            }

            val applicationContext =
                context.applicationContext

            val connectivity =
                applicationContext
                    .getSystemService(
                        ConnectivityManager::class.java,
                    )
                    ?: return

            val networkCallback =
                object :
                    ConnectivityManager.NetworkCallback() {
                    override fun onAvailable(
                        network: Network,
                    ) {
                        HeartbeatScheduler
                            .enqueueImmediate(
                                applicationContext,
                            )

                        NotificationSyncScheduler
                            .enqueueNow(
                                applicationContext,
                            )
                    }
                }

            connectivity
                .registerDefaultNetworkCallback(
                    networkCallback,
                )

            callback =
                networkCallback

            started =
                true
        }
    }
}
