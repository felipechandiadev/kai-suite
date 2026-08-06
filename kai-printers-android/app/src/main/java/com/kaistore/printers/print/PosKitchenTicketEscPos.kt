package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import com.kaistore.printers.data.TicketHeaderPrefs
import kotlinx.serialization.json.Json
import java.util.Locale
import kotlin.math.abs

object PosKitchenTicketEscPos {
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
        val isReplica = t.jsonBool("isReplica")
        w.line(if (isReplica) "COMANDA (COPIA)" else "COMANDA")
        w.bold(false)

        val fire = t.jsonNum("fireNumber")?.toLong()
        if (fire != null) {
            w.line(w.padLeft("Pedido #:", fire.toString()))
        }
        t.jsonStr("productionUnitName").present()?.let {
            w.labelValueWrapped("Estación:", it)
        }
        t.jsonStr("accountLabel").present()?.let {
            w.labelValueWrapped("Cuenta:", it)
        }
        t.jsonStr("tableCode").present()?.let {
            w.line(w.padLeft("Mesa:", it))
        }
        t.jsonStr("branchName").present()?.let { w.line(w.padLeft("Sucursal:", it)) }
        t.jsonStr("issuedAt").present()?.let {
            w.line(w.padLeft("Emitido:", w.formatDateTime(it)))
        }

        w.divider()
        w.alignCenter(true)
        w.bold(true)
        w.line("PREPARAR")
        w.bold(false)
        w.alignCenter(false)
        w.sectionGap()

        val lines = t.jsonArr("lines").orEmpty()
        lines.forEachIndexed { idx, row ->
            val obj = row.jsonObj() ?: return@forEachIndexed
            val name = obj.jsonStr("name").orEmpty().trim()
            val qty = formatQty(obj.jsonNum("quantity") ?: 0.0)
            w.bold(true)
            w.line("${qty}x $name")
            w.bold(false)
            obj.jsonStr("notes").present()?.let { notes ->
                w.wrapLines("  * $notes", widthChars).forEach { w.line(it) }
            }
            if (idx + 1 < lines.size) w.sectionGap()
        }

        w.divider()
        t.jsonStr("footerNote").present()?.let { note ->
            w.alignCenter(true)
            w.wrapLines(note, widthChars).forEach { w.line(it) }
            w.alignCenter(false)
        }
        w.line()

        return w.toByteArray(openDrawer = false)
    }

    private fun formatQty(qty: Double): String =
        if (abs(qty % 1.0) < 0.001) {
            qty.toLong().toString()
        } else {
            String.format(Locale.US, "%.2f", qty)
        }
}
