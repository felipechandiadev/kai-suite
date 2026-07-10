package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import kotlinx.serialization.json.Json

object PosPaymentInTicketEscPos {
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
        w.line("COMPROBANTE DE COBRO")
        w.bold(false)

        val folio = t.jsonStr("documentNumber").present().orEmpty()
        if (folio.isNotEmpty()) w.line("Folio: $folio")
        w.line("Fecha: ${w.formatDateTime(t.jsonStr("issuedAt").orEmpty())}")

        val origin = listOfNotNull(
            t.jsonStr("branchName").present(),
            t.jsonStr("pointOfSaleName").present(),
        ).joinToString(" · ")
        if (origin.isNotEmpty()) {
            w.labelValueWrapped("Origen:", origin)
        }
        t.jsonStr("operatorName").present()?.let { w.line(w.padLeft("Cajero:", it)) }

        val customerName = t.jsonStr("customerName").present()
        val customerDoc = t.jsonStr("customerDocument").present()
        if (customerName != null || customerDoc != null) {
            w.divider()
            w.line("Cliente")
            customerName?.let { w.labelValueWrapped("Nombre:", it) }
            customerDoc?.let { w.line(w.padLeft("Documento:", it)) }
        }

        appendPaymentRows(w, t)
        appendAllocationRows(w, t)

        w.divider()
        w.bold(true)
        w.line(w.padLeft("Total cobrado:", w.money(t.jsonNum("totalCollected") ?: 0.0)))
        w.bold(false)
        w.line(w.padLeft("Registrado:", w.money(t.jsonNum("amountPaid") ?: 0.0)))
        t.jsonStr("externalReference").present()?.let { w.line(w.padLeft("Referencia:", it)) }
        w.appendWrappedSection("Notas", t.jsonStr("notes"))

        if (folio.isNotEmpty()) w.appendBarcodeCentered(folio)
        w.alignCenter(true)
        w.line("$folio - ${w.formatDateTime(t.jsonStr("issuedAt").orEmpty())}")
        w.alignCenter(false)
        w.line()

        return w.toByteArray(
            openDrawer = CashDrawerPolicy.shouldOpenDrawer(
                "pos-payment-in-ticket",
                widthChars,
                drawerEnabledInMapping = true,
            ),
        )
    }

    private fun appendPaymentRows(w: EscPosWriter, t: kotlinx.serialization.json.JsonObject) {
        val payments = t.jsonArr("payments").orEmpty()
        if (payments.isEmpty()) {
            w.divider()
            w.line("Sin montos")
            return
        }
        w.divider()
        w.bold(true)
        w.line("Medios de pago")
        w.bold(false)
        payments.forEach { p ->
            val po = p.jsonObj() ?: return@forEach
            val label = po.jsonStr("label").present().orEmpty()
            val amount = po.jsonNum("amount") ?: 0.0
            if (amount <= 0.01) return@forEach
            val ref = po.jsonStr("reference").present()?.let { " ($it)" }.orEmpty()
            w.line(w.padLeft("$label$ref", w.money(amount)))
        }
    }

    private fun appendAllocationRows(w: EscPosWriter, t: kotlinx.serialization.json.JsonObject) {
        val allocations = t.jsonArr("allocations").orEmpty()
        if (allocations.isEmpty()) return
        w.divider()
        w.bold(true)
        w.line("Aplicado a ventas")
        w.bold(false)
        allocations.forEach { a ->
            val ao = a.jsonObj() ?: return@forEach
            val amount = ao.jsonNum("amount") ?: 0.0
            if (amount <= 0.01) return@forEach
            val doc = ao.jsonStr("documentNumber").present().orEmpty()
            w.line(w.padLeft(doc, w.money(amount)))
        }
    }
}
