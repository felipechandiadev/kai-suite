package com.kaistore.printers.print

import kotlinx.serialization.json.Json
import java.text.NumberFormat
import java.util.Locale

object PosSaleTicketEscPos {
    private val moneyFormat = NumberFormat.getIntegerInstance(Locale("es", "CL"))
    private val nonLatin1 = Regex("[^\u0000-\u00FF]")

    private fun escPosText(s: String): ByteArray =
        s.replace(nonLatin1, "?").toByteArray(Charsets.ISO_8859_1)

    fun fromTicketJson(ticketJson: String, widthChars: Int = 48): ByteArray {
        val layout = EscPosLayout.forWidthChars(widthChars)
        val ticket = Json.parseToJsonElement(ticketJson).jsonObj()
            ?: throw IllegalStateException("invalid_ticket_json")
        val buf = ArrayList<Byte>()
        fun b(vararg bytes: Int) { bytes.forEach { buf.add(it.toByte()) } }
        fun text(s: String) {
            escPosText(s).forEach { buf.add(it) }
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

        val company = ticket.jsonObj("company")
        val fantasy = company?.jsonStr("nombreFantasia").present()
            ?: company?.jsonStr("razonSocial").present()
            ?: "KaiStore"
        line(fantasy.uppercase())
        company?.jsonStr("rut")?.present()?.let { line(it) }
        company?.jsonStr("businessActivity")?.present()?.let { line(it) }
        b(0x1B, 0x61, 0x00)

        divider()
        val folio = ticket.jsonStr("folio").present() ?: ""
        val issued = ticket.jsonStr("issuedAtIso").present() ?: ""
        line("Folio: $folio")
        line("Fecha: ${issued.take(19).replace('T', ' ')}")
        ticket.jsonObj("customer")?.jsonStr("name")?.present()?.let {
            line("Cliente: $it")
        }
        divider()

        ticket.jsonArr("lines")?.forEach { row ->
            val obj = row.jsonObj() ?: return@forEach
            val name = obj.jsonStr("productName").present() ?: ""
            val qty = obj.jsonNum("quantity") ?: 1.0
            val gross = obj.jsonNum("lineGross") ?: 0.0
            line(name.take(layout.productNameChars))
            val detail = "${qty.toInt()} x ${money(obj.jsonNum("unitPriceWithTax") ?: 0.0)}"
            val pad = layout.widthChars - detail.length - money(gross).length
            line(detail + " ".repeat(pad.coerceAtLeast(1)) + money(gross))
        }

        divider()
        val totals = ticket.jsonObj("totals")
        totals?.jsonNum("subtotalNet")?.let {
            line(labelValue("Neto:", money(it)))
        }
        totals?.jsonNum("taxes")?.let {
            line(labelValue("IVA:", money(it)))
        }
        totals?.jsonNum("total")?.let {
            b(0x1B, 0x45, 0x01)
            line(labelValue("TOTAL:", money(it)))
            b(0x1B, 0x45, 0x00)
        }
        totals?.jsonNum("change")?.takeIf { it > 0 }?.let {
            line(labelValue("Vuelto:", money(it)))
        }

        ticket.jsonArr("payments")?.takeIf { it.isNotEmpty() }?.let { payments ->
            divider()
            line("PAGOS")
            payments.forEach { p ->
                val po = p.jsonObj() ?: return@forEach
                val label = po.jsonStr("label").present() ?: ""
                val amount = po.jsonNum("amount") ?: 0.0
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
