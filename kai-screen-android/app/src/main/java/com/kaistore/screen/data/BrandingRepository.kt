package com.kaistore.screen.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
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

private val Context.brandingStore: DataStore<Preferences> by preferencesDataStore(name = "kai_screen_branding")

data class DisplayBranding(
    val businessName: String = "",
    val welcomeMessage: String = "",
    val logoPath: String? = null,
)

object BrandingKeys {
    val BUSINESS_NAME = stringPreferencesKey("business_name")
    val WELCOME_MESSAGE = stringPreferencesKey("welcome_message")
    val LOGO_PATH = stringPreferencesKey("logo_path")
}

class BrandingRepository(private val context: Context) {
    val branding: Flow<DisplayBranding> = context.brandingStore.data.map { prefs ->
        DisplayBranding(
            businessName = prefs[BrandingKeys.BUSINESS_NAME].orEmpty(),
            welcomeMessage = prefs[BrandingKeys.WELCOME_MESSAGE].orEmpty(),
            logoPath = prefs[BrandingKeys.LOGO_PATH]?.trim()?.ifEmpty { null },
        )
    }

    suspend fun setBusinessName(value: String) {
        context.brandingStore.edit { it[BrandingKeys.BUSINESS_NAME] = value.trim() }
    }

    suspend fun setWelcomeMessage(value: String) {
        context.brandingStore.edit { it[BrandingKeys.WELCOME_MESSAGE] = value.trim() }
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
            context.brandingStore.edit { it[BrandingKeys.LOGO_PATH] = dest.absolutePath }
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun clearLogo() {
        val path = context.brandingStore.data.map { it[BrandingKeys.LOGO_PATH] }.first()
        if (!path.isNullOrBlank()) {
            runCatching { File(path).delete() }
        }
        context.brandingStore.edit { it.remove(BrandingKeys.LOGO_PATH) }
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
