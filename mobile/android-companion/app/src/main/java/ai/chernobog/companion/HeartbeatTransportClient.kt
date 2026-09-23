package ai.chernobog.companion

import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection

class HeartbeatTransportException(
    message: String,
    val retryable: Boolean,
) : IllegalStateException(
    message,
)

class HeartbeatTransportClient {
    fun send(
        endpoint: String,
        token: String,
        snapshot:
            MobileHeartbeatSnapshot,
    ): HeartbeatReceipt {
        val connection =
            (
                URL(
                    EndpointPolicy
                        .apiUrl(
                            endpoint,
                            "/api/personal-assistance/mobile/heartbeat",
                        ),
                )
                    .openConnection()
                as HttpsURLConnection
            ).apply {
                requestMethod =
                    "POST"
                connectTimeout =
                    CONNECT_TIMEOUT_MS
                readTimeout =
                    READ_TIMEOUT_MS
                useCaches =
                    false
                doOutput =
                    true

                setRequestProperty(
                    "Accept",
                    "application/json",
                )
                setRequestProperty(
                    "Content-Type",
                    "application/json",
                )
                setRequestProperty(
                    "Authorization",
                    "Bearer $token",
                )
                setRequestProperty(
                    "User-Agent",
                    "ChernobogCompanion/0.3",
                )
            }

        try {
            connection
                .outputStream
                .use {
                    output ->
                    output.write(
                        snapshot
                            .toJson()
                            .toString()
                            .toByteArray(
                                Charsets.UTF_8,
                            ),
                    )
                }

            val status =
                connection.responseCode

            val stream =
                if (
                    status in
                        200..299
                ) {
                    connection
                        .inputStream
                } else {
                    connection
                        .errorStream
                }

            val text =
                stream
                    ?.bufferedReader()
                    ?.use {
                        reader ->
                        reader.readText()
                    }
                    .orEmpty()

            val json =
                if (
                    text.isBlank()
                ) {
                    JSONObject()
                } else {
                    JSONObject(
                        text,
                    )
                }

            if (
                status !in
                    200..299
            ) {
                throw HeartbeatTransportException(
                    message =
                        json.optString(
                            "message",
                            "Heartbeat failed with HTTP $status.",
                        ),
                    retryable =
                        status == 408 ||
                            status == 425 ||
                            status == 429 ||
                            status >= 500,
                )
            }

            if (
                !json.optBoolean(
                    "ok",
                    true,
                )
            ) {
                throw HeartbeatTransportException(
                    message =
                        json.optString(
                            "message",
                            "Chernobog rejected the heartbeat.",
                        ),
                    retryable =
                        false,
                )
            }

            val result =
                json.optJSONObject(
                    "result",
                )
                    ?: JSONObject()

            return HeartbeatReceipt(
                accepted =
                    result.optBoolean(
                        "accepted",
                        true,
                    ),
                duplicate =
                    result.optBoolean(
                        "duplicate",
                        false,
                    ),
                serverTime =
                    result.optString(
                        "serverTime",
                        "",
                    ).takeIf {
                        it.isNotBlank()
                    },
            )
        } finally {
            connection
                .disconnect()
        }
    }

    companion object {
        private const val CONNECT_TIMEOUT_MS =
            15_000

        private const val READ_TIMEOUT_MS =
            20_000
    }
}
