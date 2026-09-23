package ai.chernobog.companion

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class ChernobogNotificationListenerService :
    NotificationListenerService() {
    private val scope =
        CoroutineScope(
            SupervisorJob() +
                Dispatchers.IO,
        )

    override fun onListenerConnected() {
        super.onListenerConnected()

        NotificationSyncScheduler
            .enqueueNow(
                this,
            )

        HeartbeatScheduler
            .enqueueImmediate(
                this,
            )
    }

    override fun onNotificationPosted(
        notification:
            StatusBarNotification?,
    ) {
        super.onNotificationPosted(
            notification,
        )

        if (
            notification == null
        ) {
            return
        }

        val policy =
            NotificationPolicyCache(
                this,
            )

        val capturePolicy =
            policy.currentPolicy()

        if (
            !capturePolicy.canCaptureMetadata()
        ) {
            return
        }

        val normalized =
            NotificationNormalizer
                .normalize(
                    context =
                        this,
                    notification =
                        notification,
                    policy =
                        capturePolicy,
                )
                ?: return

        scope.launch {
            try {
                val inserted =
                    NotificationSpoolDatabase
                        .get(
                            this@ChernobogNotificationListenerService,
                        )
                        .notifications()
                        .insert(
                            normalized,
                        )

                if (
                    inserted != -1L
                ) {
                    NotificationSyncScheduler
                        .enqueueNow(
                            this@ChernobogNotificationListenerService,
                        )
                }
            } catch (
                _: Throwable,
            ) {
                // The listener must not crash SystemUI.
                // No notification content is logged.
            }
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
