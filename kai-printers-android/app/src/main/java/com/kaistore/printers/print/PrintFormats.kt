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
    )

    fun isTicketJobType(type: String): Boolean = type in ticketJobTypes
}
