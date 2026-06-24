package com.kaistore.printers.print.transport

import android.content.Context
import com.kaistore.printers.bluetooth.BondedDevicesRepository
import com.kaistore.printers.usb.UsbPrinterRepository

class TransportFactory(
    context: Context,
    private val bonded: BondedDevicesRepository = BondedDevicesRepository(context.applicationContext),
    private val usb: UsbPrinterRepository = UsbPrinterRepository(context.applicationContext),
) {
    private val writeLock = Any()

    fun create(ref: PrinterRef): EscPosTransport = when (ref) {
        is PrinterRef.Bluetooth -> BluetoothEscPosTransport(bonded, ref.macAddress)
        is PrinterRef.Network -> NetworkEscPosTransport(ref.host, ref.port)
        is PrinterRef.Usb -> usb.transportForDeviceId(ref.deviceId)
    }

    /** Una impresión a la vez (BT SPP no admite bien escrituras concurrentes). */
    fun write(ref: PrinterRef, data: ByteArray) {
        synchronized(writeLock) {
            create(ref).write(data)
        }
    }

    fun probe(ref: PrinterRef): Boolean = try {
        create(ref).probe()
    } catch (_: Exception) {
        false
    }
}
