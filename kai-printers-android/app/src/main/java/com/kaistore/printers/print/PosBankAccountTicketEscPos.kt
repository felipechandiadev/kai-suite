package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import com.kaistore.printers.data.TicketHeaderPrefs
import kotlinx.serialization.json.Json

object PosBankAccountTicketEscPos {
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
        w.line("DATOS TRANSFERENCIA")
        w.bold(false)

        t.jsonStr("paymentMethodLabel").present()?.let { w.line(it) }

        w.divider()
        w.labelValueWrapped("Banco:", t.jsonStr("bankName").present().orEmpty())
        w.labelValueWrapped("Tipo cuenta:", t.jsonStr("accountType").present().orEmpty())

        w.bold(true)
        w.labelValueWrapped("N° cuenta:", t.jsonStr("accountNumber").present().orEmpty())
        w.bold(false)

        t.jsonStr("accountHolderName").present()?.let {
            w.labelValueWrapped("Titular:", it)
        }
        t.jsonStr("accountHolderRut").present()?.let {
            w.labelValueWrapped("RUT titular:", it)
        }
        company?.jsonStr("rut").present()?.let {
            w.line(w.padLeft("RUT empresa:", it))
        }
        if (t.jsonBool("isPrimary") == true) {
            w.line("Cuenta principal")
        }

        t.jsonStr("notes").present()?.let {
            w.divider()
            w.labelValueWrapped("Notas:", it)
        }

        w.appendOriginBlock(t.jsonStr("branchName"), t.jsonStr("pointOfSaleName"))
        t.jsonStr("issuedAt").present()?.let {
            w.line(w.padLeft("Emitido:", w.formatDateTime(it)))
        }

        w.divider()
        w.alignCenter(true)
        w.line("Realice la transferencia")
        w.line("a esta cuenta")
        w.alignCenter(false)
        w.line()

        return w.toByteArray(openDrawer = false)
    }
}
