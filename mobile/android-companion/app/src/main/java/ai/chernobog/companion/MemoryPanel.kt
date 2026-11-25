package ai.chernobog.companion

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun MemoryPanel() {
    val model: MemoryViewModel = viewModel()
    val state by model.state.collectAsState()
    var editing by remember { mutableStateOf(false) }
    var original by remember { mutableStateOf<SavedMemory?>(null) }
    var key by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var deleting by remember { mutableStateOf<SavedMemory?>(null) }
    LaunchedEffect(Unit) { model.refresh() }
    LaunchedEffect(state.editCompleted) { if (state.editCompleted > 0) { editing = false; deleting = null } }
    Column(Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("MEMORY", color = ChernobogAmberBright, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("What you choose to keep", color = ChernobogMuted, style = MaterialTheme.typography.titleSmall)
        Text("Confirmed facts live on your Acer and carry across conversations. Chats are separate; nothing is saved automatically.", style = MaterialTheme.typography.bodySmall, color = ChernobogMuted)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = { original = null; key = ""; content = ""; editing = true }, enabled = !state.busy) { Text("Add memory") }
            OutlinedButton(onClick = model::refresh, enabled = !state.busy) { Text("Refresh") }
        }
        if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
        state.error?.let { Text(it, color = ChernobogDanger, style = MaterialTheme.typography.bodySmall) }
        if (state.records.isEmpty() && !state.busy && state.error == null) {
            Column(Modifier.weight(1f).fillMaxWidth(), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Text("◇", style = MaterialTheme.typography.displayLarge, color = ChernobogAmber)
                Text("A clean slate", style = MaterialTheme.typography.titleLarge)
                Text("Try saying “Remember that my favourite drink is tea.”", modifier = Modifier.padding(12.dp), color = ChernobogMuted)
            }
        } else LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(state.records, key = { it.id }) { record ->
                Surface(shape = RoundedCornerShape(18.dp), color = ChernobogPanelRaised) {
                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(record.key, color = ChernobogAmberBright, fontWeight = FontWeight.SemiBold)
                        Text(record.content, style = MaterialTheme.typography.bodyLarge)
                        Text("OWNER CONFIRMED • REV ${record.revision} • ${record.updatedAt.take(10)}", style = MaterialTheme.typography.labelSmall, color = ChernobogMuted)
                        Row {
                            TextButton(onClick = { original = record; key = record.key; content = record.content; editing = true }, enabled = !state.busy) { Text("Edit") }
                            TextButton(onClick = { deleting = record }, enabled = !state.busy) { Text("Forget", color = ChernobogDanger) }
                        }
                    }
                }
            }
        }
    }
    if (editing) AlertDialog(
        onDismissRequest = { if (!state.busy) editing = false },
        title = { Text(if (original == null) "Remember a fact" else "Update memory") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(value = key, onValueChange = { key = it.take(80) }, label = { Text("Label, e.g. favourite-drink") }, singleLine = true, enabled = !state.busy)
                OutlinedTextField(value = content, onValueChange = { content = it.take(1000) }, label = { Text("Confirmed fact or preference") }, minLines = 3, maxLines = 6, enabled = !state.busy)
                state.error?.let { Text(it, color = ChernobogDanger) }
            }
        },
        confirmButton = { TextButton(onClick = { model.save(original, key, content) }, enabled = !state.busy && key.isNotBlank() && content.isNotBlank()) { Text("Save memory") } },
        dismissButton = { TextButton(onClick = { editing = false }, enabled = !state.busy) { Text("Cancel") } },
    )
    deleting?.let { record -> AlertDialog(
        onDismissRequest = { if (!state.busy) deleting = null }, title = { Text("Forget this memory?") },
        text = { Column { Text(record.content); Text("This removes it from long-term recall. Original chats and existing backups remain separate.", Modifier.padding(top = 12.dp), color = ChernobogMuted); state.error?.let { Text(it, color = ChernobogDanger) } } },
        confirmButton = { TextButton(onClick = { model.forget(record) }, enabled = !state.busy) { Text("Forget", color = ChernobogDanger) } },
        dismissButton = { TextButton(onClick = { deleting = null }, enabled = !state.busy) { Text("Cancel") } },
    ) }
}
