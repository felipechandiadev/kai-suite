package com.kaistore.printers.queue

import android.content.Context
import com.kaistore.printers.bluetooth.BondedDevicesRepository
import com.kaistore.printers.bluetooth.BtSppTransport
import com.kaistore.printers.data.AgentRepository
import com.kaistore.printers.print.PosSaleTicketEscPos
import com.kaistore.printers.protocol.EventBroadcaster
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.atomic.AtomicBoolean

class PrintQueueWorker(
    context: Context,
    private val repository: AgentRepository,
    private val broadcaster: EventBroadcaster,
) {
    private val bonded = BondedDevicesRepository(context.applicationContext)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()
    private val wake = AtomicBoolean(false)

    fun notifyNewJob() {
        wake.set(true)
        scope.launch { drain() }
    }

    suspend fun drain() = mutex.withLock {
        while (true) {
            val queued = repository.listJobs(50).firstOrNull { it.status == "queued" } ?: break
            repository.markJobPrinting(queued.id)
            try {
                val mac = queued.targetSystemPrinter
                    ?: throw IllegalStateException("no_target_printer")
                val device = bonded.deviceForAddress(mac)
                    ?: throw IllegalStateException("printer_not_found")
                val payload = queued.payloadRef ?: throw IllegalStateException("empty_payload")
                val bytes = when (queued.documentType) {
                    "pos-sale-ticket" -> PosSaleTicketEscPos.fromTicketJson(payload)
                    else -> throw IllegalStateException("unsupported_document_type")
                }
                BtSppTransport.write(device, bytes)
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
