package com.kaistore.screen.ui

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.kaistore.screen.KaiScreenApp
import com.kaistore.screen.R
import com.kaistore.screen.display.DisplayStateHolder
import com.kaistore.screen.service.DisplayAgentForegroundService
import com.kaistore.screen.ui.theme.KaiScreenTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContent {
            KaiScreenTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    ServiceSettingsScreen(
                        onStart = { DisplayAgentForegroundService.start(this) },
                        onStop = { DisplayAgentForegroundService.stop(this) },
                        onTrustCert = { openTrustCert() },
                        isServiceRunning = {
                            (application as KaiScreenApp).container.webSocketServer.isRunning()
                        },
                    )
                }
            }
        }
    }

    private fun openTrustCert() {
        val app = application as KaiScreenApp
        val scope = kotlinx.coroutines.MainScope()
        scope.launch {
            app.container.repository.ensureDefaults()
            val port = app.container.repository.wssListenPort()
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://127.0.0.1:$port/"))
            startActivity(intent)
        }
    }
}

@Composable
fun ServiceSettingsScreen(
    onStart: () -> Unit,
    onStop: () -> Unit,
    onTrustCert: () -> Unit,
    isServiceRunning: () -> Boolean,
) {
    val scope = rememberCoroutineScope()
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as KaiScreenApp
    var running by remember { mutableStateOf(isServiceRunning()) }
    var wsPort by remember { mutableStateOf(14570) }
    var wssPort by remember { mutableStateOf(14571) }

    val posConnected by DisplayStateHolder.posConnected.collectAsState()
    val displayAttached by DisplayStateHolder.displayAttached.collectAsState()

    androidx.compose.runtime.LaunchedEffect(Unit) {
        app.container.repository.ensureDefaults()
        wsPort = app.container.repository.listenPort()
        wssPort = app.container.repository.wssListenPort()
        running = isServiceRunning()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start,
    ) {
        Text(text = stringResource(R.string.service_title), style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = if (running) stringResource(R.string.service_running) else stringResource(R.string.service_stopped),
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = stringResource(R.string.ws_port, wsPort))
        Text(text = stringResource(R.string.wss_port, wssPort))
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = if (posConnected) stringResource(R.string.pos_connected) else stringResource(R.string.pos_disconnected),
        )
        Text(
            text = if (displayAttached) {
                stringResource(R.string.display_attached)
            } else {
                stringResource(R.string.display_missing)
            },
        )
        Spacer(modifier = Modifier.height(24.dp))
        RowSwitchService(running = running, onStart = {
            onStart()
            running = true
        }, onStop = {
            onStop()
            running = false
        })
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onTrustCert, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.trust_certificate))
        }
        Text(
            text = stringResource(R.string.trust_certificate_desc),
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}

@Composable
private fun RowSwitchService(running: Boolean, onStart: () -> Unit, onStop: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = stringResource(R.string.start_service))
        Switch(
            checked = running,
            onCheckedChange = { enabled ->
                if (enabled) onStart() else onStop()
            },
        )
    }
}
