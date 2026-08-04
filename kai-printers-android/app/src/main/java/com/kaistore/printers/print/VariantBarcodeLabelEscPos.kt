package com.kaistore.printers.print

import kotlinx.serialization.json.Json

object VariantBarcodeLabelEscPos {
    private const val BOTTOM_FEED_LINES = 4

    fun fromTicketJson(ticketJson: String, widthChars: Int = 48): ByteArray {
        val t = Json.parseToJsonElement(ticketJson).jsonObj()
            ?: throw IllegalStateException("invalid_ticket_json")
        val w = EscPosWriter(widthChars)
        w.beginTicket()

        val productName = t.jsonStr("productName").present().orEmpty()
        if (productName.isNotBlank()) {
            w.alignCenter(true)
            w.bold(true)
            w.doubleHeight(true)
            for (line in w.wrapLines(productName, widthChars / 2)) {
                w.line(line)
            }
            w.doubleHeight(false)
            w.bold(false)
            w.alignCenter(false)
        }

        val layout = t.jsonStr("layout").orEmpty().trim().lowercase()
        val detailed = layout == "detailed"

        if (detailed) {
            t.jsonArr("attributes").orEmpty().forEach { el ->
                val obj = el.jsonObj() ?: return@forEach
                val value = obj.jsonStr("value").present().orEmpty()
                if (value.isBlank()) return@forEach
                val label = obj.jsonStr("label").present()
                val text = if (label != null) "$label: $value" else value
                for (line in w.wrapLines(text, widthChars)) {
                    w.line(line)
                }
            }
            val priceLabel = t.jsonStr("priceLabel").present()
            if (priceLabel != null) {
                w.bold(true)
                for (line in w.wrapLines(priceLabel, widthChars)) {
                    w.line(line)
                }
                w.bold(false)
            }
        }

        val sku = t.jsonStr("sku").present().orEmpty()
        if (sku.isNotBlank()) {
            w.line(w.padLeft("SKU:", sku))
        }

        val barcode = t.jsonStr("barcode").present().orEmpty().trim()
        if (barcode.isEmpty()) {
            throw IllegalStateException("barcode_required")
        }

        w.divider()
        w.appendBarcodeCentered(barcode)
        w.alignCenter(true)
        w.line(barcode)
        w.alignCenter(false)
        w.divider()

        repeat(BOTTOM_FEED_LINES) { w.line() }

        return w.toByteArray(openDrawer = false)
    }
}
