package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import com.kaistore.printers.data.TicketHeaderPrefs
import kotlinx.serialization.json.Json
import java.util.Locale

object PosSaleTicketEscPos {
    fun fromTicketJson(
        ticketJson: String,
        widthChars: Int = 48,
        context: Context? = null,
        logoSettings: PrintLogoSettings? = null,
        headerPrefs: TicketHeaderPrefs = TicketHeaderPrefs(),
    ): ByteArray {
        val ticket = Json.parseToJsonElement(ticketJson).jsonObj()
            ?: throw IllegalStateException("invalid_ticket_json")
        val w = EscPosWriter(widthChars)
        w.beginTicket()

        val company = ticket.jsonObj("company")
        EscPosLogo.appendForJob(w, context, logoSettings, company?.jsonStr("logoBase64"))
        w.appendStoreHeader(company, largeTitle = false, headerPrefs = headerPrefs)

        val isBackorder = ticket.jsonStr("documentKind") == "backorder"
        val hasNcPayout = !ticket.jsonArr("ncPayout").isNullOrEmpty()
        val hasQuotaCollection = !ticket.jsonArr("quotaCollection").isNullOrEmpty()
        val hasArCollection = !ticket.jsonArr("arCollection").isNullOrEmpty()
        val collectionPending = ticket.jsonBool("collectionPending")
        ticket.jsonObj("backorder")?.let { bo ->
            if (isBackorder) {
                val deposit = bo.jsonNum("depositAmount") ?: 0.0
                val percent = bo.jsonNum("percent") ?: 0.0
                var abono = "Abono: ${w.money(deposit)}"
                if (percent > 0.01) abono += " · ${percent.toInt()}%"
                w.line(abono)
            }
        }

        ticket.jsonObj("customer")?.let { c ->
            val name = c.jsonStr("name").present()
            val doc = c.jsonStr("document").present()
            if (name != null || doc != null) {
                w.divider()
                w.line("Cliente")
                name?.let { w.line(w.padLeft("Nombre:", it)) }
                doc?.let { w.line(w.padLeft("Documento:", it)) }
            }
        }

        w.divider()
        w.bold(true)
        w.alignCenter(true)
        w.line(
            when {
                hasNcPayout -> "DEVOLUCION SALDO NC"
                hasQuotaCollection -> "PAGO DE CUOTAS"
                hasArCollection -> "COBRO PENDIENTE"
                isBackorder -> "Detalle de Encargo"
                else -> "Detalle de Venta"
            },
        )
        w.bold(false)
        w.alignCenter(false)
        w.sectionGap()

        ticket.jsonArr("lines")?.forEachIndexed { idx, row ->
            val obj = row.jsonObj() ?: return@forEachIndexed
            var name = obj.jsonStr("productName").present() ?: ""
            val attrs = obj.jsonArr("attributes")
                ?.mapNotNull { it.jsonStr()?.trim()?.takeIf { s -> s.isNotEmpty() } }
                .orEmpty()
            if (attrs.isNotEmpty()) {
                name += " · " + attrs.joinToString(" · ")
            }
            val qty = obj.jsonNum("quantity") ?: 1.0
            val qtyStr = if (kotlin.math.abs(qty % 1) < 0.001) {
                qty.toLong().toString()
            } else {
                String.format(Locale.US, "%.2f", qty)
            }
            val unitSuffix = obj.jsonStr("unitSymbol").present()?.let { "/$it" }.orEmpty()
            val qtyUnit = "${qtyStr}x ${w.money(obj.jsonNum("unitPriceWithTax") ?: 0.0)}$unitSuffix"
            val gross = obj.jsonNum("lineGross") ?: 0.0
            w.appendProductLineBlock(name, qtyUnit, w.money(gross))
            val disc = obj.jsonNum("discountAmount") ?: 0.0
            if (disc > 0.01) {
                val lbl = obj.jsonStr("discountLabel").present() ?: "Promo"
                w.line(w.padLeft("-$lbl", "-${w.money(disc)}"))
            }
            if (idx + 1 < (ticket.jsonArr("lines")?.size ?: 0)) w.sectionGap()
        }

        ticket.jsonArr("promotions")?.forEach { p ->
            val po = p.jsonObj() ?: return@forEach
            val code = po.jsonStr("code").present().orEmpty()
            val promoName = po.jsonStr("name").present().orEmpty()
            val amount = po.jsonNum("amount") ?: 0.0
            w.line(w.padLeft("$code $promoName".trim(), "-${w.money(amount)}"))
        }

        w.divider()
        val totals = ticket.jsonObj("totals")
        totals?.jsonNum("subtotalNet")?.let { w.line(w.labelValue("Neto:", w.money(it))) }
        totals?.jsonNum("taxes")?.let { w.line(w.labelValue("IVA:", w.money(it))) }
        totals?.jsonNum("total")?.let {
            w.bold(true)
            w.line(w.labelValue("TOTAL:", w.money(it)))
            w.bold(false)
        }
        val change = totals?.jsonNum("change") ?: 0.0

        val payments = ticket.jsonArr("payments").orEmpty()
        val showPayments = payments.isNotEmpty() || change > 0.01
        if (showPayments) {
            w.bold(true)
            w.line("PAGOS")
            w.bold(false)
        }
        payments.forEach { p ->
            val po = p.jsonObj() ?: return@forEach
            val label = po.jsonStr("label").present() ?: ""
            val detail = po.jsonStr("detail").present()?.let { " ($it)" }.orEmpty()
            val amount = po.jsonNum("amount") ?: 0.0
            w.line(w.labelValue("$label$detail", w.money(amount)))
        }
        if (change > 0.01) {
            w.line(w.labelValue("Vuelto:", w.money(change)))
        }

        val folio = ticket.jsonStr("folio").present() ?: ""
        val issued = ticket.jsonStr("issuedAtIso").present() ?: ""
        if (folio.isNotBlank()) {
            w.appendBarcodeCentered(folio)
        }
        val dt = w.formatDateTime(issued)
        val footer = when {
            folio.isEmpty() -> dt
            dt.isEmpty() -> folio
            else -> "$folio - $dt"
        }
        if (footer.isNotBlank()) {
            w.alignCenter(true)
            w.line(footer)
            w.alignCenter(false)
        }
        w.alignCenter(true)
        val thanks = when {
            hasNcPayout -> "Comprobante de devolucion de saldo NC"
            hasQuotaCollection -> "Comprobante de pago de cuotas"
            hasArCollection -> "Comprobante de cobro"
            isBackorder -> ""
            collectionPending -> "Venta registrada - cobro pendiente"
            else -> "Gracias por su compra"
        }
        if (thanks.isNotBlank()) {
            w.line(thanks)
        }
        w.alignCenter(false)
        w.line()

        return w.toByteArray(
            openDrawer = CashDrawerPolicy.shouldOpenDrawer(
                "pos-sale-ticket",
                widthChars,
                drawerEnabledInMapping = true,
            ),
        )
    }
}
