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
import com.kaistore.printers.print.EscPosTestBytes
import com.kaistore.printers.print.PaperProfile
import com.kaistore.printers.print.transport.PrinterRef
import com.kaistore.printers.print.transport.TransportFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun BluetoothPrintersScreenContent(onAssignmentChanged: () -> Unit = {}) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val bondedRepo = remember { BondedDevicesRepository(context) }
    val transportFactory = remember { TransportFactory(context) }
    val repository = remember { (context.applicationContext as KaiPrintersApp).container.repository }

    var devices by remember { mutableStateOf<List<BluetoothDevice>>(emptyList()) }
    var assignedName by remember { mutableStateOf<String?>(null) }
    var assignedPaperProfile by remember { mutableStateOf(PaperProfile.MM80.storageValue) }
    var selectedPaperProfile by remember { mutableStateOf(PaperProfile.MM80.storageValue) }
    var message by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        devices = bondedRepo.listBondedDevices()
        assignedName = repository.ticketsPrinterSystemName()
        assignedPaperProfile = repository.ticketsPaperProfile()
        selectedPaperProfile = assignedPaperProfile
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.printers_subtitle), style = MaterialTheme.typography.bodyMedium)

        PaperProfileSelector(
            selected = selectedPaperProfile,
            onSelect = { selectedPaperProfile = it },
        )

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
                    val isAssigned = PrinterRef.parse(assignedName) is PrinterRef.Bluetooth &&
                        (PrinterRef.parse(assignedName) as PrinterRef.Bluetooth).macAddress == device.address
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(device.name ?: device.address, style = MaterialTheme.typography.titleMedium)
                            Text(device.address, style = MaterialTheme.typography.bodySmall)
                            if (isAssigned) {
                                Text(
                                    stringResource(R.string.assigned_with_profile, assignedPaperProfile),
                                    color = MaterialTheme.colorScheme.secondary,
                                )
                            }
                            Button(
                                onClick = {
                                    scope.launch {
                                        repository.assignTicketsPrinter(
                                            device.address,
                                            device.name ?: device.address,
                                            selectedPaperProfile,
                                        )
                                        assignedName = device.address
                                        assignedPaperProfile = selectedPaperProfile
                                        message = null
                                        onAssignmentChanged()
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
                val ref = PrinterRef.parse(assignedName)
                if (ref !is PrinterRef.Bluetooth) {
                    message = context.getString(R.string.assign_printer_first)
                    return@Button
                }
                scope.launch {
                    try {
                        withContext(Dispatchers.IO) {
                            transportFactory.write(
                                ref,
                                EscPosTestBytes.testPage(PaperProfile.fromStorage(selectedPaperProfile)),
                            )
                        }
                        message = context.getString(R.string.test_print_sent)
                    } catch (e: Exception) {
                        message = e.message
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.test_print))
        }
    }
}

@Composable
fun BluetoothPrintersScreen(onContinue: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.printers_title), style = MaterialTheme.typography.headlineSmall)
        BluetoothPrintersScreenContent()
        Button(onClick = onContinue, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.continue_label))
        }
    }
}
