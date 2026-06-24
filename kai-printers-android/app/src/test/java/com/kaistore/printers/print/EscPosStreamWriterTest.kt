package com.kaistore.printers.print

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayOutputStream

class EscPosStreamWriterTest {
    @Test
    fun writesInMultipleChunksWhenDataExceedsChunkSize() {
        val data = ByteArray(2500) { it.toByte() }
        val out = ByteArrayOutputStream()
        EscPosStreamWriter.writeChunked(out, data, chunkSize = 1024, drainDelayMs = 0)
        assertEquals(data.size, out.size())
        assertTrue(out.toByteArray().contentEquals(data))
    }

    @Test
    fun singleChunkWhenDataSmall() {
        val data = byteArrayOf(0x1B, 0x40, 0x0A)
        val out = ByteArrayOutputStream()
        EscPosStreamWriter.writeChunked(out, data, chunkSize = 1024, drainDelayMs = 0)
        assertEquals(3, out.size())
    }
}
