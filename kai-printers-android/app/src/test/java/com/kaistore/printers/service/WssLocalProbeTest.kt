package com.kaistore.printers.service

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WssLocalProbeTest {
    @Test
    fun rejectsInvalidPort() {
        val result = WssLocalProbe.probe(port = 0)
        assertFalse(result.ok)
    }

    @Test
    fun connectionRefusedWhenNothingListening() {
        val result = WssLocalProbe.probe("127.0.0.1", 1, timeoutMs = 500)
        assertFalse(result.ok)
        assertTrue(result.message.isNotBlank())
    }
}
