package com.kaistore.printers.data

import com.kaistore.printers.print.PaperProfile
import com.kaistore.printers.print.transport.PrinterRef

object MappingLineUtils {
    fun defaultFormat(): String = "ticket_80mm"

    /** Clave de protocolo POS (`aliasesByFormat`) derivada de uso + perfil de papel. */
    fun protocolFormatKey(purpose: String, paperProfile: String): String = when {
        purpose == "documents" -> "document"
        paperProfile == PaperProfile.MM58.storageValue -> "ticket_58mm"
        else -> "ticket_80mm"
    }

    fun defaultPaperProfileForPurpose(purpose: String): String =
        if (purpose == "documents") PaperProfile.A4.storageValue else PaperProfile.MM80.storageValue

    fun normalizePaperProfile(purpose: String, raw: String): String {
        val v = raw.trim().lowercase()
        return when (purpose) {
            "documents" -> if (v == "letter") PaperProfile.LETTER.storageValue else PaperProfile.A4.storageValue
            else -> if (v == "58mm") PaperProfile.MM58.storageValue else PaperProfile.MM80.storageValue
        }
    }

    fun transportLabelRes(transportKind: String?): Int = when (transportKind) {
        "bluetooth" -> com.kaistore.printers.R.string.transport_bluetooth
        "network" -> com.kaistore.printers.R.string.transport_network
        "usb" -> com.kaistore.printers.R.string.transport_usb
        "system" -> com.kaistore.printers.R.string.transport_system
        else -> com.kaistore.printers.R.string.transport_unknown
    }

    fun transportKindForSystemName(systemPrinterName: String): String? =
        PrinterRef.parse(systemPrinterName)?.let { PrinterRef.transportKind(it) }

    fun lineMatchesTransport(systemPrinterName: String, transportKind: String): Boolean =
        transportKindForSystemName(systemPrinterName) == transportKind

    fun describeTransport(systemPrinterName: String): String {
        val ref = PrinterRef.parse(systemPrinterName) ?: return systemPrinterName
        return when (ref) {
            is PrinterRef.Bluetooth -> ref.macAddress
            is PrinterRef.Network -> "${ref.host}:${ref.port}"
            is PrinterRef.Usb -> "USB #${ref.deviceId}"
            is PrinterRef.SystemPrint -> "system:print"
        }
    }
}
