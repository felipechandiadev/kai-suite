package com.kaistore.printers.net

import java.net.Inet4Address
import java.net.NetworkInterface

/** Direcciones IPv4 no loopback de interfaces activas (Wi‑Fi / Ethernet). */
object LanAddressResolver {
    fun ipv4NonLoopback(): List<String> {
        val out = linkedSetOf<String>()
        val interfaces = NetworkInterface.getNetworkInterfaces() ?: return emptyList()
        for (iface in interfaces) {
            if (!iface.isUp || iface.isLoopback) continue
            for (addr in iface.inetAddresses) {
                if (addr !is Inet4Address || addr.isLoopbackAddress) continue
                val ip = addr.hostAddress?.trim() ?: continue
                if (ip.isNotEmpty()) out.add(ip)
            }
        }
        return out.sorted()
    }

    fun primaryIpv4OrNull(): String? = ipv4NonLoopback().firstOrNull()
}
