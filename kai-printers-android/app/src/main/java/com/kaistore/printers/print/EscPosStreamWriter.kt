package com.kaistore.printers.print

import java.io.OutputStream

/** Escritura ESC/POS en chunks para buffers BT/red grandes. */
object EscPosStreamWriter {
    const val DEFAULT_CHUNK_SIZE = 1024
    const val DEFAULT_DRAIN_DELAY_MS = 750L

    fun writeChunked(
        out: OutputStream,
        data: ByteArray,
        chunkSize: Int = DEFAULT_CHUNK_SIZE,
        drainDelayMs: Long = DEFAULT_DRAIN_DELAY_MS,
    ) {
        var offset = 0
        while (offset < data.size) {
            val len = minOf(chunkSize, data.size - offset)
            out.write(data, offset, len)
            out.flush()
            offset += len
        }
        if (drainDelayMs > 0) {
            Thread.sleep(drainDelayMs)
        }
    }
}
