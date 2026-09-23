package ai.chernobog.companion

import org.json.JSONArray
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection

class AlkimiiRosterTransportClient {
    fun upload(
        endpoint: String,
        token: String,
        captureId: String,
        observedAt: String,
        nodes: List<String>,
    ) {
        val url =
            EndpointPolicy.apiUrl(
                endpoint,
                "/api/personal-assistance/mobile/work-schedule/alkimii-roster",
            )

        val connection =
            URL(url)
                .openConnection() as
                HttpsURLConnection

        connection.apply {
            requestMethod =
                "POST"
            connectTimeout =
                15_000
            readTimeout =
                20_000
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
                "ChernobogCompanion/PA4-AlkimiiRoster",
            )
        }

        val body =
            JSONObject()
                .put(
                    "captureId",
                    captureId,
                )
                .put(
                    "packageName",
                    ALKIMII_PACKAGE,
                )
                .put(
                    "observedAt",
                    observedAt,
                )
                .put(
                    "nodes",
                    JSONArray(
                        nodes,
                    ),
                )

        try {
            connection
                .outputStream
                .use {
                    stream ->
                    stream.write(
                        body
                            .toString()
                            .toByteArray(
                                Charsets.UTF_8,
                            ),
                    )
                }

            val status =
                connection
                    .responseCode

            if (
                status !in
                    200..299
            ) {
                val text =
                    connection
                        .errorStream
                        ?.bufferedReader()
                        ?.use {
                            it.readText()
                        }
                        .orEmpty()

                val message =
                    runCatching {
                        JSONObject(
                            text,
                        ).optString(
                            "message",
                        )
                    }
                        .getOrNull()
                        ?.takeIf {
                            it.isNotBlank()
                        }
                        ?: "Alkimii roster upload failed with HTTP $status."

                throw IllegalStateException(
                    message,
                )
            }
        } finally {
            connection.disconnect()
        }
    }

    companion object {
        const val ALKIMII_PACKAGE =
            "com.alkimii.connect.app"
    }
}
