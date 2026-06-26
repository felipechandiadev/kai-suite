package com.kaistore.printers.ui.mapping

import android.content.Context
import com.kaistore.printers.KaiPrintersApp
import com.kaistore.printers.data.AgentRepository
import com.kaistore.printers.data.MappingLineEntity
import com.kaistore.printers.print.AndroidPdfPrinter
import com.kaistore.printers.print.DocumentTestPdf
import com.kaistore.printers.print.EscPosTestBytes
import com.kaistore.printers.print.PaperProfile
import com.kaistore.printers.print.transport.PrinterRef
import com.kaistore.printers.print.transport.TransportFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object MappingLineTestPrint {
    suspend fun run(context: Context, repository: AgentRepository, line: MappingLineEntity): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                val profile = PaperProfile.fromStorage(line.paperProfile)
                when (line.purpose) {
                    "documents" -> {
                        val format = DocumentTestPdf.formatForProfile(profile)
                        AndroidPdfPrinter.printPdf(
                            context,
                            DocumentTestPdf.bytesForProfile(profile),
                            "kai-printers-doc-test.pdf",
                            format,
                        )
                    }
                    "tickets" -> {
                        val ref = PrinterRef.parse(line.systemPrinterName)
                            ?: throw IllegalStateException("invalid_printer_ref")
                        if (ref is PrinterRef.SystemPrint) {
                            throw IllegalStateException("tickets_requires_physical_printer")
                        }
                        val app = context.applicationContext as KaiPrintersApp
                        val logoSettings = app.container.printLogoRepository.currentSettings()
                        val transport = TransportFactory(context)
                        transport.write(
                            ref,
                            EscPosTestBytes.testPage(profile, context, logoSettings),
                        )
                    }
                    else -> throw IllegalStateException("unsupported_purpose")
                }
            }
        }
}
