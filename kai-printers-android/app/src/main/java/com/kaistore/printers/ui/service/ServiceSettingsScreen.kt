package com.kaistore.printers.ui.service

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.DisposableEffect
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.kaistore.printers.KaiPrintersApp
import com.kaistore.printers.R
import com.kaistore.printers.service.PrintAgentForegroundService
import com.kaistore.printers.service.WssLocalProbe
import com.kaistore.printers.ui.prefs.ServiceSetupPrefs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ServiceSettingsScreen(onBackToPrinters: () -> Unit = {}) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val app = remember { context.applicationContext as KaiPrintersApp }
    val setupPrefs = remember { ServiceSetupPrefs(context) }

    var wsPort by remember { mutableStateOf(14567) }
    var wssPort by remember { mutableStateOf(14568) }
    var wssEnabled by remember { mutableStateOf(true) }
    var running by remember { mutableStateOf(app.container.webSocketServer.isRunning()) }
    var chromeCertAck by remember { mutableStateOf(false) }
    var probeRunning by remember { mutableStateOf(false) }
    var probeMessage by remember { mutableStateOf<String?>(null) }
    var probeOk by remember { mutableStateOf(false) }

    fun refreshState() {
        scope.launch {
            app.container.repository.ensureDefaults()
            wsPort = app.container.repository.listenPort()
            wssPort = app.container.repository.wssListenPort()
            wssEnabled = app.container.repository.wssEnabled()
            running = app.container.webSocketServer.isRunning()
            chromeCertAck = setupPrefs.isChromeCertAcknowledged()
        }
    }

    fun runWssProbe() {
        if (!running) {
            probeMessage = context.getString(R.string.trust_probe_service_stopped)
            probeOk = false
            return
        }
        probeRunning = true
        probeMessage = null
        scope.launch {
            val result = withContext(Dispatchers.IO) { WssLocalProbe.probe(wssPort) }
            probeRunning = false
            probeOk = result.ok
            probeMessage = result.message
            if (result.ok) {
                setupPrefs.setChromeCertAcknowledged(true)
                chromeCertAck = true
            }
        }
    }

    LaunchedEffect(Unit) {
        refreshState()
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                refreshState()
                if (running) {
                    runWssProbe()
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val readyForPos = running && (!wssEnabled || (chromeCertAck && probeOk))

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.pos_connection_title), style = MaterialTheme.typography.headlineSmall)
        Text(stringResource(R.string.pos_connection_subtitle), style = MaterialTheme.typography.bodyMedium)

        if (readyForPos) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
            ) {
                Text(
                    stringResource(R.string.pos_connection_ready),
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                )
            }
        }

        SetupStepCard(
            step = 1,
            title = stringResource(R.string.pos_step_service_title),
            done = running,
            status = if (running) {
                stringResource(R.string.service_running)
            } else {
                stringResource(R.string.service_stopped)
            },
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(stringResource(R.string.pos_step_service_switch))
                Switch(
                    checked = running,
                    onCheckedChange = { enabled ->
                        if (enabled) {
                            PrintAgentForegroundService.start(context)
                            scope.launch {
                                delay(600)
                                refreshState()
                                runWssProbe()
                            }
                        } else {
                            PrintAgentForegroundService.stop(context)
                            running = false
                            probeOk = false
                            probeMessage = null
                        }
                    },
                )
            }
            Text(
                stringResource(R.string.ws_port, wsPort),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (wssEnabled) {
                Text(
                    stringResource(R.string.wss_port, wssPort),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        if (wssEnabled) {
            SetupStepCard(
                step = 2,
                title = stringResource(R.string.pos_step_cert_title),
                done = chromeCertAck && probeOk,
                status = when {
                    probeOk && chromeCertAck -> stringResource(R.string.status_granted)
                    chromeCertAck -> stringResource(R.string.pos_step_cert_pending_verify)
                    else -> stringResource(R.string.status_pending)
                },
            ) {
                Text(
                    stringResource(R.string.pos_step_cert_intro),
                    style = MaterialTheme.typography.bodySmall,
                )
                Spacer(Modifier.height(4.dp))
                CertInstructionLine(1, stringResource(R.string.pos_step_cert_1))
                CertInstructionLine(2, stringResource(R.string.pos_step_cert_2))
                CertInstructionLine(3, stringResource(R.string.pos_step_cert_3))
                CertInstructionLine(4, stringResource(R.string.pos_step_cert_4))

                Spacer(Modifier.height(8.dp))

                Button(
                    onClick = {
                        if (!running) {
                            Toast.makeText(
                                context,
                                context.getString(R.string.trust_certificate_service_stopped),
                                Toast.LENGTH_LONG,
                            ).show()
                            PrintAgentForegroundService.start(context)
                            scope.launch {
                                delay(800)
                                refreshState()
                            }
                            return@Button
                        }
                        val url = "https://127.0.0.1:$wssPort/"
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = running,
                ) {
                    Text(stringResource(R.string.trust_certificate_open_chrome, wssPort))
                }

                OutlinedButton(
                    onClick = { runWssProbe() },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = running && !probeRunning,
                ) {
                    Text(
                        if (probeRunning) {
                            stringResource(R.string.pos_step_cert_verifying)
                        } else {
                            stringResource(R.string.pos_step_cert_verify)
                        },
                    )
                }

                if (probeRunning) {
                    LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                }

                probeMessage?.let { msg ->
                    Text(
                        msg,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (probeOk) {
                            MaterialTheme.colorScheme.secondary
                        } else {
                            MaterialTheme.colorScheme.error
                        },
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Checkbox(
                        checked = chromeCertAck,
                        onCheckedChange = { checked ->
                            chromeCertAck = checked
                            scope.launch { setupPrefs.setChromeCertAcknowledged(checked) }
                        },
                    )
                    Text(
                        stringResource(R.string.pos_step_cert_checkbox),
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }

        SetupStepCard(
            step = if (wssEnabled) 3 else 2,
            title = stringResource(R.string.pos_step_pos_config_title),
            done = readyForPos,
            status = if (readyForPos) stringResource(R.string.status_granted) else stringResource(R.string.status_pending),
        ) {
            Text(stringResource(R.string.pos_step_pos_config_body), style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(8.dp))
            PosConfigLine(stringResource(R.string.pos_config_host), "127.0.0.1")
            if (wssEnabled) {
                PosConfigLine(stringResource(R.string.pos_config_wss), stringResource(R.string.pos_config_wss_on))
                PosConfigLine(stringResource(R.string.pos_config_wss_port), wssPort.toString())
            } else {
                PosConfigLine(stringResource(R.string.pos_config_wss), stringResource(R.string.pos_config_wss_off))
                PosConfigLine(stringResource(R.string.pos_config_ws_port), wsPort.toString())
            }
            PosConfigLine(
                stringResource(R.string.pos_config_same_device),
                stringResource(R.string.pos_config_same_device_value),
            )
        }

        Spacer(Modifier.height(8.dp))

        OutlinedButton(onClick = onBackToPrinters, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.pos_back_to_printers))
        }

        OutlinedButton(
            onClick = {
                PrintAgentForegroundService.start(context)
                scope.launch {
                    delay(600)
                    refreshState()
                    runWssProbe()
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.service_restart))
        }
    }
}

@Composable
private fun SetupStepCard(
    step: Int,
    title: String,
    done: Boolean,
    status: String,
    content: @Composable () -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("$step. $title", style = MaterialTheme.typography.titleMedium)
                Text(
                    status,
                    style = MaterialTheme.typography.labelMedium,
                    color = if (done) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.error,
                )
            }
            content()
        }
    }
}

@Composable
private fun CertInstructionLine(number: Int, text: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("$number.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
        Text(text, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun PosConfigLine(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodySmall)
    }
}
