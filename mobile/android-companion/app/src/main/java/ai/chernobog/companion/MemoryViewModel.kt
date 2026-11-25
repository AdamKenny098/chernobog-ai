package ai.chernobog.companion

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject

data class SavedMemory(val id: String, val key: String, val content: String, val revision: Int, val updatedAt: String)
data class MemoryState(val records: List<SavedMemory> = emptyList(), val busy: Boolean = false, val error: String? = null, val editCompleted: Int = 0)

class MemoryViewModel(application: Application) : AndroidViewModel(application) {
    private val credentials = SecureCredentialStore(application)
    private val client = ConversationClient()
    private val mutable = MutableStateFlow(MemoryState())
    val state = mutable.asStateFlow()

    fun refresh() = operation(null)
    fun save(original: SavedMemory?, key: String, content: String) {
        if (key.isBlank() || key.length > 80 || content.isBlank() || content.length > 1000) {
            mutable.value = mutable.value.copy(error = "Use a label of 1–80 characters and a fact of 1–1000 characters.")
            return
        }
        val input = JSONObject().put("action", "save").put("key", key.trim()).put("content", content.trim())
        original?.let { input.put("id", it.id).put("expectedRevision", it.revision) }
        operation(input)
    }
    fun forget(record: SavedMemory) = operation(JSONObject().put("action", "delete").put("id", record.id).put("expectedRevision", record.revision))

    private fun operation(input: JSONObject?) {
        if (mutable.value.busy) return
        mutable.value = mutable.value.copy(busy = true, error = null)
        viewModelScope.launch {
            try {
                val records = withContext(Dispatchers.IO) {
                    val token = credentials.chatToken()
                    check(token.isNotBlank()) { "Connect to the phone core in Settings first." }
                    val endpoint = credentials.chatEndpoint()
                    if (input != null) client.request(endpoint, token, "/api/memories", input.toString().toByteArray())
                    val array = JSONObject(String(client.request(endpoint, token, "/api/memories"))).getJSONArray("memories")
                    (0 until array.length()).map { index -> array.getJSONObject(index).let { SavedMemory(it.getString("id"), it.getString("key"), it.getString("content"), it.getInt("revision"), it.getString("updatedAt")) } }
                }
                mutable.value = mutable.value.copy(records = records, editCompleted = mutable.value.editCompleted + if (input != null) 1 else 0)
            } catch (error: Exception) { mutable.value = mutable.value.copy(error = error.message ?: "Memory unavailable. Nothing has been confirmed.") }
            finally { mutable.value = mutable.value.copy(busy = false) }
        }
    }
    override fun onCleared() { client.cancel(); super.onCleared() }
}
