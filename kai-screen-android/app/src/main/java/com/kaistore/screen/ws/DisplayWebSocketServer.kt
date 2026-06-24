package com.kaistore.screen.ws

import android.content.Context
import com.kaistore.screen.data.DisplayAgentRepository
import com.kaistore.screen.protocol.DisplayProtocolDispatcher
import com.kaistore.screen.protocol.EventBroadcaster
import com.kaistore.screen.tls.SelfSignedCertProvider
import io.ktor.server.application.install
import io.ktor.server.engine.ApplicationEngine
import io.ktor.server.engine.applicationEngineEnvironment
import io.ktor.server.engine.connector
import io.ktor.server.engine.embeddedServer
import io.ktor.server.engine.sslConnector
import io.ktor.server.netty.Netty
import io.ktor.server.application.call
import io.ktor.http.ContentType
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.server.websocket.WebSockets
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.Frame
import io.ktor.websocket.readText
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.security.KeyStore
import java.util.concurrent.atomic.AtomicReference

private data class ConnState(var helloOk: Boolean = false)

/** Página mínima para confiar el certificado WSS en Chrome (GET HTTPS, no WebSocket). */
private const val TRUST_CERT_HTML = """
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kai Screen</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; color: #111; }
    h1 { font-size: 1.25rem; }
    p { max-width: 28rem; }
  </style>
</head>
<body>
  <h1>Kai Screen — servicio local</h1>
  <p>Si ve esta página, el certificado HTTPS está aceptado y el agente responde en este dispositivo.</p>
  <p>Cierre esta pestaña y vuelva al <strong>POS</strong> (misma tablet). Active Kai Screen en Impresión local.</p>
</body>
</html>
"""

class DisplayWebSocketServer(
    private val repository: DisplayAgentRepository,
    private val broadcaster: EventBroadcaster,
    private val dispatcher: DisplayProtocolDispatcher,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var serverRef = AtomicReference<ApplicationEngine?>(null)

    suspend fun start(context: Context) = withContext(Dispatchers.IO) {
        if (serverRef.get() != null) return@withContext
        repository.ensureDefaults()

        val host = repository.listenHost()
        val wsPort = repository.listenPort()
        val wssPort = repository.wssListenPort()
        val wssEnabled = repository.wssEnabled()

        val password = SelfSignedCertProvider.PASSWORD.toCharArray()
        val keyStore: KeyStore? = if (wssEnabled) {
            SelfSignedCertProvider.getOrCreateKeyStore(context)
        } else {
            null
        }

        val server = embeddedServer(
            Netty,
            environment = applicationEngineEnvironment {
                connector {
                    this.host = host
                    this.port = wsPort
                }
                if (wssEnabled && keyStore != null) {
                    sslConnector(
                        keyStore = keyStore,
                        keyAlias = SelfSignedCertProvider.ALIAS,
                        keyStorePassword = { password },
                        privateKeyPassword = { password },
                    ) {
                        this.host = host
                        this.port = wssPort
                    }
                }
                module {
                    install(WebSockets)
                    routing {
                        get("/") {
                            call.respondText(TRUST_CERT_HTML, ContentType.Text.Html)
                        }
                        webSocket("/") {
                            val connId = dispatcher.nextConnId()
                            val state = ConnState()
                            val broadcastCollect = scope.launch {
                                broadcaster.events.collectLatest { msg ->
                                    try {
                                        send(Frame.Text(msg))
                                    } catch (_: Exception) {
                                    }
                                }
                            }
                            try {
                                for (frame in incoming) {
                                    if (frame !is Frame.Text) continue
                                    val text = frame.readText()
                                    val action = try {
                                        Json.parseToJsonElement(text).jsonObject["action"]?.jsonPrimitive?.content
                                    } catch (_: Exception) {
                                        null
                                    }
                                    val response = dispatcher.dispatch(connId, state.helloOk, text)
                                    if (action == "hello") {
                                        state.helloOk = true
                                    }
                                    send(Frame.Text(response))
                                }
                            } finally {
                                broadcastCollect.cancel()
                                dispatcher.unregister(connId)
                            }
                        }
                    }
                }
            },
        )

        server.start(wait = false)
        serverRef.set(server)
    }

    fun stop() {
        serverRef.getAndSet(null)?.stop(1000, 2000)
    }

    fun isRunning(): Boolean = serverRef.get() != null
}
