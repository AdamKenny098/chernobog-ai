package ai.chernobog.companion

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

@Composable
fun ChernobogEye(
    modifier: Modifier = Modifier,
    active: Boolean,
) {
    val glow =
        if (active) {
            ChernobogAmberBright
        } else {
            ChernobogAmber
        }

    Canvas(
        modifier =
            modifier.size(
                164.dp,
            ),
    ) {
        val center =
            Offset(
                size.width / 2f,
                size.height / 2f,
            )

        val outerRadius =
            size.minDimension *
                0.42f

        val middleRadius =
            size.minDimension *
                0.31f

        val innerRadius =
            size.minDimension *
                0.18f

        drawCircle(
            color =
                ChernobogBorder,
            radius =
                outerRadius,
            center =
                center,
            style =
                Stroke(
                    width = 1.4f,
                ),
        )

        drawCircle(
            color =
                glow.copy(
                    alpha = 0.45f,
                ),
            radius =
                middleRadius,
            center =
                center,
            style =
                Stroke(
                    width = 2f,
                ),
        )

        drawCircle(
            color =
                glow.copy(
                    alpha = 0.28f,
                ),
            radius =
                innerRadius,
            center =
                center,
            style =
                Stroke(
                    width = 2f,
                ),
        )

        val eye =
            Path().apply {
                moveTo(
                    center.x -
                        outerRadius *
                        0.92f,
                    center.y,
                )
                quadraticTo(
                    center.x,
                    center.y -
                        outerRadius *
                        0.52f,
                    center.x +
                        outerRadius *
                        0.92f,
                    center.y,
                )
                quadraticTo(
                    center.x,
                    center.y +
                        outerRadius *
                        0.52f,
                    center.x -
                        outerRadius *
                        0.92f,
                    center.y,
                )
                close()
            }

        drawPath(
            path =
                eye,
            color =
                glow.copy(
                    alpha = 0.62f,
                ),
            style =
                Stroke(
                    width = 2.2f,
                ),
        )

        val pupilHeight =
            innerRadius *
                1.9f

        val pupilWidth =
            innerRadius *
                0.25f

        val pupil =
            Path().apply {
                moveTo(
                    center.x,
                    center.y -
                        pupilHeight,
                )
                lineTo(
                    center.x +
                        pupilWidth,
                    center.y,
                )
                lineTo(
                    center.x,
                    center.y +
                        pupilHeight,
                )
                lineTo(
                    center.x -
                        pupilWidth,
                    center.y,
                )
                close()
            }

        drawPath(
            path =
                pupil,
            color =
                glow,
        )

        drawLine(
            color =
                glow.copy(
                    alpha = 0.38f,
                ),
            start =
                Offset(
                    center.x,
                    center.y -
                        outerRadius,
                ),
            end =
                Offset(
                    center.x,
                    center.y +
                        outerRadius,
                ),
            strokeWidth =
                1f,
        )

        drawArc(
            color =
                glow.copy(
                    alpha = 0.35f,
                ),
            startAngle =
                205f,
            sweepAngle =
                130f,
            useCenter =
                false,
            topLeft =
                Offset(
                    center.x -
                        outerRadius,
                    center.y -
                        outerRadius,
                ),
            size =
                Size(
                    outerRadius * 2f,
                    outerRadius * 2f,
                ),
            style =
                Stroke(
                    width = 3f,
                ),
        )
    }
}
