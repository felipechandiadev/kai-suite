package com.kaistore.printers.print

import org.junit.Assert.assertTrue
import org.junit.Test

class PosSaleTicketEscPosTest {
    @Test
    fun buildsEscPosWithInitAndCut() {
        val json = """
            {
              "folio": "VTA-1",
              "issuedAtIso": "2026-06-02T12:00:00Z",
              "company": { "nombreFantasia": "Joyarte", "rut": "1-9" },
              "lines": [{
                "productName": "Test",
                "quantity": 1,
                "unitPriceWithTax": 1000,
                "lineGross": 1000
              }],
              "promotions": [],
              "totals": { "subtotalNet": 840, "taxes": 160, "total": 1000, "change": 0, "lineDiscounts": 0, "orderDiscount": 0 },
              "payments": []
            }
        """.trimIndent()
        val bytes = PosSaleTicketEscPos.fromTicketJson(json)
        assertTrue(bytes.isNotEmpty())
        assertTrue(bytes[0] == 0x1B.toByte())
        assertTrue(bytes[1] == 0x40.toByte())
        assertTrue(bytes.takeLast(3).let { it[0] == 0x1D.toByte() && it[1] == 0x56.toByte() })
        val text = String(bytes, Charsets.ISO_8859_1)
        assertTrue(text.contains("JOYARTE", ignoreCase = true))
        assertTrue(text.contains("VTA-1"))
    }

    @Test
    fun usesNarrowLayoutFor58mm() {
        val json = """
            {
              "folio": "VTA-1",
              "issuedAtIso": "2026-06-02T12:00:00Z",
              "company": { "nombreFantasia": "Joyarte" },
              "lines": [{
                "productName": "Nombre de producto muy largo para probar corte",
                "quantity": 1,
                "unitPriceWithTax": 1000,
                "lineGross": 1000
              }],
              "totals": { "total": 1000 }
            }
        """.trimIndent()
        val bytes = PosSaleTicketEscPos.fromTicketJson(json, widthChars = 32)
        val text = String(bytes, Charsets.ISO_8859_1)
        val lines = text.lines().filter { it.isNotBlank() }
        val productLine = lines.first { it.contains("Nombre de producto") }
        assertTrue(productLine.length <= 32)
    }
}
