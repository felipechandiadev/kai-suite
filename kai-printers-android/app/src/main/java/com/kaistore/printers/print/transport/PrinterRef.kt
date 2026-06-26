package com.kaistore.printers.print.transport

/**
 * Referencia codificada en [MappingLineEntity.systemPrinterName].
 * Legacy: dirección MAC Bluetooth sin prefijo.
 */
sealed class PrinterRef {
    abstract fun encode(): String

    data class Bluetooth(val address: String) : PrinterRef() {
        val macAddress: String get() = address.trim()

        override fun encode(): String = macAddress
    }

    data class Network(val host: String, val port: Int) : PrinterRef() {
        override fun encode(): String = "net:$host:$port"
    }

    data class Usb(val deviceId: Int) : PrinterRef() {
        override fun encode(): String = "usb:$deviceId"
    }

    /** Impresión documento vía Android Print Framework (sin ref física ESC/POS). */
    data object SystemPrint : PrinterRef() {
        override fun encode(): String = "system:print"
    }

    companion object {
        const val SYSTEM_PRINT = "system:print"
        const val ANDROID_PRINT = "android:print"
        private val MAC_REGEX = Regex("^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")

        fun parse(raw: String?): PrinterRef? {
            val s = raw?.trim().orEmpty()
            if (s.isEmpty()) return null
            when {
                s.startsWith("bt:", ignoreCase = true) -> {
                    val mac = s.substring(3).trim()
                    return if (mac.isNotEmpty()) Bluetooth(mac) else null
                }
                s.startsWith("net:", ignoreCase = true) -> {
                    val rest = s.substring(4)
                    val lastColon = rest.lastIndexOf(':')
                    if (lastColon <= 0) return null
                    val host = rest.substring(0, lastColon).trim()
                    val port = rest.substring(lastColon + 1).toIntOrNull() ?: return null
                    if (host.isEmpty() || port !in 1..65535) return null
                    return Network(host, port)
                }
                s.startsWith("usb:", ignoreCase = true) -> {
                    val id = s.substring(4).toIntOrNull() ?: return null
                    return Usb(id)
                }
                s.equals(SYSTEM_PRINT, ignoreCase = true) ||
                    s.equals(ANDROID_PRINT, ignoreCase = true) -> return SystemPrint
                MAC_REGEX.matches(s) -> return Bluetooth(s)
            }
            return null
        }

        fun transportKind(ref: PrinterRef): String = when (ref) {
            is Bluetooth -> "bluetooth"
            is Network -> "network"
            is Usb -> "usb"
            is SystemPrint -> "system"
        }
    }
}
