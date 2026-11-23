package ai.chernobog.companion

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.sqrt

class ContinuousVoiceCapture(private val context: Context) {
    private var capture: AudioRecord? = null
    private var job: Job? = null

    fun start(scope: CoroutineScope, allowed: (Boolean) -> Boolean, onStart: () -> Unit, onTurn: (File) -> Unit, onDiscard: () -> Unit, onError: () -> Unit) {
        stop()
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) { onError(); return }
        val minimum = AudioRecord.getMinBufferSize(16000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
        val recorder = runCatching { AudioRecord(MediaRecorder.AudioSource.VOICE_COMMUNICATION, 16000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, maxOf(minimum, 6400)) }.getOrElse { onError(); return }
        capture = recorder
        job = scope.launch(Dispatchers.IO) {
            var echo: AcousticEchoCanceler? = null
            var suppressor: NoiseSuppressor? = null
            try {
                check(recorder.state == AudioRecord.STATE_INITIALIZED)
                if (AcousticEchoCanceler.isAvailable()) echo = AcousticEchoCanceler.create(recorder.audioSessionId)?.apply { enabled = true }
                if (NoiseSuppressor.isAvailable()) suppressor = NoiseSuppressor.create(recorder.audioSessionId)?.apply { enabled = true }
                val canCancelEcho = echo?.enabled == true
                recorder.startRecording()
                val samples = ShortArray(320)
                val detector = VoiceTurnDetector()
                val preRoll = ArrayDeque<ByteArray>()
                val audio = ByteArrayOutputStream()
                while (isActive) {
                    val count = recorder.read(samples, 0, samples.size, AudioRecord.READ_BLOCKING)
                    if (count <= 0) { ensureActive(); error("Microphone read failed") }
                    if (!allowed(canCancelEcho)) { detector.reset(); audio.reset(); preRoll.clear(); continue }
                    val pcm = ByteBuffer.allocate(count * 2).order(ByteOrder.LITTLE_ENDIAN)
                    var sum = 0.0
                    for (index in 0 until count) { pcm.putShort(samples[index]); sum += samples[index].toDouble() * samples[index] }
                    val bytes = pcm.array()
                    val wasActive = detector.active
                    val event = detector.accept(sqrt(sum / count))
                    if (wasActive) audio.write(bytes)
                    else { preRoll.addLast(bytes); if (preRoll.size > 12) preRoll.removeFirst() }
                    when (event) {
                        VoiceTurnDetector.Event.START -> {
                            audio.reset()
                            preRoll.forEach { audio.write(it) }
                            preRoll.clear()
                            withContext(Dispatchers.Main) { onStart() }
                        }
                        VoiceTurnDetector.Event.END -> {
                            val file = File.createTempFile("continuous-", ".wav", context.cacheDir)
                            val pcmBytes = audio.toByteArray()
                            val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
                            header.put("RIFF".toByteArray()).putInt(36 + pcmBytes.size).put("WAVEfmt ".toByteArray()).putInt(16).putShort(1).putShort(1).putInt(16000).putInt(32000).putShort(2).putShort(16).put("data".toByteArray()).putInt(pcmBytes.size)
                            file.outputStream().use { it.write(header.array()); it.write(pcmBytes) }
                            try { withContext(Dispatchers.Main) { onTurn(file) } } catch (error: Exception) { file.delete(); throw error }
                            audio.reset()
                        }
                        VoiceTurnDetector.Event.DISCARD -> { audio.reset(); withContext(Dispatchers.Main) { onDiscard() } }
                        else -> Unit
                    }
                }
            } catch (error: CancellationException) { throw error }
            catch (error: Exception) { withContext(Dispatchers.Main) { onError() } }
            finally { echo?.release(); suppressor?.release() }
        }
        job?.invokeOnCompletion { recorder.release() }
    }

    fun stop() {
        job?.cancel()
        capture?.let { runCatching { it.stop() } }
        capture = null
        job = null
    }
}
