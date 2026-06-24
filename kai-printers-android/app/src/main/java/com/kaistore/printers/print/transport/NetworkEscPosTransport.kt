package com.kaistore.printers.print.transport

import com.kaistore.printers.print.EscPosStreamWriter
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket

class NetworkEscPosTransport(
    private val host: String,
    private val port: Int,
    private val connectTimeoutMs: Int = 5_000,
    private val writeTimeoutMs: Int = 10_000,
) : EscPosTransport {

    override fun write(data: ByteArray) {
        socket().use { socket ->
            socket.soTimeout = writeTimeoutMs
            val out: OutputStream = socket.getOutputStream()
            EscPosStreamWriter.writeChunked(out, data, drainDelayMs = 200)
        }
    }

    override fun probe(): Boolean = try {
        socket().use { }
        true
    } catch (_: Exception) {
        false
    }

    private fun socket(): Socket {
        val socket = Socket()
        socket.connect(InetSocketAddress(host, port), connectTimeoutMs)
        return socket
    }
}
