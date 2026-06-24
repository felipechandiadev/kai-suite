package com.kaistore.printers.print

data class EscPosLayout(val widthChars: Int) {
    val productNameChars: Int get() = widthChars * 2 / 3

    companion object {
        fun forFormat(format: PrintFormat): EscPosLayout =
            EscPosLayout(PrintFormats.charsPerLine(format))

        fun forWidthChars(widthChars: Int): EscPosLayout = EscPosLayout(widthChars)
    }
}
