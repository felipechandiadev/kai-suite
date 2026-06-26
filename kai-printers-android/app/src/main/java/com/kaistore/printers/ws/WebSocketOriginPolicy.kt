package com.kaistore.printers.ws

import java.net.URI

/**
 * Valida el header `Origin` del handshake WebSocket (paridad con Kai Printers Tauri).
 *
 * - `allowAllOrigins=true` (default): orígenes loopback o IP privada LAN (POS en otra tablet/PC).
 * - `allowAllOrigins=false`: solo lista explícita en [allowedOrigins].
 * - Sin `Origin`: permitido (sondas / herramientas).
 */
object WebSocketOriginPolicy {
    fun isAllowed(
        origin: String?,
        allowAllOrigins: Boolean,
        allowedOrigins: List<String>,
    ): Boolean {
        val raw = origin?.trim().orEmpty()
        if (raw.isEmpty()) return true
        if (allowAllOrigins) return isLoopbackOrigin(raw) || isPrivateLanOrigin(raw)
        if (allowedOrigins.isEmpty()) return false
        return allowedOrigins.any { it.equals(raw, ignoreCase = true) }
    }

    fun isLoopbackOrigin(origin: String): Boolean {
        return try {
            val host = URI(origin).host?.lowercase()?.trim().orEmpty()
            host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "[::1]"
        } catch (_: Exception) {
            false
        }
    }

    fun isPrivateLanOrigin(origin: String): Boolean {
        return try {
            val host = URI(origin).host?.trim().orEmpty()
            if (host.isEmpty()) return false
            isPrivateIpv4(host)
        } catch (_: Exception) {
            false
        }
    }

    fun isPrivateIpv4(host: String): Boolean {
        val parts = host.split(".")
        if (parts.size != 4) return false
        val octets = parts.mapNotNull { it.toIntOrNull() }
        if (octets.size != 4 || octets.any { it !in 0..255 }) return false
        return when (octets[0]) {
            10 -> true
            172 -> octets[1] in 16..31
            192 -> octets[1] == 168
            else -> false
        }
    }

    fun parseAllowedOriginsCsv(raw: String?): List<String> =
        raw
            ?.split(",")
            ?.map { it.trim() }
            ?.filter { it.isNotEmpty() }
            ?: emptyList()
}
