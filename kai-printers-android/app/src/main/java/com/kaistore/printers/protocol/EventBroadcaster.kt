package com.kaistore.printers.protocol

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class EventBroadcaster {
    private val _events = MutableSharedFlow<String>(extraBufferCapacity = 64)
    val events: SharedFlow<String> = _events.asSharedFlow()

    fun tryEmit(jsonLine: String) {
        _events.tryEmit(jsonLine)
    }

    fun emitPrintJobDone(jobId: String) {
        tryEmit(
            Json.encodeToString(
                JsonObject.serializer(),
                buildJsonObject {
                    put("version", PROTOCOL_VERSION)
                    put("event", "print_job_done")
                    put("payload", buildJsonObject { put("jobId", jobId) })
                },
            ),
        )
    }

    fun emitPrintJobFailed(jobId: String, error: String) {
        tryEmit(
            Json.encodeToString(
                JsonObject.serializer(),
                buildJsonObject {
                    put("version", PROTOCOL_VERSION)
                    put("event", "print_job_failed")
                    put("payload", buildJsonObject {
                        put("jobId", jobId)
                        put("error", error)
                    })
                },
            ),
        )
    }

    fun emitConfigChanged() {
        tryEmit(
            Json.encodeToString(
                JsonObject.serializer(),
                buildJsonObject {
                    put("version", PROTOCOL_VERSION)
                    put("event", "config_changed")
                    put("payload", buildJsonObject { put("source", "api") })
                },
            ),
        )
    }
}
