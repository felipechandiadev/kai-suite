package com.kaistore.printers.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Badge
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.kaistore.printers.R
import com.kaistore.printers.ui.printers.PrintersSetupScreen
import com.kaistore.printers.ui.service.ServiceSettingsScreen

private enum class ServiceTabStatus {
    Ready,
    Warning,
    Error,
}

@Composable
fun MainShellScreen() {
    var selectedTab by rememberSaveable { mutableIntStateOf(0) }
    var serviceTabStatusOrdinal by rememberSaveable { mutableIntStateOf(ServiceTabStatus.Warning.ordinal) }
    val serviceTabStatus = ServiceTabStatus.entries[serviceTabStatusOrdinal]

    Scaffold(
        topBar = {
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text(stringResource(R.string.tab_printers)) },
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = {
                        ServiceTabLabel(status = serviceTabStatus)
                    },
                )
            }
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize(),
        ) {
            when (selectedTab) {
                0 -> PrintersSetupScreen()
                else -> ServiceSettingsScreen(
                    onServiceStatusChange = { ready, _, hasLanIp ->
                        serviceTabStatusOrdinal = when {
                            !hasLanIp -> ServiceTabStatus.Error.ordinal
                            ready -> ServiceTabStatus.Ready.ordinal
                            else -> ServiceTabStatus.Warning.ordinal
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun ServiceTabLabel(status: ServiceTabStatus) {
    val tabText = stringResource(R.string.tab_service)
    val badgeColor = when (status) {
        ServiceTabStatus.Ready -> Color(0xFF4CAF50)
        ServiceTabStatus.Warning -> Color(0xFFFFB300)
        ServiceTabStatus.Error -> MaterialTheme.colorScheme.error
    }
    val badgeDescription = when (status) {
        ServiceTabStatus.Ready -> stringResource(R.string.tab_service_badge_ready)
        ServiceTabStatus.Warning -> stringResource(R.string.tab_service_badge_warning)
        ServiceTabStatus.Error -> stringResource(R.string.tab_service_badge_error)
    }

    BadgedBox(
        modifier = Modifier.semantics { contentDescription = badgeDescription },
        badge = {
            Badge(containerColor = badgeColor)
        },
    ) {
        Text(tabText)
    }
}
