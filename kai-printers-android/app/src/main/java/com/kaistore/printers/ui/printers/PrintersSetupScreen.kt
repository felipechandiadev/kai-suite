package com.kaistore.printers.ui.printers

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import com.kaistore.printers.ui.mapping.AddMappingLineSheet
import com.kaistore.printers.ui.mapping.MappingLinesList
import com.kaistore.printers.ui.mapping.MappingLinesState

@Composable
fun PrintersSetupScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val repository = remember { (context.applicationContext as KaiPrintersApp).container.repository }
    val mappingState = remember { MappingLinesState(context.applicationContext, repository, scope) }
    var showAddSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        mappingState.refresh()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
    ) {
        Text(stringResource(R.string.printers_setup_title), style = MaterialTheme.typography.headlineSmall)
        Text(
            stringResource(R.string.printers_setup_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
        )

        mappingState.message?.let {
            Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            MappingLinesList(
                lines = mappingState.lines,
                onTestLine = mappingState::testLine,
                onDeleteLine = { mappingState.deleteLine(it.id) },
                testingLineId = mappingState.testingLineId,
                emptyText = stringResource(R.string.mapping_no_lines),
            )

            Button(
                onClick = { showAddSheet = true },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.mapping_add_printer))
            }
        }
    }

    AddMappingLineSheet(
        visible = showAddSheet,
        onDismiss = { showAddSheet = false },
        onAddLine = { purpose, paperProfile, ref, alias ->
            mappingState.addLine(purpose, ref, alias, paperProfile)
        },
    )
}
