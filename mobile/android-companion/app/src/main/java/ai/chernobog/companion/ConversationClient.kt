package ai.chernobog.companion

import org.json.JSONObject
import java.io.File
import java.net.URL
import java.util.UUID
import javax.net.ssl.HttpsURLConnection

class ConversationClient {
    fun request(endpoint: String, token: String, route: String, body: ByteArray? = null, contentType: String = "application/json"): ByteArray {
        val connection = URL(EndpointPolicy.apiUrl(endpoint, route)).openConnection() as HttpsURLConnection
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
        } finally { connection.disconnect() }
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
        val prefix = "--$boundary\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"voice.m4a\"\r\nContent-Type: audio/mp4\r\n\r\n".toByteArray()
        val body = prefix + audio.readBytes() + "\r\n--$boundary--\r\n".toByteArray()
        return JSONObject(String(request(endpoint, token, "/api/sensory/transcribe", body, "multipart/form-data; boundary=$boundary"))).getString("transcript").also {
            require(it.isNotBlank()) { "No speech detected. Please try again." }
        }
    }
}
