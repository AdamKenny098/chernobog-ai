package ai.chernobog.companion

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat

@Composable
fun CompanionNavigation(model: ConversationViewModel, companion: @Composable () -> Unit) {
    var selected by rememberSaveable { mutableStateOf(0) }
    val state by model.state.collectAsState()
    Scaffold(
        containerColor = ChernobogBackground,
        bottomBar = {
            NavigationBar(containerColor = ChernobogPanel) {
                listOf("Conversation", "Companion", "Settings").forEachIndexed { index, title ->
                    NavigationBarItem(selected = selected == index, onClick = { if (index != selected) model.stopAudio(); selected = index },
                        icon = { Text(listOf("◉", "◇", "⚙")[index]) }, label = { Text(title) })
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding).imePadding()) {
            when (selected) {
                0 -> ConversationPanel(model, state) { selected = 2 }
                1 -> companion()
                else -> ConversationSettings(model, state)
            }
        }
    }
}

@Composable
private fun ConversationPanel(model: ConversationViewModel, state: ConversationState, settings: () -> Unit) {
    val context = LocalContext.current
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) model.startRecording() else model.permissionDenied()
    }
    val scroll = rememberLazyListState()
    LaunchedEffect(state.turns.size) { if (state.turns.isNotEmpty()) scroll.animateScrollToItem(state.turns.lastIndex) }
    Column(Modifier.fillMaxSize().padding(horizontal = 18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth().padding(top = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("CHERNOBOG", color = ChernobogAmberBright, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("PRIVATE CONVERSATION", style = MaterialTheme.typography.labelSmall, color = ChernobogMuted)
            }
            TextButton(onClick = model::newConversation, enabled = !state.busy && !state.recording) { Text("New") }
        }
        if (state.turns.isEmpty()) {
            Column(Modifier.weight(1f).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Text("◉", color = ChernobogAmber, style = MaterialTheme.typography.displayLarge)
                Spacer(Modifier.height(18.dp))
                Text("A direct line to Chernobog", style = MaterialTheme.typography.titleMedium)
                Text("Type a message, or tap the microphone to speak.", modifier = Modifier.padding(12.dp), color = ChernobogMuted)
                TextButton(onClick = settings) { Text("Connection settings") }
            }
        } else {
            LazyColumn(state = scroll, modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(vertical = 8.dp)) {
                items(state.turns) { turn ->
                    val owner = turn.role == "You"
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = if (owner) Alignment.End else Alignment.Start) {
                        Text(turn.role.uppercase(), color = ChernobogMuted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        Surface(shape = RoundedCornerShape(18.dp), color = if (owner) ChernobogPanelRaised else ChernobogPanel, tonalElevation = 2.dp, modifier = Modifier.widthIn(max = 420.dp)) {
                            Text(turn.text, modifier = Modifier.padding(16.dp), style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                }
            }
        }
        state.error?.let { Text(it, color = ChernobogDanger, style = MaterialTheme.typography.bodySmall) }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (state.busy) CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
            Text(state.status, modifier = Modifier.weight(1f), color = ChernobogMuted, style = MaterialTheme.typography.labelMedium)
            if (state.speaking) TextButton(onClick = model::stopPlayback) { Text("Stop audio") }
        }
        OutlinedTextField(value = state.draft, onValueChange = model::draft, enabled = !state.busy && !state.recording,
            placeholder = { Text("Message Chernobog…") }, modifier = Modifier.fillMaxWidth(), maxLines = 4, shape = RoundedCornerShape(18.dp))
        Row(Modifier.fillMaxWidth().padding(bottom = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(onClick = {
                if (state.recording) model.finishRecording()
                else if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) model.startRecording()
                else permission.launch(Manifest.permission.RECORD_AUDIO)
            }, enabled = !state.busy, modifier = Modifier.weight(1f)) { Text(if (state.recording) "Stop & send" else "Microphone") }
            Button(onClick = model::send, enabled = !state.busy && !state.recording && state.draft.isNotBlank(), modifier = Modifier.weight(1f)) { Text("Send") }
        }
    }
}

@Composable
private fun ConversationSettings(model: ConversationViewModel, state: ConversationState) {
    var endpoint by rememberSaveable { mutableStateOf(model.endpoint) }
    var token by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Text("CONNECTION", color = ChernobogAmberBright, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text("Connect through Tailscale to your homelab. Conversation credentials are separate from companion device pairing.", color = ChernobogMuted)
        OutlinedTextField(value = endpoint, onValueChange = { endpoint = it }, label = { Text("Phone core HTTPS address") }, singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri), modifier = Modifier.fillMaxWidth(), enabled = !state.busy)
        OutlinedTextField(value = token, onValueChange = { token = it }, label = { Text("Access token") }, placeholder = { Text("Leave blank to keep saved token") },
            visualTransformation = PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth(), enabled = !state.busy)
        Button(onClick = { model.saveConnection(endpoint, token); token = "" }, enabled = !state.busy && !state.recording, modifier = Modifier.fillMaxWidth()) { Text("Save & test connection") }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Text("Spoken replies"); Text("Speech is generated on the Acer.", color = ChernobogMuted, style = MaterialTheme.typography.bodySmall) }
            Switch(checked = state.speakReplies, onCheckedChange = model::speakReplies)
        }
        Text("Recording is foreground-only and limited to 45 seconds. Leaving the app stops the microphone. No always-on listening.", color = ChernobogMuted, style = MaterialTheme.typography.bodySmall)
        Text(state.status, color = ChernobogAmber)
        state.error?.let { Text(it, color = ChernobogDanger) }
    }
}
