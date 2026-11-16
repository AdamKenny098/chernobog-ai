package ai.chernobog.companion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Restarts existing WorkManager scheduling after normal unlocked boot or an app update. */
class MobileRecoveryReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val cause = when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED -> MobileRecoveryCoordinator.Cause.BOOT_COMPLETED
            Intent.ACTION_MY_PACKAGE_REPLACED -> MobileRecoveryCoordinator.Cause.PACKAGE_REPLACED
            else -> return
        }
        // Enqueue only: no network I/O, activity launch, service startup or permission grant.
        MobileRecoveryCoordinator.enqueue(context, cause)
    }
}
