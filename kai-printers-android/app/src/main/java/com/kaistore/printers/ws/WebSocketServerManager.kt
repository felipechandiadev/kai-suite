package com.kaistore.printers.ws

import android.content.Context
import com.kaistore.printers.bluetooth.BondedDevicesRepository
import com.kaistore.printers.data.AgentRepository
import com.kaistore.printers.print.transport.TransportFactory
import com.kaistore.printers.protocol.EventBroadcaster
import com.kaistore.printers.protocol.ProtocolDispatcher
import com.kaistore.printers.queue.PrintQueueWorker
import com.kaistore.printers.tls.SelfSignedCertProvider
import io.ktor.server.application.ApplicationCallPipeline
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.engine.applicationEngineEnvironment
import io.ktor.server.engine.connector
import io.ktor.server.engine.embeddedServer
import io.ktor.server.engine.sslConnector
import io.ktor.server.engine.ApplicationEngine
import io.ktor.http.HttpStatusCode
import io.ktor.server.request.header
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import io.ktor.server.netty.Netty
import io.ktor.http.HttpHeaders
import io.ktor.server.websocket.WebSockets
import io.ktor.server.routing.routing
import io.ktor.http.ContentType
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
import io.ktor.server.websocket.webSocket
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
  <title>Kai Printers</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; color: #111; }
    h1 { font-size: 1.25rem; }
    p { max-width: 28rem; }
  </style>
</head>
<body>
  <h1>Kai Printers — servicio local</h1>
  <p>Si ve esta página, el certificado HTTPS está aceptado y el agente responde en este dispositivo.</p>
  <p>Desde <strong>otro equipo en la red</strong> (POS en Mac/PC), use la IP LAN de esta tablet en Impresión local del POS.</p>
  <p>En la <strong>misma tablet</strong>, cierre esta pestaña y vuelva al POS; el icono de impresión debería conectar por WSS.</p>
</body>
</html>
"""

class WebSocketServerManager(
    private val repository: AgentRepository,
    private val broadcaster: EventBroadcaster,
    private val queueWorker: PrintQueueWorker,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var serverRef = AtomicReference<ApplicationEngine?>(null)
    private lateinit var dispatcher: ProtocolDispatcher
    private lateinit var bonded: BondedDevicesRepository

    suspend fun start(context: Context) = withContext(Dispatchers.IO) {
        if (serverRef.get() != null) return@withContext
        repository.ensureDefaults()
        bonded = BondedDevicesRepository(context.applicationContext)
        val transport = TransportFactory(context.applicationContext)
        dispatcher = ProtocolDispatcher(context.applicationContext, repository, bonded, transport, broadcaster, queueWorker)

        val host = repository.listenHost()
        val wsPort = repository.listenPort()
        val wssPort = repository.wssListenPort()
        val wssEnabled = repository.wssEnabled()
        val allowAllOrigins = repository.allowAllOrigins()
        val allowedOrigins = repository.allowedOrigins()

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
                    intercept(ApplicationCallPipeline.Call) {
                        val upgrade = call.request.header(HttpHeaders.Upgrade)
                        if (upgrade.equals("websocket", ignoreCase = true)) {
                            val origin = call.request.header(HttpHeaders.Origin)
                            if (
                                !WebSocketOriginPolicy.isAllowed(
                                    origin,
                                    allowAllOrigins,
                                    allowedOrigins,
                                )
                            ) {
                                call.respond(HttpStatusCode.Forbidden, "Origin not allowed")
                                finish()
                                return@intercept
                            }
                        }
                    }
                    install(WebSockets)
                    routing {
                        route("/") {
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
