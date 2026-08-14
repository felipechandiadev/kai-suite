package com.kaistore.printers.protocol

import com.kaistore.printers.BuildConfig
import com.kaistore.printers.KaiPrintersApp
import com.kaistore.printers.net.LanAddressResolver
import com.kaistore.printers.bluetooth.BondedDevicesRepository
import com.kaistore.printers.data.AgentRepository
import com.kaistore.printers.print.AndroidPdfPrinter
import com.kaistore.printers.print.DocumentTestPdf
import com.kaistore.printers.print.EscPosTestBytes
import com.kaistore.printers.print.transport.PrinterRef
import com.kaistore.printers.print.transport.TransportFactory
import com.kaistore.printers.print.PaperProfile
import com.kaistore.printers.print.PrintFormat
import com.kaistore.printers.print.PrintFormats
import com.kaistore.printers.print.jsonObj
import com.kaistore.printers.print.jsonStr
import com.kaistore.printers.print.present
import com.kaistore.printers.queue.PrintQueueWorker
import android.content.Context
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

data class ConnectedSession(
    val connId: String,
    val clientId: String,
    val appLabel: String,
    val userDisplayName: String,
    val companyName: String?,
    val pointOfSaleName: String?,
)

class ProtocolDispatcher(
    private val appContext: Context,
    private val repository: AgentRepository,
    private val bonded: BondedDevicesRepository,
    private val transport: TransportFactory,
    private val broadcaster: EventBroadcaster,
    private val queueWorker: PrintQueueWorker,
) {
    private val connSeq = AtomicInteger(0)
    private val sessions = ConcurrentHashMap<String, ConnectedSession>()

    fun nextConnId(): String = "conn-${connSeq.incrementAndGet()}"

    fun register(session: ConnectedSession) {
        sessions[session.connId] = session
    }

    fun unregister(connId: String) {
        sessions.remove(connId)
    }

    fun connectedCount(): Int = sessions.size

    fun connectedSessionsJson(): JsonArray = buildJsonArray {
        sessions.values.forEach { s ->
            add(
                buildJsonObject {
                    put("clientId", s.clientId)
                    put("appLabel", s.appLabel)
                    put("userDisplayName", s.userDisplayName)
                    s.companyName?.let { put("companyName", it) }
                    s.pointOfSaleName?.let { put("pointOfSaleName", it) }
                },
            )
        }
    }

    suspend fun dispatch(connId: String, helloOk: Boolean, raw: String): String {
        val env = try {
            Json.parseToJsonElement(raw).jsonObject
        } catch (_: Exception) {
            return encodeErr(null, "invalid_json")
        }

        val version = env["version"]?.jsonPrimitive?.content
        if (!isVersionOk(version)) {
            return encodeErr(env["request_id"]?.asString(), "unsupported_version: $version")
        }

        val action = env["action"]?.jsonPrimitive?.content
            ?: return encodeErr(env["request_id"]?.asString(), "missing_action")
        val requestId = env["request_id"]?.asString()

        if (action == "hello") {
            val clientId = env["clientId"]?.jsonPrimitive?.content ?: "unknown"
            val appLabel = env["appLabel"]?.jsonPrimitive?.content
                ?: env["applicationName"]?.jsonPrimitive?.content
                ?: "Cliente"
            val userDisplayName = env["userDisplayName"]?.jsonPrimitive?.content
                ?: env["userName"]?.jsonPrimitive?.content
                ?: "—"
            val companyName = env["companyName"]?.jsonPrimitive?.content?.trim()?.takeIf { it.isNotEmpty() }
            val posName = env["pointOfSaleName"]?.jsonPrimitive?.content?.trim()?.takeIf { it.isNotEmpty() }
            register(
                ConnectedSession(
                    connId = connId,
                    clientId = clientId,
                    appLabel = appLabel,
                    userDisplayName = userDisplayName,
                    companyName = companyName,
                    pointOfSaleName = posName,
                ),
            )
            val health = PrinterHealthBuilder.build(repository, transport)
            val data = buildJsonObject {
                put("serviceStatus", serviceStatusPayload())
                put("printerHealth", health["payload"]!!)
                put("agentCapabilities", JsonArray(AGENT_CAPABILITIES_MVP.map { JsonPrimitive(it) }))
                put("ticketEscposEnabled", true)
                put("versionName", BuildConfig.VERSION_NAME)
                put("versionCode", BuildConfig.VERSION_CODE)
            }
            broadcaster.tryEmit(health.toString())
            return encodeOk(requestId, data)
        }

        if (!helloOk) {
            return encodeErr(requestId, "send_hello_first")
        }

        return when (action) {
            "ping" -> encodeOk(
                requestId,
                buildJsonObject {
                    put("status", "alive")
                    put("version", PROTOCOL_VERSION)
                },
            )
            "get_config" -> {
                val lines = repository.mappingLinesJson()
                val aliases = repository.aliasesByPurposeJson()
                val aliasesByFormat = repository.aliasesByFormatJson()
                val paperProfileByAlias = repository.paperProfileByAliasJson()
                encodeOk(
                    requestId,
                    buildJsonObject {
                        put("mappingLines", lines)
                        put("aliasesByPurpose", aliases)
                        put("aliasesByFormat", aliasesByFormat)
                        put("paperProfileByAlias", paperProfileByAlias)
                        put("mappings", JsonArray(emptyList()))
                        put("listenHost", repository.listenHost())
                        put("listenPort", repository.listenPort())
                        put("wssListenPort", repository.wssListenPort())
                        put("wssEnabled", repository.wssEnabled())
                        put("allowAllOrigins", repository.allowAllOrigins())
                        put(
                            "allowedOrigins",
                            repository.allowedOrigins().joinToString(","),
                        )
                        put(
                            "lanIpv4Addresses",
                            JsonArray(
                                LanAddressResolver.ipv4NonLoopback().map { JsonPrimitive(it) },
                            ),
                        )
                    },
                )
            }
            "set_config" -> {
                repository.applySetConfig(env)
                broadcaster.emitConfigChanged()
                encodeOk(requestId, buildJsonObject { put("ok", true) })
            }
            "set_printer_mapping" -> {
                val purpose = env["purpose"]?.jsonPrimitive?.content ?: ""
                val printer = env["printerName"]?.jsonPrimitive?.content ?: ""
                if (purpose.isEmpty() || printer.isEmpty()) {
                    encodeErr(requestId, "purpose_and_printerName_required")
                } else {
                    val paperProfile = env["paperProfile"]?.jsonPrimitive?.content ?: "80mm"
                    repository.setMapping(purpose, printer, paperProfile)
                    broadcaster.emitConfigChanged()
                    encodeOk(requestId, buildJsonObject { put("ok", true) })
                }
            }
            "set_mapping_lines" -> {
                val lines = env["lines"]?.jsonArray ?: JsonArray(emptyList())
                repository.applyMappingLinesFromJson(lines)
                broadcaster.emitConfigChanged()
                encodeOk(requestId, buildJsonObject { put("ok", true) })
            }
            "get_printers" -> {
                val printers = bonded.listBondedPrintersJson()
                encodeOk(requestId, buildJsonObject { put("printers", printers) })
            }
            "get_jobs" -> {
                val jobs = repository.listJobs(50).map { job ->
                    buildJsonObject {
                        put("id", job.id)
                        put("status", job.status)
                        job.purpose?.let { put("purpose", it) }
                        job.filename?.let { put("filename", it) }
                        job.error?.let { put("error", it) }
                        job.format?.let { put("format", it) }
                    }
                }
                encodeOk(requestId, buildJsonObject { put("jobs", JsonArray(jobs)) })
            }
            "cancel_job" -> {
                val jobId = env["jobId"]?.jsonPrimitive?.content ?: ""
                if (repository.dismissJob(jobId)) {
                    encodeOk(requestId, buildJsonObject { put("cancelled", true) })
                } else {
                    encodeErr(requestId, "job_not_in_queue_or_missing")
                }
            }
            "health" -> {
                val jobs = repository.listJobs(50)
                encodeOk(
                    requestId,
                    buildJsonObject {
                        put("printers", bonded.listBondedPrintersJson())
                        put("jobs", JsonArray(jobs.map {
                            buildJsonObject {
                                put("id", it.id)
                                put("status", it.status)
                            }
                        }))
                    },
                )
            }
            "print" -> handlePrint(env, requestId)
            "test_print" -> handleTestPrint(env, requestId)
            else -> encodeErr(requestId, "unknown_action")
        }
    }

    private suspend fun handlePrint(env: JsonObject, requestId: String?): String {
        val printType = env["type"]?.jsonPrimitive?.content
            ?: return encodeErr(requestId, "missing_type")
        val purpose = env["purpose"]?.jsonPrimitive?.content
            ?: PrintFormats.printFormatToPurpose(PrintFormats.resolve(null, "tickets"))
        var format = PrintFormats.resolve(env["format"]?.jsonPrimitive?.content, purpose)

        if (!PrintFormats.formatCompatibleWithPurpose(format, purpose)) {
            return encodeErr(requestId, "format_purpose_mismatch")
        }

        val displayLabel = env["printerDisplayLabel"]?.jsonPrimitive?.content
            ?: env["printerAlias"]?.jsonPrimitive?.content
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
        val target = repository.resolvePrinterForPurpose(purpose, displayLabel)
            ?: return encodeErr(requestId, "no_printer_mapped")
        val mappingLine = repository.findMappingLine(purpose, displayLabel, target)
        val paperProfile = PaperProfile.fromStorage(
            mappingLine?.paperProfile ?: PaperProfile.defaultForPurpose(purpose).storageValue,
        )
        format = PrintFormats.resolveFormatForMapping(format, paperProfile, purpose)
        if (!PrintFormats.formatsMatchProfile(format, paperProfile)) {
            return encodeErr(requestId, "format_printer_mismatch")
        }

        val filename = env["filename"]?.jsonPrimitive?.content ?: "print.bin"
        val clientId = env["clientId"]?.jsonPrimitive?.content

        return when {
            PrintFormats.isTicketFormat(format) -> {
                if (!PrintFormats.isTicketJobType(printType)) {
                    return encodeErr(requestId, "unsupported_print_type")
                }
                val ticket = env["ticket"] ?: return encodeErr(requestId, "ticket_required")
                val ticketObj = ticket.jsonObj() ?: return encodeErr(requestId, "ticket_required")
                val folio = ticketObj.jsonStr("folio").present() ?: ""
                val jobId = repository.enqueueJob(
                    purpose = purpose,
                    filename = filename,
                    documentType = printType,
                    internalFolio = folio,
                    clientId = clientId,
                    targetPrinter = target,
                    payloadJson = ticket.toString(),
                    format = format.wireValue,
                )
                queueWorker.notifyNewJob()
                encodeOk(requestId, buildJsonObject { put("jobId", jobId) })
            }
            PrintFormats.isDocumentFormat(format) -> {
                if (printType != "pdf-base64") {
                    return encodeErr(requestId, "unsupported_print_type")
                }
                val payload = env["payload"]?.jsonPrimitive?.content
                    ?: return encodeErr(requestId, "payload_required")
                val folio = env["internalFolio"]?.jsonPrimitive?.content ?: ""
                val jobId = repository.enqueueJob(
                    purpose = purpose,
                    filename = filename,
                    documentType = printType,
                    internalFolio = folio,
                    clientId = clientId,
                    targetPrinter = target,
                    payloadJson = payload,
                    format = format.wireValue,
                )
                queueWorker.notifyNewJob()
                encodeOk(requestId, buildJsonObject { put("jobId", jobId) })
            }
            else -> encodeErr(requestId, "unsupported_format")
        }
    }

    private suspend fun handleTestPrint(env: JsonObject, requestId: String?): String {
        val purpose = env["purpose"]?.jsonPrimitive?.content ?: "tickets"
        val displayLabel = env["printerDisplayLabel"]?.jsonPrimitive?.content
            ?: env["printerAlias"]?.jsonPrimitive?.content?.trim()?.takeIf { it.isNotEmpty() }
        val target = repository.resolvePrinterForPurpose(purpose, displayLabel)
            ?: return encodeErr(requestId, "no_printer_mapped")
        val mappingLine = repository.findMappingLine(purpose, displayLabel, target)
        val paperProfile = PaperProfile.fromStorage(
            mappingLine?.paperProfile ?: PaperProfile.defaultForPurpose(purpose).storageValue,
        )
        return try {
            when (purpose) {
                "documents" -> {
                    val format = DocumentTestPdf.formatForProfile(paperProfile)
                    AndroidPdfPrinter.printPdf(
                        appContext,
                        DocumentTestPdf.bytesForProfile(paperProfile),
                        "kai-printers-doc-test.pdf",
                        format,
                    )
                    encodeOk(requestId, buildJsonObject { put("ok", true) })
                }
                "tickets" -> {
                    val ref = PrinterRef.parse(target) ?: return encodeErr(requestId, "invalid_printer_ref")
                    if (ref is PrinterRef.SystemPrint) {
                        return encodeErr(requestId, "invalid_printer_ref")
                    }
                    val app = appContext.applicationContext as KaiPrintersApp
                    val logoSettings = app.container.printLogoRepository.currentSettings()
                    val headerPrefs = repository.ticketHeaderPrefs()
                    val bytes = EscPosTestBytes.testPage(paperProfile, appContext, logoSettings, headerPrefs)
                    transport.write(ref, bytes)
                    encodeOk(requestId, buildJsonObject { put("ok", true) })
                }
                else -> encodeErr(requestId, "unsupported_purpose")
            }
        } catch (e: Exception) {
            encodeErr(requestId, e.message ?: "test_print_failed")
        }
    }

    suspend fun serviceStatusPayload(): JsonObject = buildJsonObject {
        put("connectedClients", connectedCount())
        put("sessions", connectedSessionsJson())
        put("agentDisplayName", repository.agentDisplayName())
        put("listenHost", repository.listenHost())
        put("listenPort", repository.listenPort())
        put("wssListenPort", repository.wssListenPort())
        put("wssEnabled", repository.wssEnabled())
        put("allowAllOrigins", repository.allowAllOrigins())
        put(
            "lanIpv4Addresses",
            JsonArray(LanAddressResolver.ipv4NonLoopback().map { JsonPrimitive(it) }),
        )
    }

    private fun encodeOk(requestId: String?, data: JsonObject): String =
        Json.encodeToString(
            JsonObject.serializer(),
            buildJsonObject {
                put("version", PROTOCOL_VERSION)
                requestId?.let { put("request_id", it) }
                put("ok", true)
                put("data", data)
            },
        )

    private fun encodeErr(requestId: String?, msg: String): String =
        Json.encodeToString(
            JsonObject.serializer(),
            buildJsonObject {
                put("version", PROTOCOL_VERSION)
                requestId?.let { put("request_id", it) }
                put("ok", false)
                put("error", msg)
            },
        )

    private fun isVersionOk(version: String?): Boolean {
        if (version == null) return true
        return version == "2" || version == "2.0" || version == "2.1" || version.startsWith("2.")
    }

    private fun JsonElement.asString(): String? =
        (this as? JsonPrimitive)?.content
}
