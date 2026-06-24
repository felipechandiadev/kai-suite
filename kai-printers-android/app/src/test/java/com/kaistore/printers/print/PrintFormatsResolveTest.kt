package com.kaistore.printers.print

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PrintFormatsResolveTest {
    @Test
    fun resolvesTicketFormatFromPaperProfileWhenPosRequestsOtherTicketWidth() {
        val resolved = PrintFormats.resolveFormatForMapping(
            PrintFormat.TICKET_80MM,
            PaperProfile.MM58,
            "tickets",
        )
        assertEquals(PrintFormat.TICKET_58MM, resolved)
    }

    @Test
    fun keepsFormatWhenAlreadyMatching() {
        val resolved = PrintFormats.resolveFormatForMapping(
            PrintFormat.TICKET_80MM,
            PaperProfile.MM80,
            "tickets",
        )
        assertEquals(PrintFormat.TICKET_80MM, resolved)
    }

    @Test
    fun demoTicketIncludesBarcodeSequence() {
        val bytes = EscPosTestBytes.testPage(PaperProfile.MM80)
        assertTrue(bytes.size > 200)
        val text = String(bytes, Charsets.ISO_8859_1)
        assertTrue(text.contains(PosSaleTicketDemo.FOLIO))
        assertTrue(bytes.any { it == 0x1D.toByte() })
    }
}
