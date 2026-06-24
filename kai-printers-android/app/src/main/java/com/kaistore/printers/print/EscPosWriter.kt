package com.kaistore.printers.print

import kotlinx.serialization.json.JsonObject
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * Buffer ESC/POS compartido para tickets POS (paridad con helpers Rust en pos_sale_ticket_escpos.rs).
 */
class EscPosWriter(widthChars: Int) {
    val layout: EscPosLayout = EscPosLayout.forWidthChars(widthChars)
    private val buf = ArrayList<Byte>()
    private val moneyFormat = NumberFormat.getIntegerInstance(Locale("es", "CL"))
    private val nonLatin1 = Regex("[^\u0000-\u00FF]")

    fun beginTicket() {
        b(0x1B, 0x40)
        b(0x1B, 0x52, 0x00)
        b(0x1B, 0x74, 0x02)
        b(0x1B, 0x4D, 0x00)
    }

    fun bytes(): MutableList<Byte> = buf

    fun appendRaw(bytes: ByteArray) {
        bytes.forEach { buf.add(it) }
    }

    fun toByteArray(openDrawer: Boolean = false): ByteArray {
        EscPosTail.append(buf, openDrawer)
        return buf.toByteArray()
    }

    fun money(n: Double): String = "$" + moneyFormat.format(kotlin.math.abs(n).toLong())

    fun moneySigned(n: Double): String =
        if (n < -0.01) "-${money(-n)}" else money(n)

    fun line(text: String = "") {
        escPosText(text.take(layout.widthChars)).forEach { buf.add(it) }
        b(0x0A)
    }

    fun divider() = line("-".repeat(layout.widthChars))

    fun labelValue(label: String, value: String): String {
        val pad = layout.widthChars - label.length - value.length
        return label + " ".repeat(pad.coerceAtLeast(1)) + value
    }

    fun padLeft(label: String, value: String): String = labelValue(label, value)

    fun padLabelValue(label: String, value: String): String {
        val combined = "$label $value".trim()
        if (combined.length <= layout.widthChars) return combined
        return labelValue(label.take(layout.widthChars / 2), value)
    }

    fun bold(on: Boolean) {
        b(0x1B, 0x45, if (on) 1 else 0)
    }

    fun alignCenter(on: Boolean) {
        b(0x1B, 0x61, if (on) 1 else 0)
    }

    fun doubleHeight(on: Boolean) {
        b(0x1D, 0x21, if (on) 0x10 else 0x00)
    }

    fun sectionGap() = line()

    fun wrapLines(text: String, maxWidth: Int): List<String> {
        val words = text.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        if (words.isEmpty()) return emptyList()
        val lines = ArrayList<String>()
        var current = StringBuilder()
        for (word in words) {
            val next = if (current.isEmpty()) word else "${current} $word"
            if (next.length <= maxWidth) {
                current = StringBuilder(next)
            } else {
                if (current.isNotEmpty()) lines.add(current.toString())
                current = StringBuilder(
                    if (word.length <= maxWidth) word else word.take(maxWidth),
                )
            }
        }
        if (current.isNotEmpty()) lines.add(current.toString())
        return lines
    }

    fun lineWrapped(text: String, maxWidth: Int = layout.widthChars) {
        wrapLines(text, maxWidth).forEach { line(it) }
    }

    fun labelValueWrapped(label: String, value: String) {
        val prefix = "$label "
        val avail = (layout.widthChars - prefix.length).coerceAtLeast(8)
        val parts = wrapLines(value.trim(), avail)
        if (parts.isEmpty()) {
            line(prefix.trim())
            return
        }
        line(prefix + parts.first())
        parts.drop(1).forEach { line(" ".repeat(prefix.length.coerceAtMost(layout.widthChars)) + it) }
    }

    fun formatDateTime(iso: String): String {
        val raw = iso.trim()
        if (raw.isEmpty()) return raw
        return try {
            val parsers = listOf(
                SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                },
                SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US),
                SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US),
            )
            val out = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale("es", "CL"))
            for (p in parsers) {
                try {
                    val d = p.parse(raw) ?: continue
                    return out.format(d)
                } catch (_: Exception) {
                }
            }
            raw.take(19).replace('T', ' ')
        } catch (_: Exception) {
            raw.take(19).replace('T', ' ')
        }
    }

    fun storeName(company: JsonObject?): String {
        return company?.jsonStr("nombreFantasia").present()
            ?: company?.jsonStr("razonSocial").present()
            ?: "KaiStore"
    }

    /** Encabezado tienda centrado (fantasía grande opcional). */
    fun appendStoreHeader(company: JsonObject?, largeTitle: Boolean = true) {
        val store = storeName(company)
        alignCenter(true)
        if (largeTitle) {
            bold(true)
            doubleHeight(true)
            wrapLines(store, layout.widthChars / 2).forEach { line(it) }
            doubleHeight(false)
            bold(false)
        } else {
            line(store.uppercase())
        }
        val fantasy = company?.jsonStr("nombreFantasia").present()
        val razon = company?.jsonStr("razonSocial").present()
        if (largeTitle && fantasy != null && razon != null && fantasy != razon) {
            lineWrapped(razon)
        }
        company?.jsonStr("rut")?.present()?.let { line(if (it.startsWith("RUT")) it else "RUT: $it") }
        company?.jsonStr("businessActivity")?.present()?.let { lineWrapped(it) }
        alignCenter(false)
    }

    fun appendOriginBlock(branchName: String?, pointOfSaleName: String?) {
        val origin = listOfNotNull(
            branchName?.trim()?.takeIf { it.isNotEmpty() },
            pointOfSaleName?.trim()?.takeIf { it.isNotEmpty() },
        ).joinToString(" · ")
        if (origin.isNotEmpty()) {
            divider()
            labelValueWrapped("Origen:", origin)
        }
    }

    fun sessionShortId(cashSessionId: String): String {
        val sid = cashSessionId.trim()
        if (sid.isEmpty()) return ""
        return if (sid.length > 8) sid.take(8).uppercase() else sid.uppercase()
    }

    fun appendBarcodeCentered(data: String) {
        val trimmed = data.trim()
        if (trimmed.isEmpty()) return
        sectionGap()
        alignCenter(true)
        EscPosBarcode.code128Commands(trimmed).forEach { buf.add(it) }
        alignCenter(false)
    }

    fun appendProductLineBlock(name: String, qtyUnit: String, total: String) {
        lineWrapped(name.take(layout.productNameChars * 2), layout.widthChars)
        val pad = layout.widthChars - qtyUnit.length - total.length
        line(qtyUnit + " ".repeat(pad.coerceAtLeast(1)) + total)
    }

    fun appendWritableLine(label: String) {
        val fill = "_".repeat((layout.widthChars - label.length - 2).coerceAtLeast(8))
        labelValueWrapped(label, fill)
    }

    fun appendWrappedSection(title: String, body: String?) {
        val trimmed = body?.trim().orEmpty()
        if (trimmed.isEmpty()) return
        divider()
        bold(true)
        line(title)
        bold(false)
        lineWrapped(trimmed)
    }

    private fun escPosText(s: String): ByteArray =
        s.replace(nonLatin1, "?").toByteArray(Charsets.ISO_8859_1)

    private fun b(vararg bytes: Int) {
        bytes.forEach { buf.add(it.toByte()) }
    }
}
