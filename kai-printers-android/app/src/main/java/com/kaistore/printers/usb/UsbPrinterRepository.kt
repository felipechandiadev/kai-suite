package com.kaistore.printers.usb

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import com.kaistore.printers.print.transport.EscPosTransport
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.withTimeoutOrNull

class UsbPrinterRepository(private val context: Context) {
    private val usbManager: UsbManager =
        context.getSystemService(Context.USB_SERVICE) as UsbManager

    fun listDevices(): List<UsbDevice> = usbManager.deviceList.values.toList()

    fun deviceForId(deviceId: Int): UsbDevice? =
        usbManager.deviceList.values.firstOrNull { it.deviceId == deviceId }

    fun hasPermission(device: UsbDevice): Boolean = usbManager.hasPermission(device)

    suspend fun requestPermission(device: UsbDevice): Boolean {
        if (usbManager.hasPermission(device)) return true
        val action = "${context.packageName}.USB_PERMISSION"
        val deferred = CompletableDeferred<Boolean>()
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                if (intent?.action != action) return
                val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                deferred.complete(granted)
                try {
                    context.unregisterReceiver(this)
                } catch (_: Exception) {
                }
            }
        }
        val filter = IntentFilter(action)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            context.registerReceiver(receiver, filter)
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE
        } else {
            0
        }
        val pi = PendingIntent.getBroadcast(
            context,
            device.deviceId,
            Intent(action),
            flags,
        )
        usbManager.requestPermission(device, pi)
        return withTimeoutOrNull(30_000) { deferred.await() } == true
    }

    fun transportForDeviceId(deviceId: Int): EscPosTransport {
        val device = deviceForId(deviceId) ?: throw IllegalStateException("usb_device_not_found")
        return UsbEscPosTransport(usbManager, device)
    }

    fun deviceLabel(device: UsbDevice): String {
        val name = device.productName ?: device.deviceName ?: "USB"
        return "$name (#${device.deviceId})"
    }
}
