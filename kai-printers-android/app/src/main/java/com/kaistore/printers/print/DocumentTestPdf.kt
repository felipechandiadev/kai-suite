package com.kaistore.printers.print

import com.kaistore.printers.print.PaperProfile

/**
 * PDF mínimo para prueba de impresión documento (A4 / Letter).
 */
object DocumentTestPdf {
    fun bytesForProfile(paperProfile: PaperProfile): ByteArray {
        val mediaBox = when (paperProfile) {
            PaperProfile.LETTER -> "0 0 612 792"
            PaperProfile.A4 -> "0 0 595 842"
            else -> "0 0 595 842"
        }
        val text = "Kai Printers - prueba documento"
        val content = "BT /F1 14 Tf 72 720 Td ($text) Tj ET"
        val pdf = """
            %PDF-1.4
            1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
            2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
            3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[$mediaBox]/Contents 4 0 R>>endobj
            4 0 obj<</Length ${content.length}>>stream
            $content
            endstream
            endobj
            xref
            0 5
            0000000000 65535 f 
            0000000009 00000 n 
            0000000058 00000 n 
            0000000115 00000 n 
            0000000206 00000 n 
            trailer<</Size 5/Root 1 0 R>>
            startxref
            300
            %%EOF
        """.trimIndent().replace("\n", "\r\n")
        return pdf.toByteArray(Charsets.US_ASCII)
    }

    fun formatForProfile(paperProfile: PaperProfile): PrintFormat = when (paperProfile) {
        PaperProfile.LETTER -> PrintFormat.DOCUMENT_LETTER
        PaperProfile.A4 -> PrintFormat.DOCUMENT_A4
        else -> PrintFormat.DOCUMENT_A4
    }
}
