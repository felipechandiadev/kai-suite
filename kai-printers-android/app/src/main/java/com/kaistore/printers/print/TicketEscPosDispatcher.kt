package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings

/**
 * Enruta JSON de ticket al renderer ESC/POS según `documentType` (paridad ws.rs → vector_ticket_escpos_writer).
 */
object TicketEscPosDispatcher {
    fun fromJob(
        documentType: String,
        ticketJson: String,
        widthChars: Int,
        context: Context? = null,
        logoSettings: PrintLogoSettings? = null,
    ): ByteArray =
        when (documentType) {
            "pos-sale-ticket" -> PosSaleTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "pos-quotation-ticket" -> PosQuotationTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "pos-payment-in-ticket" -> PosPaymentInTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "pos-customer-credit-note-ticket" ->
                PosCustomerCreditNoteTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "pos-cash-closing-ticket" -> PosCashClosingTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "pos-cash-count-sheet-ticket" ->
                PosCashCountSheetTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "pos-cash-session-opening-ticket" ->
                PosCashSessionOpeningTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "pos-cash-hub-movement-ticket" ->
                PosCashHubMovementTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "pos-supplier-payment-ticket" ->
                PosSupplierPaymentTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "pos-bank-account-ticket" ->
                PosBankAccountTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "pos-dining-account-ticket" ->
                PosDiningAccountTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "pos-presale-ticket" ->
                PosPresaleTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "pos-laundry-reception-ticket" ->
                PosLaundryReceptionTicketEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "fiscal-boleta-preview" ->
                FiscalBoletaPreviewEscPos.fromTicketJson(ticketJson, widthChars, context, logoSettings)
            "variant-barcode-label" ->
                VariantBarcodeLabelEscPos.fromTicketJson(ticketJson, widthChars)
            else -> throw IllegalStateException("unsupported_document_type")
        }
}
