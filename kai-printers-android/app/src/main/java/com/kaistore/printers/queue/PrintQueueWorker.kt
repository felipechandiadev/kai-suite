package com.kaistore.printers.queue

import android.content.Context
import android.util.Base64
import com.kaistore.printers.data.AgentRepository
import com.kaistore.printers.data.PrintLogoRepository
import com.kaistore.printers.print.transport.PrinterRef
import com.kaistore.printers.print.transport.TransportFactory
import com.kaistore.printers.print.AndroidPdfPrinter
import com.kaistore.printers.print.TicketEscPosDispatcher
import com.kaistore.printers.print.PrintFormat
import com.kaistore.printers.print.PrintFormats
import com.kaistore.printers.protocol.EventBroadcaster
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeout
import java.util.concurrent.atomic.AtomicBoolean

class PrintQueueWorker(
    private val context: Context,
    private val repository: AgentRepository,
    private val printLogoRepository: PrintLogoRepository,
    private val broadcaster: EventBroadcaster,
) {
    private val transportFactory = TransportFactory(context.applicationContext)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()
    private val wake = AtomicBoolean(false)

    fun notifyNewJob() {
        wake.set(true)
        scope.launch { drain() }
    }

    suspend fun drain() = mutex.withLock {
        repository.recoverStalePrintingJobs()
        while (true) {
            val queued = repository.listJobs(50).firstOrNull { it.status == "queued" } ?: break
            repository.markJobPrinting(queued.id)
            try {
                val payload = queued.payloadRef ?: throw IllegalStateException("empty_payload")
                val format = PrintFormat.parse(queued.format)
                    ?: PrintFormats.resolve(null, queued.purpose ?: "tickets")

                when {
                    PrintFormats.isTicketFormat(format) -> {
                        val ref = PrinterRef.parse(queued.targetSystemPrinter)
                            ?: throw IllegalStateException("no_target_printer")
                        val widthChars = PrintFormats.charsPerLine(format)
                        val logoSettings = printLogoRepository.currentSettings()
                        val headerPrefs = repository.ticketHeaderPrefs()
                        val bytes = if (PrintFormats.isTicketJobType(queued.documentType ?: "")) {
                            TicketEscPosDispatcher.fromJob(
                                queued.documentType ?: "",
                                payload,
                                widthChars,
                                context.applicationContext,
                                logoSettings,
                                headerPrefs,
                            )
                        } else {
                            throw IllegalStateException("unsupported_document_type")
                        }
                        withTimeout(60_000) {
                            transportFactory.write(ref, bytes)
                        }
                    }
                    PrintFormats.isDocumentFormat(format) -> {
                        if (queued.documentType != "pdf-base64") {
                            throw IllegalStateException("unsupported_document_type")
                        }
                        val pdfBytes = Base64.decode(payload, Base64.DEFAULT)
                        val jobName = queued.filename ?: "document.pdf"
                        AndroidPdfPrinter.printPdf(context.applicationContext, pdfBytes, jobName, format)
                    }
                    else -> throw IllegalStateException("unsupported_format")
                }
                repository.markJobDone(queued.id)
                broadcaster.emitPrintJobDone(queued.id)
            } catch (e: Exception) {
                repository.markJobFailed(queued.id, e.message ?: "print_failed")
                broadcaster.emitPrintJobFailed(queued.id, e.message ?: "print_failed")
            }
        }
        wake.set(false)
    }
}
