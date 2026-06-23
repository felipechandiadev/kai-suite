package com.kaistore.printers

import android.app.Application
import com.kaistore.printers.data.AgentRepository
import com.kaistore.printers.data.createAgentDatabase
import com.kaistore.printers.protocol.EventBroadcaster
import com.kaistore.printers.queue.PrintQueueWorker
import com.kaistore.printers.ws.WebSocketServerManager

class KaiPrintersApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        val db = createAgentDatabase(this)
        val repository = AgentRepository(db)
        val broadcaster = EventBroadcaster()
        val queueWorker = PrintQueueWorker(applicationContext, repository, broadcaster)
        val webSocketServer = WebSocketServerManager(repository, broadcaster, queueWorker)
        container = AppContainer(repository, broadcaster, queueWorker, webSocketServer)
    }
}

class AppContainer(
    val repository: AgentRepository,
    val broadcaster: EventBroadcaster,
    val queueWorker: PrintQueueWorker,
    val webSocketServer: WebSocketServerManager,
)
