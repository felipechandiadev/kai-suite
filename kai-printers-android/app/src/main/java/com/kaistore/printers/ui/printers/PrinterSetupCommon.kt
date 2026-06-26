package com.kaistore.printers.ui.printers

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.kaistore.printers.R
import com.kaistore.printers.data.MappingLineEntity
import com.kaistore.printers.data.MappingLineUtils
import com.kaistore.printers.print.PaperProfile
import com.kaistore.printers.print.transport.PrinterRef

@Composable
fun MappingLinesSummary(lines: List<MappingLineEntity>) {
    if (lines.isEmpty()) {
        Text(
            stringResource(R.string.mapping_no_lines),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
        )
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        lines.forEach { line ->
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
            val kindLabel = stringResource(MappingLineUtils.transportLabelRes(transportKind))
            Text(
                stringResource(
                    R.string.mapping_summary_item,
                    line.displayLabel ?: "—",
                    "$usoLabel · $formatLabel",
                    kindLabel,
                ),
                color = MaterialTheme.colorScheme.secondary,
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

@Composable
fun AssignedPrinterSummary(systemPrinterName: String?, paperProfile: String) {
    if (systemPrinterName.isNullOrBlank()) return
    val ref = PrinterRef.parse(systemPrinterName)
    val transportKind = MappingLineUtils.transportKindForSystemName(systemPrinterName)
    val kindLabel = stringResource(MappingLineUtils.transportLabelRes(transportKind))
    val detail = when (ref) {
        is PrinterRef.Bluetooth -> ref.macAddress
        is PrinterRef.Network -> "${ref.host}:${ref.port}"
        is PrinterRef.Usb -> "#${ref.deviceId}"
        is PrinterRef.SystemPrint -> stringResource(R.string.transport_system)
        null -> systemPrinterName
    }
    Text(
        stringResource(R.string.assigned_transport, kindLabel, detail, paperProfile),
        color = MaterialTheme.colorScheme.secondary,
        style = MaterialTheme.typography.bodyMedium,
    )
}
