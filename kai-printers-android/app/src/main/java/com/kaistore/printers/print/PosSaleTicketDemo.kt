package com.kaistore.printers.print

/** Ticket de venta demo (paridad con POS `buildPosPrintTestSaleReceipt` / fixture protocolo). */
object PosSaleTicketDemo {
    const val FOLIO = "VTA-PRUEBA-001"

    fun ticketJson(): String = """
        {
          "version": 1,
          "folio": "$FOLIO",
          "issuedAtIso": "2026-05-23T15:30:00.000Z",
          "documentKind": "sale",
          "company": {
            "razonSocial": "Comercial Demo SpA",
            "nombreFantasia": "Tienda de Prueba",
            "rut": "76.543.210-K",
            "businessActivity": "Venta al por menor"
          },
          "customer": {
            "name": "Cliente de Prueba",
            "document": "12.345.678-9"
          },
          "lines": [
            {
              "productName": "Producto demo A",
              "attributes": ["Talla M", "Azul"],
              "quantity": 2,
              "unitSymbol": "und",
              "unitPriceWithTax": 5990,
              "lineGross": 11980
            },
            {
              "productName": "Producto demo B",
              "attributes": [],
              "quantity": 1,
              "unitSymbol": "und",
              "unitPriceWithTax": 12990,
              "lineGross": 12990,
              "discountAmount": 500,
              "discountLabel": "Promo prueba"
            }
          ],
          "promotions": [],
          "totals": {
            "subtotalNet": 20143,
            "taxes": 3827,
            "lineDiscounts": 500,
            "orderDiscount": 0,
            "total": 23970,
            "change": 0
          },
          "payments": [
            { "label": "Efectivo", "amount": 23970, "detail": null }
          ]
        }
    """.trimIndent()

    fun widthCharsForPaper(profile: PaperProfile): Int = when (profile) {
        PaperProfile.MM58 -> PrintFormats.charsPerLine(PrintFormat.TICKET_58MM)
        else -> PrintFormats.charsPerLine(PrintFormat.TICKET_80MM)
    }
}
