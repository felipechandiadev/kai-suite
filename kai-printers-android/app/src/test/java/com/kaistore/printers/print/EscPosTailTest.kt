package com.kaistore.printers.print

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EscPosTailTest {
    private fun hasDrawerKick(bytes: ByteArray): Boolean {
        for (i in 0 until bytes.size - 1) {
            if (bytes[i] == 0x1B.toByte() && bytes[i + 1] == 0x70.toByte()) return true
        }
        return false
    }

    @Test
    fun appendsDrawerFeedAndCutWhenRequested() {
        val buf = mutableListOf<Byte>()
        EscPosTail.append(buf, openCashDrawer = true)
        val bytes = buf.toByteArray()
        assertTrue(bytes.size >= 11)
        assertTrue(hasDrawerKick(bytes))
        assertEquals(0x1D.toByte(), bytes[bytes.size - 3])
        assertEquals(0x56.toByte(), bytes[bytes.size - 2])
        assertEquals(0x00.toByte(), bytes[bytes.size - 1])
    }

    @Test
    fun skipsDrawerWhenNotRequested() {
        val buf = mutableListOf<Byte>()
        EscPosTail.append(buf, openCashDrawer = false)
        val bytes = buf.toByteArray()
        assertTrue(!hasDrawerKick(bytes))
    }

    @Test
    fun shouldOpenCashDrawerOnlyOn80mm() {
        assertTrue(EscPosTail.shouldOpenCashDrawer(48))
        assertTrue(!EscPosTail.shouldOpenCashDrawer(32))
    }

    @Test
    fun feedLineCountMatchesOneCentimeterApprox() {
        assertEquals(4, EscPosTail.FEED_LINES_BEFORE_CUT)
    }
}
