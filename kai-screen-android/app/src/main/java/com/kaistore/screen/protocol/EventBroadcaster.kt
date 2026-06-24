package com.kaistore.screen.protocol

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

    fun emitDisplayStatus(connected: Boolean, displayAttached: Boolean, message: String? = null) {
        tryEmit(
            Json.encodeToString(
                JsonObject.serializer(),
                buildJsonObject {
                    put("version", PROTOCOL_VERSION)
                    put("event", "display_status")
                    put(
                        "payload",
                        buildJsonObject {
                            put("connected", connected)
                            put("displayAttached", displayAttached)
                            message?.let { put("message", it) }
                        },
                    )
                },
            ),
        )
    }
}
