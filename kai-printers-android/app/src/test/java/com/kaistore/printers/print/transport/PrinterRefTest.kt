package com.kaistore.printers.print.transport

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PrinterRefTest {
    @Test
    fun parseLegacyBluetoothMac() {
        val ref = PrinterRef.parse("AA:BB:CC:DD:EE:FF")
        assertTrue(ref is PrinterRef.Bluetooth)
        assertEquals("AA:BB:CC:DD:EE:FF", (ref as PrinterRef.Bluetooth).macAddress)
    }

    @Test
    fun parseBluetoothWithPrefix() {
        val ref = PrinterRef.parse("bt:11:22:33:44:55:66")
        assertTrue(ref is PrinterRef.Bluetooth)
        assertEquals("11:22:33:44:55:66", (ref as PrinterRef.Bluetooth).macAddress)
    }

    @Test
    fun parseNetworkRef() {
        val ref = PrinterRef.parse("net:192.168.1.50:9100")
        assertTrue(ref is PrinterRef.Network)
        val net = ref as PrinterRef.Network
        assertEquals("192.168.1.50", net.host)
        assertEquals(9100, net.port)
        assertEquals("net:192.168.1.50:9100", net.encode())
    }

    @Test
    fun parseUsbRef() {
        val ref = PrinterRef.parse("usb:42")
        assertTrue(ref is PrinterRef.Usb)
        assertEquals(42, (ref as PrinterRef.Usb).deviceId)
        assertEquals("usb:42", ref.encode())
    }

    @Test
    fun parseInvalidReturnsNull() {
        assertNull(PrinterRef.parse(""))
        assertNull(PrinterRef.parse("net:invalid"))
        assertNull(PrinterRef.parse("usb:not-a-number"))
    }

    @Test
    fun transportKind() {
        assertEquals("bluetooth", PrinterRef.transportKind(PrinterRef.Bluetooth("AA:BB:CC:DD:EE:FF")))
        assertEquals("network", PrinterRef.transportKind(PrinterRef.Network("10.0.0.1", 9100)))
        assertEquals("usb", PrinterRef.transportKind(PrinterRef.Usb(1)))
    }

    @Test
    fun bluetoothEncodeKeepsMac() {
        val ref = PrinterRef.Bluetooth("AA:BB:CC:DD:EE:FF")
        assertEquals("AA:BB:CC:DD:EE:FF", ref.encode())
    }

    @Test
    fun networkWithIpv6LikeHost() {
        val ref = PrinterRef.parse("net:fe80::1:9100")
        assertNotNull(ref)
        assertTrue(ref is PrinterRef.Network)
        assertEquals("fe80::1", (ref as PrinterRef.Network).host)
    }
}
