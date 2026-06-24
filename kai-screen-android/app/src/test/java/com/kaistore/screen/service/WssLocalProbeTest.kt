package com.kaistore.screen.service

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WssLocalProbeTest {
    @Test
    fun probe_invalidPort_returnsFalse() {
        val result = WssLocalProbe.probe(0)
        assertFalse(result.ok)
    }

    @Test
    fun probe_unreachablePort_returnsFalse() {
        val result = WssLocalProbe.probe(1, timeoutMs = 500)
        assertFalse(result.ok)
    }
}
