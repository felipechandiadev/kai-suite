package com.kaistore.screen

import android.app.Application
import com.kaistore.screen.data.DisplayAgentRepository
import com.kaistore.screen.protocol.DisplayProtocolDispatcher
import com.kaistore.screen.protocol.EventBroadcaster
import com.kaistore.screen.ws.DisplayWebSocketServer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

class KaiScreenApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
        val repository = DisplayAgentRepository(applicationContext)
        val broadcaster = EventBroadcaster()
        val dispatcher = DisplayProtocolDispatcher(repository, broadcaster, scope)
        val webSocketServer = DisplayWebSocketServer(repository, broadcaster, dispatcher)
        container = AppContainer(repository, broadcaster, dispatcher, webSocketServer, scope)
    }
}

class AppContainer(
    val repository: DisplayAgentRepository,
    val broadcaster: EventBroadcaster,
    val dispatcher: DisplayProtocolDispatcher,
    val webSocketServer: DisplayWebSocketServer,
    val scope: CoroutineScope,
)
