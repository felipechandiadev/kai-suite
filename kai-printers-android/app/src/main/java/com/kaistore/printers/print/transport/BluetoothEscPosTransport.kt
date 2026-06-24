package com.kaistore.printers.print.transport

import android.bluetooth.BluetoothDevice
import com.kaistore.printers.bluetooth.BondedDevicesRepository
import com.kaistore.printers.bluetooth.BtSppTransport

class BluetoothEscPosTransport(
    private val bonded: BondedDevicesRepository,
    private val macAddress: String,
) : EscPosTransport {
    private fun device(): BluetoothDevice? = bonded.deviceForAddress(macAddress)

    override fun write(data: ByteArray) {
        val device = device() ?: throw IllegalStateException("printer_not_found")
        BtSppTransport.write(device, data)
    }

    override fun probe(): Boolean = bonded.isDeviceReachable(macAddress)
}
