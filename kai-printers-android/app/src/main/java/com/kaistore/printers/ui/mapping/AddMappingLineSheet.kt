package com.kaistore.printers.ui.mapping

import android.content.Intent
import android.hardware.usb.UsbDevice
import android.provider.Settings
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.kaistore.printers.R
import com.kaistore.printers.bluetooth.BluetoothPermissions
import com.kaistore.printers.bluetooth.BondedDevicesRepository
import com.kaistore.printers.data.MappingLineUtils
import com.kaistore.printers.print.transport.PrinterRef
import com.kaistore.printers.print.transport.TransportFactory
import com.kaistore.printers.usb.UsbPrinterRepository
import com.kaistore.printers.bluetooth.safeLabel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private enum class AddTransport { BLUETOOTH, NETWORK, USB }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddMappingLineSheet(
    visible: Boolean,
    onDismiss: () -> Unit,
    onAddLine: (purpose: String, paperProfile: String, systemPrinterName: String, displayLabel: String) -> Unit,
) {
    if (!visible) return

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var purpose by rememberSaveable { mutableStateOf("tickets") }
    var paperProfile by rememberSaveable {
        mutableStateOf(MappingLineUtils.defaultPaperProfileForPurpose("tickets"))
    }
    // Enum no es Bundle-saveable: guardar como nombre evita crash al abrir el sheet.
    var transportName by rememberSaveable { mutableStateOf(AddTransport.BLUETOOTH.name) }
    val transport =
        runCatching { AddTransport.valueOf(transportName) }.getOrDefault(AddTransport.BLUETOOTH)
    var alias by rememberSaveable { mutableStateOf("") }
    var systemPrinterName by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(purpose) {
        paperProfile = MappingLineUtils.defaultPaperProfileForPurpose(purpose)
        if (alias.isBlank()) {
            alias = if (purpose == "documents") "Documentos" else "Tickets"
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text(stringResource(R.string.mapping_add_line_title), style = MaterialTheme.typography.titleLarge)

            PurposeSelector(
                selected = purpose,
                onSelect = {
                    purpose = it
                    systemPrinterName = null
                },
            )

            PaperProfileSelector(
                purpose = purpose,
                selected = paperProfile,
                onSelect = { paperProfile = it },
            )

            TransportSelector(
                selected = transport,
                onSelect = {
                    transportName = it.name
                    systemPrinterName = null
                },
            )

            when (transport) {
                AddTransport.BLUETOOTH -> {
                    BluetoothDevicePicker(
                        onSelected = { address, label ->
                            systemPrinterName = PrinterRef.Bluetooth(address).encode()
                            if (alias.isBlank() || alias == "Tickets" || alias == "Documentos") {
                                alias = label
                            }
                        },
                    )
                }
                AddTransport.NETWORK -> {
                    NetworkDevicePicker(
                        onSelected = { ref, label ->
                            systemPrinterName = ref
                            if (alias.isBlank() || alias == "Tickets" || alias == "Documentos") {
                                alias = label
                            }
                        },
                    )
                }
                AddTransport.USB -> {
                    UsbDevicePicker(
                        onSelected = { ref, label ->
                            systemPrinterName = ref
                            if (alias.isBlank() || alias == "Tickets" || alias == "Documentos") {
                                alias = label
                            }
                        },
                    )
                }
            }

            DisplayLabelField(value = alias, onValueChange = { alias = it })

            systemPrinterName?.let { ref ->
                Text(
                    stringResource(R.string.mapping_device_ref, MappingLineUtils.describeTransport(ref)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Button(
                onClick = {
                    val name = systemPrinterName ?: return@Button
                    val ref = PrinterRef.parse(name)
                    if (purpose == "tickets" && ref is PrinterRef.SystemPrint) return@Button
                    onAddLine(purpose, paperProfile, name, alias.trim())
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = alias.trim().isNotEmpty() && systemPrinterName != null,
            ) {
                Text(stringResource(R.string.mapping_add_line_button))
            }

            OutlinedButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.mapping_cancel))
            }
        }
    }
}

@Composable
private fun TransportSelector(
    selected: AddTransport,
    onSelect: (AddTransport) -> Unit,
    modifier: Modifier = Modifier,
) {
    val options = listOf(
        AddTransport.BLUETOOTH to stringResource(R.string.transport_bluetooth),
        AddTransport.NETWORK to stringResource(R.string.transport_network),
        AddTransport.USB to stringResource(R.string.transport_usb),
    )
    Column(modifier.selectableGroup(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(stringResource(R.string.mapping_transport_label), style = MaterialTheme.typography.titleSmall)
        options.forEach { (value, label) ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = selected == value,
                        onClick = { onSelect(value) },
                        role = Role.RadioButton,
                    )
                    .padding(vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RadioButton(selected = selected == value, onClick = null)
                Text(label, modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@Composable
private fun BluetoothDevicePicker(onSelected: (address: String, label: String) -> Unit) {
    val context = LocalContext.current
    val bondedRepo = remember { BondedDevicesRepository(context) }
    var devices by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var listError by remember { mutableStateOf<String?>(null) }
    val hasBtPermission = BluetoothPermissions.hasScanAndConnect(context)

    LaunchedEffect(hasBtPermission) {
        if (!hasBtPermission) {
            devices = emptyList()
            listError = null
            return@LaunchedEffect
        }
        devices = bondedRepo.listBondedDevicesSafe().map { it.address to it.safeLabel() }
        listError = null
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (!hasBtPermission) {
            Text(
                stringResource(R.string.perm_bluetooth),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
            )
        }
        OutlinedButton(
            onClick = { context.startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS)) },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.pair_in_system))
        }
        listError?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }
        if (devices.isEmpty()) {
            Text(stringResource(R.string.no_bonded_devices), style = MaterialTheme.typography.bodySmall)
        } else {
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                devices.forEach { (address, label) ->
                    OutlinedButton(
                        onClick = { onSelected(address, label) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(label)
                    }
                }
            }
        }
    }
}

@Composable
private fun NetworkDevicePicker(onSelected: (ref: String, label: String) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val transportFactory = remember { TransportFactory(context) }
    var host by rememberSaveable { mutableStateOf("192.168.1.50") }
    var portText by rememberSaveable { mutableStateOf("9100") }
    var message by remember { mutableStateOf<String?>(null) }
    val port = portText.toIntOrNull() ?: 9100

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
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
        message?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        OutlinedButton(
            onClick = {
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
                val trimmed = host.trim()
                onSelected(PrinterRef.Network(trimmed, port).encode(), "$trimmed:$port")
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = host.trim().isNotEmpty(),
        ) {
            Text(stringResource(R.string.mapping_use_network_target))
        }
    }
}

@Composable
private fun UsbDevicePicker(onSelected: (ref: String, label: String) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val usbRepo = remember { UsbPrinterRepository(context) }
    var devices by remember { mutableStateOf<List<UsbDevice>>(emptyList()) }

    fun refresh() {
        devices = usbRepo.listDevices()
    }

    LaunchedEffect(Unit) {
        refresh()
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedButton(
            onClick = { refresh() },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.usb_refresh))
        }
        if (devices.isEmpty()) {
            Text(stringResource(R.string.usb_no_devices), style = MaterialTheme.typography.bodySmall)
        } else {
            devices.forEach { device ->
                val label = usbRepo.deviceLabel(device)
                val hasPermission = usbRepo.hasPermission(device)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (!hasPermission) {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    usbRepo.requestPermission(device)
                                    refresh()
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(stringResource(R.string.usb_request_permission))
                        }
                    }
                    Button(
                        onClick = {
                            onSelected(PrinterRef.Usb(device.deviceId).encode(), label)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = hasPermission,
                    ) {
                        Text(label)
                    }
                }
            }
        }
    }
}
