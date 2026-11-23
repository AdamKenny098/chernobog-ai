package ai.chernobog.companion

import org.json.JSONObject
import java.io.File
import java.net.URL
import java.util.UUID
import javax.net.ssl.HttpsURLConnection

class ConversationClient {
    private val connections = java.util.concurrent.ConcurrentHashMap.newKeySet<HttpsURLConnection>()

    fun cancel() { connections.toList().forEach { it.disconnect() } }

    fun request(endpoint: String, token: String, route: String, body: ByteArray? = null, contentType: String = "application/json"): ByteArray {
        val connection = URL(EndpointPolicy.apiUrl(endpoint, route)).openConnection() as HttpsURLConnection
        connections.add(connection)
        try {
            connection.instanceFollowRedirects = false
            connection.connectTimeout = 15000
            connection.readTimeout = 130000
            connection.setRequestProperty("Authorization", "Bearer ${token.trim()}")
            if (body != null) {
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", contentType)
                connection.doOutput = true
                connection.setFixedLengthStreamingMode(body.size)
                connection.outputStream.use { it.write(body) }
            }
            val status = connection.responseCode
            if (status !in 200..299) {
                throw IllegalStateException(when (status) {
                    401 -> "Access token rejected. Check Conversation settings."
                    429 -> "Chernobog is busy. Please try again shortly."
                    413 -> "Recording or message is too large. Try a shorter turn."
                    else -> "Chernobog returned HTTP $status. Check the server services."
                })
            }
            return connection.inputStream.use { it.readBytes() }
        } finally { connections.remove(connection); connection.disconnect() }
    }

    fun streamChat(endpoint: String, token: String, session: String, message: String, onToken: (String) -> Unit, onComplete: () -> Unit): String {
        val connection = URL(EndpointPolicy.apiUrl(endpoint, "/api/chat")).openConnection() as HttpsURLConnection
        connections.add(connection)
        try {
            connection.instanceFollowRedirects = false
            connection.connectTimeout = 15000
            connection.readTimeout = 130000
            connection.requestMethod = "POST"
            connection.setRequestProperty("Authorization", "Bearer ${token.trim()}")
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            val body = JSONObject().put("sessionId", session).put("message", message).put("stream", true).toString().toByteArray()
            connection.outputStream.use { it.write(body) }
            check(connection.responseCode == 200) { "Conversation returned HTTP ${connection.responseCode}. Check the server update and access token." }
            if (connection.contentType?.startsWith("application/json") == true) {
                val reply = JSONObject(connection.inputStream.bufferedReader().use { it.readText() }).getString("reply")
                onToken(reply)
                onComplete()
                return reply
            }
            check(connection.contentType?.startsWith("application/x-ndjson") == true) { "Unexpected response from conversation service." }
            var complete: String? = null
            connection.inputStream.bufferedReader().useLines { lines ->
                lines.forEach { line ->
                    if (line.isNotBlank()) {
                        val event = JSONObject(line)
                        when (event.getString("type")) {
                            "token" -> onToken(event.getString("text"))
                            "done" -> { complete = event.getString("reply"); onComplete() }
                            "error" -> error("The response was interrupted. Please retry.")
                        }
                    }
                }
            }
            return checkNotNull(complete) { "Connection ended before the reply was complete." }
        } finally { connections.remove(connection); connection.disconnect() }
    }

    fun chat(endpoint: String, token: String, session: String, message: String): String {
        require(message.isNotBlank() && message.length <= 8000) { "Enter a message of up to 8000 characters." }
        val body = JSONObject().put("sessionId", session).put("message", message).toString().toByteArray()
        return JSONObject(String(request(endpoint, token, "/api/chat", body))).getString("reply").also {
            require(it.isNotBlank()) { "Chernobog returned an empty reply." }
        }
    }

    fun transcribe(endpoint: String, token: String, audio: File): String {
        require(audio.length() in 1..(12L * 1024 * 1024)) { "Recording is empty or too large." }
        val boundary = UUID.randomUUID().toString()
        val wav = audio.extension == "wav"
        val filename = if (wav) "voice.wav" else "voice.m4a"
        val type = if (wav) "audio/wav" else "audio/mp4"
        val prefix = "--$boundary\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"$filename\"\r\nContent-Type: $type\r\n\r\n".toByteArray()
        val body = prefix + audio.readBytes() + "\r\n--$boundary--\r\n".toByteArray()
        return JSONObject(String(request(endpoint, token, "/api/sensory/transcribe", body, "multipart/form-data; boundary=$boundary"))).getString("transcript").also {
            require(it.isNotBlank()) { "No speech detected. Please try again." }
        }
    }
}
