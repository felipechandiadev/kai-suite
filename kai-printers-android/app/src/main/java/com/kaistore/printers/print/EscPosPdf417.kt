package com.kaistore.printers.print

import android.graphics.Bitmap
import android.graphics.Color
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.common.BitMatrix
import com.google.zxing.pdf417.PDF417Writer

object EscPosPdf417 {
    private const val WIDTH_DOTS_58 = 384
    private const val WIDTH_DOTS_80 = 576

    fun rasterMaxWidthDots(widthChars: Int): Int =
        if (widthChars <= 32) WIDTH_DOTS_58 else WIDTH_DOTS_80

    fun appendCentered(writer: EscPosWriter, payload: String, widthChars: Int = 48) {
        val trimmed = payload.trim()
        if (trimmed.isEmpty()) return
        val maxDots = rasterMaxWidthDots(widthChars)
        val bitmap = pdf417Bitmap(trimmed, maxDots) ?: return
        EscPosLogo.appendBitmapCentered(writer, bitmap, maxDots)
        if (!bitmap.isRecycled) bitmap.recycle()
    }

    private fun pdf417Bitmap(payload: String, maxWidthDots: Int): Bitmap? {
        val scale = maxWidthDots.toFloat() / WIDTH_DOTS_58.toFloat()
        val encodeW = (280f * scale).toInt().coerceAtLeast(200)
        val encodeH = (100f * scale).toInt().coerceAtLeast(80)
        return try {
            val matrix = PDF417Writer().encode(
                payload,
                BarcodeFormat.PDF_417,
                encodeW,
                encodeH,
                mapOf(EncodeHintType.MARGIN to 0),
            )
            scaleBitmapToMaxWidth(bitMatrixToBitmap(matrix), maxWidthDots)
        } catch (_: Exception) {
            null
        }
    }

    private fun scaleBitmapToMaxWidth(source: Bitmap, maxWidthDots: Int): Bitmap {
        if (source.width == maxWidthDots) return source
        val scale = maxWidthDots.toFloat() / source.width
        val nh = (source.height * scale).toInt().coerceAtLeast(1)
        val scaled = Bitmap.createScaledBitmap(source, maxWidthDots, nh, true)
        if (scaled !== source) source.recycle()
        return scaled
    }

    private fun bitMatrixToBitmap(matrix: BitMatrix): Bitmap {
        val w = matrix.width
        val h = matrix.height
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        for (y in 0 until h) {
            for (x in 0 until w) {
                bmp.setPixel(x, y, if (matrix[x, y]) Color.BLACK else Color.WHITE)
            }
        }
        return bmp
    }
}
