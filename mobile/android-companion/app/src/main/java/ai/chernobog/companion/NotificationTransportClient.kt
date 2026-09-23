package ai.chernobog.companion

import org.json.JSONArray
import org.json.JSONObject
import java.net.URL
import java.util.UUID
import javax.net.ssl.HttpsURLConnection

data class NotificationReconcileResult(
    val acknowledgedEventIds:
        Set<String>,
    val unknownEventIds:
        Set<String>,
)

data class NotificationUploadResult(
    val acknowledgedEventIds:
        Set<String>,
)

class NotificationTransportException(
    message: String,
    val retryable: Boolean,
) : IllegalStateException(
    message,
)

class NotificationTransportClient {
    fun reconcile(
        endpoint: String,
        token: String,
        eventIds: List<String>,
    ): NotificationReconcileResult {
        val array =
            JSONArray()

        eventIds.forEach {
            eventId ->
            array.put(
                eventId,
            )
        }

        val response =
            request(
                method = "POST",
                url =
                    EndpointPolicy
                        .apiUrl(
                            endpoint,
                            "/api/personal-assistance/mobile/notifications/reconcile",
                        ),
                token =
                    token,
                body =
                    JSONObject()
                        .put(
                            "eventIds",
                            array,
                        ),
            )

        return NotificationReconcileResult(
            acknowledgedEventIds =
                response
                    .optJSONArray(
                        "acknowledgedEventIds",
                    )
                    .toStringSet(),
            unknownEventIds =
                response
                    .optJSONArray(
                        "unknownEventIds",
                    )
                    .toStringSet(),
        )
    }

    fun upload(
        endpoint: String,
        token: String,
        events:
            List<NotificationSpoolEntity>,
    ): NotificationUploadResult {
        val array =
            JSONArray()

        events.forEach {
            event ->
            val json =
                JSONObject()
                    .put(
                        "eventId",
                        event.eventId,
                    )
                    .put(
                        "appPackage",
                        event.appPackage,
                    )
                    .put(
                        "postedAt",
                        event.postedAt,
                    )

            event.appLabel
                ?.let {
                    json.put(
                        "appLabel",
                        it,
                    )
                }

            event.notificationKey
                ?.let {
                    json.put(
                        "notificationKey",
                        it,
                    )
                }

            event.category
                ?.let {
                    json.put(
                        "category",
                        it,
                    )
                }

            event.channelId
                ?.let {
                    json.put(
                        "channelId",
                        it,
                    )
                }

            event.sender
                ?.let {
                    json.put(
                        "sender",
                        it,
                    )
                }

            event.title
                ?.let {
                    json.put(
                        "title",
                        it,
                    )
                }

            event.body
                ?.let {
                    json.put(
                        "body",
                        it,
                    )
                }

            event.redactedTitle
                ?.let {
                    json.put(
                        "redactedTitle",
                        it,
                    )
                }

            event.redactedBody
                ?.let {
                    json.put(
                        "redactedBody",
                        it,
                    )
                }

            array.put(
                json,
            )
        }

        val response =
            request(
                method = "POST",
                url =
                    EndpointPolicy
                        .apiUrl(
                            endpoint,
                            "/api/personal-assistance/mobile/notifications",
                        ),
                token =
                    token,
                body =
                    JSONObject()
                        .put(
                            "batchId",
                            "android-${UUID.randomUUID()}",
                        )
                        .put(
                            "events",
                            array,
                        ),
            )

        val result =
            response
                .optJSONObject(
                    "result",
                )
                ?: JSONObject()

        return NotificationUploadResult(
            acknowledgedEventIds =
                result
                    .optJSONArray(
                        "acknowledgedEventIds",
                    )
                    .toStringSet(),
        )
    }

    private fun request(
        method: String,
        url: String,
        token: String,
        body: JSONObject,
    ): JSONObject {
        val connection =
            (
                URL(
                    url,
                )
                    .openConnection()
                as HttpsURLConnection
            ).apply {
                requestMethod =
                    method
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
                    "ChernobogCompanion/0.2",
                )
            }

        try {
            connection
                .outputStream
                .use {
                    output ->
                    output.write(
                        body
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
                throw NotificationTransportException(
                    message =
                        json.optString(
                            "message",
                            "Notification transport failed with HTTP $status.",
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
                throw NotificationTransportException(
                    message =
                        json.optString(
                            "message",
                            "Chernobog rejected notification transport.",
                        ),
                    retryable =
                        false,
                )
            }

            return json
        } finally {
            connection
                .disconnect()
        }
    }

    private fun JSONArray?.toStringSet():
        Set<String> {
        if (
            this == null
        ) {
            return emptySet()
        }

        return buildSet {
            for (
                index in
                0 until length()
            ) {
                optString(
                    index,
                )
                    .takeIf {
                        it.isNotBlank()
                    }
                    ?.let(
                        ::add,
                    )
            }
        }
    }

    companion object {
        private const val CONNECT_TIMEOUT_MS =
            15_000

        private const val READ_TIMEOUT_MS =
            20_000
    }
}
