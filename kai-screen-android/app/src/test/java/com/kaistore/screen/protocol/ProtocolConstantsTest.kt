package com.kaistore.screen.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class ProtocolConstantsTest {
    @Test
    fun defaultPorts_doNotCollideWithPrinters() {
        assertEquals(14570, DEFAULT_LISTEN_PORT)
        assertEquals(14571, DEFAULT_WSS_LISTEN_PORT)
    }
}
