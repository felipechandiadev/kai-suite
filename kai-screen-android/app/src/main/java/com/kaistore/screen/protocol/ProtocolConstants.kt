package com.kaistore.screen.protocol

const val PROTOCOL_VERSION = "1.1"
val SUPPORTED_PROTOCOL_VERSIONS = setOf("1.0", "1.1")
const val WS_CLOSE_REASON_SERVICE_STOPPED = "kai:service_stopped"

fun isSupportedProtocolVersion(version: String?): Boolean {
    if (version == null) return true
    return version in SUPPORTED_PROTOCOL_VERSIONS
}

const val DEFAULT_LISTEN_HOST = "127.0.0.1"
const val DEFAULT_LISTEN_PORT = 14570
const val DEFAULT_WSS_LISTEN_PORT = 14571
