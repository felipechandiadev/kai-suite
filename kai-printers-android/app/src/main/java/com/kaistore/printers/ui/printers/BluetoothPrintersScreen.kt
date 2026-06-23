package com.kaistore.printers.ui.printers

import android.bluetooth.BluetoothDevice
import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
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
import com.kaistore.printers.bluetooth.BondedDevicesRepository
import com.kaistore.printers.bluetooth.BtSppTransport
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun BluetoothPrintersScreen(onContinue: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val bondedRepo = remember { BondedDevicesRepository(context) }
    val repository = remember { (context.applicationContext as KaiPrintersApp).container.repository }

    var devices by remember { mutableStateOf<List<BluetoothDevice>>(emptyList()) }
    var assignedMac by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        devices = bondedRepo.listBondedDevices()
        assignedMac = repository.ticketsPrinterMac()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.printers_title), style = MaterialTheme.typography.headlineSmall)
        Text(stringResource(R.string.printers_subtitle), style = MaterialTheme.typography.bodyMedium)

        Button(
            onClick = { context.startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS)) },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.pair_in_system))
        }

        if (devices.isEmpty()) {
            Text(stringResource(R.string.no_bonded_devices))
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.weight(1f)) {
                items(devices, key = { it.address }) { device ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(device.name ?: device.address, style = MaterialTheme.typography.titleMedium)
                            Text(device.address, style = MaterialTheme.typography.bodySmall)
                            if (assignedMac == device.address) {
                                Text(stringResource(R.string.assigned), color = MaterialTheme.colorScheme.secondary)
                            }
                            Button(
                                onClick = {
                                    scope.launch {
                                        repository.assignTicketsPrinter(
                                            device.address,
                                            device.name ?: device.address,
                                        )
                                        assignedMac = device.address
                                        message = null
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(stringResource(R.string.assign_tickets))
                            }
                        }
                    }
                }
            }
        }

        message?.let { Text(it, color = MaterialTheme.colorScheme.error) }

        Button(
            onClick = {
                val mac = assignedMac
                if (mac == null) {
                    message = "Asigne una impresora primero"
                    return@Button
                }
                scope.launch {
                    try {
                        val device = bondedRepo.deviceForAddress(mac)
                            ?: error("Dispositivo no encontrado")
                        withContext(Dispatchers.IO) {
                            BtSppTransport.write(device, BtSppTransport.testPage())
                        }
                        message = "Prueba enviada"
                    } catch (e: Exception) {
                        message = e.message
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.test_print))
        }

        Button(onClick = onContinue, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.continue_label))
        }
    }
}
