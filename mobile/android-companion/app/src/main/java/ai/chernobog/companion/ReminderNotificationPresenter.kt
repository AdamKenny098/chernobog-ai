package ai.chernobog.companion

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

/** Absolute local DND gate: PRIORITY, NONE, ALARMS, UNKNOWN all block posting. */
object ReminderNotificationPresenter {
    private const val CHANNEL_ID = "chernobog-reminders-v1"
    private const val NOTIFICATION_ID = 6131

    fun canPresent(context: Context): Boolean {
        val manager = context.getSystemService(NotificationManager::class.java)
            ?: return false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED
        ) return false
        if (!manager.areNotificationsEnabled()) return false
        return manager.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_ALL
    }

    fun present(context: Context, reminder: ClaimedReminder): Boolean {
        if (!canPresent(context)) return false
        val manager = context.getSystemService(NotificationManager::class.java)
            ?: return false
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "Chernobog reminders",
                NotificationManager.IMPORTANCE_DEFAULT,
            ),
        )
        // A user-disabled reminder channel must not produce a fake delivery ACK.
        if (manager.getNotificationChannel(CHANNEL_ID)?.importance ==
            NotificationManager.IMPORTANCE_NONE
        ) return false
        // Final local check immediately before posting: no DND bypass.
        if (!canPresent(context)) return false
        val notification = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Chernobog reminder")
            .setContentText(reminder.title)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .build()
        manager.notify(reminder.reminderId, NOTIFICATION_ID, notification)
        return true
    }
}
