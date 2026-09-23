package ai.chernobog.companion

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel

class MainActivity :
    ComponentActivity() {
    override fun onCreate(
        savedInstanceState: Bundle?,
    ) {
        super.onCreate(
            savedInstanceState,
        )

        enableEdgeToEdge()

        setContent {
            ChernobogTheme {
                val model:
                    CompanionViewModel =
                    viewModel()

                val state by
                    model
                        .state
                        .collectAsState()

                CompanionScreen(
                    state =
                        state,
                    onEndpointChange =
                        model::updateEndpoint,
                    onPairingCodeChange =
                        model::updatePairingCode,
                    onDisplayNameChange =
                        model::updateDisplayName,
                    onEnroll =
                        model::enroll,
                    onRefresh =
                        model::refreshSession,
                )
            }
        }
    }
}
