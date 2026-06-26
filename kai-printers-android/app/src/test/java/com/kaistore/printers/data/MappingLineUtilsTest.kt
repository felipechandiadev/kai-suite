package com.kaistore.printers.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MappingLineUtilsTest {
    @Test
    fun normalizePaperProfileDocuments() {
        assertEquals("a4", MappingLineUtils.normalizePaperProfile("documents", "a4"))
        assertEquals("letter", MappingLineUtils.normalizePaperProfile("documents", "letter"))
        assertEquals("a4", MappingLineUtils.normalizePaperProfile("documents", "invalid"))
    }

    @Test
    fun normalizePaperProfileTickets() {
        assertEquals("58mm", MappingLineUtils.normalizePaperProfile("tickets", "58mm"))
        assertEquals("80mm", MappingLineUtils.normalizePaperProfile("tickets", "80mm"))
    }

    @Test
    fun lineMatchesTransport() {
        assertTrue(MappingLineUtils.lineMatchesTransport("AA:BB:CC:DD:EE:FF", "bluetooth"))
        assertTrue(MappingLineUtils.lineMatchesTransport("net:10.0.0.1:9100", "network"))
        assertTrue(MappingLineUtils.lineMatchesTransport("system:print", "system"))
        assertFalse(MappingLineUtils.lineMatchesTransport("usb:1", "bluetooth"))
    }
}
