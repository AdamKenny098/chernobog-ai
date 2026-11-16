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

        // One explicit Android permission prompt; never silently grant access.
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) !=
                android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            val preferences = getSharedPreferences("chernobog-reminder-permissions", MODE_PRIVATE)
            if (!preferences.getBoolean("prompted", false)) {
                preferences.edit().putBoolean("prompted", true).apply()
                requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 6131)
            }
        }

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
                    onRecover =
                        model::recoverEnrollment,
                    onPrepareFreshEnrollment =
                        model::prepareFreshEnrollment,
                    onRefresh =
                        model::refreshSession,
                )
            }
        }
    }
}
