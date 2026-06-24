package com.kaistore.printers.ui.printers

import android.hardware.usb.UsbDevice
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
import androidx.compose.material3.OutlinedTextField
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
import com.kaistore.printers.print.EscPosTestBytes
import com.kaistore.printers.print.PaperProfile
import com.kaistore.printers.print.transport.PrinterRef
import com.kaistore.printers.print.transport.TransportFactory
import com.kaistore.printers.usb.UsbPrinterRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun NetworkPrintersScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val repository = remember { (context.applicationContext as KaiPrintersApp).container.repository }
    val transportFactory = remember { TransportFactory(context) }

    var host by remember { mutableStateOf("192.168.1.50") }
    var portText by remember { mutableStateOf("9100") }
    var selectedPaperProfile by remember { mutableStateOf(PaperProfile.MM80.storageValue) }
    var assignedName by remember { mutableStateOf<String?>(null) }
    var assignedPaperProfile by remember { mutableStateOf(PaperProfile.MM80.storageValue) }
    var message by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        assignedName = repository.ticketsPrinterSystemName()
        assignedPaperProfile = repository.ticketsPaperProfile()
        selectedPaperProfile = assignedPaperProfile
        PrinterRef.parse(assignedName)?.let { ref ->
            if (ref is PrinterRef.Network) {
                host = ref.host
                portText = ref.port.toString()
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.network_printers_subtitle), style = MaterialTheme.typography.bodyMedium)
        AssignedPrinterSummary(assignedName, assignedPaperProfile)

        OutlinedTextField(
            value = host,
            onValueChange = { host = it },
            label = { Text(stringResource(R.string.network_host_label)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedTextField(
            value = portText,
            onValueChange = { portText = it.filter { ch -> ch.isDigit() } },
            label = { Text(stringResource(R.string.network_port_label)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )

        PaperProfileSelector(selected = selectedPaperProfile, onSelect = { selectedPaperProfile = it })

        message?.let { Text(it, color = MaterialTheme.colorScheme.error) }

        Button(
            onClick = {
                val port = portText.toIntOrNull() ?: 9100
                val ref = PrinterRef.Network(host.trim(), port)
                scope.launch {
                    try {
                        val ok = withContext(Dispatchers.IO) { transportFactory.probe(ref) }
                        message = if (ok) {
                            context.getString(R.string.network_probe_ok)
                        } else {
                            context.getString(R.string.network_probe_failed)
                        }
                    } catch (e: Exception) {
                        message = e.message
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.network_probe))
        }

        Button(
            onClick = {
                val port = portText.toIntOrNull() ?: 9100
                val label = "${host.trim()}:$port"
                scope.launch {
                    repository.assignNetworkPrinter(host.trim(), port, label, selectedPaperProfile)
                    assignedName = "net:${host.trim()}:$port"
                    assignedPaperProfile = selectedPaperProfile
                    message = null
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.assign_tickets))
        }

        Button(
            onClick = {
                val port = portText.toIntOrNull() ?: 9100
                val ref = PrinterRef.Network(host.trim(), port)
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
fun UsbPrintersScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val repository = remember { (context.applicationContext as KaiPrintersApp).container.repository }
    val usbRepo = remember { UsbPrinterRepository(context) }
    val transportFactory = remember { TransportFactory(context) }

    var devices by remember { mutableStateOf<List<UsbDevice>>(emptyList()) }
    var assignedName by remember { mutableStateOf<String?>(null) }
    var assignedPaperProfile by remember { mutableStateOf(PaperProfile.MM80.storageValue) }
    var selectedPaperProfile by remember { mutableStateOf(PaperProfile.MM80.storageValue) }
    var message by remember { mutableStateOf<String?>(null) }

    fun refreshDevices() {
        devices = usbRepo.listDevices()
    }

    LaunchedEffect(Unit) {
        refreshDevices()
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
        Text(stringResource(R.string.usb_printers_subtitle), style = MaterialTheme.typography.bodyMedium)
        AssignedPrinterSummary(assignedName, assignedPaperProfile)

        PaperProfileSelector(selected = selectedPaperProfile, onSelect = { selectedPaperProfile = it })

        Button(onClick = { refreshDevices() }, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.usb_refresh))
        }

        if (devices.isEmpty()) {
            Text(stringResource(R.string.usb_no_devices))
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f, fill = false),
            ) {
                items(devices, key = { it.deviceId }) { device ->
                    val label = usbRepo.deviceLabel(device)
                    val hasPermission = usbRepo.hasPermission(device)
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(label, style = MaterialTheme.typography.titleMedium)
                            Text(
                                stringResource(R.string.usb_vendor_id, device.vendorId),
                                style = MaterialTheme.typography.bodySmall,
                            )
                            if (!hasPermission) {
                                Button(
                                    onClick = {
                                        scope.launch {
                                            val granted = usbRepo.requestPermission(device)
                                            message = if (granted) {
                                                null
                                            } else {
                                                context.getString(R.string.usb_permission_denied)
                                            }
                                            refreshDevices()
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Text(stringResource(R.string.usb_request_permission))
                                }
                            }
                            Button(
                                onClick = {
                                    scope.launch {
                                        if (!usbRepo.hasPermission(device) &&
                                            !usbRepo.requestPermission(device)
                                        ) {
                                            message = context.getString(R.string.usb_permission_denied)
                                            return@launch
                                        }
                                        repository.assignUsbPrinter(
                                            device.deviceId,
                                            label,
                                            selectedPaperProfile,
                                        )
                                        assignedName = "usb:${device.deviceId}"
                                        assignedPaperProfile = selectedPaperProfile
                                        message = null
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = hasPermission,
                            ) {
                                Text(stringResource(R.string.assign_tickets))
                            }
                            Button(
                                onClick = {
                                    scope.launch {
                                        if (!usbRepo.hasPermission(device) &&
                                            !usbRepo.requestPermission(device)
                                        ) {
                                            message = context.getString(R.string.usb_permission_denied)
                                            return@launch
                                        }
                                        val ref = PrinterRef.Usb(device.deviceId)
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
                                enabled = hasPermission,
                            ) {
                                Text(stringResource(R.string.test_print))
                            }
                        }
                    }
                }
            }
        }

        message?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }
}
