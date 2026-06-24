package com.kaistore.printers.print

import kotlinx.serialization.json.Json

object PosQuotationTicketEscPos {
    fun fromTicketJson(ticketJson: String, widthChars: Int = 48): ByteArray {
        val q = Json.parseToJsonElement(ticketJson).jsonObj()
            ?: throw IllegalStateException("invalid_ticket_json")
        val w = EscPosWriter(widthChars)
        w.beginTicket()

        val company = q.jsonObj("company")
        EscPosLogo.appendIfPresent(w, company?.jsonStr("logoBase64"))
        w.appendStoreHeader(company)

        w.divider()
        w.bold(true)
        w.line("COTIZACION")
        w.bold(false)

        val folio = q.jsonStr("documentNumber").present().orEmpty()
        w.line("Emitida: ${w.formatDateTime(q.jsonStr("issuedAt").orEmpty())}")
        w.line("Valida hasta: ${w.formatDateTime(q.jsonStr("validUntil").orEmpty())}")
        q.jsonStr("branchName").present()?.let { w.line(w.padLeft("Sucursal:", it)) }
        q.jsonStr("pointOfSaleName").present()?.let { w.line(w.padLeft("Punto venta:", it)) }

        val customerName = q.jsonStr("customerName").present()
        val customerDoc = q.jsonStr("customerDocument").present()
        if (customerName != null || customerDoc != null) {
            w.divider()
            w.line("Cliente")
            customerName?.let { w.labelValueWrapped("Nombre:", it) }
            customerDoc?.let { w.line(w.padLabelValue("Documento:", it)) }
        }

        w.divider()
        w.alignCenter(true)
        w.bold(true)
        w.line("DETALLE")
        w.bold(false)
        w.alignCenter(false)
        w.sectionGap()

        val lines = q.jsonArr("lines").orEmpty()
        lines.forEachIndexed { idx, row ->
            val obj = row.jsonObj() ?: return@forEachIndexed
            val name = quotationLineName(obj)
            val qty = obj.jsonNum("quantity") ?: 0.0
            val total = obj.jsonNum("total") ?: 0.0
            val unitPrice = obj.jsonNum("unitPrice") ?: if (qty > 0) total / qty else 0.0
            val qtyStr = formatQty(qty)
            val qtyUnit = "${qtyStr}x ${w.money(unitPrice)}"
            w.appendProductLineBlock(name, qtyUnit, w.money(total))
            if (idx + 1 < lines.size) w.sectionGap()
        }

        w.divider()
        w.line(w.padLeft("Subtotal:", w.money(q.jsonNum("subtotal") ?: 0.0)))
        w.line(w.padLeft("Impuestos:", w.money(q.jsonNum("taxAmount") ?: 0.0)))
        val discount = q.jsonNum("discountAmount") ?: 0.0
        if (discount > 0.01) {
            w.line(w.padLeft("Descuentos:", "-${w.money(discount)}"))
        }
        w.bold(true)
        w.line(w.padLeft("TOTAL:", w.money(q.jsonNum("total") ?: 0.0)))
        w.bold(false)
        w.divider()

        w.appendWrappedSection("Notas", q.jsonStr("notes"))
        w.appendWrappedSection("Condiciones", q.jsonStr("terms"))

        if (folio.isNotEmpty()) w.appendBarcodeCentered(folio)
        w.alignCenter(true)
        w.line("$folio - ${w.formatDateTime(q.jsonStr("issuedAt").orEmpty())}")
        w.alignCenter(false)
        w.line()

        return w.toByteArray(openDrawer = false)
    }

    private fun quotationLineName(obj: kotlinx.serialization.json.JsonObject): String {
        val base = obj.jsonStr("productName").present().orEmpty()
        val variant = obj.jsonStr("variantName").present().orEmpty()
        var name = when {
            variant.isEmpty() -> base
            base.isEmpty() -> variant
            else -> "$base · $variant"
        }
        val sku = obj.jsonStr("productSku").present()
        if (sku != null) {
            name = if (name.isNotEmpty()) "$name ($sku)" else sku
        }
        return name
    }

    private fun formatQty(qty: Double): String =
        if (kotlin.math.abs(qty % 1) < 0.001) qty.toLong().toString()
        else String.format(java.util.Locale.US, "%.2f", qty)
}
