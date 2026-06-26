package com.kaistore.printers.ui.mapping

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.kaistore.printers.R
import com.kaistore.printers.data.MappingLineEntity
import com.kaistore.printers.data.MappingLineUtils
import com.kaistore.printers.print.PaperProfile
import com.kaistore.printers.print.transport.PrinterRef

@Composable
fun DisplayLabelField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(stringResource(R.string.mapping_alias_label)) },
        singleLine = true,
        placeholder = { Text(stringResource(R.string.mapping_alias_placeholder)) },
    )
}

@Composable
fun PurposeSelector(
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val options = listOf(
        "tickets" to stringResource(R.string.mapping_purpose_tickets),
        "documents" to stringResource(R.string.mapping_purpose_documents),
    )
    Column(modifier.selectableGroup(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(stringResource(R.string.mapping_purpose_label), style = MaterialTheme.typography.titleSmall)
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
fun PaperProfileSelector(
    purpose: String,
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val options = if (purpose == "documents") {
        listOf(
            PaperProfile.A4.storageValue to stringResource(R.string.paper_profile_a4),
            PaperProfile.LETTER.storageValue to stringResource(R.string.paper_profile_letter),
        )
    } else {
        listOf(
            PaperProfile.MM58.storageValue to stringResource(R.string.mapping_format_58mm),
            PaperProfile.MM80.storageValue to stringResource(R.string.mapping_format_80mm),
        )
    }
    Column(modifier.selectableGroup(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(stringResource(R.string.mapping_format_label), style = MaterialTheme.typography.titleSmall)
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
fun MappingLineCard(
    line: MappingLineEntity,
    onTest: () -> Unit,
    onDelete: () -> Unit,
    testBusy: Boolean,
    modifier: Modifier = Modifier,
) {
    val usoLabel = when (line.purpose) {
        "documents" -> stringResource(R.string.mapping_purpose_documents)
        else -> stringResource(R.string.mapping_purpose_tickets)
    }
    val formatLabel = when {
        line.purpose == "documents" && line.paperProfile == PaperProfile.LETTER.storageValue ->
            stringResource(R.string.paper_profile_letter)
        line.purpose == "documents" -> stringResource(R.string.paper_profile_a4)
        line.paperProfile == PaperProfile.MM58.storageValue ->
            stringResource(R.string.mapping_format_58mm)
        else -> stringResource(R.string.mapping_format_80mm)
    }
    val transportKind = MappingLineUtils.transportKindForSystemName(line.systemPrinterName)
    val transportLabel = stringResource(MappingLineUtils.transportLabelRes(transportKind))
    val deviceDetail = when (val ref = PrinterRef.parse(line.systemPrinterName)) {
        is PrinterRef.Bluetooth -> ref.macAddress
        is PrinterRef.Network -> "${ref.host}:${ref.port}"
        is PrinterRef.Usb -> "USB #${ref.deviceId}"
        is PrinterRef.SystemPrint -> stringResource(R.string.transport_system)
        null -> line.systemPrinterName
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                line.displayLabel ?: "—",
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                stringResource(R.string.mapping_line_uso, usoLabel),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                stringResource(R.string.mapping_line_formato, formatLabel),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                stringResource(R.string.mapping_line_conexion, transportLabel),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                deviceDetail,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = onTest,
                    enabled = !testBusy,
                    modifier = Modifier.weight(1f),
                ) {
                    Text(
                        if (testBusy) {
                            stringResource(R.string.mapping_testing)
                        } else {
                            stringResource(R.string.mapping_test_device)
                        },
                    )
                }
                TextButton(onClick = onDelete) {
                    Text(stringResource(R.string.mapping_delete_line))
                }
            }
        }
    }
}

@Composable
fun MappingLinesList(
    lines: List<MappingLineEntity>,
    onTestLine: (MappingLineEntity) -> Unit,
    onDeleteLine: (MappingLineEntity) -> Unit,
    testingLineId: String?,
    modifier: Modifier = Modifier,
    emptyText: String? = null,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (lines.isEmpty()) {
            emptyText?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            lines.forEach { line ->
                MappingLineCard(
                    line = line,
                    onTest = { onTestLine(line) },
                    onDelete = { onDeleteLine(line) },
                    testBusy = testingLineId == line.id,
                )
            }
        }
    }
}
