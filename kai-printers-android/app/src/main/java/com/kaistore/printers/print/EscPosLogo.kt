package com.kaistore.printers.print

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64

/**
 * Logo raster ESC/POS (`GS v 0`) desde base64 PNG/JPEG (paridad escpos_raster.rs).
 */
object EscPosLogo {
    private const val MAX_WIDTH_DOTS = 384
    private const val MAX_HEIGHT_DOTS = 160

    fun appendIfPresent(writer: EscPosWriter, logoBase64: String?) {
        val commands = logoBase64ToCommands(logoBase64) ?: return
        writer.alignCenter(true)
        writer.appendRaw(commands)
        writer.alignCenter(false)
        writer.sectionGap()
    }

    fun logoBase64ToCommands(logoBase64: String?): ByteArray? {
        val trimmed = logoBase64?.trim().orEmpty()
        if (trimmed.isEmpty()) return null
        val payload = trimmed.substringAfter(',', trimmed)
        val bytes = try {
            Base64.decode(payload.trim(), Base64.DEFAULT)
        } catch (_: Exception) {
            return null
        }
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
        return bitmapToGsV0(bitmap)
    }

    private fun bitmapToGsV0(source: Bitmap): ByteArray? {
        val w = source.width
        val h = source.height
        if (w <= 0 || h <= 0) return null
        val scale = minOf(
            MAX_WIDTH_DOTS.toFloat() / w,
            MAX_HEIGHT_DOTS.toFloat() / h,
            1f,
        )
        val nw = (w * scale).toInt().coerceAtLeast(1)
        val nh = (h * scale).toInt().coerceAtLeast(1)
        val scaled = Bitmap.createScaledBitmap(source, nw, nh, true)
        val widthBytes = (nw + 7) / 8
        val raster = ByteArray(widthBytes * nh)
        for (y in 0 until nh) {
            for (x in 0 until nw) {
                val pixel = scaled.getPixel(x, y)
                val r = (pixel shr 16) and 0xFF
                val g = (pixel shr 8) and 0xFF
                val b = pixel and 0xFF
                val luma = (0.299 * r + 0.587 * g + 0.114 * b).toInt()
                if (luma < 200) {
                    val idx = y * widthBytes + x / 8
                    val bit = 7 - (x % 8)
                    raster[idx] = (raster[idx].toInt() or (1 shl bit)).toByte()
                }
            }
        }
        if (scaled !== source) scaled.recycle()
        val out = ArrayList<Byte>()
        out.add(0x1D)
        out.add(0x76)
        out.add(0x30)
        out.add(0x00)
        out.add((widthBytes and 0xFF).toByte())
        out.add(((widthBytes shr 8) and 0xFF).toByte())
        out.add((nh and 0xFF).toByte())
        out.add(((nh shr 8) and 0xFF).toByte())
        raster.forEach { out.add(it) }
        return out.toByteArray()
    }
}
