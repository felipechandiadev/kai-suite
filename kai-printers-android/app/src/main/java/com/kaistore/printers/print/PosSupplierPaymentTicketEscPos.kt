package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import kotlinx.serialization.json.Json

object PosSupplierPaymentTicketEscPos {
    fun fromTicketJson(
        ticketJson: String,
        widthChars: Int = 48,
        context: Context? = null,
        logoSettings: PrintLogoSettings? = null,
    ): ByteArray {
        val t = Json.parseToJsonElement(ticketJson).jsonObj()
            ?: throw IllegalStateException("invalid_ticket_json")
        val w = EscPosWriter(widthChars)
        w.beginTicket()

        val company = t.jsonObj("company")
        EscPosLogo.appendForJob(w, context, logoSettings, company?.jsonStr("logoBase64"))
        w.appendStoreHeader(company)

        w.divider()
        w.bold(true)
        w.line("PAGO A PROVEEDOR")
        w.bold(false)
        val method = t.jsonStr("paymentMethodLabel").present() ?: "Efectivo"
        w.line("Salida de efectivo · $method")

        w.appendOriginBlock(t.jsonStr("branchName"), t.jsonStr("pointOfSaleName"))
        t.jsonStr("operatorName").present()?.let { w.line(w.padLeft("Operador:", it)) }
        t.jsonStr("documentNumber").present()?.let { w.line(w.padLeft("Comprobante:", it)) }
        val sid = t.jsonStr("cashSessionId").present().orEmpty()
        if (sid.isNotEmpty()) {
            w.line(w.padLeft("Sesion:", w.sessionShortId(sid)))
        }
        t.jsonStr("issuedAt").present()?.let {
            w.line(w.padLeft("Fecha:", w.formatDateTime(it)))
        }
        t.jsonStr("supplierName").present()?.let { w.appendLabelValueWrapped("Proveedor:", it) }
        t.jsonStr("supplierDocument").present()?.let { w.line(w.padLeft("RUT / Doc.:", it)) }
        t.jsonStr("receptionDocumentNumber").present()?.let { w.line(w.padLeft("Recepcion:", it)) }
        t.jsonStr("supplierDocumentRef").present()?.let {
            w.appendLabelValueWrapped("Doc. proveedor:", it)
        }
        t.jsonStr("reason").present()?.let { w.appendLabelValueWrapped("Detalle:", it) }

        w.divider()
        w.bold(true)
        w.line(w.padLeft("Salida:", w.money(t.jsonNum("amount") ?: 0.0)))
        w.bold(false)

        w.divider()
        w.alignCenter(true)
        w.line("Movimiento de caja registrado")
        w.alignCenter(false)
        w.line()

        return w.toByteArray(
            openDrawer = CashDrawerPolicy.shouldOpenDrawer(
                "pos-supplier-payment-ticket",
                widthChars,
                drawerEnabledInMapping = true,
            ),
        )
    }
}
