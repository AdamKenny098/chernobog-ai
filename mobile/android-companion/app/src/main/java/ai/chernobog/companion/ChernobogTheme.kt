package ai.chernobog.companion

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val ChernobogBackground =
    Color(0xFF07090A)

val ChernobogPanel =
    Color(0xFF0D1012)

val ChernobogPanelRaised =
    Color(0xFF121619)

val ChernobogAmber =
    Color(0xFFE38A32)

val ChernobogAmberBright =
    Color(0xFFFFA94D)

val ChernobogText =
    Color(0xFFE6E2DB)

val ChernobogMuted =
    Color(0xFF8B8984)

val ChernobogBorder =
    Color(0xFF3A2B1D)

val ChernobogSuccess =
    Color(0xFF64C88A)

val ChernobogDanger =
    Color(0xFFE35A4F)

private val ChernobogColors =
    darkColorScheme(
        primary =
            ChernobogAmber,
        onPrimary =
            Color.Black,
        secondary =
            ChernobogAmberBright,
        background =
            ChernobogBackground,
        onBackground =
            ChernobogText,
        surface =
            ChernobogPanel,
        onSurface =
            ChernobogText,
        surfaceVariant =
            ChernobogPanelRaised,
        onSurfaceVariant =
            ChernobogMuted,
        outline =
            ChernobogBorder,
        error =
            ChernobogDanger,
    )

@Composable
fun ChernobogTheme(
    content:
        @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme =
            ChernobogColors,
        content =
            content,
    )
}
