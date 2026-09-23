package ai.chernobog.companion

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequest
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object NotificationSyncScheduler {
    fun enqueueNow(
        context: Context,
    ) {
        val workManager =
            workManager(
                context,
            )

        cancelLegacy(
            workManager,
        )

        workManager
            .enqueueUniqueWork(
                UNIQUE_WORK_NAME,
                ExistingWorkPolicy.KEEP,
                request(),
            )
    }

    fun enqueueRecovery(
        context: Context,
    ) {
        val workManager =
            workManager(
                context,
            )

        cancelLegacy(
            workManager,
        )

        workManager
            .enqueueUniqueWork(
                UNIQUE_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request(),
            )
    }

    fun enqueueContinuation(
        context: Context,
    ) {
        workManager(
            context,
        )
            .enqueue(
                request(),
            )
    }

    private fun workManager(
        context: Context,
    ): WorkManager =
        WorkManager
            .getInstance(
                context
                    .applicationContext,
            )

    private fun request():
        OneTimeWorkRequest {
        val constraints =
            Constraints
                .Builder()
                .setRequiredNetworkType(
                    NetworkType.CONNECTED,
                )
                .build()

        return OneTimeWorkRequestBuilder<
            NotificationSyncWorker
        >()
            .setConstraints(
                constraints,
            )
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                30,
                TimeUnit.SECONDS,
            )
            .build()
    }

    private fun cancelLegacy(
        workManager: WorkManager,
    ) {
        workManager
            .cancelUniqueWork(
                LEGACY_UNIQUE_WORK_NAME,
            )
    }

    private const val UNIQUE_WORK_NAME =
        "chernobog-notification-sync-v2"

    private const val LEGACY_UNIQUE_WORK_NAME =
        "chernobog-notification-sync"
}