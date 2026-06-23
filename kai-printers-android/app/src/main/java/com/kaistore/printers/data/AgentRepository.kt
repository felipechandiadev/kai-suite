package com.kaistore.printers.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.time.Instant
import java.util.UUID

object AgentSettingsKeys {
    const val LISTEN_HOST = "listen_host"
    const val LISTEN_PORT = "listen_port"
    const val WSS_LISTEN_PORT = "wss_listen_port"
    const val WSS_ENABLED = "wss_enabled"
    const val ALLOW_ALL_ORIGINS = "allow_all_origins"
    const val AGENT_DISPLAY_NAME = "agent_display_name"
}

class AgentRepository(private val db: AgentDatabase) {
    private val settings = db.settingsDao()
    private val mappingLines = db.mappingLineDao()
    private val jobs = db.printJobDao()

    suspend fun ensureDefaults() = withContext(Dispatchers.IO) {
        val defaults = mapOf(
            AgentSettingsKeys.LISTEN_HOST to "127.0.0.1",
            AgentSettingsKeys.LISTEN_PORT to "14567",
            AgentSettingsKeys.WSS_LISTEN_PORT to "14568",
            AgentSettingsKeys.WSS_ENABLED to "true",
            AgentSettingsKeys.ALLOW_ALL_ORIGINS to "true",
            AgentSettingsKeys.AGENT_DISPLAY_NAME to "KaiPrinters",
        )
        for ((key, value) in defaults) {
            if (settings.get(key) == null) {
                settings.put(SettingEntity(key, value))
            }
        }
    }

    suspend fun getSetting(key: String): String? = withContext(Dispatchers.IO) {
        settings.get(key)
    }

    suspend fun setSetting(key: String, value: String) = withContext(Dispatchers.IO) {
        settings.put(SettingEntity(key, value))
    }

    suspend fun listenHost(): String = getSetting(AgentSettingsKeys.LISTEN_HOST) ?: "127.0.0.1"

    suspend fun listenPort(): Int = getSetting(AgentSettingsKeys.LISTEN_PORT)?.toIntOrNull() ?: 14567

    suspend fun wssListenPort(): Int = getSetting(AgentSettingsKeys.WSS_LISTEN_PORT)?.toIntOrNull() ?: 14568

    suspend fun wssEnabled(): Boolean = getSetting(AgentSettingsKeys.WSS_ENABLED) != "false"

    suspend fun allowAllOrigins(): Boolean = getSetting(AgentSettingsKeys.ALLOW_ALL_ORIGINS) != "false"

    suspend fun listMappingLines(): List<MappingLineEntity> = withContext(Dispatchers.IO) {
        mappingLines.getAll()
    }

    suspend fun replaceMappingLines(lines: List<MappingLineEntity>) = withContext(Dispatchers.IO) {
        mappingLines.deleteAll()
        if (lines.isNotEmpty()) mappingLines.insertAll(lines)
    }

    suspend fun setMapping(purpose: String, printerName: String) = withContext(Dispatchers.IO) {
        val all = mappingLines.getAll()
        val others = all.filter { it.purpose != purpose }
        val line = MappingLineEntity(
            id = UUID.randomUUID().toString(),
            purpose = purpose,
            systemPrinterName = printerName,
            sortOrder = 0,
            displayLabel = printerName,
        )
        mappingLines.deleteAll()
        mappingLines.insertAll(others + line)
    }

    suspend fun assignTicketsPrinter(macAddress: String, displayLabel: String) = withContext(Dispatchers.IO) {
        val all = mappingLines.getAll().filter { it.purpose != "tickets" }
        val line = MappingLineEntity(
            id = UUID.randomUUID().toString(),
            purpose = "tickets",
            systemPrinterName = macAddress,
            sortOrder = 0,
            displayLabel = displayLabel,
        )
        mappingLines.deleteAll()
        mappingLines.insertAll(all + line)
    }

    suspend fun ticketsPrinterMac(): String? = withContext(Dispatchers.IO) {
        mappingLines.getAll().firstOrNull { it.purpose == "tickets" }?.systemPrinterName
    }

    suspend fun resolvePrinterForPurpose(purpose: String, displayLabel: String?): String? =
        withContext(Dispatchers.IO) {
            val lines = mappingLines.getAll().filter { it.purpose == purpose }
            if (displayLabel != null) {
                lines.firstOrNull { it.displayLabel == displayLabel }?.systemPrinterName
                    ?: lines.firstOrNull()?.systemPrinterName
            } else {
                lines.firstOrNull()?.systemPrinterName
            }
        }

