package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import com.kaistore.printers.data.TicketHeaderPrefs
import kotlinx.serialization.json.Json

object PosCashHubMovementTicketEscPos {
    fun fromTicketJson(
        ticketJson: String,
        widthChars: Int = 48,
        context: Context? = null,
        logoSettings: PrintLogoSettings? = null,
        headerPrefs: TicketHeaderPrefs = TicketHeaderPrefs(),
    ): ByteArray {
        val t = Json.parseToJsonElement(ticketJson).jsonObj()
            ?: throw IllegalStateException("invalid_ticket_json")
        val direction = t.jsonStr("direction").present().orEmpty()
        val isOut = direction.equals("OUT", ignoreCase = true)
        val w = EscPosWriter(widthChars)
        w.beginTicket()

        val company = t.jsonObj("company")
        EscPosLogo.appendForJob(w, context, logoSettings, company?.jsonStr("logoBase64"))
        w.appendStoreHeader(company, headerPrefs = headerPrefs)

        w.divider()
        w.bold(true)
        w.line(if (isOut) "EGRESO A CENTRO" else "INGRESO DESDE CENTRO")
        w.bold(false)
        w.line(
            if (isOut) "Traslado de efectivo a centro de acopio"
            else "Ingreso de efectivo desde centro de acopio",
        )

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
        t.jsonStr("cashHubName").present()?.let { w.line(w.padLeft("Centro efectivo:", it)) }
        t.jsonStr("reason").present()?.let { w.appendLabelValueWrapped("Motivo:", it) }

        w.divider()
        w.bold(true)
        w.line(w.padLeft("Monto:", w.money(t.jsonNum("amount") ?: 0.0)))
        w.bold(false)

        w.divider()
        w.alignCenter(true)
        w.line("Movimiento registrado")
        w.alignCenter(false)
        w.line()

        return w.toByteArray(
            openDrawer = CashDrawerPolicy.shouldOpenDrawer(
                "pos-cash-hub-movement-ticket",
                widthChars,
                drawerEnabledInMapping = true,
            ),
        )
    }
}
