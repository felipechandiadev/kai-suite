package com.kaistore.printers.ui.printers

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
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
import kotlinx.coroutines.launch

private enum class PrinterTab { BLUETOOTH, NETWORK, USB }

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun PrintersSetupScreen(
    onContinue: () -> Unit,
    onOpenPosConnection: () -> Unit = onContinue,
) {
    val context = LocalContext.current
    val repository = remember { (context.applicationContext as KaiPrintersApp).container.repository }
    val scope = rememberCoroutineScope()
    val tabs = PrinterTab.entries
    val pagerState = rememberPagerState(pageCount = { tabs.size })
    var assignedName by remember { mutableStateOf<String?>(null) }
    var assignedPaperProfile by remember { mutableStateOf("80mm") }

    LaunchedEffect(Unit) {
        assignedName = repository.ticketsPrinterSystemName()
        assignedPaperProfile = repository.ticketsPaperProfile()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
    ) {
        Text(stringResource(R.string.printers_setup_title), style = MaterialTheme.typography.headlineSmall)
        AssignedPrinterSummary(assignedName, assignedPaperProfile)

        TabRow(selectedTabIndex = pagerState.currentPage, modifier = Modifier.fillMaxWidth()) {
            tabs.forEachIndexed { index, tab ->
                Tab(
                    selected = pagerState.currentPage == index,
                    onClick = { scope.launch { pagerState.animateScrollToPage(index) } },
                    text = {
                        Text(
                            when (tab) {
                                PrinterTab.BLUETOOTH -> stringResource(R.string.tab_bluetooth)
                                PrinterTab.NETWORK -> stringResource(R.string.tab_network)
                                PrinterTab.USB -> stringResource(R.string.tab_usb)
                            },
                        )
                    },
                )
            }
        }

        HorizontalPager(
            state = pagerState,
            modifier = Modifier.weight(1f),
        ) { page ->
            when (tabs[page]) {
                PrinterTab.BLUETOOTH -> BluetoothPrintersScreenContent(
                    onAssignmentChanged = {
                        scope.launch {
                            assignedName = repository.ticketsPrinterSystemName()
                            assignedPaperProfile = repository.ticketsPaperProfile()
                        }
                    },
                )
                PrinterTab.NETWORK -> NetworkPrintersScreen()
                PrinterTab.USB -> UsbPrintersScreen()
            }
        }

        OutlinedButton(onClick = onOpenPosConnection, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.pos_connection_shortcut))
        }

        Button(onClick = onContinue, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.continue_label))
        }
    }
}
