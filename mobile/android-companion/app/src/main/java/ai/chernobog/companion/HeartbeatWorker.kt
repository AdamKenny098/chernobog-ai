package ai.chernobog.companion

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class HeartbeatWorker(
    context: Context,
    parameters: WorkerParameters,
) : CoroutineWorker(
    context,
    parameters,
) {
    override suspend fun doWork():
        Result {
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
                HeartbeatStatusStore(
                    applicationContext,
                ).recordError(
                    error.message
                        ?: "Stored mobile credential could not be read.",
                )

                return Result.failure()
            }

        if (
            endpoint.isBlank() ||
            token.isNullOrBlank()
        ) {
            return Result.success()
        }

        val leaseStore =
            HeartbeatLeaseStore(
                applicationContext,
            )

        val heartbeatId =
            leaseStore.acquire()

        val statusStore =
            HeartbeatStatusStore(
                applicationContext,
            )

        val snapshot =
            try {
                DeviceHealthCollector(
                    applicationContext,
                ).collect(
                    heartbeatId,
                )
            } catch (
                error: Throwable,
            ) {
                statusStore.recordError(
                    error.message
                        ?: "Device health collection failed.",
                )

                return Result.retry()
            }

        statusStore.recordAttempt(
            snapshot,
        )

        return try {
            val receipt =
                HeartbeatTransportClient()
                    .send(
                        endpoint =
                            endpoint,
                        token =
                            token,
                        snapshot =
                            snapshot,
                    )

            if (
                !receipt.accepted
            ) {
                statusStore.recordError(
                    "Chernobog did not accept the heartbeat.",
                )

                Result.retry()
            } else {
                statusStore.recordSuccess(
                    snapshot =
                        snapshot,
                    receipt =
                        receipt,
                )

                leaseStore.complete(
                    heartbeatId,
                )

                val policy =
                    NotificationPolicyCache(
                        applicationContext,
                    )

                if (
                    policy
                        .offlineSpoolUploadEnabled()
                ) {
                    NotificationSyncScheduler
                        .enqueueNow(
                            applicationContext,
                        )
                }

                Result.success()
            }
        } catch (
            error:
                HeartbeatTransportException,
        ) {
            statusStore.recordError(
                error.message
                    ?: "Heartbeat transport failed.",
            )

            if (
                error.retryable
            ) {
                Result.retry()
            } else {
                Result.failure()
            }
        } catch (
            error: Throwable,
        ) {
            statusStore.recordError(
                error.message
                    ?: "Heartbeat failed.",
            )

            Result.retry()
        }
    }
}
