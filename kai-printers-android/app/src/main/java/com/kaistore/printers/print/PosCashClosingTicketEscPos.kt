package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import com.kaistore.printers.data.TicketHeaderPrefs
import kotlinx.serialization.json.Json

object PosCashClosingTicketEscPos {
    private val COUNTED_ROWS = listOf(
        "Efectivo" to "cash",
        "Tarjeta debito" to "debitCard",
        "Tarjeta credito" to "creditCard",
        "Transferencia" to "transfer",
        "Cheque" to "check",
        "Otros" to "other",
    )

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
        w.line("ARQUEO DE CAJA")
        w.bold(false)
        w.line("Cierre de sesion")

        w.appendOriginBlock(t.jsonStr("branchName"), t.jsonStr("pointOfSaleName"))
        t.jsonStr("operatorName").present()?.let { w.line(w.padLeft("Operador:", it)) }
        t.jsonStr("sessionOpenedAt").present()?.let {
            w.line(w.padLeft("Apertura:", w.formatDateTime(it)))
        }
        w.line(w.padLeft("Cierre:", w.formatDateTime(t.jsonStr("closedAt").orEmpty())))

        w.divider()
        w.bold(true)
        w.line("Conteo declarado")
        w.bold(false)

        val counted = t.jsonObj("counted")
        var anyCounted = false
        for ((label, key) in COUNTED_ROWS) {
            val amt = counted?.jsonNum(key) ?: 0.0
            if (amt <= 0.01) continue
            anyCounted = true
            w.line(w.padLeft(label, w.money(amt)))
        }
        if (!anyCounted) w.line("Sin montos")
        w.bold(true)
        w.line(w.padLeft("TOTAL:", w.money(t.jsonNum("countedGrand") ?: 0.0)))
        w.bold(false)

        if (t.jsonBool("usedBlindCount")) {
            w.divider()
            w.bold(true)
            w.line("Cuadre")
            w.bold(false)
            w.line(w.padLeft("Total declarado:", w.money(t.jsonNum("countedGrand") ?: 0.0)))
            w.line(
                w.padLeft(
                    "Efectivo teorico:",
                    w.money(t.jsonNum("systemCashExpected") ?: 0.0),
                ),
            )
            w.line(w.padLeft("Efectivo contado:", w.money(counted?.jsonNum("cash") ?: 0.0)))
            t.jsonNum("difference")?.let { w.line(w.padLeft("Diferencia:", w.money(it))) }
            t.jsonNum("salesTotal")?.let { w.line(w.padLeft("Ventas sesion:", w.money(it))) }
        }

        w.appendWrappedSection("Notas", t.jsonStr("notes"))

        w.divider()
        val sid = t.jsonStr("cashSessionId").present().orEmpty()
        if (sid.isNotEmpty()) {
            w.line(w.padLeft("Sesion:", w.sessionShortId(sid)))
        }
        val msg = t.jsonStr("message").present() ?: "Sesion cerrada"
        w.alignCenter(true)
        w.lineWrapped(msg)
        w.alignCenter(false)
        w.line()

        return w.toByteArray(openDrawer = false)
    }
}
