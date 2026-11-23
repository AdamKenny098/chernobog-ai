package ai.chernobog.companion

import android.app.Application
import android.media.MediaPlayer
import android.media.MediaRecorder
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

data class ConversationTurn(val role: String, val text: String)
data class ConversationState(
    val turns: List<ConversationTurn> = emptyList(),
    val draft: String = "",
    val busy: Boolean = false,
    val recording: Boolean = false,
    val speaking: Boolean = false,
    val speakReplies: Boolean = true,
    val status: String = "Ready when you are",
    val error: String? = null,
)

class ConversationViewModel(application: Application) : AndroidViewModel(application) {
    private val credentials = SecureCredentialStore(application)
    private val client = ConversationClient()
    private var session = credentials.chatSession()
    private val mutable = MutableStateFlow(ConversationState(turns = loadHistory(), speakReplies = credentials.spokenReplies()))
    val state = mutable.asStateFlow()
    var endpoint = credentials.chatEndpoint()
        private set
    private var token = runCatching { credentials.chatToken() }.getOrDefault("")
    private var recorder: MediaRecorder? = null
    private var player: MediaPlayer? = null
    private var recordingFile: File? = null
    private var playbackFile: File? = null
    private var audioGeneration = 0

    private fun loadHistory(): List<ConversationTurn> = runCatching {
        val array = JSONArray(credentials.chatHistory())
        (0 until array.length()).map { index -> array.getJSONObject(index).let { ConversationTurn(it.getString("role"), it.getString("text")) } }
    }.getOrDefault(emptyList())

    private fun persist() {
        val array = JSONArray()
        mutable.value.turns.takeLast(100).forEach { array.put(JSONObject().put("role", it.role).put("text", it.text)) }
        credentials.saveChatHistory(array.toString())
    }

    fun draft(value: String) { mutable.value = mutable.value.copy(draft = value.take(8000)) }
    fun permissionDenied() { mutable.value = mutable.value.copy(error = "Microphone permission is needed for voice. Text chat remains available.") }
    fun speakReplies(value: Boolean) { stopPlayback(); credentials.saveSpokenReplies(value); mutable.value = mutable.value.copy(speakReplies = value) }

    fun saveConnection(rawEndpoint: String, rawToken: String) {
        if (mutable.value.busy || mutable.value.recording) return
        mutable.value = mutable.value.copy(busy = true, status = "Checking connection…", error = null)
        viewModelScope.launch {
            try {
                val normalized = EndpointPolicy.normalize(rawEndpoint)
                val candidate = rawToken.trim().ifEmpty { token }
                require(candidate.length >= 32) { "Enter the phone core access token." }
                withContext(Dispatchers.IO) { client.request(normalized, candidate, "/health/ready") }
                credentials.saveChatConnection(normalized, candidate)
                if (endpoint != normalized) { session = credentials.resetChatSession(); mutable.value = mutable.value.copy(turns = emptyList()) }
                endpoint = normalized
                token = candidate
                mutable.value = mutable.value.copy(status = "Connected to Chernobog")
            } catch (error: Exception) { mutable.value = mutable.value.copy(error = error.message ?: "Connection failed. Check Tailscale.") }
            finally { mutable.value = mutable.value.copy(busy = false) }
        }
    }

    fun newConversation() {
        if (mutable.value.busy || mutable.value.recording) return
        stopPlayback()
        session = credentials.resetChatSession()
        mutable.value = mutable.value.copy(turns = emptyList(), draft = "", error = null, status = "New conversation")
    }

    fun send() {
        if (mutable.value.busy || mutable.value.recording || mutable.value.draft.isBlank()) return
        turn(mutable.value.draft.trim(), null)
    }

