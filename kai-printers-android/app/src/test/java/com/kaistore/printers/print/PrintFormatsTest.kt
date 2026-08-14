package com.kaistore.printers.print

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PrintFormatsTest {
    @Test
    fun parsesExplicitFormats() {
        assertEquals(PrintFormat.TICKET_58MM, PrintFormat.parse("ticket_58mm"))
        assertEquals(PrintFormat.DOCUMENT_A4, PrintFormat.parse("document_a4"))
    }

    @Test
    fun migratesLegacyAliases() {
        assertEquals(PrintFormat.TICKET_80MM, PrintFormat.parse("ticket"))
        assertEquals(PrintFormat.DOCUMENT_A4, PrintFormat.parse("document"))
    }

    @Test
    fun charsPerLineMatchesPresets() {
        assertEquals(32, PrintFormats.charsPerLine(PrintFormat.TICKET_58MM))
        assertEquals(48, PrintFormats.charsPerLine(PrintFormat.TICKET_80MM))
    }

    @Test
    fun formatsMatchProfile() {
        assertTrue(PrintFormats.formatsMatchProfile(PrintFormat.TICKET_58MM, PaperProfile.MM58))
        assertFalse(PrintFormats.formatsMatchProfile(PrintFormat.TICKET_80MM, PaperProfile.MM58))
    }

    @Test
    fun resolvesDefaultsByPurpose() {
        assertEquals(PrintFormat.TICKET_80MM, PrintFormats.resolve(null, "tickets"))
        assertEquals(PrintFormat.DOCUMENT_A4, PrintFormats.resolve(null, "documents"))
    }

    @Test
    fun laundryReceptionIsTicketJobType() {
        assertTrue(PrintFormats.isTicketJobType("pos-laundry-reception-ticket"))
        assertTrue(PrintFormats.isTicketJobType("pos-dining-account-ticket"))
        assertTrue(PrintFormats.isTicketJobType("pos-kitchen-ticket"))
        assertFalse(PrintFormats.isTicketJobType("pdf-base64"))
    }

    @Test
    fun ticketFormatsCompatibleWithComandas() {
        assertTrue(PrintFormats.formatCompatibleWithPurpose(PrintFormat.TICKET_80MM, "comandas"))
        assertTrue(PrintFormats.formatCompatibleWithPurpose(PrintFormat.TICKET_58MM, "comandas"))
        assertFalse(PrintFormats.formatCompatibleWithPurpose(PrintFormat.DOCUMENT_A4, "comandas"))
        assertTrue(PrintFormats.formatCompatibleWithPurpose(PrintFormat.TICKET_80MM, "tickets"))
    }

    @Test
    fun resolveFormatForMappingComandas80To58() {
        assertEquals(
            PrintFormat.TICKET_58MM,
            PrintFormats.resolveFormatForMapping(
                PrintFormat.TICKET_80MM,
                PaperProfile.MM58,
                "comandas",
            ),
        )
    }
}
