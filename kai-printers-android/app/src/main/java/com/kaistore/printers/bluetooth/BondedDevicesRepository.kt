package com.kaistore.printers.bluetooth

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.Context
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID

class BondedDevicesRepository(private val context: Context) {
    private val sppUuid: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    private fun adapter(): BluetoothAdapter? {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        return manager?.adapter
    }

    @SuppressLint("MissingPermission")
    fun listBondedDevices(): List<BluetoothDevice> {
        if (!BluetoothPermissions.hasScanAndConnect(context)) return emptyList()
        return try {
            adapter()?.bondedDevices?.toList().orEmpty()
        } catch (_: SecurityException) {
            emptyList()
        }
    }

    /** Misma lista, pero nunca lanza (para UI). */
    fun listBondedDevicesSafe(): List<BluetoothDevice> = listBondedDevices()

    @SuppressLint("MissingPermission")
    fun listBondedPrintersJson(): JsonArray = buildJsonArray {
        listBondedDevices().forEach { device ->
            add(
                buildJsonObject {
                    put("name", device.safeLabel())
                    put("address", device.address)
                    put("default", false)
                    put("online", isDeviceReachable(device.address))
                },
            )
        }
    }

    @SuppressLint("MissingPermission")
    fun deviceForAddress(address: String): BluetoothDevice? =
        try {
            adapter()?.getRemoteDevice(address)
        } catch (_: IllegalArgumentException) {
            null
        } catch (_: SecurityException) {
            null
        }

    fun isDeviceReachable(address: String): Boolean {
        val device = deviceForAddress(address) ?: return false
        return try {
            BtSppTransport.tryQuickConnect(device, sppUuid)
        } catch (_: SecurityException) {
            false
        }
    }
}

@SuppressLint("MissingPermission")
fun BluetoothDevice.safeLabel(): String {
    return try {
        name?.takeIf { it.isNotBlank() } ?: address
    } catch (_: SecurityException) {
        address
    }
}
