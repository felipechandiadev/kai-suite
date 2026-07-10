package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import kotlinx.serialization.json.Json

object FiscalBoletaPreviewEscPos {
    private const val BOTTOM_FEED_LINES = 4

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

        val simulated = t.jsonBool("isSimulated") == true

        if (simulated) {
            w.alignCenter(true)
            w.line("SIMULACION - NO VALIDO")
            w.alignCenter(false)
        }

        val emisor = t.jsonObj("emisor")
        val store = emisor?.jsonStr("legalName").present()?.takeIf { it.isNotBlank() } ?: "—"
        w.alignCenter(true)
        w.bold(true)
        w.doubleHeight(true)
        for (line in w.wrapLines(store, widthChars / 2)) {
            w.line(line)
        }
        w.doubleHeight(false)
        w.bold(false)

        val rut = emisor?.jsonStr("rut").present()?.takeIf { it.isNotBlank() } ?: "—"
        w.line("RUT: $rut")

        emisor?.jsonStr("businessActivity").present()?.let { act ->
            for (line in w.wrapLines(act, widthChars)) w.line(line)
        }

        val addrParts = listOfNotNull(
            emisor?.jsonStr("address").present(),
            emisor?.jsonStr("commune").present(),
            emisor?.jsonStr("city").present(),
        ).filter { it.isNotBlank() }
        if (addrParts.isNotEmpty()) {
            for (line in w.wrapLines(addrParts.joinToString(", "), widthChars)) w.line(line)
        }

        w.divider()
        w.alignCenter(true)
        w.bold(true)
        w.line("BOLETA ELECTRONICA")
        w.bold(false)
        w.line("Tipo DTE ${t.jsonNum("tipoDte")?.toInt() ?: 39}")
        w.alignCenter(false)

        w.line(w.padLeft("Folio:", t.jsonNum("folio")?.toLong()?.toString() ?: "—"))
        val issued = t.jsonStr("issuedAt").orEmpty()
        w.line(w.padLeft("Fecha:", if (issued.length >= 10) issued.substring(0, 10) else issued))

        val showReceptor = t.jsonBool("showReceptorOnTicket")
            ?: run {
                val rut = t.jsonObj("receptor")?.jsonStr("rut").orEmpty()
                    .replace(".", "")
                    .trim()
                    .uppercase()
                rut != "66666666-6"
            }
        if (showReceptor) {
            val receptor = t.jsonObj("receptor")
            w.line(w.padLeft("Receptor:", receptor?.jsonStr("rut").orEmpty()))
            receptor?.jsonStr("name").present()?.let { name ->
                for (line in w.wrapLines(name, widthChars)) w.line(line)
            }
        }

        w.divider()
        w.bold(true)
        w.line("DETALLE")
        w.bold(false)

        t.jsonArr("lines")?.forEach { el ->
            val line = el.jsonObj() ?: return@forEach
            val name = line.jsonStr("name").orEmpty()
            for (nl in w.wrapLines(name, widthChars)) w.line(nl)
            val unit = line.jsonStr("unitMeasure").present()?.takeIf { it.isNotBlank() } ?: "UN"
            val qty = line.jsonNum("quantity") ?: 0.0
            val price = line.jsonNum("unitPriceWithIva") ?: 0.0
            val total = line.jsonNum("lineTotal") ?: 0.0
            val qtyPrice = "${qty.toLong()} $unit x ${w.money(price)}"
            w.line(w.padLeft(qtyPrice, w.money(total)))
            if (line.jsonBool("exempt") == true) w.line("  (EXENTO)")
        }

        val totals = t.jsonObj("totals")
        w.divider()
        totals?.jsonNum("mntNeto")?.takeIf { it > 0 }?.let {
            w.line(w.padLeft("Neto:", w.money(it)))
        }
        totals?.jsonNum("mntExe")?.takeIf { it > 0 }?.let {
            w.line(w.padLeft("Exento:", w.money(it)))
        }
        totals?.jsonNum("iva")?.takeIf { it > 0 }?.let {
            w.line(w.padLeft("IVA:", w.money(it)))
        }
        w.bold(true)
        w.line(w.padLeft("TOTAL:", w.money(totals?.jsonNum("mntTotal") ?: 0.0)))
        w.bold(false)

        val resNum = emisor?.jsonStr("resolutionNumber").present()
        val resDate = emisor?.jsonStr("resolutionDate").present()
        if (!resNum.isNullOrBlank() && !resDate.isNullOrBlank()) {
            val dateShort = if (resDate.length >= 10) resDate.substring(0, 10) else resDate
            w.line("Res. SII N $resNum de $dateShort")
        }

        if (simulated) {
            w.line("Ref. Set BE: ${t.jsonStr("caso").orEmpty()}")
        }

        t.jsonStr("observation").present()?.let { obs ->
            w.divider()
            for (line in w.wrapLines(obs, widthChars)) w.line(line)
        }

        w.divider()
        w.alignCenter(true)
        w.line(if (simulated) "Timbre electronico (simulado)" else "Timbre electronico SII")
        w.alignCenter(false)
        val timbre = t.jsonStr("timbrePdf417Payload").present().orEmpty()
        if (timbre.isNotEmpty()) {
            EscPosPdf417.appendCentered(w, timbre, widthChars)
            if (!simulated) {
                w.alignCenter(true)
                w.line("Verifique en www.sii.cl")
                w.alignCenter(false)
            }
        } else {
            w.alignCenter(true)
            if (simulated) {
                w.line("TIMBRE SIMULADO")
                w.line("No valido tributariamente")
            } else {
                w.line("TIMBRE NO DISPONIBLE")
            }
            w.alignCenter(false)
        }
        repeat(BOTTOM_FEED_LINES) { w.line() }

        return w.toByteArray(
            openDrawer = CashDrawerPolicy.shouldOpenDrawer(
                "fiscal-boleta-preview",
                widthChars,
                drawerEnabledInMapping = true,
            ),
        )
    }
}