    private fun turn(message: String?, audio: File?) {
        if (token.isBlank()) { audio?.delete(); mutable.value = mutable.value.copy(error = "Connect to the phone core in Settings first."); return }
        stopPlayback()
        val generation = audioGeneration
        mutable.value = mutable.value.copy(busy = true, error = null, status = if (audio != null) "Transcribing…" else "Thinking…")
        viewModelScope.launch {
            try {
                val text = message ?: withContext(Dispatchers.IO) { client.transcribe(endpoint, token, audio!!) }
                mutable.value = mutable.value.copy(draft = text, status = "Thinking…")
                val reply = withContext(Dispatchers.IO) { client.chat(endpoint, token, session, text) }
                mutable.value = mutable.value.copy(turns = (mutable.value.turns + listOf(ConversationTurn("You", text), ConversationTurn("Chernobog", reply))).takeLast(100), draft = "", status = "Reply received")
                persist()
                if (mutable.value.speakReplies && generation == audioGeneration) {
                    mutable.value = mutable.value.copy(status = "Preparing speech…")
                    val bytes = withContext(Dispatchers.IO) { client.request(endpoint, token, "/api/sensory/speak", JSONObject().put("text", reply.take(8000)).toString().toByteArray()) }
                    if (generation == audioGeneration) play(bytes)
                }
            } catch (error: Exception) { mutable.value = mutable.value.copy(error = error.message ?: "Unable to reach Chernobog. Check Tailscale.", status = "Ready to retry") }
            finally { audio?.delete(); mutable.value = mutable.value.copy(busy = false) }
        }
    }

    @Suppress("DEPRECATION")
    fun startRecording() {
        if (mutable.value.busy || mutable.value.recording) return
        if (token.isBlank()) { mutable.value = mutable.value.copy(error = "Connect in Settings first."); return }
        stopPlayback()
        try {
            val file = File.createTempFile("voice-", ".m4a", getApplication<Application>().cacheDir)
            recordingFile = file
            val activeRecorder = MediaRecorder()
            recorder = activeRecorder
            activeRecorder.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(16000)
                setAudioEncodingBitRate(64000)
                setMaxDuration(45000)
                setOutputFile(file.absolutePath)
                setOnInfoListener { _, what, _ -> if (what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) finishRecording() }
                prepare()
                start()
            }
            mutable.value = mutable.value.copy(recording = true, error = null, status = "Listening • tap to send • 45 seconds maximum")
        } catch (error: Exception) { stopAudio(); mutable.value = mutable.value.copy(error = "Could not start microphone. Check its permission.") }
    }

    fun finishRecording() {
        if (!mutable.value.recording) return
        val file = recordingFile
        recordingFile = null
        try {
            recorder?.stop()
            recorder?.release()
            recorder = null
            mutable.value = mutable.value.copy(recording = false)
            turn(null, file)
        } catch (error: Exception) { file?.delete(); stopAudio(); mutable.value = mutable.value.copy(error = "Recording too short. Try again.") }
    }

    private fun play(bytes: ByteArray) {
        val file = File.createTempFile("reply-", ".wav", getApplication<Application>().cacheDir)
        playbackFile = file
        file.writeBytes(bytes)
        val activePlayer = MediaPlayer()
        player = activePlayer
        activePlayer.apply {
            setDataSource(file.absolutePath)
            setOnCompletionListener { stopPlayback() }
            setOnErrorListener { _, _, _ -> stopPlayback(); true }
            prepare()
            start()
        }
        mutable.value = mutable.value.copy(speaking = true, status = "Speaking…")
    }

    fun stopPlayback() {
        audioGeneration++
        player?.release()
        player = null
        playbackFile?.delete()
        playbackFile = null
        mutable.value = mutable.value.copy(speaking = false, status = if (mutable.value.speaking) "Ready when you are" else mutable.value.status)
    }

    fun stopAudio() {
        recorder?.run { runCatching { stop() }; release() }
        recorder = null
        recordingFile?.delete()
        recordingFile = null
        mutable.value = mutable.value.copy(recording = false, status = if (mutable.value.recording) "Recording cancelled" else mutable.value.status)
        stopPlayback()
    }

    override fun onCleared() { stopAudio(); super.onCleared() }
}
