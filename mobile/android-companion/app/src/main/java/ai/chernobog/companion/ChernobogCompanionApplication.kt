package ai.chernobog.companion

import android.app.Application

class ChernobogCompanionApplication :
    Application() {
    override fun onCreate() {
        super.onCreate()

        AppVisibilityTracker
            .register(
                this,
            )

        ConnectivityReconnectObserver
            .start(
                this,
            )

        val enrolled =
            SecureCredentialStore(
                this,
            )
                .savedDeviceId()
                ?.isNotBlank() ==
                true

        if (
            enrolled
        ) {
            HeartbeatScheduler
                .ensurePeriodic(
                    this,
                )

            HeartbeatScheduler
                .enqueueImmediate(
                    this,
                )
        }
    }
}
