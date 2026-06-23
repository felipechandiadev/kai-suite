package com.kaistore.printers.protocol

import org.junit.Assert.assertTrue
import org.junit.Test

class ProtocolConstantsTest {
    @Test
    fun protocolVersionMatchesPwaClient() {
        assertTrue(PROTOCOL_VERSION == "2.1")
        assertTrue(AGENT_CAPABILITIES_MVP.contains("pos-sale-ticket"))
    }
}
