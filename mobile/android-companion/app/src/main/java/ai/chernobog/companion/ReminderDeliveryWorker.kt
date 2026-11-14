package ai.chernobog.companion

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Pull-only delivery; the phone never accepts unauthenticated incoming pushes. */
class ReminderDeliveryWorker(
    context: Context,
    parameters: WorkerParameters,
) : CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result {
        // Diagnostics intentionally omit reminder titles, IDs, tokens and endpoint URLs.
        Log.i("ChernobogReminders", "stage=worker-start")
        // Do not even claim a server-side reservation when Android DND is active.
        if (!ReminderNotificationPresenter.canPresent(applicationContext)) {
            Log.i("ChernobogReminders", "stage=local-presentation-blocked")
            return Result.success()
        }
        val credentials = SecureCredentialStore(applicationContext)
        val endpoint = credentials.savedEndpoint().trim()
        val token = try {
            credentials.savedToken()
        } catch (_: Throwable) {
            Log.w("ChernobogReminders", "stage=credential-access-failed")
            return Result.failure()
        }
        if (endpoint.isBlank() || token.isNullOrBlank()) {
            Log.i("ChernobogReminders", "stage=credentials-missing")
            return Result.success()
        }

        return try {
            withContext(Dispatchers.IO) {
                val client = ReminderDeliveryClient()
                repeat(5) {
                    if (!ReminderNotificationPresenter.canPresent(applicationContext)) {
                        Log.i("ChernobogReminders", "stage=local-presentation-changed")
                        return@withContext Result.success()
                    }
                    Log.i("ChernobogReminders", "stage=claim-request")
                    val reminder = client.claim(endpoint, token)
                    if (reminder == null) {
                        Log.i("ChernobogReminders", "stage=claim-empty")
                        return@withContext Result.success()
                    }
                    Log.i("ChernobogReminders", "stage=claim-acquired")
                    // Server rechecks the live owner attention state and profile;
                    // the client rechecks Android DND and its notification grant.
                    Log.i("ChernobogReminders", "stage=authorize-request")
                    if (!client.authorize(endpoint, token, reminder)) {
                        Log.i("ChernobogReminders", "stage=authorization-denied")
                        return@withContext Result.success()
                    }
                    Log.i("ChernobogReminders", "stage=authorized")
                    if (!ReminderNotificationPresenter.canPresent(applicationContext)) {
                        Log.i("ChernobogReminders", "stage=local-presentation-changed")
                        return@withContext Result.success()
                    }
                    if (!ReminderNotificationPresenter.present(applicationContext, reminder)) {
                        Log.i("ChernobogReminders", "stage=posting-blocked")
                        return@withContext Result.success()
                    }
                    Log.i("ChernobogReminders", "stage=posted")
                    // Only AFTER NotificationManager.notify has returned.
                    Log.i("ChernobogReminders", "stage=ack-request")
                    client.acknowledge(endpoint, token, reminder)
                    Log.i("ChernobogReminders", "stage=acknowledged")
                }
                // Continue in a later WorkManager run if there are more than five.
                ReminderDeliveryScheduler.enqueueNow(applicationContext)
                Log.i("ChernobogReminders", "stage=batch-limit-reached")
                Result.success()
            }
        } catch (error: ReminderDeliveryNetworkException) {
            Log.w("ChernobogReminders", "stage=transport-failed retryable=${error.retryable} detail=${error.message?.take(120)}")
            if (error.retryable) Result.retry() else Result.failure()
        } catch (error: SecurityException) {
            Log.w("ChernobogReminders", "stage=notification-permission-denied")
            Result.success()
        } catch (error: Throwable) {
            Log.w("ChernobogReminders", "stage=delivery-error type=${error.javaClass.simpleName}")
            Result.retry()
        }
    }
}
