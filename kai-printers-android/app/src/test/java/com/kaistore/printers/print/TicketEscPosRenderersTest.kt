package com.kaistore.printers.print

import org.junit.Assert.assertTrue
import org.junit.Test

class TicketEscPosDispatcherTest {
    private fun hasDrawerKick(bytes: ByteArray): Boolean {
        for (i in 0 until bytes.size - 1) {
            if (bytes[i] == 0x1B.toByte() && bytes[i + 1] == 0x70.toByte()) return true
        }
        return false
    }

    @Test
    fun dispatchesSaleTicket() {
        val json = """
            {
              "folio": "VTA-1",
              "issuedAtIso": "2026-06-02T12:00:00Z",
              "company": { "nombreFantasia": "Tienda" },
              "lines": [],
              "totals": { "total": 0 }
            }
        """.trimIndent()
        val bytes = TicketEscPosDispatcher.fromJob("pos-sale-ticket", json, 48)
        assertTrue(bytes.isNotEmpty())
        val text = String(bytes, Charsets.ISO_8859_1)
        assertTrue(text.contains("VTA-1"))
        assertTrue(hasDrawerKick(bytes))
    }

    @Test
    fun saleTicketSkipsDrawerOn58mm() {
        val json = """
            {
              "folio": "VTA-1",
              "issuedAtIso": "2026-06-02T12:00:00Z",
              "company": { "nombreFantasia": "Tienda" },
              "lines": [],
              "totals": { "total": 0 }
            }
        """.trimIndent()
        val bytes = TicketEscPosDispatcher.fromJob("pos-sale-ticket", json, 32)
        assertTrue(!hasDrawerKick(bytes))
    }

    @Test(expected = IllegalStateException::class)
    fun rejectsUnknownDocumentType() {
        TicketEscPosDispatcher.fromJob("pos-unknown-ticket", "{}", 48)
    }
}

class PosQuotationTicketEscPosTest {
    @Test
    fun hasCotizacionHeading() {
        val json = """
            {
              "documentNumber": "COT-001",
              "issuedAt": "2026-01-01T12:00:00Z",
              "validUntil": "2026-02-01T12:00:00Z",
              "company": { "razonSocial": "Tienda" },
              "lines": [{
                "productName": "Item",
                "quantity": 1,
                "unitPrice": 1000,
                "total": 1190
              }],
              "subtotal": 1000,
              "taxAmount": 190,
              "total": 1190
            }
        """.trimIndent()
        val text = String(PosQuotationTicketEscPos.fromTicketJson(json), Charsets.ISO_8859_1)
        assertTrue(text.contains("COTIZACION"))
    }

    @Test
    fun toleratesNullCustomerFields() {
        val json = """
            {
              "documentNumber": "COT-002",
              "issuedAt": "2026-01-01T12:00:00Z",
              "validUntil": "2026-02-01T12:00:00Z",
              "company": { "razonSocial": "Tienda", "nombreFantasia": null },
              "customerName": null,
              "customerDocument": null,
              "lines": [],
              "subtotal": 0,
              "taxAmount": 0,
              "total": 0
            }
        """.trimIndent()
        val bytes = PosQuotationTicketEscPos.fromTicketJson(json)
        assertTrue(bytes.isNotEmpty())
    }
}

class PosCashClosingTicketEscPosTest {
    @Test
    fun hasArqueoHeading() {
        val json = """
            {
              "cashSessionId": "sess-12345678",
              "closedAt": "2026-01-01T18:00:00Z",
              "company": { "razonSocial": "Tienda" },
              "usedBlindCount": false,
              "counted": { "cash": 1000, "debitCard": 0, "creditCard": 0, "transfer": 0, "check": 0, "other": 0 },
              "countedGrand": 1000
            }
        """.trimIndent()
        val text = String(PosCashClosingTicketEscPos.fromTicketJson(json), Charsets.ISO_8859_1)
        assertTrue(text.contains("ARQUEO DE CAJA"))
    }
}

class PosCustomerCreditNoteTicketEscPosTest {
    @Test
    fun hasNotaDeCreditoHeading() {
        val json = """
            {
              "creditNoteFolio": "NC-001",
              "saleReturnFolio": "DEV-1",
              "originalSaleFolio": "VTA-1",
              "issuedAtIso": "2026-01-01T12:00:00Z",
              "company": { "razonSocial": "Tienda" },
              "lines": [],
              "totals": { "subtotalNet": 0, "taxes": 0, "discounts": 0, "total": 0 }
            }
        """.trimIndent()
        val text = String(PosCustomerCreditNoteTicketEscPos.fromTicketJson(json), Charsets.ISO_8859_1)
        assertTrue(text.contains("NOTA DE CREDITO"))
    }
}

class PosCashSessionOpeningTicketEscPosTest {
    @Test
    fun hasAperturaHeading() {
        val json = """
            {
              "cashSessionId": "sess-abc",
              "openedAt": "2026-01-01T08:00:00Z",
              "openingAmount": 50000,
              "company": { "razonSocial": "Tienda" }
            }
        """.trimIndent()
        val text = String(PosCashSessionOpeningTicketEscPos.fromTicketJson(json), Charsets.ISO_8859_1)
        assertTrue(text.contains("APERTURA DE CAJA"))
    }
}

class PosCashCountSheetTicketEscPosTest {
    @Test
    fun hasPlanillaHeading() {
        val json = """
            {
              "cashSessionId": "sess-abc",
              "printedAt": "2026-01-01T18:00:00Z",
              "company": { "razonSocial": "Tienda" },
              "paymentLines": []
            }
        """.trimIndent()
        val text = String(PosCashCountSheetTicketEscPos.fromTicketJson(json), Charsets.ISO_8859_1)
        assertTrue(text.contains("PLANILLA DE CONTEO"))
    }
}

class PosPaymentInTicketEscPosTest {
    private fun hasDrawerKick(bytes: ByteArray): Boolean {
        for (i in 0 until bytes.size - 1) {
            if (bytes[i] == 0x1B.toByte() && bytes[i + 1] == 0x70.toByte()) return true
        }
        return false
    }

    private fun sampleJson(): String = """
            {
              "documentNumber": "COB-001",
              "issuedAt": "2026-01-01T12:00:00Z",
              "company": { "razonSocial": "Tienda" },
              "totalCollected": 5000,
              "amountPaid": 5000,
              "payments": [{ "label": "Efectivo", "amount": 5000 }],
              "allocations": [{ "documentNumber": "VTA-1", "amount": 5000 }]
            }
        """.trimIndent()

    @Test
    fun hasComprobanteHeading() {
        val text = String(PosPaymentInTicketEscPos.fromTicketJson(sampleJson()), Charsets.ISO_8859_1)
        assertTrue(text.contains("COMPROBANTE DE COBRO"))
    }

    @Test
    fun opensDrawerOn80mm() {
        val bytes = PosPaymentInTicketEscPos.fromTicketJson(sampleJson(), 48)
        assertTrue(hasDrawerKick(bytes))
    }

    @Test
    fun skipsDrawerOn58mm() {
        val bytes = PosPaymentInTicketEscPos.fromTicketJson(sampleJson(), 32)
        assertTrue(!hasDrawerKick(bytes))
    }
}
