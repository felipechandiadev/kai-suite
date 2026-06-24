package com.kaistore.printers.print

/**
 * Enruta JSON de ticket al renderer ESC/POS según `documentType` (paridad ws.rs → vector_ticket_escpos_writer).
 */
object TicketEscPosDispatcher {
    fun fromJob(documentType: String, ticketJson: String, widthChars: Int): ByteArray =
        when (documentType) {
            "pos-sale-ticket" -> PosSaleTicketEscPos.fromTicketJson(ticketJson, widthChars)
            "pos-quotation-ticket" -> PosQuotationTicketEscPos.fromTicketJson(ticketJson, widthChars)
            "pos-payment-in-ticket" -> PosPaymentInTicketEscPos.fromTicketJson(ticketJson, widthChars)
            "pos-customer-credit-note-ticket" ->
                PosCustomerCreditNoteTicketEscPos.fromTicketJson(ticketJson, widthChars)
            "pos-cash-closing-ticket" -> PosCashClosingTicketEscPos.fromTicketJson(ticketJson, widthChars)
            "pos-cash-count-sheet-ticket" ->
                PosCashCountSheetTicketEscPos.fromTicketJson(ticketJson, widthChars)
            "pos-cash-session-opening-ticket" ->
                PosCashSessionOpeningTicketEscPos.fromTicketJson(ticketJson, widthChars)
            else -> throw IllegalStateException("unsupported_document_type")
        }
}
