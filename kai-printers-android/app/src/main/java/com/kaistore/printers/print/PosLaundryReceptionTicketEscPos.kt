package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import kotlinx.serialization.json.Json
import kotlin.math.abs

/**
 * Guía recepción lavandería ESC/POS (paridad desktop `pos_laundry_reception_ticket_escpos`).
 */
object PosLaundryReceptionTicketEscPos {
    private const val BOTTOM_FEED_LINES = 4

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
        w.alignCenter(true)
        w.bold(true)
        w.doubleHeight(true)
        w.line("GUIA DE RECEPCION")
        w.doubleHeight(false)
        w.bold(false)
        w.line("Documento informativo — no valido como boleta")
        w.alignCenter(false)

        t.jsonStr("branchName").present()?.let { w.line(w.padLeft("Sucursal:", it)) }
        t.jsonStr("pointOfSaleName").present()?.let { w.line(w.padLeft("Punto venta:", it)) }
        w.line(w.padLeft("Cliente:", t.jsonStr("customerName").present().orEmpty().ifBlank { "Cliente" }))
        t.jsonStr("customerPhone").present()?.let { w.line(w.padLeft("Tel:", it)) }
        t.jsonStr("issuedAt").present()?.let {
            w.line(w.padLeft("Recibido:", w.formatDateTime(it)))
        }
        t.jsonStr("promisedAt").present()?.let {
            w.line(w.padLeft("Promesa:", w.formatDateTime(it)))
        }
        t.jsonStr("paymentModeLabel").present()?.let {
            w.line(w.padLeft("Cobro:", it))
        }

        w.divider()
        w.alignCenter(true)
        w.bold(true)
        w.line("PRENDAS")
        w.bold(false)
        w.alignCenter(false)

        val garments = t.jsonArr("garments").orEmpty()
        garments.forEachIndexed { gIdx, row ->
            val g = row.jsonObj() ?: return@forEachIndexed
            val label = g.jsonStr("label").present().orEmpty().ifBlank { "Prenda" }
            val qty = g.jsonNum("quantity") ?: 0.0
            w.bold(true)
            w.wrapLines("$label  x${formatQty(qty)}", widthChars).forEach { w.line(it) }
            w.bold(false)
            g.jsonStr("careInstructions").present()?.let { care ->
                w.wrapLines("  Instr: $care", widthChars).forEach { w.line(it) }
            }
            g.jsonArr("services").orEmpty().forEach { svcEl ->
                val svc = svcEl.jsonObj() ?: return@forEach
                val name = "  ${svc.jsonStr("name").present().orEmpty().ifBlank { "Servicio" }}"
                val sQty = svc.jsonNum("quantity") ?: 0.0
                val unit = svc.jsonNum("unitPrice") ?: 0.0
                val lineTotal = svc.jsonNum("lineTotal") ?: (sQty * unit)
                w.appendProductLineBlock(name, "${formatQty(sQty)}x ${w.money(unit)}", w.money(lineTotal))
            }
            if (gIdx + 1 < garments.size) w.sectionGap()
        }

        val totals = t.jsonObj("totals")
        w.divider()
        w.bold(true)
        w.line(w.padLeft("TOTAL SERVICIOS:", w.money(totals?.jsonNum("servicesTotal") ?: 0.0)))
        w.bold(false)
        totals?.jsonNum("depositPaid")?.takeIf { it > 0 }?.let {
            w.line(w.padLeft("Abono:", w.money(it)))
        }
        totals?.jsonNum("balanceDue")?.takeIf { it > 0 }?.let {
            w.bold(true)
            w.line(w.padLeft("SALDO:", w.money(it)))
            w.bold(false)
        }
        w.divider()

        val code = t.jsonStr("code").present().orEmpty()
        w.alignCenter(true)
        w.bold(true)
        w.wrapLines(code, widthChars / 2).forEach { w.line(it) }
        w.bold(false)
        if (code.isNotEmpty()) w.appendBarcodeCentered(code)
        w.alignCenter(false)

        t.jsonStr("footerNote").present()?.let { note ->
            w.alignCenter(true)
            w.wrapLines(note, widthChars).forEach { w.line(it) }
            w.alignCenter(false)
        }
        t.jsonStr("operatorName").present()?.let {
            w.line(w.padLeft("Operador:", it))
        }
        repeat(BOTTOM_FEED_LINES) { w.line() }

        return w.toByteArray(openDrawer = false)
    }

    private fun formatQty(qty: Double): String =
        if (abs(qty % 1) < 0.001) qty.toLong().toString()
        else String.format(java.util.Locale.US, "%.2f", qty)
}
