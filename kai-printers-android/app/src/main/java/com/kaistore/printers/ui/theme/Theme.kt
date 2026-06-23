package com.kaistore.printers.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val KaiPrimary = Color(0xFF002B59)
private val KaiAccent = Color(0xFF0A7CAD)
private val KaiBackground = Color(0xFFFFFFFF)

private val LightColors = lightColorScheme(
    primary = KaiPrimary,
    onPrimary = Color.White,
    secondary = KaiAccent,
    background = KaiBackground,
    surface = KaiBackground,
)

@Composable
fun KaiPrintersTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        content = content,
    )
}
