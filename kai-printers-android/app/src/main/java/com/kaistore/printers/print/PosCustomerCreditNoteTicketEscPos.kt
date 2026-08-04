package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import com.kaistore.printers.data.TicketHeaderPrefs
import kotlinx.serialization.json.Json
import java.util.Locale

object PosCustomerCreditNoteTicketEscPos {
    fun fromTicketJson(
        ticketJson: String,
        widthChars: Int = 48,
        context: Context? = null,
        logoSettings: PrintLogoSettings? = null,
        headerPrefs: TicketHeaderPrefs = TicketHeaderPrefs(),
    ): ByteArray {
        val nc = Json.parseToJsonElement(ticketJson).jsonObj()
            ?: throw IllegalStateException("invalid_ticket_json")
        val w = EscPosWriter(widthChars)
        w.beginTicket()

        val company = nc.jsonObj("company")
        EscPosLogo.appendForJob(w, context, logoSettings, company?.jsonStr("logoBase64"))
        w.appendStoreHeader(company, headerPrefs = headerPrefs)

        w.divider()
        w.bold(true)
        w.line("NOTA DE CREDITO")
        w.bold(false)

        val folio = nc.jsonStr("creditNoteFolio").present().orEmpty()
        w.line("Fecha: ${w.formatDateTime(nc.jsonStr("issuedAtIso").orEmpty())}")
        w.line(w.padLabelValue("Folio NC:", folio))
        nc.jsonStr("branchName").present()?.let { w.line(w.padLeft("Sucursal:", it)) }
        nc.jsonStr("pointOfSaleName").present()?.let { w.line(w.padLeft("Punto venta:", it)) }

        w.divider()
        w.line("Referencias")
        w.line(w.padLabelValue("Venta origen:", nc.jsonStr("originalSaleFolio").present().orEmpty()))
        w.line(w.padLabelValue("Devolucion:", nc.jsonStr("saleReturnFolio").present().orEmpty()))

        val customerName = nc.jsonStr("customerName").present()
        val customerDoc = nc.jsonStr("customerDocument").present()
        if (customerName != null || customerDoc != null) {
            w.divider()
            w.line("Cliente")
            customerName?.let { w.labelValueWrapped("Nombre:", it) }
            customerDoc?.let { w.line(w.padLabelValue("Documento:", it)) }
        }

        w.divider()
        w.alignCenter(true)
        w.bold(true)
        w.line("DETALLE DEVOLUCION")
        w.bold(false)
        w.alignCenter(false)
        w.sectionGap()

        val lines = nc.jsonArr("lines").orEmpty()
        lines.forEachIndexed { idx, row ->
            val obj = row.jsonObj() ?: return@forEachIndexed
            val name = creditNoteLineName(obj)
            val qty = obj.jsonNum("quantity") ?: 0.0
            val qtyStr = formatQty(qty)
            val unit = obj.jsonNum("unitPriceWithTax") ?: 0.0
            val total = obj.jsonNum("lineTotal") ?: 0.0
            w.appendProductLineBlock(name, "${qtyStr}x ${w.money(unit)}", w.money(total))
            if (idx + 1 < lines.size) w.sectionGap()
        }

        w.divider()
        val totals = nc.jsonObj("totals")
        w.line(w.padLeft("Subtotal neto:", w.money(totals?.jsonNum("subtotalNet") ?: 0.0)))
        w.line(w.padLeft("Impuestos:", w.money(totals?.jsonNum("taxes") ?: 0.0)))
        w.line(w.padLeft("Descuentos:", w.money(totals?.jsonNum("discounts") ?: 0.0)))
        w.bold(true)
        w.line(w.padLeft("Monto NC:", w.money(totals?.jsonNum("total") ?: 0.0)))
        w.bold(false)
        w.divider()

        val immediate = nc.jsonStr("refundMode")?.equals("immediate", ignoreCase = true) == true
        val refundPayments = nc.jsonArr("refundPayments").orEmpty()
        if (immediate && refundPayments.isNotEmpty()) {
            w.divider()
            w.bold(true)
            w.line("Reembolso en caja")
            w.bold(false)
            refundPayments.forEach { p ->
                val po = p.jsonObj() ?: return@forEach
                val label = po.jsonStr("label").present().orEmpty()
                val amount = po.jsonNum("amount") ?: 0.0
                w.line(w.padLeft(label, w.money(amount)))
            }
            w.lineWrapped("Dinero entregado al cliente desde esta sesion de caja.")
        }

        if (folio.isNotEmpty()) w.appendBarcodeCentered(folio)
        w.alignCenter(true)
        w.line("$folio - ${w.formatDateTime(nc.jsonStr("issuedAtIso").orEmpty())}")
        w.alignCenter(false)
        w.line()

        return w.toByteArray(openDrawer = false)
    }

    private fun creditNoteLineName(obj: kotlinx.serialization.json.JsonObject): String {
        val base = obj.jsonStr("productName").present().orEmpty()
        val attrs = obj.jsonArr("attributes")
            ?.mapNotNull { it.jsonStr()?.trim()?.takeIf { s -> s.isNotEmpty() } }
            .orEmpty()
            .joinToString(" · ")
        return when {
            attrs.isEmpty() -> base
            base.isEmpty() -> attrs
            else -> "$base · $attrs"
        }
    }

    private fun formatQty(qty: Double): String =
        if (kotlin.math.abs(qty % 1) < 0.001) qty.toLong().toString()
        else String.format(Locale.US, "%.2f", qty)
}
