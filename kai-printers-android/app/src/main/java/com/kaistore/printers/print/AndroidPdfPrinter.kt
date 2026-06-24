package com.kaistore.printers.print

import android.content.Context
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.io.FileOutputStream
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

object AndroidPdfPrinter {
    suspend fun printPdf(
        context: Context,
        pdfBytes: ByteArray,
        jobName: String,
        format: PrintFormat,
    ) = withContext(Dispatchers.Main) {
        val printManager = context.getSystemService(Context.PRINT_SERVICE) as PrintManager
        val mediaSize = when (format) {
            PrintFormat.DOCUMENT_LETTER -> PrintAttributes.MediaSize.NA_LETTER
            PrintFormat.DOCUMENT_A4 -> PrintAttributes.MediaSize.ISO_A4
            else -> PrintAttributes.MediaSize.ISO_A4
        }
        val attributes = PrintAttributes.Builder()
            .setMediaSize(mediaSize)
            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
            .build()
        val adapter = PdfPrintDocumentAdapter(pdfBytes, jobName)
        suspendCancellableCoroutine { cont ->
            printManager.print(jobName, adapter, attributes)
            adapter.awaitCompletion(
                onSuccess = { if (cont.isActive) cont.resume(Unit) },
                onFailure = { err -> if (cont.isActive) cont.resumeWithException(err) },
            )
        }
    }
}

private class PdfPrintDocumentAdapter(
    private val pdfBytes: ByteArray,
    private val jobName: String,
) : PrintDocumentAdapter() {
    private var onSuccess: (() -> Unit)? = null
    private var onFailure: ((Exception) -> Unit)? = null

    fun awaitCompletion(onSuccess: () -> Unit, onFailure: (Exception) -> Unit) {
        this.onSuccess = onSuccess
        this.onFailure = onFailure
    }

    override fun onLayout(
        oldAttributes: PrintAttributes?,
        newAttributes: PrintAttributes?,
        cancellationSignal: CancellationSignal?,
        callback: LayoutResultCallback?,
        extras: android.os.Bundle?,
    ) {
        if (cancellationSignal?.isCanceled == true) {
            callback?.onLayoutCancelled()
            return
        }
        val info = PrintDocumentInfo.Builder(jobName)
            .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
            .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
            .build()
        callback?.onLayoutFinished(info, true)
    }

    override fun onWrite(
        pages: Array<out android.print.PageRange>?,
        destination: ParcelFileDescriptor?,
        cancellationSignal: CancellationSignal?,
        callback: WriteResultCallback?,
    ) {
        if (cancellationSignal?.isCanceled == true) {
            callback?.onWriteCancelled()
            onFailure?.invoke(CancellationException("print_cancelled"))
            return
        }
        try {
            FileOutputStream(destination?.fileDescriptor).use { out ->
                out.write(pdfBytes)
            }
            callback?.onWriteFinished(arrayOf(android.print.PageRange.ALL_PAGES))
            onSuccess?.invoke()
        } catch (e: Exception) {
            callback?.onWriteFailed(e.message)
            onFailure?.invoke(e)
        }
    }
}

private class CancellationException(message: String) : Exception(message)
