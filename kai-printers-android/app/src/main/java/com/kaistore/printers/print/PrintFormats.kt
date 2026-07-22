package com.kaistore.printers.print

enum class PaperProfile(val storageValue: String) {
    MM58("58mm"),
    MM80("80mm"),
    LETTER("letter"),
    A4("a4"),
    ;

    companion object {
        fun fromStorage(raw: String?): PaperProfile {
            val v = raw?.trim()?.lowercase() ?: return MM80
            return entries.firstOrNull { it.storageValue == v } ?: MM80
        }

        fun defaultForPurpose(purpose: String): PaperProfile =
            if (purpose == "documents") A4 else MM80
    }
}

enum class PrintFormat(val wireValue: String) {
    TICKET_58MM("ticket_58mm"),
    TICKET_80MM("ticket_80mm"),
    DOCUMENT_LETTER("document_letter"),
    DOCUMENT_A4("document_a4"),
    ;

    companion object {
        fun parse(raw: String?): PrintFormat? {
            val v = raw?.trim()?.lowercase() ?: return null
            if (v == "ticket") return TICKET_80MM
            if (v == "document") return DOCUMENT_A4
            return entries.firstOrNull { it.wireValue == v }
        }
    }
}

object PrintFormats {
    fun isTicketFormat(format: PrintFormat): Boolean =
        format == PrintFormat.TICKET_58MM || format == PrintFormat.TICKET_80MM

    fun isDocumentFormat(format: PrintFormat): Boolean =
        format == PrintFormat.DOCUMENT_LETTER || format == PrintFormat.DOCUMENT_A4

    fun printFormatToPurpose(format: PrintFormat): String =
        if (isTicketFormat(format)) "tickets" else "documents"

    fun formatToPaperProfile(format: PrintFormat): PaperProfile = when (format) {
        PrintFormat.TICKET_58MM -> PaperProfile.MM58
        PrintFormat.TICKET_80MM -> PaperProfile.MM80
        PrintFormat.DOCUMENT_LETTER -> PaperProfile.LETTER
        PrintFormat.DOCUMENT_A4 -> PaperProfile.A4
    }

    fun formatsMatchProfile(format: PrintFormat, profile: PaperProfile): Boolean =
        formatToPaperProfile(format) == profile

    fun paperProfileToDefaultFormat(profile: PaperProfile): PrintFormat = when (profile) {
        PaperProfile.MM58 -> PrintFormat.TICKET_58MM
        PaperProfile.MM80 -> PrintFormat.TICKET_80MM
        PaperProfile.LETTER -> PrintFormat.DOCUMENT_LETTER
        PaperProfile.A4 -> PrintFormat.DOCUMENT_A4
    }

    /**
     * Si el POS pide ticket_80mm pero la impresora está en 58mm (u otro ticket), usa el perfil físico.
     * Solo aplica dentro del mismo propósito (ticket o document).
     */
    fun resolveFormatForMapping(requested: PrintFormat, paperProfile: PaperProfile, purpose: String): PrintFormat {
        val purposeFromFormat = printFormatToPurpose(requested)
        if (purposeFromFormat != purpose) return requested
        if (formatsMatchProfile(requested, paperProfile)) return requested
        if (isTicketFormat(requested) && (paperProfile == PaperProfile.MM58 || paperProfile == PaperProfile.MM80)) {
            return paperProfileToDefaultFormat(paperProfile)
        }
        if (isDocumentFormat(requested) && (paperProfile == PaperProfile.LETTER || paperProfile == PaperProfile.A4)) {
            return paperProfileToDefaultFormat(paperProfile)
        }
        return requested
    }

    fun charsPerLine(format: PrintFormat): Int = when (format) {
        PrintFormat.TICKET_58MM -> 32
        PrintFormat.TICKET_80MM -> 48
        else -> 48
    }

    fun resolve(raw: String?, purpose: String): PrintFormat {
        PrintFormat.parse(raw)?.let { return it }
        return if (purpose == "documents") PrintFormat.DOCUMENT_A4 else PrintFormat.TICKET_80MM
    }

    val ticketJobTypes = setOf(
        "pos-sale-ticket",
        "pos-quotation-ticket",
        "pos-payment-in-ticket",
        "pos-customer-credit-note-ticket",
        "pos-cash-closing-ticket",
        "pos-cash-count-sheet-ticket",
        "pos-cash-session-opening-ticket",
        "pos-cash-hub-movement-ticket",
        "pos-supplier-payment-ticket",
        "pos-bank-account-ticket",
        "pos-dining-account-ticket",
        "pos-presale-ticket",
        "fiscal-boleta-preview",
        "variant-barcode-label",
    )

    fun isTicketJobType(type: String): Boolean = type in ticketJobTypes
}
