package com.kaistore.printers.protocol

const val PROTOCOL_VERSION = "2.1"
const val WS_CLOSE_REASON_SERVICE_STOPPED = "flowstore:service_stopped"

val AGENT_CAPABILITIES_MVP = listOf(
    "pos-sale-ticket",
    "pos-quotation-ticket",
    "pos-payment-in-ticket",
    "pos-customer-credit-note-ticket",
    "pos-cash-closing-ticket",
    "pos-cash-count-sheet-ticket",
    "pos-cash-session-opening-ticket",
    "pos-bank-account-ticket",
    "pdf-base64",
    "bluetooth-escpos",
    "network-escpos",
    "usb-escpos",
)
