package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import kotlinx.serialization.json.Json

object PosCashCountSheetTicketEscPos {
    private val DEFAULT_PAYMENT_ROWS = listOf(
        "Efectivo",
        "Tarjeta debito",
        "Tarjeta credito",
        "Transferencia",
        "Cheque",
        "Otros",
    )

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
        w.line("PLANILLA DE CONTEO")
        w.bold(false)
        w.line("Cierre de caja — anotar montos")

        w.appendOriginBlock(t.jsonStr("branchName"), t.jsonStr("pointOfSaleName"))
        t.jsonStr("operatorName").present()?.let { w.line(w.padLeft("Operador:", it)) }
        val sid = t.jsonStr("cashSessionId").present().orEmpty()
        if (sid.isNotEmpty()) {
            w.line(w.padLeft("Sesion:", w.sessionShortId(sid)))
        }
        t.jsonStr("sessionOpenedAt").present()?.let {
            w.line(w.padLeft("Apertura:", w.formatDateTime(it)))
        }
        t.jsonStr("printedAt").present()?.let {
            w.line(w.padLeft("Impresion:", w.formatDateTime(it)))
        }

        w.divider()
        w.lineWrapped("Escriba el monto contado en cada linea antes de ingresarlo en el POS.")

        w.divider()
        paymentRows(t).forEach { label ->
            w.appendWritableLine(label)
            w.line()
        }

        w.bold(true)
        w.appendWritableLine("TOTAL")
        w.bold(false)

        w.divider()
        w.alignCenter(true)
        w.line("Firma operador:")
        w.line("_______________________")
        w.alignCenter(false)
        w.line()

        return w.toByteArray(
            openDrawer = CashDrawerPolicy.shouldOpenDrawer(
                "pos-cash-count-sheet-ticket",
                widthChars,
                drawerEnabledInMapping = true,
            ),
        )
    }

    private fun paymentRows(t: kotlinx.serialization.json.JsonObject): List<String> {
        val fromPayload = t.jsonArr("paymentLines")
            ?.mapNotNull { it.jsonObj()?.jsonStr("label")?.trim()?.takeIf { s -> s.isNotEmpty() } }
            .orEmpty()
        return fromPayload.ifEmpty { DEFAULT_PAYMENT_ROWS }
    }
}
