package com.kaistore.printers.ui.service

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.kaistore.printers.KaiPrintersApp
import com.kaistore.printers.R
import com.kaistore.printers.service.PrintAgentForegroundService
import kotlinx.coroutines.launch

@Composable
fun ServiceSettingsScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val app = remember { context.applicationContext as KaiPrintersApp }
    var wsPort by remember { mutableStateOf(14567) }
    var wssPort by remember { mutableStateOf(14568) }
    var running by remember { mutableStateOf(app.container.webSocketServer.isRunning()) }

    LaunchedEffect(Unit) {
        wsPort = app.container.repository.listenPort()
        wssPort = app.container.repository.wssListenPort()
        running = app.container.webSocketServer.isRunning()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.service_title), style = MaterialTheme.typography.headlineSmall)
        Text(
            if (running) stringResource(R.string.service_running) else stringResource(R.string.service_stopped),
            color = if (running) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.error,
        )
        Text(stringResource(R.string.ws_port, wsPort))
        Text(stringResource(R.string.wss_port, wssPort))

        Text(
            stringResource(R.string.trust_certificate_desc),
            style = MaterialTheme.typography.bodyMedium,
        )

        Button(
            onClick = {
                val url = "https://127.0.0.1:$wssPort/"
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.trust_certificate))
        }

        Button(
            onClick = {
                PrintAgentForegroundService.start(context)
                scope.launch {
                    wsPort = app.container.repository.listenPort()
                    wssPort = app.container.repository.wssListenPort()
                    running = true
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Reiniciar servicio")
        }

        Button(
            onClick = {
                PrintAgentForegroundService.stop(context)
                running = false
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Detener servicio")
        }
    }
}
