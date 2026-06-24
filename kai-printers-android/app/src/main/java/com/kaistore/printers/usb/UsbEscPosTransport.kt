package com.kaistore.printers.usb

import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import com.kaistore.printers.print.EscPosStreamWriter
import com.kaistore.printers.print.transport.EscPosTransport
import java.io.ByteArrayOutputStream

class UsbEscPosTransport(
    private val usbManager: UsbManager,
    private val device: UsbDevice,
) : EscPosTransport {

    override fun write(data: ByteArray) {
        withConnection { connection, outEndpoint ->
            val buffer = ByteArrayOutputStream(data.size)
            EscPosStreamWriter.writeChunked(buffer, data)
            val payload = buffer.toByteArray()
            val chunk = 1024
            var offset = 0
            while (offset < payload.size) {
                val len = minOf(chunk, payload.size - offset)
                val sent = connection.bulkTransfer(
                    outEndpoint,
                    payload,
                    offset,
                    len,
                    10_000,
                )
                if (sent < 0) throw IllegalStateException("usb_write_failed")
                offset += sent
                if (offset < payload.size) {
                    Thread.sleep(5)
                }
            }
        }
    }

    override fun probe(): Boolean = try {
        withConnection { _, _ -> }
        true
    } catch (_: Exception) {
        false
    }

    private inline fun <T> withConnection(block: (UsbDeviceConnection, UsbEndpoint) -> T): T {
        if (!usbManager.hasPermission(device)) {
            throw IllegalStateException("usb_permission_required")
        }
        val iface = printerInterface(device)
        val outEndpoint = bulkOutEndpoint(iface)
        val connection = usbManager.openDevice(device)
            ?: throw IllegalStateException("usb_open_failed")
        return try {
            if (!connection.claimInterface(iface, true)) {
                throw IllegalStateException("usb_claim_failed")
            }
            block(connection, outEndpoint)
        } finally {
            try {
                connection.releaseInterface(iface)
            } catch (_: Exception) {
            }
            connection.close()
        }
    }

    companion object {
        fun printerInterface(device: UsbDevice): UsbInterface {
            for (i in 0 until device.interfaceCount) {
                val iface = device.getInterface(i)
                if (iface.interfaceClass == android.hardware.usb.UsbConstants.USB_CLASS_PRINTER) {
                    return iface
                }
            }
            return device.getInterface(0)
        }

        fun bulkOutEndpoint(iface: UsbInterface): UsbEndpoint {
            for (i in 0 until iface.endpointCount) {
                val ep = iface.getEndpoint(i)
                if (ep.type == android.hardware.usb.UsbConstants.USB_ENDPOINT_XFER_BULK &&
                    ep.direction == android.hardware.usb.UsbConstants.USB_DIR_OUT
                ) {
                    return ep
                }
            }
            throw IllegalStateException("usb_no_bulk_out")
        }
    }
}
