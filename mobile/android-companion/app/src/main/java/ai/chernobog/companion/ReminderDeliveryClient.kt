package ai.chernobog.companion

import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection

data class ClaimedReminder(
    val reminderId: String,
    val reservationId: String,
    val title: String,
    val priority: String,
    val dueAt: String,
)

class ReminderDeliveryNetworkException(
    message: String,
    val retryable: Boolean,
) : IllegalStateException(message)

/** Uses the existing enrolled device bearer credential and HTTPS-only endpoint policy. */
class ReminderDeliveryClient {
    fun claim(endpoint: String, token: String): ClaimedReminder? {
        val reply = post(endpoint, token, "claim", JSONObject())
        val claim = reply.optJSONObject("claim") ?: return null
        val reminderId = claim.getString("reminderId")
        val reservationId = claim.getString("reservationId")
        require(reminderId.matches(Regex("rem_[0-9a-f-]{36}"))) {
            "Invalid reminder identifier."
        }
        require(reservationId.matches(Regex("reserve_[0-9a-f-]{36}"))) {
            "Invalid reservation identifier."
        }
        val title = claim.getString("title")
        require(title.isNotBlank() && title.length <= 160) {
            "Invalid reminder title."
        }
        return ClaimedReminder(
            reminderId = reminderId,
            reservationId = reservationId,
            title = title,
            priority = claim.getString("priority"),
            dueAt = claim.getString("dueAt"),
        )
    }

    fun authorize(endpoint: String, token: String, item: ClaimedReminder): Boolean =
        post(
            endpoint, token, "authorize",
            JSONObject()
                .put("reminderId", item.reminderId)
                .put("reservationId", item.reservationId),
        ).optBoolean("authorized", false)

    fun acknowledge(endpoint: String, token: String, item: ClaimedReminder) {
        val receipt = "android:${item.reminderId}"
        val reply = post(
            endpoint, token, "ack",
            JSONObject()
                .put("reminderId", item.reminderId)
                .put("reservationId", item.reservationId)
                .put("receipt", receipt),
        )
        require(reply.optJSONObject("result")?.optString("state") == "delivered") {
            "Android reminder receipt was not acknowledged."
        }
    }

    private fun post(
        endpoint: String,
        token: String,
        action: String,
        body: JSONObject,
    ): JSONObject {
        val uri = EndpointPolicy.apiUrl(
            endpoint,
            "/api/personal-assistance/mobile/reminders/$action",
        )
        val connection = (URL(uri).openConnection() as HttpsURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 20_000
            useCaches = false
            doOutput = true
            instanceFollowRedirects = false
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("User-Agent", "ChernobogCompanion/0.3")
        }
        try {
            connection.outputStream.use { output ->
                output.write(body.toString().toByteArray(Charsets.UTF_8))
            }
            val status = connection.responseCode
            if (status !in 200..299) {
                throw ReminderDeliveryNetworkException(
                    "Reminder endpoint rejected the request (HTTP $status).",
                    retryable = status == 408 || status == 425 || status == 429 || status >= 500,
                )
            }
            val payload = connection.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(payload)
            if (!json.optBoolean("ok", false)) {
                throw ReminderDeliveryNetworkException("Reminder endpoint did not accept the request.", false)
            }
            return json
        } finally {
            connection.disconnect()
        }
    }
}
