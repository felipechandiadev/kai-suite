package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import com.kaistore.printers.data.TicketHeaderPrefs
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlin.math.abs

object PosDiningAccountTicketEscPos {
    fun fromTicketJson(
        ticketJson: String,
        widthChars: Int = 48,
        context: Context? = null,
        logoSettings: PrintLogoSettings? = null,
        headerPrefs: TicketHeaderPrefs = TicketHeaderPrefs(),
    ): ByteArray {
        val t = Json.parseToJsonElement(ticketJson).jsonObj()
            ?: throw IllegalStateException("invalid_ticket_json")
        val w = EscPosWriter(widthChars)
        w.beginTicket()

        val company = t.jsonObj("company")
        EscPosLogo.appendForJob(w, context, logoSettings, company?.jsonStr("logoBase64"))
        w.appendStoreHeader(company, headerPrefs = headerPrefs)

        w.divider()
        w.bold(true)
        w.line("CUENTA")
        w.bold(false)

        val account = t.jsonObj("account")
        account?.jsonStr("displayLabel").present()?.let {
            w.labelValueWrapped("Cuenta:", it)
        }
        account?.jsonStr("tableCode").present()?.let {
            w.line(w.padLeft("Mesa:", it))
        }
        account?.jsonStr("kind").present()?.let {
            w.line(w.padLeft("Tipo:", kindLabel(it)))
        }

        t.jsonStr("branchName").present()?.let { w.line(w.padLeft("Sucursal:", it)) }
        t.jsonStr("pointOfSaleName").present()?.let { w.line(w.padLeft("Punto venta:", it)) }
        t.jsonStr("issuedAt").present()?.let {
            w.line(w.padLeft("Emitido:", w.formatDateTime(it)))
        }

        w.divider()
        w.alignCenter(true)
        w.bold(true)
        w.line("DETALLE")
        w.bold(false)
        w.alignCenter(false)
        w.sectionGap()

        val lines = t.jsonArr("lines").orEmpty()
        lines.forEachIndexed { idx, row ->
            val obj = row.jsonObj() ?: return@forEachIndexed
            appendDetailLine(w, obj, widthChars)
            if (idx + 1 < lines.size) w.sectionGap()
        }

        val totals = t.jsonObj("totals")
        w.divider()
        w.bold(true)
        w.line(w.padLeft("TOTAL:", w.money(totals?.jsonNum("total") ?: 0.0)))
        w.bold(false)
        w.divider()

        t.jsonStr("footerNote").present()?.let { note ->
            w.alignCenter(true)
            w.wrapLines(note, widthChars).forEach { w.line(it) }
            w.alignCenter(false)
        }
        w.line()

        return w.toByteArray(openDrawer = false)
    }

    private fun appendDetailLine(w: EscPosWriter, obj: JsonObject, widthChars: Int) {
        val name = obj.jsonStr("name").present().orEmpty()
        val qty = obj.jsonNum("quantity") ?: 0.0
        val unitPrice = obj.jsonNum("unitPrice") ?: 0.0
        val lineTotal = obj.jsonNum("lineTotal") ?: (qty * unitPrice)
        val qtyUnit = "${formatQty(qty)}x ${w.money(unitPrice)}"
        w.appendProductLineBlock(name, qtyUnit, w.money(lineTotal))
        obj.jsonStr("notes").present()?.let { notes ->
            w.wrapLines("  * $notes", widthChars).forEach { w.line(it) }
        }
    }

    private fun kindLabel(kind: String): String =
        when (kind.trim().uppercase()) {
            "TABLE" -> "Mesa"
            "COUNTER" -> "Barra"
            "TAKEAWAY" -> "Para llevar"
            else -> "Cuenta"
        }

    private fun formatQty(qty: Double): String =
        if (abs(qty % 1) < 0.001) qty.toLong().toString()
        else String.format(java.util.Locale.US, "%.2f", qty)
}
