package com.kaistore.printers.print

import com.kaistore.printers.data.TicketHeaderPrefs
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
        assertTrue(
            bytes.takeLast(3).let {
                it[0] == 0x1D.toByte() && it[1] == 0x56.toByte() && it[2] == 0x00.toByte()
            },
        )
        assertTrue(
            bytes.indices.any { i ->
                i + 1 < bytes.size &&
                    bytes[i] == 0x1B.toByte() &&
                    bytes[i + 1] == 0x70.toByte()
            },
        )
        val text = String(bytes, Charsets.ISO_8859_1)
        assertTrue(text.contains("JOYARTE", ignoreCase = true))
        assertTrue(text.contains("VTA-1"))
        assertTrue(bytes.any { it == 0x1D.toByte() })
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

    @Test
    fun buildsTicketWithExplicitNullFieldsFromPos() {
        val json = """
            {
              "version": 1,
              "folio": "VTA-REAL-001",
              "issuedAtIso": "2026-06-23T15:30:00.000Z",
              "documentKind": "sale",
              "backorder": null,
              "company": {
                "razonSocial": "Comercial Demo SpA",
                "nombreFantasia": null,
                "rut": null,
                "businessActivity": null,
                "logoBase64": null
              },
              "customer": null,
              "quotation": null,
              "lines": [{
                "productName": "Producto sin cliente",
                "attributes": [],
                "quantity": 1,
                "unitSymbol": null,
                "unitPriceWithTax": 5000,
                "lineGross": 5000,
                "discountAmount": 0,
                "discountLabel": null
              }],
              "promotions": [],
              "totals": {
                "subtotalNet": 4202,
                "taxes": 798,
                "lineDiscounts": 0,
                "orderDiscount": 0,
                "total": 5000,
                "change": 0
              },
              "payments": [{ "label": "Efectivo", "amount": 5000, "detail": null }]
            }
        """.trimIndent()
        val bytes = PosSaleTicketEscPos.fromTicketJson(json)
        assertTrue(bytes.isNotEmpty())
        val text = String(bytes, Charsets.ISO_8859_1)
        assertTrue(text.contains("VTA-REAL-001"))
        assertTrue(text.contains("COMERCIAL DEMO SPA"))
        assertTrue(!text.contains("Cliente:"))
    }

    @Test
    fun buildsRealisticSaleTicketWithPaymentsAndBarcode() {
        val json = """
            {
              "version": 1,
              "folio": "VTA-2026-0042",
              "issuedAtIso": "2026-06-23T15:30:00-04:00",
              "documentKind": "sale",
              "company": {
                "razonSocial": "Comercial Joyarte SpA",
                "nombreFantasia": "Joyarte Café",
                "rut": "76.543.210-K",
                "businessActivity": "Cafetería y repostería"
              },
              "customer": { "name": "María José Ñuñez", "document": "12.345.678-9" },
              "lines": [
                {
                  "productName": "Café latte grande con leche de almendra",
                  "attributes": ["Sin azúcar"],
                  "quantity": 2,
                  "unitSymbol": "un",
                  "unitPriceWithTax": 3500,
                  "lineGross": 7000,
                  "discountAmount": 500,
                  "discountLabel": "Happy hour"
                },
                {
                  "productName": "Brownie artesanal",
                  "quantity": 1,
                  "unitPriceWithTax": 2800,
                  "lineGross": 2800
                }
              ],
              "promotions": [{ "code": "PROMO10", "name": "10% fin de semana", "amount": 980 }],
              "totals": {
                "subtotalNet": 7471,
                "taxes": 1419,
                "lineDiscounts": 500,
                "orderDiscount": 0,
                "total": 8820,
                "change": 1180
              },
              "payments": [
                { "label": "Efectivo", "amount": 10000, "detail": null },
                { "label": "Tarjeta débito", "amount": 0, "detail": "**** 4242" }
              ]
            }
        """.trimIndent()
        val bytes = PosSaleTicketEscPos.fromTicketJson(json)
        assertTrue(bytes.isNotEmpty())
        val text = String(bytes, Charsets.ISO_8859_1)
        assertTrue(text.contains("VTA-2026-0042"))
        assertTrue(text.contains("PAGOS"))
        assertTrue(text.contains("Vuelto:"))
        assertTrue(bytes.any { it == 0x1D.toByte() })
    }

    @Test
    fun omitsCompanyRutWhenHeaderPrefOff() {
        val json = """
            {
              "folio": "VTA-1",
              "issuedAtIso": "2026-06-02T12:00:00Z",
              "company": {
                "nombreFantasia": "Joyarte",
                "razonSocial": "Joyarte SpA",
                "rut": "76.543.210-K"
              },
              "lines": [],
              "totals": { "total": 1000 }
            }
        """.trimIndent()
        val bytes = PosSaleTicketEscPos.fromTicketJson(
            json,
            headerPrefs = TicketHeaderPrefs(showCompanyRut = false, showRazonSocial = true),
        )
        val text = String(bytes, Charsets.ISO_8859_1)
        assertTrue(text.contains("JOYARTE", ignoreCase = true))
        assertTrue(!text.contains("76.543.210-K"))
        assertTrue(!text.contains("RUT:", ignoreCase = true))
    }
}

class TicketHeaderPrefsEscPosTest {
    @Test
    fun quotationOmitsSecondaryRazonWhenPrefOff() {
        val json = """
            {
              "documentNumber": "COT-1",
              "issuedAtIso": "2026-06-02T12:00:00Z",
              "company": {
                "nombreFantasia": "Kai Food",
                "razonSocial": "Comercial Demo SpA",
                "rut": "76.123.456-7"
              },
              "lines": [],
              "totals": { "total": 1000 }
            }
        """.trimIndent()
        val on = String(
            PosQuotationTicketEscPos.fromTicketJson(
                json,
                headerPrefs = TicketHeaderPrefs(showCompanyRut = true, showRazonSocial = true),
            ),
            Charsets.ISO_8859_1,
        )
        val off = String(
            PosQuotationTicketEscPos.fromTicketJson(
                json,
                headerPrefs = TicketHeaderPrefs(showCompanyRut = true, showRazonSocial = false),
            ),
            Charsets.ISO_8859_1,
        )
        assertTrue(on.contains("Comercial Demo SpA"))
        assertTrue(on.contains("RUT: 76.123.456-7") || on.contains("76.123.456-7"))
        assertTrue(!off.contains("Comercial Demo SpA"))
        assertTrue(off.contains("Kai Food") || off.contains("KAI FOOD"))
        assertTrue(off.contains("76.123.456-7"))
    }

    @Test
    fun testPageRespectsHeaderPrefs() {
        val off = String(
            EscPosTestBytes.testPage(
                headerPrefs = TicketHeaderPrefs(showCompanyRut = false, showRazonSocial = false),
            ),
            Charsets.ISO_8859_1,
        )
        assertTrue(off.contains("Tienda de Prueba", ignoreCase = true) || off.contains("TIENDA DE PRUEBA"))
        assertTrue(!off.contains("76.543.210-K"))
        // Sale demo header uses largeTitle=false → secondary razón never printed anyway.
        assertTrue(off.contains(PosSaleTicketDemo.FOLIO))
    }
}