    suspend fun mappingLinesJson(): JsonArray = withContext(Dispatchers.IO) {
        buildJsonArray {
            mappingLines.getAll().forEach { line ->
                add(
                    buildJsonObject {
                        put("id", JsonPrimitive(line.id))
                        put("purpose", JsonPrimitive(line.purpose))
                        put("systemPrinterName", JsonPrimitive(line.systemPrinterName))
                        put("sortOrder", JsonPrimitive(line.sortOrder))
                        line.displayLabel?.let { put("displayLabel", JsonPrimitive(it)) }
                    },
                )
            }
        }
    }

    suspend fun aliasesByPurposeJson(): JsonObject = withContext(Dispatchers.IO) {
        buildJsonObject {
            mappingLines.getAll().groupBy { it.purpose }.forEach { (purpose, lines) ->
                put(
                    purpose,
                    buildJsonArray {
                        lines.mapNotNull { it.displayLabel }.forEach { add(JsonPrimitive(it)) }
                    },
                )
            }
        }
    }

    suspend fun enqueueJob(
        purpose: String,
        filename: String,
        documentType: String,
        internalFolio: String,
        clientId: String?,
        targetPrinter: String?,
        payloadJson: String,
    ): String = withContext(Dispatchers.IO) {
        val id = UUID.randomUUID().toString()
        val now = Instant.now().toString()
        jobs.insert(
            PrintJobEntity(
                id = id,
                status = "queued",
                purpose = purpose,
                filename = filename,
                payloadRef = payloadJson,
                copies = 1,
                createdAt = now,
                startedAt = null,
                printedAt = null,
                error = null,
                priority = 0,
                clientId = clientId,
                retryCount = 0,
                documentType = documentType,
                internalFolio = internalFolio,
                sourceApp = "pwa",
                requestedBy = null,
                targetSystemPrinter = targetPrinter,
            ),
        )
        id
    }

    suspend fun markJobPrinting(id: String) = withContext(Dispatchers.IO) {
        jobs.updateStatus(id, "printing", null, null)
    }

    suspend fun markJobDone(id: String) = withContext(Dispatchers.IO) {
        jobs.updateStatus(id, "done", null, Instant.now().toString())
    }

    suspend fun markJobFailed(id: String, error: String) = withContext(Dispatchers.IO) {
        jobs.updateStatus(id, "failed", error, null)
    }

    suspend fun listJobs(limit: Int): List<PrintJobEntity> = withContext(Dispatchers.IO) {
        jobs.listQueue(limit)
    }

    suspend fun dismissJob(id: String): Boolean = withContext(Dispatchers.IO) {
        jobs.dismissQueued(id) > 0
    }

    suspend fun applySetConfig(extra: JsonObject) = withContext(Dispatchers.IO) {
        extra["listenHost"]?.jsonPrimitive?.content?.trim()?.takeIf { it.isNotEmpty() }?.let {
            setSetting(AgentSettingsKeys.LISTEN_HOST, it)
        }
        extra["listenPort"]?.jsonPrimitive?.content?.toIntOrNull()?.let {
            setSetting(AgentSettingsKeys.LISTEN_PORT, it.toString())
        }
        extra["wssListenPort"]?.jsonPrimitive?.content?.toIntOrNull()?.let {
            setSetting(AgentSettingsKeys.WSS_LISTEN_PORT, it.toString())
        }
        extra["wssEnabled"]?.let { el ->
            val enabled = when (el) {
                is JsonPrimitive -> {
                    val c = el.content
                    c == "true" || c == "1" || c.equals("true", ignoreCase = true)
                }
                else -> false
            }
            setSetting(AgentSettingsKeys.WSS_ENABLED, if (enabled) "true" else "false")
        }
        extra["allowAllOrigins"]?.let { el ->
            val allow = when (el) {
                is JsonPrimitive -> el.content == "true" || el.content == "1"
                else -> false
            }
            setSetting(AgentSettingsKeys.ALLOW_ALL_ORIGINS, if (allow) "true" else "false")
        }
    }

    suspend fun applyMappingLinesFromJson(lines: JsonArray) = withContext(Dispatchers.IO) {
        val parsed = lines.mapNotNull { el ->
            val obj = el.jsonObject
            val purpose = obj["purpose"]?.jsonPrimitive?.content ?: return@mapNotNull null
            val printer = obj["systemPrinterName"]?.jsonPrimitive?.content
                ?: obj["printerName"]?.jsonPrimitive?.content
                ?: return@mapNotNull null
            MappingLineEntity(
                id = obj["id"]?.jsonPrimitive?.content ?: UUID.randomUUID().toString(),
                purpose = purpose,
                systemPrinterName = printer,
                sortOrder = obj["sortOrder"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0,
                displayLabel = obj["displayLabel"]?.jsonPrimitive?.content,
            )
        }
        replaceMappingLines(parsed)
    }
}
