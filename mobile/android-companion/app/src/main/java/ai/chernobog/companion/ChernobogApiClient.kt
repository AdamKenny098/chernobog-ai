package ai.chernobog.companion

import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection

class ChernobogApiClient {
    fun enroll(
        endpoint: String,
        pairingCode: String,
        installationId: String,
        displayName: String,
        appVersion: String,
    ): EnrollmentRecord {
        val normalizedEndpoint =
            EndpointPolicy.normalize(
                endpoint,
            )

        require(
            pairingCode.trim().length >= 16,
        ) {
            "Pairing code is too short."
        }

        require(
            installationId.trim().length >= 8,
        ) {
            "Installation identity is invalid."
        }

        require(
            displayName.trim().isNotBlank(),
        ) {
            "Device name is required."
        }

        val body =
            JSONObject()
                .put(
                    "pairingCode",
                    pairingCode.trim(),
                )
                .put(
                    "installationId",
                    installationId.trim(),
                )
                .put(
                    "displayName",
                    displayName.trim(),
                )
                .put(
                    "appVersion",
                    appVersion,
                )

        val response =
            request(
                method = "POST",
                url =
                    EndpointPolicy.apiUrl(
                        normalizedEndpoint,
                        "/api/personal-assistance/mobile/enroll",
                    ),
                token = null,
                body = body,
            )

        val device =
            response
                .getJSONObject(
                    "device",
                )

        val credential =
            response
                .getJSONObject(
                    "credential",
                )

        return EnrollmentRecord(
            endpoint =
                normalizedEndpoint,
            installationId =
                device.getString(
                    "installationId",
                ),
            deviceId =
                device.getString(
                    "deviceId",
                ),
            displayName =
                device.getString(
                    "displayName",
                ),
            token =
                credential.getString(
                    "token",
                ),
        )
    }

    fun session(
        endpoint: String,
        token: String,
    ): SessionSnapshot {
        val response =
            request(
                method = "GET",
                url =
                    EndpointPolicy.apiUrl(
                        endpoint,
                        "/api/personal-assistance/mobile/session",
                    ),
                token = token,
                body = null,
            )

        val device =
            response
                .getJSONObject(
                    "device",
                )

        val capabilities =
            response
                .getJSONObject(
                    "capabilities",
                )

        return SessionSnapshot(
            deviceId =
                device.getString(
                    "deviceId",
                ),
            installationId =
                device.getString(
                    "installationId",
                ),
            displayName =
                device.getString(
                    "displayName",
                ),
            status =
                device.getString(
                    "status",
                ),
            lastSeenAt =
                device.optNullableString(
                    "lastSeenAt",
                ),
            capabilities =
                SessionCapabilities(
                    identity =
                        capabilities.optBoolean(
                            "identity",
                            false,
                        ),
                    heartbeat =
                        capabilities.optBoolean(
                            "heartbeat",
                            false,
                        ),
                    notificationApiAvailable =
                        capabilities.optBoolean(
                            "notificationApiAvailable",
                            false,
                        ),
                    notificationCaptureMode =
                        capabilities.optString(
                            "notificationCaptureMode",
                            "disabled",
                        ),
                    notificationStoreBodies =
                        capabilities.optBoolean(
                            "notificationStoreBodies",
                            false,
                        ),
                    notificationRedactSensitiveContent =
                        capabilities.optBoolean(
                            "notificationRedactSensitiveContent",
                            true,
                        ),
                    notificationStoreSenderIdentity =
                        capabilities.optBoolean(
                            "notificationStoreSenderIdentity",
                            false,
                        ),
                    notificationIngest =
                        capabilities.optBoolean(
                            "notificationIngest",
                            false,
                        ),
                    offlineSpoolUpload =
                        capabilities.optBoolean(
                            "offlineSpoolUpload",
                            false,
                        ),
                    classification =
                        capabilities.optBoolean(
                            "classification",
                            false,
                        ),
                    importanceScoring =
                        capabilities.optBoolean(
                            "importanceScoring",
                            false,
                        ),
                    toolExecution =
                        capabilities.optBoolean(
                            "toolExecution",
                            false,
                        ),
                    permissionGranting =
                        capabilities.optBoolean(
                            "permissionGranting",
                            false,
                        ),
                ),
        )
    }

    fun transport(
        endpoint: String,
        token: String,
    ): JSONObject =
        request(
            method = "GET",
            url =
                EndpointPolicy.apiUrl(
                    endpoint,
                    "/api/personal-assistance/mobile/transport",
                ),
            token = token,
            body = null,
        )

    private fun request(
        method: String,
        url: String,
        token: String?,
        body: JSONObject?,
    ): JSONObject {
        val connection =
            (
                URL(url)
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

                setRequestProperty(
                    "Accept",
                    "application/json",
                )
                setRequestProperty(
                    "User-Agent",
                    "ChernobogCompanion/0.1",
                )

                if (!token.isNullOrBlank()) {
                    setRequestProperty(
                        "Authorization",
                        "Bearer $token",
                    )
                }

                if (body != null) {
                    doOutput =
                        true
                    setRequestProperty(
                        "Content-Type",
                        "application/json",
                    )
                }
            }

        try {
            if (body != null) {
                connection.outputStream.use {
                    output ->
                    output.write(
                        body
                            .toString()
                            .toByteArray(
                                Charsets.UTF_8,
                            ),
                    )
                }
            }

            val status =
                connection.responseCode

            val stream =
                if (
                    status in
                        200..299
                ) {
                    connection.inputStream
                } else {
                    connection.errorStream
                }

            val responseText =
                stream
                    ?.bufferedReader()
                    ?.use {
                        reader ->
                        reader.readText()
                    }
                    .orEmpty()

            val json =
                if (
                    responseText.isBlank()
                ) {
                    JSONObject()
                } else {
                    JSONObject(
                        responseText,
                    )
                }

            if (
                status !in
                    200..299
            ) {
                val message =
                    json.optString(
                        "message",
                        "Chernobog request failed with HTTP $status.",
                    )

                throw IllegalStateException(
                    message,
                )
            }

            if (
                !json.optBoolean(
                    "ok",
                    true,
                )
            ) {
                throw IllegalStateException(
                    json.optString(
                        "message",
                        "Chernobog rejected the request.",
                    ),
                )
            }

            return json
        } finally {
            connection.disconnect()
        }
    }

    private fun JSONObject.optNullableString(
        key: String,
    ): String? {
        if (
            !has(key) ||
            isNull(key)
        ) {
            return null
        }

        return optString(
            key,
        ).takeIf {
            it.isNotBlank()
        }
    }

    companion object {
        private const val CONNECT_TIMEOUT_MS =
            15_000

        private const val READ_TIMEOUT_MS =
            20_000
    }
}
