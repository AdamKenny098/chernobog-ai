package ai.chernobog.companion

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class NotificationSyncWorker(
    context: Context,
    parameters: WorkerParameters,
) : CoroutineWorker(
    context,
    parameters,
) {
    override suspend fun doWork():
        Result =
        syncMutex.withLock {
            runSync()
        }

    private suspend fun runSync():
        Result {
        val policy =
            NotificationPolicyCache(
                applicationContext,
            )

        val database =
            NotificationSpoolDatabase
                .get(
                    applicationContext,
                )

        val dao =
            database.notifications()

        val capturePolicy =
            policy.currentPolicy()

        if (
            !capturePolicy.canCaptureMetadata()
        ) {
            dao.deleteAll()

            return Result.success()
        }

        if (
            !capturePolicy.offlineSpoolUploadEnabled
        ) {
            Log.i(
                TAG,
                "stage=upload-disabled",
            )

            return Result.success()
        }

        val credentialStore =
            SecureCredentialStore(
                applicationContext,
            )

        val endpoint =
            credentialStore
                .savedEndpoint()
                .trim()

        val token =
            try {
                credentialStore
                    .savedToken()
            } catch (
                error: Throwable,
            ) {
                Log.w(
                    TAG,
                    "stage=credential-error type=${error.javaClass.simpleName}",
                )

                return Result.failure()
            }

        if (
            endpoint.isBlank() ||
            token.isNullOrBlank()
        ) {
            Log.w(
                TAG,
                "stage=credentials-missing endpointPresent=${endpoint.isNotBlank()} tokenPresent=${!token.isNullOrBlank()}",
            )

            return Result.success()
        }

        val transport =
            NotificationTransportClient()

        repeat(
            MAX_BATCHES_PER_RUN,
        ) {
            val storedPending =
                dao.oldest(
                    BATCH_SIZE,
                )

            if (
                storedPending.isEmpty()
            ) {
                return Result.success()
            }

            val pending =
                storedPending.map {
                    item ->
                    item.enforcePolicy(
                        capturePolicy,
                    )
                }

            pending
                .zip(
                    storedPending,
                )
                .forEach {
                    (effective, stored) ->
                    if (
                        effective !=
                        stored
                    ) {
                        dao.update(
                            effective,
                        )
                    }
                }

            val ids =
                pending.map {
                    it.eventId
                }

            try {
                Log.i(
                    TAG,
                    "stage=reconcile start batch=${ids.size} workerAttempt=$runAttemptCount",
                )

                val reconciliation =
                    transport.reconcile(
                        endpoint =
                            endpoint,
                        token =
                            token,
                        eventIds =
                            ids,
                    )

                Log.i(
                    TAG,
                    "stage=reconcile success acknowledged=${reconciliation.acknowledgedEventIds.size} unknown=${reconciliation.unknownEventIds.size}",
                )

                val acknowledged =
                    reconciliation
                        .acknowledgedEventIds

                if (
                    acknowledged.isNotEmpty()
                ) {
                    dao.deleteByEventIds(
                        acknowledged.toList(),
                    )
                }

                val toUpload =
                    pending.filterNot {
                        it.eventId in
                            acknowledged
                    }

                if (
                    toUpload.isEmpty()
                ) {
                    return@repeat
                }

                val uploadIds =
                    toUpload.map {
                        it.eventId
                    }

                dao.markAttempt(
                    eventIds =
                        uploadIds,
                    attemptedAtEpochMs =
                        System
                            .currentTimeMillis(),
                )

                Log.i(
                    TAG,
                    "stage=upload start batch=${toUpload.size}",
                )

                val uploaded =
                    transport.upload(
                        endpoint =
                            endpoint,
                        token =
                            token,
                        events =
                            toUpload,
                    )

                if (
                    uploaded
                        .acknowledgedEventIds
                        .isNotEmpty()
                ) {
                    dao.deleteByEventIds(
                        uploaded
                            .acknowledgedEventIds
                            .toList(),
                    )
                }

                val unacknowledged =
                    uploadIds.any {
                        eventId ->
                        eventId !in
                            uploaded
                                .acknowledgedEventIds
                    }

                if (
                    unacknowledged
                ) {
                    Log.w(
                        TAG,
                        "stage=upload-unacknowledged batch=${uploadIds.size}",
                    )

                    return Result.retry()
                }
            } catch (
                error:
                    NotificationTransportException,
            ) {
                Log.w(
                    TAG,
                    "stage=transport-exception retryable=${error.retryable} type=${error.javaClass.simpleName} message=${error.message?.take(300)}",
                )

                return if (
                    error.retryable
                ) {
                    Result.retry()
                } else {
                    Result.failure()
                }
            } catch (
                error: Throwable,
            ) {
                Log.w(
                    TAG,
                    "stage=unexpected-exception type=${error.javaClass.simpleName} message=${error.message?.take(300)}",
                )

                return Result.retry()
            }
        }

        return if (
            dao.count() > 0
        ) {
            Log.i(
                TAG,
                "stage=continuation-enqueued",
            )

            NotificationSyncScheduler
                .enqueueContinuation(
                    applicationContext,
                )

            Result.success()
        } else {
            Result.success()
        }
    }

    companion object {
        private val syncMutex =
            Mutex()

        private const val TAG =
            "ChernobogNotifSync"

        private const val BATCH_SIZE =
            100

        private const val MAX_BATCHES_PER_RUN =
            5
    }
}