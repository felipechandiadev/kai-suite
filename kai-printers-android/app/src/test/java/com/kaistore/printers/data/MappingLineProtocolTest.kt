package com.kaistore.printers.data

import org.junit.Assert.assertEquals
import org.junit.Test

class MappingLineProtocolTest {
    @Test
    fun protocolFormatKey_mapsPurposeAndProfile() {
        assertEquals("ticket_58mm", MappingLineUtils.protocolFormatKey("tickets", "58mm"))
        assertEquals("ticket_80mm", MappingLineUtils.protocolFormatKey("tickets", "80mm"))
        assertEquals("document", MappingLineUtils.protocolFormatKey("documents", "a4"))
        assertEquals("document", MappingLineUtils.protocolFormatKey("documents", "letter"))
    }
}
