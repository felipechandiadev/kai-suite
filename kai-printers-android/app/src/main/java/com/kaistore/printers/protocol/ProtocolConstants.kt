package com.kaistore.printers.protocol

const val PROTOCOL_VERSION = "2.1"
const val WS_CLOSE_REASON_SERVICE_STOPPED = "flowstore:service_stopped"

val AGENT_CAPABILITIES_MVP = listOf(
    "pos-sale-ticket",
    "pdf-base64",
    "bluetooth-escpos",
    "network-escpos",
    "usb-escpos",
)
