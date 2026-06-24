package com.kaistore.printers.print

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.text.NumberFormat
import java.util.Locale

object PosSaleTicketEscPos {
    private val moneyFormat = NumberFormat.getIntegerInstance(Locale("es", "CL"))

    fun fromTicketJson(ticketJson: String, widthChars: Int = 48): ByteArray {
        val layout = EscPosLayout.forWidthChars(widthChars)
        val ticket = Json.parseToJsonElement(ticketJson).jsonObject
        val buf = ArrayList<Byte>()
        fun b(vararg bytes: Int) { bytes.forEach { buf.add(it.toByte()) } }
        fun text(s: String) {
            s.toByteArray(Charsets.ISO_8859_1).forEach { buf.add(it) }
        }
        fun line(s: String = "") {
            text(s.take(layout.widthChars))
            b(0x0A)
        }
        fun divider() = line("-".repeat(layout.widthChars))
        fun money(n: Double): String = "$" + moneyFormat.format(n.toLong())
        fun labelValue(label: String, value: String): String {
            val pad = layout.widthChars - label.length - value.length
            return label + " ".repeat(pad.coerceAtLeast(1)) + value
        }

        b(0x1B, 0x40) // init
        b(0x1B, 0x52, 0x00)
        b(0x1B, 0x74, 0x02) // PC850
        b(0x1B, 0x61, 0x01) // center

        val company = ticket["company"]?.jsonObject
        val fantasy = company?.get("nombreFantasia")?.jsonPrimitive?.content
            ?: company?.get("razonSocial")?.jsonPrimitive?.content
            ?: "KaiStore"
        line(fantasy.uppercase())
        company?.get("rut")?.jsonPrimitive?.content?.let { line(it) }
        company?.get("businessActivity")?.jsonPrimitive?.content?.let { line(it) }
        b(0x1B, 0x61, 0x00)

        divider()
        val folio = ticket["folio"]?.jsonPrimitive?.content ?: ""
        val issued = ticket["issuedAtIso"]?.jsonPrimitive?.content ?: ""
        line("Folio: $folio")
        line("Fecha: ${issued.take(19).replace('T', ' ')}")
        ticket["customer"]?.jsonObject?.get("name")?.jsonPrimitive?.content?.let {
            line("Cliente: $it")
        }
        divider()

        ticket["lines"]?.jsonArray?.forEach { row ->
            val obj = row.jsonObject
            val name = obj["productName"]?.jsonPrimitive?.content ?: ""
            val qty = obj["quantity"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 1.0
            val gross = obj["lineGross"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0
            line(name.take(layout.productNameChars))
            val detail = "${qty.toInt()} x ${money(obj["unitPriceWithTax"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0)}"
            val pad = layout.widthChars - detail.length - money(gross).length
            line(detail + " ".repeat(pad.coerceAtLeast(1)) + money(gross))
        }

        divider()
        val totals = ticket["totals"]?.jsonObject
        totals?.get("subtotalNet")?.jsonPrimitive?.content?.toDoubleOrNull()?.let {
            line(labelValue("Neto:", money(it)))
        }
        totals?.get("taxes")?.jsonPrimitive?.content?.toDoubleOrNull()?.let {
            line(labelValue("IVA:", money(it)))
        }
        totals?.get("total")?.jsonPrimitive?.content?.toDoubleOrNull()?.let {
            b(0x1B, 0x45, 0x01)
            line(labelValue("TOTAL:", money(it)))
            b(0x1B, 0x45, 0x00)
        }
        totals?.get("change")?.jsonPrimitive?.content?.toDoubleOrNull()?.takeIf { it > 0 }?.let {
            line(labelValue("Vuelto:", money(it)))
        }

        ticket["payments"]?.jsonArray?.takeIf { it.isNotEmpty() }?.let { payments ->
            divider()
            line("PAGOS")
            payments.forEach { p ->
                val po = p.jsonObject
                val label = po["label"]?.jsonPrimitive?.content ?: ""
                val amount = po["amount"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0
                line(labelValue(label, money(amount)))
            }
        }

        line()
        line("Gracias por su compra")
        if (folio.isNotBlank()) {
            line()
            EscPosBarcode.code128Commands(folio).forEach { buf.add(it) }
        }
        line()
        EscPosTail.append(buf)
        return buf.toByteArray()
    }
}
