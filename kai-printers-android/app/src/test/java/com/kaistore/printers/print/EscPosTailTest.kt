package com.kaistore.printers.print

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EscPosTailTest {
    @Test
    fun appendsDrawerFeedAndCut() {
        val buf = mutableListOf<Byte>()
        EscPosTail.append(buf)
        val bytes = buf.toByteArray()
        assertTrue(bytes.size >= 11)
        assertEquals(0x1B.toByte(), bytes[0])
        assertEquals(0x70.toByte(), bytes[1])
        assertTrue(
            bytes.indices.any { i ->
                i + 1 < bytes.size &&
                    bytes[i] == 0x1B.toByte() &&
                    bytes[i + 1] == 0x64.toByte()
            },
        )
        assertEquals(0x1D.toByte(), bytes[bytes.size - 3])
        assertEquals(0x56.toByte(), bytes[bytes.size - 2])
        assertEquals(0x00.toByte(), bytes[bytes.size - 1])
    }

    @Test
    fun feedLineCountMatchesOneCentimeterApprox() {
        assertEquals(4, EscPosTail.FEED_LINES_BEFORE_CUT)
    }
}
