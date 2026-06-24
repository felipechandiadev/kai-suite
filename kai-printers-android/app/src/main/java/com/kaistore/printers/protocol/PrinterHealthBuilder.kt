package com.kaistore.printers.protocol

import com.kaistore.printers.bluetooth.BondedDevicesRepository
import com.kaistore.printers.data.AgentRepository
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

object PrinterHealthBuilder {
    suspend fun build(repository: AgentRepository, bonded: BondedDevicesRepository): JsonObject {
        val lines = repository.listMappingLines()
        val paperProfileByAlias = buildJsonObject {
            for (line in lines) {
                line.displayLabel?.let { put(it, line.paperProfile) }
            }
        }
        val healthLines = buildJsonArray {
            for (line in lines) {
                val online = bonded.isDeviceReachable(line.systemPrinterName)
                add(
                    buildJsonObject {
                        put("id", line.id)
                        put("purpose", line.purpose)
                        put("systemPrinterName", line.systemPrinterName)
                        line.displayLabel?.let { put("displayLabel", it) }
                        put("paperProfile", line.paperProfile)
                        put("online", online)
                        put("status", if (online) "ready" else "offline")
                    },
                )
            }
        }
        return buildJsonObject {
            put("version", PROTOCOL_VERSION)
            put("event", "printer_health")
            put("payload", buildJsonObject {
                put("lines", healthLines)
                put("paperProfileByAlias", paperProfileByAlias)
                put("overall", if (healthLines.isEmpty()) "unknown" else "degraded")
            })
        }
    }
}
