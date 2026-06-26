package com.kaistore.printers.print

/**
 * Cola común de tickets: avance de papel, apertura de cajón y corte.
 * ~5 mm de feed ≈ 4 líneas a 203 dpi con espaciado estándar.
 */
object EscPosTail {
    const val FEED_LINES_BEFORE_CUT = 4

    /** Columnas por línea en rollo 80 mm (48); 58 mm usa 32 y no lleva cajón. */
    const val DRAWER_MIN_WIDTH_CHARS = 48

    /** Abre cajón solo en impresoras 80 mm (venta, cobro cliente y pruebas). */
    fun shouldOpenCashDrawer(widthChars: Int): Boolean = widthChars >= DRAWER_MIN_WIDTH_CHARS

    /** Pulso cajón pin 2 (t1=50×2ms on, t2=200×2ms off). */
    fun append(buf: MutableList<Byte>, openCashDrawer: Boolean = false) {
        fun b(vararg bytes: Int) {
            bytes.forEach { buf.add(it.toByte()) }
        }
        if (openCashDrawer) {
            b(0x1B, 0x70, 0x00, 0x32, 0xC8)
        }
        b(0x1B, 0x64, FEED_LINES_BEFORE_CUT)
        b(0x1D, 0x56, 0x00)
    }
}
