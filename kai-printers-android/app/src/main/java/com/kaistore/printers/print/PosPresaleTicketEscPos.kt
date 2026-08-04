package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import com.kaistore.printers.data.TicketHeaderPrefs
import kotlinx.serialization.json.Json

object PosPresaleTicketEscPos {
    private const val BOTTOM_FEED_LINES = 4

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
        w.alignCenter(true)
        w.bold(true)
        w.doubleHeight(true)
        w.line("TICKET DE PREVENTA")
        w.doubleHeight(false)
        w.bold(false)
        w.alignCenter(false)

        w.line("Emitido: ${w.formatDateTime(t.jsonStr("issuedAt").orEmpty())}")
        t.jsonStr("branchName").present()?.let { w.line(w.padLeft("Sucursal:", it)) }
        t.jsonStr("pointOfSaleName").present()?.let { w.line(w.padLeft("Punto venta:", it)) }

        val code = t.jsonStr("code").present().orEmpty()
        w.divider()
        w.alignCenter(true)
        w.bold(true)
        for (line in w.wrapLines(code, widthChars / 2)) {
            w.line(line)
        }
        w.bold(false)
        w.line("Presenta este codigo en caja")
        w.alignCenter(false)

        val payload = t.jsonStr("qrPayload").present()?.takeIf { it.isNotBlank() } ?: code
        if (payload.isNotEmpty()) w.appendBarcodeCentered(payload)

        w.divider()
        w.bold(true)
        w.line(w.padLeft("TOTAL:", w.money(t.jsonNum("total") ?: 0.0)))
        w.bold(false)

        w.alignCenter(true)
        w.line("Gracias por su compra")
        w.alignCenter(false)
        repeat(BOTTOM_FEED_LINES) { w.line() }

        return w.toByteArray(openDrawer = false)
    }
}
