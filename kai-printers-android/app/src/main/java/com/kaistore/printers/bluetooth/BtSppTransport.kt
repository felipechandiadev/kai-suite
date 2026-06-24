package com.kaistore.printers.bluetooth

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import com.kaistore.printers.print.EscPosStreamWriter
import java.io.OutputStream
import java.util.UUID

object BtSppTransport {
    private val sppUuid: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    @SuppressLint("MissingPermission")
    fun tryQuickConnect(device: BluetoothDevice, uuid: UUID = sppUuid): Boolean {
        var socket: BluetoothSocket? = null
        return try {
            socket = device.createRfcommSocketToServiceRecord(uuid)
            socket.connect()
            true
        } catch (_: Exception) {
            false
        } finally {
            try {
                socket?.close()
            } catch (_: Exception) {
            }
        }
    }

    @SuppressLint("MissingPermission")
    fun write(device: BluetoothDevice, data: ByteArray) {
        var socket: BluetoothSocket? = null
        try {
            socket = device.createRfcommSocketToServiceRecord(sppUuid)
            socket.connect()
            val out: OutputStream = socket.outputStream
            EscPosStreamWriter.writeChunked(out, data)
        } finally {
            try {
                socket?.close()
            } catch (_: Exception) {
            }
        }
    }

    fun testPage(): ByteArray = com.kaistore.printers.print.EscPosTestBytes.testPage()
}
