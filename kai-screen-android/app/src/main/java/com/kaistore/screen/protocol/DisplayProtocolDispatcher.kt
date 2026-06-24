package com.kaistore.screen.protocol

import com.kaistore.screen.data.DisplayAgentRepository
import com.kaistore.screen.display.CustomerDisplayEvent
import com.kaistore.screen.display.CustomerDisplaySnapshot
import com.kaistore.screen.display.DisplayStateHolder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

data class ConnectedPosSession(
    val connId: String,
    val clientId: String,
    val pointOfSaleId: String,
    val storeName: String?,
)

class DisplayProtocolDispatcher(
    private val repository: DisplayAgentRepository,
    private val broadcaster: EventBroadcaster,
    private val scope: CoroutineScope,
) {
    private val connSeq = AtomicInteger(0)
    private val sessions = ConcurrentHashMap<String, ConnectedPosSession>()
  private val json = Json { ignoreUnknownKeys = true }

    fun nextConnId(): String = "conn-${connSeq.incrementAndGet()}"

    fun unregister(connId: String) {
        sessions.remove(connId)
        if (sessions.isEmpty()) {
            DisplayStateHolder.setPosConnected(false)
            broadcaster.emitDisplayStatus(
                connected = false,
                displayAttached = DisplayStateHolder.displayAttached.value,
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
        if (version != PROTOCOL_VERSION) {
            return encodeErr(env["request_id"]?.asString(), "unsupported_version:$version")
        }

        val action = env["action"]?.jsonPrimitive?.content
            ?: return encodeErr(env["request_id"]?.asString(), "missing_action")

        if (action != "hello" && !helloOk) {
            return encodeErr(env["request_id"]?.asString(), "send_hello_first")
        }

        return when (action) {
            "hello" -> handleHello(connId, env)
            "cart_snapshot" -> handleCartSnapshot(env)
            "display_event" -> handleDisplayEvent(env)
            else -> encodeErr(env["request_id"]?.asString(), "unknown_action:$action")
        }
    }

    private suspend fun handleHello(connId: String, env: JsonObject): String {
        val token = env["token"]?.jsonPrimitive?.content?.trim()
        val expected = repository.agentToken()
        if (!expected.isNullOrEmpty() && token != expected) {
            return encodeErr(env["request_id"]?.asString(), "invalid_token")
        }
        val clientId = env["clientId"]?.jsonPrimitive?.content ?: "unknown"
        val pointOfSaleId = env["pointOfSaleId"]?.jsonPrimitive?.content?.trim().orEmpty()
        if (pointOfSaleId.isEmpty()) {
            return encodeErr(env["request_id"]?.asString(), "pointOfSaleId_required")
        }
        val storeName = env["storeName"]?.jsonPrimitive?.content
        sessions[connId] = ConnectedPosSession(connId, clientId, pointOfSaleId, storeName)
        DisplayStateHolder.setPosConnected(true)
        broadcaster.emitDisplayStatus(
            connected = true,
            displayAttached = DisplayStateHolder.displayAttached.value,
        )
        return encodeOk(
            env["request_id"]?.asString(),
            buildJsonObject {
                put("version", PROTOCOL_VERSION)
                put("agentCapabilities", JsonPrimitive("customer-display"))
            },
        )
    }

    private fun handleCartSnapshot(env: JsonObject): String {
        val payload = env["payload"]?.jsonObject ?: return encodeErr(env["request_id"]?.asString(), "missing_payload")
        return try {
            val snap = json.decodeFromJsonElement(CustomerDisplaySnapshot.serializer(), payload)
            DisplayStateHolder.setSnapshot(snap)
            encodeOk(env["request_id"]?.asString(), buildJsonObject { put("ok", true) })
        } catch (e: Exception) {
            encodeErr(env["request_id"]?.asString(), "invalid_snapshot:${e.message}")
        }
    }

    private fun handleDisplayEvent(env: JsonObject): String {
        val payload = env["payload"]?.jsonObject ?: return encodeErr(env["request_id"]?.asString(), "missing_payload")
        return try {
            val event = json.decodeFromJsonElement(CustomerDisplayEvent.serializer(), payload)
            when (event.type) {
                "sale_completed" -> {
                    val thankYou = CustomerDisplaySnapshot(
                        state = "thank_you",
                        pointOfSaleId = event.pointOfSaleId,
                        storeName = DisplayStateHolder.snapshot.value.storeName,
                        total = event.total ?: DisplayStateHolder.snapshot.value.total,
                        itemCount = DisplayStateHolder.snapshot.value.itemCount,
                        updatedAt = event.updatedAt,
                    )
                    DisplayStateHolder.setSnapshot(thankYou)
                    scope.launch {
                        delay(5_000)
                        if (DisplayStateHolder.snapshot.value.state == "thank_you") {
                            DisplayStateHolder.setSnapshot(
                                CustomerDisplaySnapshot(
                                    state = "idle",
                                    pointOfSaleId = event.pointOfSaleId,
                                    storeName = thankYou.storeName,
                                ),
                            )
                        }
                    }
                }
                "idle" -> {
                    DisplayStateHolder.setSnapshot(
                        CustomerDisplaySnapshot(
                            state = "idle",
                            pointOfSaleId = event.pointOfSaleId,
                            storeName = DisplayStateHolder.snapshot.value.storeName,
                        ),
                    )
                }
            }
            encodeOk(env["request_id"]?.asString(), buildJsonObject { put("ok", true) })
        } catch (e: Exception) {
            encodeErr(env["request_id"]?.asString(), "invalid_event:${e.message}")
        }
    }

    private fun JsonElement?.asString(): String? = this?.jsonPrimitive?.content

    private fun encodeOk(requestId: String?, payload: JsonObject = buildJsonObject {}): String =
        Json.encodeToString(
            JsonObject.serializer(),
            buildJsonObject {
                put("version", PROTOCOL_VERSION)
                put("ok", true)
                requestId?.let { put("request_id", it) }
                put("payload", payload)
            },
        )

    private fun encodeErr(requestId: String?, error: String): String =
        Json.encodeToString(
            JsonObject.serializer(),
            buildJsonObject {
                put("version", PROTOCOL_VERSION)
                put("ok", false)
                requestId?.let { put("request_id", it) }
                put("error", error)
            },
        )
}
