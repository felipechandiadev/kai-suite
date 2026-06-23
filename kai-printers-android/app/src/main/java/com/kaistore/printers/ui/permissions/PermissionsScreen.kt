package com.kaistore.printers.ui.permissions

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.kaistore.printers.R
import com.kaistore.printers.bluetooth.BluetoothPermissions
import com.kaistore.printers.service.PrintAgentForegroundService
import com.kaistore.printers.ui.prefs.OnboardingPrefs
import kotlinx.coroutines.launch
import android.content.pm.PackageManager

@Composable
fun PermissionsScreen(onContinue: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val prefs = remember { OnboardingPrefs(context) }

    var notificationsOk by remember {
        mutableStateOf(
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    var bluetoothOk by remember { mutableStateOf(BluetoothPermissions.hasScanAndConnect(context)) }
    var serviceOn by remember { mutableStateOf(false) }

    val notifLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted -> notificationsOk = granted }

    val btLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { result ->
        bluetoothOk = BluetoothPermissions.hasScanAndConnect(context)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.permissions_title), style = MaterialTheme.typography.headlineSmall)
        Text(stringResource(R.string.permissions_subtitle), style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(8.dp))

        PermissionCard(
            title = stringResource(R.string.perm_notifications),
            description = stringResource(R.string.perm_notifications_desc),
            granted = notificationsOk,
            onGrant = {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    notificationsOk = true
                }
            },
        )

        PermissionCard(
            title = stringResource(R.string.perm_bluetooth),
            description = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                stringResource(R.string.perm_bluetooth_desc_legacy)
            } else {
                stringResource(R.string.perm_bluetooth_desc)
            },
            granted = bluetoothOk,
            onGrant = { btLauncher.launch(BluetoothPermissions.requiredPermissions()) },
        )

        PermissionCard(
            title = stringResource(R.string.perm_battery),
            description = stringResource(R.string.perm_battery_desc),
            granted = false,
            actionLabel = stringResource(R.string.open_settings),
            onGrant = {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                }
                context.startActivity(intent)
            },
        )

        Card(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.perm_service), style = MaterialTheme.typography.titleMedium)
                    Text(stringResource(R.string.perm_service_desc), style = MaterialTheme.typography.bodySmall)
                }
                Switch(
                    checked = serviceOn,
                    onCheckedChange = { on ->
                        serviceOn = on
                        if (on) {
                            PrintAgentForegroundService.start(context)
                            scope.launch { prefs.setServiceAutostart(true) }
                        } else {
                            PrintAgentForegroundService.stop(context)
                            scope.launch { prefs.setServiceAutostart(false) }
                        }
                    },
                )
            }
        }

        Spacer(Modifier.weight(1f))

        Button(
            onClick = {
                scope.launch {
                    prefs.setPermissionsOnboardingDone(true)
                    onContinue()
                }
            },
            enabled = notificationsOk && bluetoothOk && serviceOn,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.continue_label))
        }
    }
}

@Composable
private fun PermissionCard(
    title: String,
    description: String,
    granted: Boolean,
    actionLabel: String = stringResource(R.string.grant),
    onGrant: () -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(
                    if (granted) stringResource(R.string.status_granted) else stringResource(R.string.status_pending),
                    style = MaterialTheme.typography.labelMedium,
                    color = if (granted) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.error,
                )
            }
            Text(description, style = MaterialTheme.typography.bodySmall)
            if (!granted) {
                Button(onClick = onGrant) { Text(actionLabel) }
            }
        }
    }
}
