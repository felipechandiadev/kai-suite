package com.kaistore.printers.print.transport

interface EscPosTransport {
    fun write(data: ByteArray)
    fun probe(): Boolean
}
