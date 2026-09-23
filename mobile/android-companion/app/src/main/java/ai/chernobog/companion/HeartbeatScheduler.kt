package ai.chernobog.companion

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object HeartbeatScheduler {
    fun ensurePeriodic(
        context: Context,
    ) {
        val constraints =
            Constraints
                .Builder()
                .setRequiredNetworkType(
                    NetworkType.CONNECTED,
                )
                .build()

        val request =
            PeriodicWorkRequestBuilder<
                HeartbeatWorker
            >(
                15,
                TimeUnit.MINUTES,
            )
                .setConstraints(
                    constraints,
                )
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    30,
                    TimeUnit.SECONDS,
                )
                .build()

        WorkManager
            .getInstance(
                context
                    .applicationContext,
            )
            .enqueueUniquePeriodicWork(
                PERIODIC_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
    }

    fun enqueueImmediate(
        context: Context,
    ) {
        val constraints =
            Constraints
                .Builder()
                .setRequiredNetworkType(
                    NetworkType.CONNECTED,
                )
                .build()

        val request =
            OneTimeWorkRequestBuilder<
                HeartbeatWorker
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

        WorkManager
            .getInstance(
                context
                    .applicationContext,
            )
            .enqueueUniqueWork(
                IMMEDIATE_WORK_NAME,
                ExistingWorkPolicy.KEEP,
                request,
            )
    }

    private const val PERIODIC_WORK_NAME =
        "chernobog-device-heartbeat-periodic"

    private const val IMMEDIATE_WORK_NAME =
        "chernobog-device-heartbeat-immediate"
}
