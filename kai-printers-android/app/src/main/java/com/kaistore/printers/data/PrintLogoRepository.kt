package com.kaistore.printers.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

private val Context.printLogoStore: DataStore<Preferences> by preferencesDataStore(name = "kai_printers_logo")

data class PrintLogoSettings(
    val logoPath: String? = null,
    val logoEnabled: Boolean = true,
)

object PrintLogoKeys {
    val LOGO_PATH = stringPreferencesKey("logo_path")
    val LOGO_ENABLED = booleanPreferencesKey("logo_enabled")
}

class PrintLogoRepository(private val context: Context) {
    val settings: Flow<PrintLogoSettings> = context.printLogoStore.data.map { prefs ->
        PrintLogoSettings(
            logoPath = prefs[PrintLogoKeys.LOGO_PATH]?.trim()?.ifEmpty { null },
            logoEnabled = prefs[PrintLogoKeys.LOGO_ENABLED] ?: true,
        )
    }

    suspend fun currentSettings(): PrintLogoSettings = settings.first()

    suspend fun setLogoEnabled(enabled: Boolean) {
        context.printLogoStore.edit { it[PrintLogoKeys.LOGO_ENABLED] = enabled }
    }

    suspend fun saveLogoFromUri(uri: Uri): Boolean = withContext(Dispatchers.IO) {
        val dir = File(context.filesDir, "branding").apply { mkdirs() }
        val dest = File(dir, "logo.png")
        try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                val bitmap = BitmapFactory.decodeStream(input) ?: return@withContext false
                val scaled = scaleLogo(bitmap)
                FileOutputStream(dest).use { out ->
                    scaled.compress(Bitmap.CompressFormat.PNG, 92, out)
                }
                if (scaled !== bitmap) {
                    bitmap.recycle()
                }
            } ?: return@withContext false
            context.printLogoStore.edit { it[PrintLogoKeys.LOGO_PATH] = dest.absolutePath }
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun clearLogo() {
        val path = context.printLogoStore.data.map { it[PrintLogoKeys.LOGO_PATH] }.first()
        if (!path.isNullOrBlank()) {
            runCatching { File(path).delete() }
        }
        context.printLogoStore.edit { it.remove(PrintLogoKeys.LOGO_PATH) }
    }

    private fun scaleLogo(source: Bitmap): Bitmap {
        val maxSide = 480
        val w = source.width
        val h = source.height
        if (w <= maxSide && h <= maxSide) return source
        val ratio = minOf(maxSide.toFloat() / w, maxSide.toFloat() / h)
        val nw = (w * ratio).toInt().coerceAtLeast(1)
        val nh = (h * ratio).toInt().coerceAtLeast(1)
        return Bitmap.createScaledBitmap(source, nw, nh, true)
    }
}
