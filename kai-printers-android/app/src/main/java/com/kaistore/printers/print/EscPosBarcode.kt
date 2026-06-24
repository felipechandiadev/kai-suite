package com.kaistore.printers.print

/**
 * Código de barras CODE128 en ESC/POS (GS k).
 * El folio se imprime como texto legible bajo el código (HRI).
 */
object EscPosBarcode {
    fun code128Commands(data: String, heightDots: Int = 80, moduleWidth: Int = 2): ByteArray {
        val payload = data.trim()
        if (payload.isEmpty()) return byteArrayOf()
        val raw = payload.toByteArray(Charsets.US_ASCII)
        if (raw.isEmpty()) return byteArrayOf()

        val buf = ArrayList<Byte>()
        fun b(vararg bytes: Int) { bytes.forEach { buf.add(it.toByte()) } }

        b(0x1B, 0x61, 0x01) // center
        b(0x1D, 0x68, heightDots.coerceIn(1, 255))
        b(0x1D, 0x77, moduleWidth.coerceIn(1, 6))
        b(0x1D, 0x48, 2) // HRI below barcode
        b(0x1D, 0x6B, 73, raw.size)
        raw.forEach { buf.add(it) }
        b(0x0A)
        b(0x1B, 0x61, 0x00) // left align
        return buf.toByteArray()
    }
}
