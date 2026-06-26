package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import kotlinx.serialization.json.Json

object PosCashSessionOpeningTicketEscPos {
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
        w.line("APERTURA DE CAJA")
        w.bold(false)
        w.line("Inicio de sesion")

        w.appendOriginBlock(t.jsonStr("branchName"), t.jsonStr("pointOfSaleName"))
        t.jsonStr("operatorName").present()?.let { w.line(w.padLeft("Operador:", it)) }
        val sid = t.jsonStr("cashSessionId").present().orEmpty()
        if (sid.isNotEmpty()) {
            w.line(w.padLeft("Sesion:", w.sessionShortId(sid)))
        }
        t.jsonStr("openedAt").present()?.let {
            w.line(w.padLeft("Apertura:", w.formatDateTime(it)))
        }
        t.jsonStr("cashHubName").present()?.let { w.line(w.padLeft("Centro efectivo:", it)) }

        w.divider()
        w.bold(true)
        w.line(w.padLeft("Monto apertura:", w.money(t.jsonNum("openingAmount") ?: 0.0)))
        w.bold(false)

        w.divider()
        w.alignCenter(true)
        w.line("Sesion de caja abierta")
        w.alignCenter(false)
        w.line()

        return w.toByteArray(openDrawer = false)
    }
}
