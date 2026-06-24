package com.kaistore.printers.ui.printers

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.kaistore.printers.R
import com.kaistore.printers.print.PaperProfile
import com.kaistore.printers.print.transport.PrinterRef

@Composable
fun PaperProfileSelector(selected: String, onSelect: (String) -> Unit) {
    val options = listOf(
        PaperProfile.MM58.storageValue to stringResource(R.string.paper_profile_58mm),
        PaperProfile.MM80.storageValue to stringResource(R.string.paper_profile_80mm),
    )
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(stringResource(R.string.paper_profile_label), style = MaterialTheme.typography.titleSmall)
        Column(Modifier.selectableGroup()) {
            options.forEach { (value, label) ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .selectable(
                            selected = selected == value,
                            onClick = { onSelect(value) },
                            role = Role.RadioButton,
                        )
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RadioButton(selected = selected == value, onClick = null)
                    Text(label, modifier = Modifier.padding(start = 8.dp))
                }
            }
        }
    }
}

@Composable
fun AssignedPrinterSummary(systemPrinterName: String?, paperProfile: String) {
    if (systemPrinterName.isNullOrBlank()) return
    val ref = PrinterRef.parse(systemPrinterName)
    val kindLabel = when (ref) {
        is PrinterRef.Bluetooth -> stringResource(R.string.transport_bluetooth)
        is PrinterRef.Network -> stringResource(R.string.transport_network)
        is PrinterRef.Usb -> stringResource(R.string.transport_usb)
        null -> stringResource(R.string.transport_unknown)
    }
    val detail = when (ref) {
        is PrinterRef.Bluetooth -> ref.macAddress
        is PrinterRef.Network -> "${ref.host}:${ref.port}"
        is PrinterRef.Usb -> "#${ref.deviceId}"
        null -> systemPrinterName
    }
    Text(
        stringResource(R.string.assigned_transport, kindLabel, detail, paperProfile),
        color = MaterialTheme.colorScheme.secondary,
        style = MaterialTheme.typography.bodyMedium,
    )
}
